import { Platform, MasterContent, PlatformContent } from '../core/types/index.js';
import { PostRepository } from '../database/repositories/post-repository.js';
import { HistoryRepository } from '../database/repositories/history-repository.js';
import { ContentGenerator } from '../content/content-generator.js';
import { MediaManager } from '../media/media-manager.js';
import { RetryManager, PlatformJobResult } from './retry-manager.js';
import { getEnabledPlatforms } from '../platforms/platform-registry.js';
import { generateContentItemId, generatePostId, generateIdempotencyKey, generateTopicHash } from './idempotency.js';
import { getPublishingConfig } from '../config/settings.js';
import { logger } from '../core/logger/index.js';

export interface OrchestrationResult {
  runId: string;
  contentItemId: string;
  topic: string;
  qualityScore: number;
  platformResults: PlatformJobResult[];
  successCount: number;
  failureCount: number;
  durationMs: number;
}

export class PublishingOrchestrator {
  private postRepo = new PostRepository();
  private historyRepo = new HistoryRepository();
  private contentGenerator = new ContentGenerator();
  private mediaManager = new MediaManager();
  private retryManager = new RetryManager();

  async orchestrate(
    runId: string,
    topic: string,
    angle: string,
    pillarId: string,
    sourceUrl?: string,
    options: { dryRun?: boolean; platforms?: Platform[] } = {}
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const contentItemId = generateContentItemId();
    const targetPlatforms = options.platforms || getEnabledPlatforms();

    logger.info('Starting content orchestration', { runId, topic, contentItemId, dryRun: options.dryRun });

    // 1. Generate and QA master content
    const { content, quality } = await this.contentGenerator.generateAndQualityCheck(
      topic, angle, pillarId, sourceUrl
    );

    // 2. Store content item
    if (!options.dryRun) {
      await this.postRepo.createContentItem({
        id: contentItemId,
        topicId: undefined,
        masterContent: content,
        contentType: pillarId,
        qualityScore: quality.score,
        contentStatus: 'quality_approved',
        mediaPrompt: content.imagePrompt,
      });
    }

    // 3. Generate platform variants
    const platformContents = await this.contentGenerator.adaptForAllPlatforms(content, targetPlatforms);

    // 4. Generate media (image) — non-blocking
    const imageResult = await this.mediaManager.generateAndUploadImage(
      content.imagePrompt,
      'instagram', // Instagram-first sizing
      options.dryRun ?? false
    );

    // Attach media URLs to platforms that support images
    const mediaPlatforms: Platform[] = ['x', 'facebook', 'instagram', 'linkedin'];
    for (const p of mediaPlatforms) {
      const pc = platformContents.get(p);
      if (pc && imageResult.url) {
        pc.mediaUrls = [imageResult.url];
      }
    }

    // 5. Create independent platform jobs and publish
    const topicHash = generateTopicHash(topic, angle);
    const platformResults: PlatformJobResult[] = [];

    for (const platform of targetPlatforms) {
      const platformContent = platformContents.get(platform);
      if (!platformContent) {
        logger.warn(`No adapted content for ${platform}, skipping`);
        platformResults.push({ platform, success: false, error: 'Adaptation failed', retryable: false, retries: 0 });
        continue;
      }

      const postId = generatePostId(platform);
      const idempotencyKey = generateIdempotencyKey(runId, platform, topicHash);

      // Create platform post record
      if (!options.dryRun) {
        try {
          await this.postRepo.createPlatformPost({
            id: postId,
            contentItemId,
            platform,
            platformContent,
            status: 'publishing',
            idempotencyKey,
          });
        } catch (err) {
          logger.warn(`Failed to create post record for ${platform}`, { error: String(err) });
        }
      }

      // Publish independently — one platform failure does not block others
      const result = await this.retryManager.publishWithRetry(
        platform,
        platformContent,
        postId,
        idempotencyKey,
        { dryRun: options.dryRun }
      );

      platformResults.push(result);
      logger.info(`Platform ${platform}: ${result.success ? 'SUCCESS' : 'FAILED'}`, {
        postId: result.platformPostId,
        retries: result.retries,
      });
    }

    // 6. Save to content memory for future deduplication
    if (!options.dryRun) {
      try {
        await this.historyRepo.saveContentMemory({
          id: `mem_${contentItemId}`,
          contentItemId,
          topic: content.topic,
          angle: content.contentAngle,
          pillar: pillarId,
          summary: content.mainTakeaway,
          normalizedContent: `${content.topic} ${content.contentAngle} ${content.hook}`.toLowerCase(),
        });
      } catch (err) {
        logger.warn('Failed to save content memory', { error: String(err) });
      }
    }

    const successCount = platformResults.filter((r) => r.success).length;
    const failureCount = platformResults.filter((r) => !r.success).length;
    const durationMs = Date.now() - startTime;

    logger.info('Orchestration complete', {
      runId,
      topic,
      successCount,
      failureCount,
      durationMs,
    });

    return {
      runId,
      contentItemId,
      topic,
      qualityScore: quality.score,
      platformResults,
      successCount,
      failureCount,
      durationMs,
    };
  }
}
