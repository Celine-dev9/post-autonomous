import { JobLock } from '../scheduler/job-lock.js';
import { HistoryRepository } from '../database/repositories/history-repository.js';
import { TopicRepository } from '../database/repositories/topic-repository.js';
import { ResearchEngine } from '../research/research-engine.js';
import { ContentGenerator } from '../content/content-generator.js';
import { PublishingOrchestrator } from '../publishing/publishing-orchestrator.js';
import { DuplicateDetector } from '../content/duplicate-detector.js';
import { PillarSelector } from '../strategy/pillar-selector.js';
import { generateRunId } from '../publishing/idempotency.js';
import { getPublishingConfig } from '../config/settings.js';
import { Platform, PublishingRunRecord, TopicCandidate, ExecutionStatus } from '../core/types/index.js';
import { logger } from '../core/logger/index.js';
import { alertOnFailure } from '../monitoring/alerting.js';

export interface DailyRunOptions {
  dryRun?: boolean;
  platforms?: Platform[];
  topicOverride?: string;
  postsCount?: number;
  forceFreshResearch?: boolean;
}

export class DailyRunner {
  private historyRepo = new HistoryRepository();
  private topicRepo = new TopicRepository();
  private researchEngine = new ResearchEngine();
  private orchestrator = new PublishingOrchestrator();
  private duplicateDetector = new DuplicateDetector();
  private pillarSelector = new PillarSelector();

  async run(options: DailyRunOptions = {}): Promise<void> {
    const config = getPublishingConfig();
    const runId = generateRunId();
    const postsCount = options.postsCount || config.scheduler.postsPerDay;
    const runDate = new Date().toISOString().slice(0, 10);

    logger.info('=== DAILY PUBLISHING RUN STARTED ===', {
      runId,
      runDate,
      postsCount,
      dryRun: options.dryRun,
    });

    // 1. Acquire distributed lock
    const lock = new JobLock('daily_publishing_lock', runId);
    try {
      await lock.acquire();
    } catch (err) {
      logger.warn('Could not acquire scheduling lock — another run may be in progress', {
        error: String(err),
      });
      return;
    }

    // 2. Create publishing run record
    const runRecord: PublishingRunRecord = {
      id: runId,
      runDate,
      executionStatus: 'running' as ExecutionStatus,
      startedAt: new Date(),
      postsRequested: postsCount,
      postsGenerated: 0,
      postsPublished: 0,
      errors: [],
    };

    if (!options.dryRun) {
      await this.historyRepo.createPublishingRun(runRecord);
    }

    const errors: string[] = [];
    let postsPublished = 0;
    let postsGenerated = 0;

    try {
      // 3. Research topics
      const topicCount = postsCount + 2; // request extras for filtering
      logger.info('Discovering topics via research engine...', { target: topicCount });

      let candidates: TopicCandidate[] = [];
      if (options.topicOverride) {
        // Manual topic override
        candidates = [{
          id: `override_${runId}`,
          topic: options.topicOverride,
          angle: 'Editorial selection',
          pillarId: 'educational-tips',
          freshnessScore: 100,
          relevanceScore: 100,
          topicScore: 100,
          reasoning: 'Manually specified topic override',
          status: 'candidate',
        }];
      } else {
        candidates = await this.researchEngine.discoverTopics(topicCount);
      }

      logger.info(`Research completed: ${candidates.length} topic candidates found`);

      // 4. Select diverse topics (one per batch)
      const selectedTopics: TopicCandidate[] = [];
      const usedPillarIds: string[] = [];

      for (const candidate of candidates) {
        if (selectedTopics.length >= postsCount) break;

        // Filter near-duplicates vs history
        const tooSimilar = await this.duplicateDetector.isTooSimilarToHistory(candidate);
        if (tooSimilar) {
          logger.info(`Skipping candidate (too similar to history): ${candidate.topic}`);
          continue;
        }

        // Filter near-duplicates vs current batch
        if (this.duplicateDetector.isTooSimilarToCurrentBatch(candidate, selectedTopics)) {
          logger.info(`Skipping candidate (too similar to current batch): ${candidate.topic}`);
          continue;
        }

        // Try to use different pillars for each batch post
        if (selectedTopics.length > 0 && usedPillarIds.includes(candidate.pillarId)) {
          // Allow pillar repeat only if we have no other choice
          const remainingCandidates = candidates.slice(candidates.indexOf(candidate) + 1);
          const hasDifferentPillar = remainingCandidates.some(
            (c) => !usedPillarIds.includes(c.pillarId)
          );
          if (hasDifferentPillar) continue;
        }

        selectedTopics.push(candidate);
        usedPillarIds.push(candidate.pillarId);
      }

      if (selectedTopics.length === 0) {
        const errorMsg = 'No suitable topics found after deduplication filtering';
        logger.error(errorMsg);
        errors.push(errorMsg);
        await alertOnFailure(runId, errorMsg);
      }

      logger.info(`Selected ${selectedTopics.length} topics for publishing`);

      // 5. Generate and publish each topic batch
      for (const topic of selectedTopics) {
        try {
          logger.info(`Processing topic: "${topic.topic}"`, { pillar: topic.pillarId });

          const result = await this.orchestrator.orchestrate(
            runId,
            topic.topic,
            topic.angle,
            topic.pillarId,
            topic.sourceUrl,
            { dryRun: options.dryRun, platforms: options.platforms }
          );

          postsGenerated++;
          postsPublished += result.successCount;

          // Mark topic as used in memory
          if (!options.dryRun) {
            await this.topicRepo.markTopicAsUsed(topic.id);
          }

          // Log platform results
          for (const pr of result.platformResults) {
            if (!pr.success && pr.error) {
              errors.push(`${pr.platform}: ${pr.error}`);
            }
          }

        } catch (err) {
          const errorMsg = `Failed to process topic "${topic.topic}": ${String(err)}`;
          logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

    } catch (err) {
      const errorMsg = `Fatal pipeline error: ${String(err)}`;
      logger.error(errorMsg);
      errors.push(errorMsg);
      await alertOnFailure(runId, errorMsg);
    } finally {
      // 6. Update run record
      const finalStatus: ExecutionStatus =
        postsPublished === 0 && postsGenerated > 0 ? 'failed'
          : postsPublished < postsGenerated ? 'partial_failure'
            : 'completed';

      if (!options.dryRun) {
        await this.historyRepo.updatePublishingRun(runId, {
          executionStatus: finalStatus,
          completedAt: new Date(),
          postsGenerated,
          postsPublished,
          errors,
        });
      }

      // 7. Release lock
      await lock.release();
    }

    // 8. Print run summary
    this.printRunSummary(runId, postsGenerated, postsPublished, errors);
  }

  private printRunSummary(
    runId: string,
    postsGenerated: number,
    postsPublished: number,
    errors: string[]
  ): void {
    console.log('\n==================================================');
    console.log('               PUBLISHING RUN SUMMARY            ');
    console.log('==================================================');
    console.log(`Run ID:           ${runId}`);
    console.log(`Posts Generated:  ${postsGenerated}`);
    console.log(`Posts Published:  ${postsPublished}`);
    console.log(`Errors:           ${errors.length}`);
    if (errors.length > 0) {
      errors.forEach((e) => console.log(`  - ${e}`));
    }
    console.log('==================================================\n');
  }
}
