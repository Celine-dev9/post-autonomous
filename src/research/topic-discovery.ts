import { ResearchItem, TopicCandidate } from '../core/types/index.js';
import { SourceRepository } from '../database/repositories/source-repository.js';
import { TopicRepository } from '../database/repositories/topic-repository.js';
import { getContentPillars } from '../config/settings.js';
import { calculateTextSimilarity } from '../knowledge/embeddings.js';

export class TopicDiscovery {
  private sourceRepo = new SourceRepository();
  private topicRepo = new TopicRepository();

  async filterAndScoreItems(rawItems: ResearchItem[]): Promise<TopicCandidate[]> {
    const pillars = getContentPillars();
    const recentUsedTopics = await this.topicRepo.getRecentTopics(30);
    const candidates: TopicCandidate[] = [];

    for (const item of rawItems) {
      // 1. Check if hash was already used
      const alreadySeen = await this.sourceRepo.isTopicHashSeen(item.topicHash);
      if (alreadySeen) continue;

      // 2. Check title similarity with recent published topics (deduplication)
      const hasRecentDuplicate = recentUsedTopics.some(
        (t) => calculateTextSimilarity(item.articleTitle, t.topic) > 0.7
      );
      if (hasRecentDuplicate) continue;

      // 3. Score freshness: 100 for today, decaying to 50 at 3 days
      const ageHours = (Date.now() - item.publishedAt.getTime()) / (1000 * 60 * 60);
      const freshnessScore = Math.max(50, Math.min(100, Math.round(100 - ageHours)));

      // 4. Match best pillar
      const titleLower = item.articleTitle.toLowerCase();
      let matchedPillar = pillars[0].id;
      if (titleLower.includes('breakthrough') || titleLower.includes('release') || titleLower.includes('announces')) {
        matchedPillar = 'industry-news';
      } else if (titleLower.includes('tutorial') || titleLower.includes('how to') || titleLower.includes('guide')) {
        matchedPillar = 'practical-tutorials';
      } else if (titleLower.includes('postmortem') || titleLower.includes('scale') || titleLower.includes('outage')) {
        matchedPillar = 'case-studies';
      } else if (titleLower.includes('opinion') || titleLower.includes('future') || titleLower.includes('why')) {
        matchedPillar = 'thought-leadership';
      }

      // 5. Score technical relevance
      let relevanceScore = 70;
      const techKeywords = ['ai', 'agent', 'architecture', 'model', 'cloud', 'database', 'llm', 'system', 'api', 'code'];
      const hitCount = techKeywords.filter((k) => titleLower.includes(k)).length;
      relevanceScore = Math.min(100, relevanceScore + hitCount * 6);

      const topicScore = Math.round(freshnessScore * 0.4 + relevanceScore * 0.6);

      candidates.push({
        id: `cand_${item.topicHash}`,
        topic: item.articleTitle,
        angle: `Engineering implications of ${item.articleTitle}: architectural trade-offs and production lessons.`,
        pillarId: matchedPillar,
        sourceUrl: item.sourceUrl,
        freshnessScore,
        relevanceScore,
        topicScore,
        reasoning: `Matched ${matchedPillar} with ${hitCount} key tech signals and freshness of ${freshnessScore}%.`,
        status: 'candidate',
      });
    }

    // Sort by overall topic score descending
    candidates.sort((a, b) => b.topicScore - a.topicScore);
    return candidates;
  }
}
