import { Platform, PlatformContent, PublishResult } from '../../core/types/index.js';
import {
  IPlatformAdapter,
  ValidationResult,
  ConnectionResult,
  PublishOptions,
} from '../platform-interface.js';
import { getEnv } from '../../config/env.js';
import { getPlatformsConfig } from '../../config/platform-config.js';
import { logger } from '../../core/logger/index.js';
import { PlatformPublishError, PlatformAuthError } from '../../core/errors/index.js';

export class XAdapter implements IPlatformAdapter {
  public readonly platform: Platform = 'x';

  async validateContent(content: PlatformContent): Promise<ValidationResult> {
    const config = getPlatformsConfig().x;
    const errors: string[] = [];
    const textWithHashtags = content.text + (content.hashtags.length > 0 ? '\n' + content.hashtags.join(' ') : '');

    if (textWithHashtags.length > (config.maxCharacters || 280)) {
      errors.push(`Post exceeds X character limit: ${textWithHashtags.length}/${config.maxCharacters}`);
    }

    if (!content.text.trim()) {
      errors.push('X post text cannot be empty');
    }

    if (content.hashtags.length > config.maxHashtags) {
      errors.push(`Too many hashtags for X: ${content.hashtags.length}/${config.maxHashtags}`);
    }

    return { valid: errors.length === 0, errors };
  }

  async publish(content: PlatformContent, options?: PublishOptions): Promise<PublishResult> {
    const env = getEnv();

    if (options?.dryRun) {
      logger.info('[DRY RUN] X post would be published', { text: content.text.slice(0, 80) });
      return {
        platform: 'x',
        success: true,
        platformPostId: 'dry_run_x_id',
        postUrl: 'https://x.com/status/dry_run',
        idempotencyKey: options.idempotencyKey,
      };
    }

    if (!env.X_API_KEY || !env.X_ACCESS_TOKEN) {
      throw new PlatformAuthError('x', 'Missing X_API_KEY or X_ACCESS_TOKEN credentials');
    }

    // Compose full tweet text
    const hashtagStr = content.hashtags.length > 0 ? '\n\n' + content.hashtags.join(' ') : '';
    const tweetText = (content.text + hashtagStr).slice(0, 280);

    // POST to X API v2
    const payload: Record<string, unknown> = { text: tweetText };
    if (content.mediaUrls.length > 0) {
      // X requires media upload endpoint first; simplified here
      logger.info('X media attachment: requires separate upload step in production');
    }

    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.X_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 401 || response.status === 403) {
        throw new PlatformAuthError('x', `Authentication failed: ${response.status}`);
      }
      throw new PlatformPublishError('x', `API error ${response.status}: ${error}`, response.status === 429);
    }

    const data = await response.json() as { data?: { id: string } };
    const postId = data?.data?.id || '';
    const postUrl = `https://x.com/i/web/status/${postId}`;

    logger.info('Successfully published to X', { postId });

    return {
      platform: 'x',
      success: true,
      platformPostId: postId,
      postUrl,
      idempotencyKey: options?.idempotencyKey,
      publishedAt: new Date(),
    };
  }

  async testConnection(): Promise<ConnectionResult> {
    const env = getEnv();
    const missing: string[] = [];
    if (!env.X_API_KEY) missing.push('X_API_KEY');
    if (!env.X_API_SECRET) missing.push('X_API_SECRET');
    if (!env.X_ACCESS_TOKEN) missing.push('X_ACCESS_TOKEN');
    if (!env.X_ACCESS_TOKEN_SECRET) missing.push('X_ACCESS_TOKEN_SECRET');

    if (missing.length > 0) {
      return {
        connected: false,
        platform: 'x',
        details: `Mock mode active. Missing credentials: ${missing.join(', ')}`,
        missingCredentials: missing,
      };
    }

    return { connected: true, platform: 'x', details: 'X API credentials provided (live mode)' };
  }
}
