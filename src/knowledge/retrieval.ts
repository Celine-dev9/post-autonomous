import { loadBrandKnowledge, BrandKnowledge } from '../config/brand.js';
import { HistoryRepository } from '../database/repositories/history-repository.js';
import { TopicRepository } from '../database/repositories/topic-repository.js';
import { calculateTextSimilarity } from './embeddings.js';

export interface GenerationContext {
  brandKnowledge: BrandKnowledge;
  recentTopics: string[];
  similarHistoricalAngles: string[];
  relevantPillarGuidelines: string;
}

export class KnowledgeRetriever {
  private historyRepo = new HistoryRepository();
  private topicRepo = new TopicRepository();

  async getContextForTopic(topic: string, pillarId: string): Promise<GenerationContext> {
    const brandKnowledge = loadBrandKnowledge();

    // 1. Fetch recent used topics from repository
    const recentTopicRecords = await this.topicRepo.getRecentTopics(30);
    const recentTopics = recentTopicRecords.map((t) => `${t.topic} (Angle: ${t.angle})`).slice(0, 10);

    // 2. Find similar past angles using text similarity
    const recentMemories = await this.historyRepo.getRecentMemory(30);
    const similarAngles: string[] = [];

    for (const mem of recentMemories) {
      const similarity = calculateTextSimilarity(topic, mem.topic);
      if (similarity > 0.4) {
        similarAngles.push(`Previous topic: "${mem.topic}" | Used angle: "${mem.angle}"`);
      }
    }

    return {
      brandKnowledge,
      recentTopics,
      similarHistoricalAngles: similarAngles.slice(0, 5),
      relevantPillarGuidelines: `Pillar: ${pillarId}`,
    };
  }
}
