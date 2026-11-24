import { Platform, PlatformContent, PublishResult } from '../core/types/index.js';
import { PostRepository } from '../database/repositories/post-repository.js';
import { getPlatformAdapter } from '../platforms/platform-registry.js';
import { PublishOptions } from '../platforms/platform-interface.js';
import { getPublishingConfig } from '../config/settings.js';
import { logger } from '../core/logger/index.js';
import { PlatformAuthError, PlatformPublishError } from '../core/errors/index.js';

export interface PlatformJobResult {
  platform: Platform;
  success: boolean;
  platformPostId?: string;
  postUrl?: string;
  error?: string;
  retryable?: boolean;
  retries: number;
}

export class RetryManager {
  async publishWithRetry(
    platform: Platform,
    content: PlatformContent,
    postId: string,
    idempotencyKey: string,
    options: PublishOptions = {}
  ): Promise<PlatformJobResult> {
    const config = getPublishingConfig();
    const { maxRetries, initialDelayMs, maxDelayMs, backoffMultiplier } = config.retryPolicy;
    const adapter = getPlatformAdapter(platform);
    const postRepo = new PostRepository();

    // Check idempotency - if already published, return existing result
    const existing = await postRepo.findPostByIdempotencyKey(idempotencyKey);
    if (existing && existing.status === 'published') {
      logger.info('Idempotency check: post already published, skipping', { platform, idempotencyKey });
      return {
        platform,
        success: true,
        platformPostId: existing.platform_post_id,
        postUrl: existing.post_url,
        retries: 0,
      };
    }

    let lastError: string = '';
    let retries = 0;
    let delay = initialDelayMs;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Publishing to ${platform} (attempt ${attempt + 1}/${maxRetries + 1})`, {
          platform,
          idempotencyKey,
        });

        // Validate before publish
        const validation = await adapter.validateContent(content);
        if (!validation.valid) {
          logger.warn(`Content validation failed for ${platform}`, { errors: validation.errors });
          return { platform, success: false, error: validation.errors.join('; '), retryable: false, retries };
        }

        const result = await adapter.publish(content, { ...options, idempotencyKey });

        // Record successful publish
        await postRepo.updatePostStatus(postId, 'published', {
          platformPostId: result.platformPostId,
          postUrl: result.postUrl,
          publishedAt: new Date(),
        });

        return {
          platform,
          success: true,
          platformPostId: result.platformPostId,
          postUrl: result.postUrl,
          retries,
        };
      } catch (err) {
        retries = attempt + 1;
        lastError = err instanceof Error ? err.message : String(err);

        // Permanent errors — don't retry
        if (err instanceof PlatformAuthError) {
          logger.warn(`${platform} permanent auth error — not retrying`, { error: lastError });
          await postRepo.updatePostStatus(postId, 'failed', {
            errorMessage: lastError,
            retryCount: retries,
          });
          return { platform, success: false, error: lastError, retryable: false, retries };
        }

        if (err instanceof PlatformPublishError && !err.retryable) {
          await postRepo.updatePostStatus(postId, 'failed', {
            errorMessage: lastError,
            retryCount: retries,
          });
          return { platform, success: false, error: lastError, retryable: false, retries };
        }

        if (attempt < maxRetries) {
          logger.warn(`${platform} publish failed (attempt ${attempt + 1}). Retrying in ${delay}ms...`, {
            error: lastError,
          });
          await new Promise((r) => setTimeout(r, delay));
          delay = Math.min(delay * backoffMultiplier, maxDelayMs);
        }
      }
    }

    logger.error(`${platform} publish failed after ${maxRetries + 1} attempts`, { error: lastError });
    await postRepo.updatePostStatus(postId, 'failed', {
      errorMessage: lastError,
      retryCount: retries,
    });

    return { platform, success: false, error: lastError, retryable: true, retries };
  }
}
