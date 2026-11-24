import { Platform, PlatformContent, PublishResult } from '../../core/types/index.js';
import { IPlatformAdapter, ValidationResult, ConnectionResult, PublishOptions } from '../platform-interface.js';
import { getEnv } from '../../config/env.js';
import { getPlatformsConfig } from '../../config/platform-config.js';
import { logger } from '../../core/logger/index.js';
import { PlatformPublishError, PlatformAuthError } from '../../core/errors/index.js';

const GRAPH_API_BASE = 'https://graph.facebook.com/v20.0';
const CONTAINER_POLL_MAX = 12;
const CONTAINER_POLL_INTERVAL_MS = 5000;

export class InstagramAdapter implements IPlatformAdapter {
  public readonly platform: Platform = 'instagram';

  async validateContent(content: PlatformContent): Promise<ValidationResult> {
    const config = getPlatformsConfig().instagram;
    const errors: string[] = [];

    if (!content.text.trim()) errors.push('Instagram caption cannot be empty');
    if (content.text.length > (config.maxCharacters || 2200)) {
      errors.push(`Caption exceeds Instagram limit: ${content.text.length}/${config.maxCharacters}`);
    }
    if (content.hashtags.length > config.maxHashtags) {
      errors.push(`Too many hashtags: ${content.hashtags.length}/${config.maxHashtags}`);
    }
    if (content.mediaUrls.length === 0 && !content.metadata?.textOnly) {
      errors.push('Instagram posts require a media URL unless marked as text-only (not officially supported)');
    }

    return { valid: errors.length === 0, errors };
  }

  async publish(content: PlatformContent, options?: PublishOptions): Promise<PublishResult> {
    const env = getEnv();

    if (options?.dryRun) {
      logger.info('[DRY RUN] Instagram post would be published', { caption: content.text.slice(0, 80) });
      return { platform: 'instagram', success: true, platformPostId: 'dry_run_ig', idempotencyKey: options.idempotencyKey };
    }

    if (!env.INSTAGRAM_ACCESS_TOKEN || !env.INSTAGRAM_ACCOUNT_ID) {
      throw new PlatformAuthError('instagram', 'Missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_ACCOUNT_ID');
    }

    const caption = content.text + (content.hashtags.length > 0 ? '\n\n' + content.hashtags.join(' ') : '');
    const mediaUrl = content.mediaUrls[0] || '';

    if (!mediaUrl) {
      throw new PlatformPublishError('instagram', 'No public media URL available for Instagram post', false);
    }

    // Step 1: Create media container
    const containerRes = await fetch(
      `${GRAPH_API_BASE}/${env.INSTAGRAM_ACCOUNT_ID}/media?image_url=${encodeURIComponent(mediaUrl)}&caption=${encodeURIComponent(caption)}&access_token=${env.INSTAGRAM_ACCESS_TOKEN}`,
      { method: 'POST' }
    );

    if (!containerRes.ok) {
      const err = await containerRes.text();
      throw new PlatformPublishError('instagram', `Container creation failed: ${err}`, containerRes.status === 429);
    }

    const containerData = await containerRes.json() as { id?: string };
    const containerId = containerData.id;
    if (!containerId) throw new PlatformPublishError('instagram', 'No container ID returned', false);

    // Step 2: Poll container status
    let status = 'IN_PROGRESS';
    for (let i = 0; i < CONTAINER_POLL_MAX; i++) {
      await new Promise((r) => setTimeout(r, CONTAINER_POLL_INTERVAL_MS));
      const statusRes = await fetch(
        `${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${env.INSTAGRAM_ACCESS_TOKEN}`
      );
      const statusData = await statusRes.json() as { status_code?: string };
      status = statusData.status_code || 'ERROR';
      if (status === 'FINISHED') break;
      if (status === 'ERROR') throw new PlatformPublishError('instagram', 'Container processing failed', false);
    }

    if (status !== 'FINISHED') {
      throw new PlatformPublishError('instagram', 'Container did not finish processing in time', true);
    }

    // Step 3: Publish container
    const publishRes = await fetch(
      `${GRAPH_API_BASE}/${env.INSTAGRAM_ACCOUNT_ID}/media_publish?creation_id=${containerId}&access_token=${env.INSTAGRAM_ACCESS_TOKEN}`,
      { method: 'POST' }
    );

    if (!publishRes.ok) {
      const err = await publishRes.text();
      throw new PlatformPublishError('instagram', `Publish failed: ${err}`, publishRes.status === 429);
    }

    const publishData = await publishRes.json() as { id?: string };
    const postId = publishData.id || '';

    logger.info('Successfully published to Instagram', { postId });
    return { platform: 'instagram', success: true, platformPostId: postId, idempotencyKey: options?.idempotencyKey, publishedAt: new Date() };
  }

  async testConnection(): Promise<ConnectionResult> {
    const env = getEnv();
    const missing: string[] = [];
    if (!env.INSTAGRAM_ACCOUNT_ID) missing.push('INSTAGRAM_ACCOUNT_ID');
    if (!env.INSTAGRAM_ACCESS_TOKEN) missing.push('INSTAGRAM_ACCESS_TOKEN');

    if (missing.length > 0) {
      return { connected: false, platform: 'instagram', details: `Mock mode. Missing: ${missing.join(', ')}`, missingCredentials: missing };
    }
    return { connected: true, platform: 'instagram', details: 'Instagram credentials provided' };
  }
}
