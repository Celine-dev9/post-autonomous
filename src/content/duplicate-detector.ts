import { TopicCandidate } from '../core/types/index.js';
import { calculateTextSimilarity } from '../knowledge/embeddings.js';
import { TopicRepository } from '../database/repositories/topic-repository.js';
import { getPublishingConfig } from '../config/settings.js';

export class DuplicateDetector {
  private topicRepo = new TopicRepository();

  async isTooSimilarToHistory(candidate: TopicCandidate): Promise<boolean> {
    const config = getPublishingConfig();
    const threshold = config.deduplication.similarityThreshold;
    const lookbackDays = config.deduplication.lookbackDays;

    const recentTopics = await this.topicRepo.getRecentTopics(lookbackDays);
    for (const hist of recentTopics) {
      const topicSim = calculateTextSimilarity(candidate.topic, hist.topic);
      const angleSim = calculateTextSimilarity(candidate.angle, hist.angle);
      if (topicSim > threshold || angleSim > threshold) {
        return true;
      }
    }
    return false;
  }

  isTooSimilarToCurrentBatch(candidate: TopicCandidate, currentBatch: TopicCandidate[]): boolean {
    const config = getPublishingConfig();
    const threshold = config.deduplication.similarityThreshold;
    for (const existing of currentBatch) {
      const sim = calculateTextSimilarity(candidate.topic, existing.topic);
      if (sim > threshold) return true;
    }
    return false;
  }

  normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  exactDuplicate(a: string, b: string): boolean {
    return this.normalizeText(a) === this.normalizeText(b);
  }
}
