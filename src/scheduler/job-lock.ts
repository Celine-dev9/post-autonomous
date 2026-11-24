import { getDatabaseClient } from '../database/client.js';
import { LockAcquisitionError } from '../core/errors/index.js';
import { logger } from '../core/logger/index.js';

export class JobLock {
  private lockName: string;
  private executionId: string;
  private ttlMinutes: number;
  private db = getDatabaseClient();

  constructor(lockName = 'daily_publishing_lock', executionId = `exec_${Date.now()}`, ttlMinutes = 30) {
    this.lockName = lockName;
    this.executionId = executionId;
    this.ttlMinutes = ttlMinutes;
  }

  public getExecutionId(): string {
    return this.executionId;
  }

  async acquire(): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlMinutes * 60 * 1000);

    // Check existing lock
    const { data: existing } = await this.db
      .from('scheduler_locks')
      .select('*')
      .eq('lock_name', this.lockName)
      .single();

    if (existing) {
      const lockedUntil = new Date(existing.locked_until);
      if (lockedUntil > now) {
        logger.warn('Lock is currently held by another execution', {
          lockName: this.lockName,
          executionId: existing.execution_id,
          lockedUntil: existing.locked_until,
        });
        throw new LockAcquisitionError(
          `Scheduler lock '${this.lockName}' is currently held by run ${existing.execution_id} until ${existing.locked_until}`
        );
      }
      // Expired lock: remove stale lock
      await this.db.from('scheduler_locks').delete().eq('lock_name', this.lockName);
    }

    // Insert new lock
    await this.db.from('scheduler_locks').insert({
      id: `lock_${this.lockName}`,
      lock_name: this.lockName,
      locked_until: expiresAt.toISOString(),
      execution_id: this.executionId,
      acquired_at: now.toISOString(),
    });

    logger.info('Scheduler lock successfully acquired', {
      lockName: this.lockName,
      executionId: this.executionId,
      expiresAt: expiresAt.toISOString(),
    });
    return true;
  }

  async release(): Promise<void> {
    try {
      await this.db.from('scheduler_locks').delete().eq('lock_name', this.lockName);
      logger.info('Scheduler lock released', { lockName: this.lockName, executionId: this.executionId });
    } catch (err) {
      logger.warn('Failed to cleanly release scheduler lock', { error: String(err) });
    }
  }

  static async forceUnlock(lockName = 'daily_publishing_lock'): Promise<void> {
    const db = getDatabaseClient();
    await db.from('scheduler_locks').delete().eq('lock_name', lockName);
    logger.info('Force released scheduler lock', { lockName });
  }
}
