import { Platform, PlatformContent, PublishResult } from '../../core/types/index.js';
import { IPlatformAdapter, ValidationResult, ConnectionResult, PublishOptions } from '../platform-interface.js';
import { getEnv } from '../../config/env.js';
import { getPlatformsConfig } from '../../config/platform-config.js';
import { logger } from '../../core/logger/index.js';
import { PlatformPublishError, PlatformAuthError } from '../../core/errors/index.js';

const GRAPH_API_BASE = 'https://graph.facebook.com/v20.0';

export class FacebookAdapter implements IPlatformAdapter {
  public readonly platform: Platform = 'facebook';

  async validateContent(content: PlatformContent): Promise<ValidationResult> {
    const config = getPlatformsConfig().facebook;
    const errors: string[] = [];

    if (!content.text.trim()) errors.push('Facebook post text cannot be empty');
    if (content.text.length > (config.maxCharacters || 5000)) {
      errors.push(`Post exceeds Facebook character limit: ${content.text.length}/${config.maxCharacters}`);
    }
    if (content.hashtags.length > config.maxHashtags) {
      errors.push(`Too many hashtags: ${content.hashtags.length}/${config.maxHashtags}`);
    }

    return { valid: errors.length === 0, errors };
  }

  async publish(content: PlatformContent, options?: PublishOptions): Promise<PublishResult> {
    const env = getEnv();

    if (options?.dryRun) {
      logger.info('[DRY RUN] Facebook post would be published', { text: content.text.slice(0, 80) });
      return { platform: 'facebook', success: true, platformPostId: 'dry_run_fb', idempotencyKey: options.idempotencyKey };
    }

    if (!env.FACEBOOK_ACCESS_TOKEN || !env.FACEBOOK_PAGE_ID) {
      throw new PlatformAuthError('facebook', 'Missing FACEBOOK_ACCESS_TOKEN or FACEBOOK_PAGE_ID');
    }

    const message = content.text + (content.hashtags.length > 0 ? '\n\n' + content.hashtags.join(' ') : '');

    const body: Record<string, string> = {
      message,
      access_token: env.FACEBOOK_ACCESS_TOKEN,
    };

    if (content.mediaUrls.length > 0) {
      body.link = content.mediaUrls[0];
    }

    const response = await fetch(`${GRAPH_API_BASE}/${env.FACEBOOK_PAGE_ID}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 401 || response.status === 403) throw new PlatformAuthError('facebook', `Auth failed: ${response.status}`);
      throw new PlatformPublishError('facebook', `API error ${response.status}: ${error}`, response.status === 429);
    }

    const data = await response.json() as { id?: string };
    const postId = data.id || '';
    const postUrl = `https://www.facebook.com/${postId}`;

    logger.info('Successfully published to Facebook', { postId });
    return { platform: 'facebook', success: true, platformPostId: postId, postUrl, idempotencyKey: options?.idempotencyKey, publishedAt: new Date() };
  }

  async testConnection(): Promise<ConnectionResult> {
    const env = getEnv();
    const missing: string[] = [];
    if (!env.FACEBOOK_PAGE_ID) missing.push('FACEBOOK_PAGE_ID');
    if (!env.FACEBOOK_ACCESS_TOKEN) missing.push('FACEBOOK_ACCESS_TOKEN');

    if (missing.length > 0) {
      return { connected: false, platform: 'facebook', details: `Mock mode. Missing: ${missing.join(', ')}`, missingCredentials: missing };
    }
    return { connected: true, platform: 'facebook', details: 'Facebook credentials provided' };
  }
}
