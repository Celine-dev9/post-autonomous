import { describe, it, expect, beforeEach } from 'vitest';
import { PublishingOrchestrator } from '../../src/publishing/publishing-orchestrator.js';
import { RetryManager } from '../../src/publishing/retry-manager.js';
import { generateRunId, generateIdempotencyKey } from '../../src/publishing/idempotency.js';

describe('Phase 8: Publishing Orchestrator & Retries', () => {
  let orchestrator: PublishingOrchestrator;
  let retryManager: RetryManager;

  beforeEach(() => {
    orchestrator = new PublishingOrchestrator();
    retryManager = new RetryManager();
  });

  it('should generate unique, deterministic idempotency keys and run IDs', () => {
    const runId1 = generateRunId();
    const runId2 = generateRunId();
    expect(runId1).not.toBe(runId2);

    const key1 = generateIdempotencyKey('run_1', 'x', 'hash_abc');
    const key2 = generateIdempotencyKey('run_1', 'x', 'hash_abc');
    const keyDiffPlatform = generateIdempotencyKey('run_1', 'linkedin', 'hash_abc');

    expect(key1).toBe(key2);
    expect(key1).not.toBe(keyDiffPlatform);
  });

  it('should orchestrate dry-run across all enabled platforms independently', async () => {
    const runId = generateRunId();
    const result = await orchestrator.orchestrate(
      runId,
      'Circuit Breakers in High-Throughput Microservices',
      'Implementing sliding window error thresholds in Node.js',
      'educational-tips',
      undefined,
      { dryRun: true }
    );

    expect(result.runId).toBe(runId);
    expect(result.qualityScore).toBeGreaterThanOrEqual(80);
    expect(result.platformResults.length).toBeGreaterThanOrEqual(4);
    expect(result.successCount).toBeGreaterThanOrEqual(4);
  });
});
