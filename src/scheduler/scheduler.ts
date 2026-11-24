import { DailyRunner } from './daily-runner.js';
import { getPublishingConfig } from '../config/settings.js';
import { getEnv } from '../config/env.js';
import { logger } from '../core/logger/index.js';

export class AutonomousScheduler {
  private runner = new DailyRunner();
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastExecutedDate: string | null = null;
  private nextRunTimes: Date[] = [];

  constructor() {
    this.recalculateNextRunTimes();
  }

  /**
   * Recalculates the daily scheduled run times based on postsPerDay and configured times.
   * Incorporates configured randomization window.
   */
  public recalculateNextRunTimes(): Date[] {
    const config = getPublishingConfig();
    const env = getEnv();
    const times: Date[] = [];
    const today = new Date();

    const postTimes = (config.scheduler.times && config.scheduler.times.length > 0)
      ? config.scheduler.times.slice(0, config.scheduler.postsPerDay)
      : ['10:00', '17:00'].slice(0, config.scheduler.postsPerDay);

    for (const timeStr of postTimes) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const scheduled = new Date(today);
      scheduled.setHours(hours, minutes, 0, 0);

      // Add jitter / randomization if enabled
      if (config.scheduler.randomizeTime) {
        const windowMinutes = config.scheduler.randomWindowMinutes;
        const randomDelta = (Math.random() * 2 - 1) * windowMinutes;
        scheduled.setMinutes(scheduled.getMinutes() + Math.round(randomDelta));
      }

      times.push(scheduled);
    }

    this.nextRunTimes = times.sort((a, b) => a.getTime() - b.getTime());
    return this.nextRunTimes;
  }

  public getNextRunTimes(): Date[] {
    return this.nextRunTimes;
  }

  /**
   * Starts the background scheduler polling loop (runs every 60 seconds).
   */
  public start(pollIntervalMs = 60000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('Starting Autonomous Scheduler daemon', {
      timezone: getEnv().TIMEZONE,
      postsPerDay: getPublishingConfig().scheduler.postsPerDay,
      nextScheduledRuns: this.nextRunTimes.map((d) => d.toISOString()),
    });

    this.intervalHandle = setInterval(async () => {
      await this.checkAndTrigger();
    }, pollIntervalMs);
  }

  public stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.isRunning = false;
    logger.info('Autonomous Scheduler daemon stopped');
  }

  /**
   * Evaluates current time against scheduled slots.
   */
  public async checkAndTrigger(): Promise<boolean> {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const scheduled of this.nextRunTimes) {
      const scheduledMinutes = scheduled.getHours() * 60 + scheduled.getMinutes();
      // Match within 2 minute window if not already run
      if (Math.abs(currentMinutes - scheduledMinutes) <= 1) {
        const dateKey = `${now.toISOString().slice(0, 10)}_${scheduled.getHours()}`;
        if (this.lastExecutedDate !== dateKey) {
          this.lastExecutedDate = dateKey;
          logger.info(`Scheduled trigger matched: running daily publishing batch for slot ${scheduled.toLocaleTimeString()}`);
          try {
            await this.runner.run();
            return true;
          } catch (err) {
            logger.error('Error during scheduled publishing batch execution', { error: String(err) });
          }
        }
      }
    }

    // Refresh slots at midnight
    if (now.getHours() === 0 && now.getMinutes() === 1) {
      this.recalculateNextRunTimes();
    }

    return false;
  }
}
