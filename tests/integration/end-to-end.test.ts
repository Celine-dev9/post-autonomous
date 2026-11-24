import { describe, it, expect } from 'vitest';
import { DailyRunner } from '../../src/scheduler/daily-runner.js';
import { Application } from '../../src/app.js';

describe('Phase 11: End-to-End Pipeline Dry Run', () => {
  it('should execute end-to-end autonomous publishing dry-run without errors', async () => {
    const runner = new DailyRunner();
    // Execute a full run in dry-run mode (exercises RSS/AI research, pillar selection, QA, media, adapters)
    await expect(runner.run({ dryRun: true, postsCount: 1 })).resolves.not.toThrow();
  });

  it('should initialize Application and execute single batch cycle cleanly', async () => {
    const app = new Application();
    await expect(app.initialize()).resolves.not.toThrow();
    await expect(app.runDailyBatch({ dryRun: true, postsCount: 1 })).resolves.not.toThrow();
  }, 60000);
});
