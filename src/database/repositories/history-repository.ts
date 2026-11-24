import { getDatabaseClient } from '../client.js';
import { ExecutionStatus, PublishingRunRecord } from '../../core/types/index.js';

export class HistoryRepository {
  private db = getDatabaseClient();

  async createPublishingRun(record: PublishingRunRecord): Promise<any> {
    const { data, error } = await this.db.from('publishing_runs').insert({
      id: record.id,
      run_date: record.runDate,
      execution_status: record.executionStatus,
      started_at: record.startedAt.toISOString(),
      posts_requested: record.postsRequested,
      posts_generated: record.postsGenerated,
      posts_published: record.postsPublished,
      errors: record.errors,
      metadata: record.metadata || {},
    });
    if (error) throw new Error(`Failed to create publishing run: ${JSON.stringify(error)}`);
    return data;
  }

  async updatePublishingRun(
    id: string,
    updates: {
      executionStatus?: ExecutionStatus;
      completedAt?: Date;
      postsGenerated?: number;
      postsPublished?: number;
      errors?: string[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const updateObj: Record<string, any> = {};
    if (updates.executionStatus) updateObj.execution_status = updates.executionStatus;
    if (updates.completedAt) updateObj.completed_at = updates.completedAt.toISOString();
    if (updates.postsGenerated !== undefined) updateObj.posts_generated = updates.postsGenerated;
    if (updates.postsPublished !== undefined) updateObj.posts_published = updates.postsPublished;
    if (updates.errors) updateObj.errors = updates.errors;
    if (updates.metadata) updateObj.metadata = updates.metadata;

    await this.db.from('publishing_runs').update(updateObj).match({ id });
  }

  async saveContentMemory(memory: {
    id: string;
    contentItemId: string;
    topic: string;
    angle: string;
    pillar: string;
    summary: string;
    normalizedContent: string;
  }): Promise<void> {
    await this.db.from('content_memory').insert({
      id: memory.id,
      content_item_id: memory.contentItemId,
      topic: memory.topic,
      angle: memory.angle,
      pillar: memory.pillar,
      summary: memory.summary,
      normalized_content: memory.normalizedContent,
      created_at: new Date().toISOString(),
    });
  }

  async getRecentMemory(limit = 30): Promise<any[]> {
    const { data } = await this.db
      .from('content_memory')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  }
}
