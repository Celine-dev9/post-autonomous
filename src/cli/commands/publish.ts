import { DailyRunner } from '../../scheduler/daily-runner.js';
import { Platform } from '../../core/types/index.js';
import { logger } from '../../core/logger/index.js';

export interface PublishCommandOptions {
  dryRun?: boolean;
  platforms?: string[];
}

export async function publishCommand(options: PublishCommandOptions): Promise<void> {
  console.log('\n======================================================');
  console.log('       AUTONOMOUS PUBLISHER — LIVE PUBLISHING CYCLE    ');
  console.log('======================================================\n');

  const runner = new DailyRunner();
  await runner.run({
    dryRun: options.dryRun ?? false,
    platforms: options.platforms as Platform[] | undefined,
  });

  console.log('\nPublishing execution finished.\n');
}
