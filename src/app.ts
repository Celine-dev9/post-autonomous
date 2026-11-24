import { AutonomousScheduler } from './scheduler/scheduler.js';
import { DailyRunner, DailyRunOptions } from './scheduler/daily-runner.js';
import { AnalyticsCollector } from './analytics/analytics-collector.js';
import { loadBrandKnowledge } from './config/brand.js';
import { getEnv } from './config/env.js';
import { logger } from './core/logger/index.js';

export class Application {
  private scheduler = new AutonomousScheduler();
  private runner = new DailyRunner();
  private analytics = new AnalyticsCollector();

  async initialize(): Promise<void> {
    const env = getEnv();
    logger.info('Initializing Autonomous Social Media Content & Publishing Engine', {
      nodeEnv: env.NODE_ENV,
      timezone: env.TIMEZONE,
      aiProvider: env.AI_PROVIDER,
      dryRun: env.DRY_RUN,
    });

    // Validate brand knowledge base markdown files
    const brand = loadBrandKnowledge();
    logger.info('Loaded brand knowledge base successfully');
  }

  async runDailyBatch(options: DailyRunOptions = {}): Promise<void> {
    await this.runner.run(options);
  }

  async collectAnalytics(): Promise<void> {
    await this.analytics.collectRecent();
  }

  startDaemon(): void {
    logger.info('Starting Autonomous Publisher in continuous headless daemon mode');
    this.scheduler.start();
  }

  stopDaemon(): void {
    this.scheduler.stop();
  }

  getScheduler(): AutonomousScheduler {
    return this.scheduler;
  }
}
