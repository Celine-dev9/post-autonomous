import { JobLock } from '../../scheduler/job-lock.js';
import { logger } from '../../core/logger/index.js';

export async function unlockCommand(): Promise<void> {
  console.log('\n======================================================');
  console.log('       FORCE UNLOCKING SCHEDULER JOB LOCK             ');
  console.log('======================================================\n');

  try {
    await JobLock.forceUnlock('daily_publishing_lock');
    console.log('Successfully released scheduler lock: "daily_publishing_lock"');
  } catch (err) {
    console.error('Failed to release lock:', err);
    process.exit(1);
  }

  console.log('\n======================================================\n');
}
