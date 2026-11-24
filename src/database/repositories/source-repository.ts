import { getDatabaseClient } from '../client.js';
import { ResearchItem } from '../../core/types/index.js';

export class SourceRepository {
  private db = getDatabaseClient();

  async saveResearchItem(item: ResearchItem): Promise<void> {
    await this.db.from('research_sources').insert({
      id: item.id,
      source_name: item.sourceName,
      source_url: item.sourceUrl,
      source_type: item.sourceType,
      article_title: item.articleTitle,
      article_summary: item.articleSummary || '',
      published_at: item.publishedAt.toISOString(),
      retrieved_at: item.retrievedAt.toISOString(),
      topic_hash: item.topicHash,
    });
  }

  async isTopicHashSeen(hash: string): Promise<boolean> {
    const { data } = await this.db.from('research_sources').select('id').eq('topic_hash', hash).single();
    return Boolean(data);
  }

  async getRecentSources(limit = 50): Promise<any[]> {
    const { data } = await this.db
      .from('research_sources')
      .select('*')
      .order('retrieved_at', { ascending: false })
      .limit(limit);
    return data || [];
  }
}
