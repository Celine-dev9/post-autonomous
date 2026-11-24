import { getDatabaseClient } from '../client.js';
import { TopicCandidate } from '../../core/types/index.js';

export class TopicRepository {
  private db = getDatabaseClient();

  async saveTopicCandidate(candidate: TopicCandidate): Promise<any> {
    const { data, error } = await this.db.from('content_topics').insert({
      id: candidate.id,
      topic: candidate.topic,
      angle: candidate.angle,
      pillar: candidate.pillarId,
      source: candidate.sourceUrl || 'original_ai',
      source_url: candidate.sourceUrl || null,
      freshness: candidate.freshnessScore,
      topic_score: candidate.topicScore,
      status: candidate.status,
      created_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Failed to save topic candidate: ${JSON.stringify(error)}`);
    return data;
  }

  async markTopicAsUsed(id: string): Promise<void> {
    await this.db
      .from('content_topics')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
      })
      .match({ id });
  }

  async getRecentTopics(lookbackDays = 30): Promise<Array<{ id: string; topic: string; angle: string; pillar: string; used_at: string }>> {
    const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await this.db
      .from('content_topics')
      .select('*')
      .eq('status', 'used')
      .gte('used_at', cutoff)
      .order('used_at', { ascending: false });

    return data || [];
  }

  async isExactTopicUsed(topic: string, lookbackDays = 30): Promise<boolean> {
    const recent = await this.getRecentTopics(lookbackDays);
    const normalizedInput = topic.toLowerCase().trim();
    return recent.some((t) => t.topic.toLowerCase().trim() === normalizedInput);
  }
}
