import { Platform, PlatformContent, PublishResult } from '../../core/types/index.js';
import { IPlatformAdapter, ValidationResult, ConnectionResult, PublishOptions } from '../platform-interface.js';
import { getEnv } from '../../config/env.js';
import { getPlatformsConfig } from '../../config/platform-config.js';
import { logger } from '../../core/logger/index.js';
import { PlatformPublishError, PlatformAuthError } from '../../core/errors/index.js';

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

export class LinkedInAdapter implements IPlatformAdapter {
  public readonly platform: Platform = 'linkedin';

  async validateContent(content: PlatformContent): Promise<ValidationResult> {
    const config = getPlatformsConfig().linkedin;
    const errors: string[] = [];

    if (!content.text.trim()) errors.push('LinkedIn post text cannot be empty');
    if (content.text.length > (config.maxCharacters || 3000)) {
      errors.push(`Post exceeds LinkedIn limit: ${content.text.length}/${config.maxCharacters}`);
    }
    if (content.hashtags.length > config.maxHashtags) {
      errors.push(`Too many hashtags: ${content.hashtags.length}/${config.maxHashtags}`);
    }

    return { valid: errors.length === 0, errors };
  }

  async publish(content: PlatformContent, options?: PublishOptions): Promise<PublishResult> {
    const env = getEnv();

    if (options?.dryRun) {
      logger.info('[DRY RUN] LinkedIn post would be published', { text: content.text.slice(0, 80) });
      return { platform: 'linkedin', success: true, platformPostId: 'dry_run_li', idempotencyKey: options.idempotencyKey };
    }

    if (!env.LINKEDIN_ACCESS_TOKEN) {
      throw new PlatformAuthError('linkedin', 'Missing LINKEDIN_ACCESS_TOKEN');
    }

    const authorUrn = env.LINKEDIN_ORGANIZATION_ID
      ? `urn:li:organization:${env.LINKEDIN_ORGANIZATION_ID}`
      : env.LINKEDIN_PERSON_URN || '';

    if (!authorUrn) {
      throw new PlatformAuthError('linkedin', 'Missing LINKEDIN_ORGANIZATION_ID or LINKEDIN_PERSON_URN');
    }

    const postText = content.text + (content.hashtags.length > 0 ? '\n\n' + content.hashtags.join(' ') : '');

    const payload = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: postText },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    };

    const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 401 || response.status === 403) {
        throw new PlatformAuthError('linkedin', `Auth failed: ${response.status} - Token may be expired`);
      }
      throw new PlatformPublishError('linkedin', `API error ${response.status}: ${error}`, response.status === 429);
    }

    const postId = response.headers.get('x-restli-id') || '';
    const postUrl = postId ? `https://www.linkedin.com/feed/update/${postId}` : undefined;

    logger.info('Successfully published to LinkedIn', { postId });
    return { platform: 'linkedin', success: true, platformPostId: postId, postUrl, idempotencyKey: options?.idempotencyKey, publishedAt: new Date() };
  }

  async testConnection(): Promise<ConnectionResult> {
    const env = getEnv();
    const missing: string[] = [];
    if (!env.LINKEDIN_ACCESS_TOKEN) missing.push('LINKEDIN_ACCESS_TOKEN');
    if (!env.LINKEDIN_ORGANIZATION_ID && !env.LINKEDIN_PERSON_URN) missing.push('LINKEDIN_ORGANIZATION_ID or LINKEDIN_PERSON_URN');

    if (missing.length > 0) {
      return { connected: false, platform: 'linkedin', details: `Mock mode. Missing: ${missing.join(', ')}`, missingCredentials: missing };
    }
    return { connected: true, platform: 'linkedin', details: 'LinkedIn credentials provided' };
  }
}
