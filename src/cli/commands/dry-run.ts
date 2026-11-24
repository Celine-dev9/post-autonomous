import { DailyRunner } from '../../scheduler/daily-runner.js';
import { logger } from '../../core/logger/index.js';

export async function dryRunCommand(): Promise<void> {
  console.log('\n======================================================');
  console.log('       AUTONOMOUS PUBLISHER — DRY RUN EXECUTION       ');
  console.log('======================================================\n');
  console.log('Mode: DRY-RUN (Zero external posts will be broadcast)\n');

  const runner = new DailyRunner();
  await runner.run({ dryRun: true });

  console.log('\nDry run completed successfully. All stages passed validation.\n');
}
