import { TopicCandidate } from '../core/types/index.js';
import { SourceRegistry } from './source-registry.js';
import { RSSReader } from './rss-reader.js';
import { TopicDiscovery } from './topic-discovery.js';
import { SourceRepository } from '../database/repositories/source-repository.js';
import { TopicRepository } from '../database/repositories/topic-repository.js';
import { getAIProvider } from '../ai/ai-factory.js';
import { buildTopicIdeationPrompt, TopicListSchema } from '../ai/prompts/topic-prompt.js';
import { getContentPillars } from '../config/settings.js';
import { loadBrandKnowledge } from '../config/brand.js';
import { getEnv } from '../config/env.js';
import { logger } from '../core/logger/index.js';

export class ResearchEngine {
  private sourceRegistry = new SourceRegistry();
  private rssReader = new RSSReader();
  private topicDiscovery = new TopicDiscovery();
  private sourceRepo = new SourceRepository();
  private topicRepo = new TopicRepository();

  async discoverTopics(targetCount = 3): Promise<TopicCandidate[]> {
    const env = getEnv();
    const discoveredCandidates: TopicCandidate[] = [];

    // --- SOURCE A: RSS Feeds ---
    if (env.RSS_ENABLED) {
      try {
        const sources = this.sourceRegistry.getActiveSources();
        logger.info(`Fetching articles from ${sources.length} configured RSS sources`);

        const rawArticles = await this.rssReader.fetchAllSources(sources);
        logger.info(`Retrieved ${rawArticles.length} raw articles from RSS feeds`);

        const scored = await this.topicDiscovery.filterAndScoreItems(rawArticles);
        discoveredCandidates.push(...scored);
        logger.info(`Derived ${scored.length} qualified candidate topics from RSS`);

        // Record sources in repository after discovery
        for (const item of rawArticles) {
          try {
            await this.sourceRepo.saveResearchItem(item);
          } catch {
            // Ignore duplicate insert errors
          }
        }
      } catch (err) {
        logger.warn('RSS discovery encountered an error, falling back to autonomous AI ideation', {
          error: String(err),
        });
      }
    }

    // --- SOURCE B: Autonomous AI Evergreen Ideation (Always supplement to target count) ---
    if (discoveredCandidates.length < targetCount) {
      const neededCount = Math.max(targetCount - discoveredCandidates.length, 1);
      logger.info(`Supplementing research with ${neededCount} autonomous AI evergreen topics`);

      const ai = getAIProvider();
      const pillars = getContentPillars();
      const brandKnowledge = loadBrandKnowledge();
      const recentUsedTopics = await this.topicRepo.getRecentTopics(30);
      const recentTitles = recentUsedTopics.map((t) => t.topic);

      // Select target pillar
      const targetPillar = pillars[Math.floor(Math.random() * pillars.length)];
      const prompt = buildTopicIdeationPrompt(targetPillar, brandKnowledge, recentTitles, neededCount);

      try {
        const response = await ai.generateStructured(prompt, TopicListSchema, {
          temperature: 0.8,
        });

        for (const item of response.topics) {
          const candidate: TopicCandidate = {
            id: `ai_top_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            topic: item.topic,
            angle: item.angle,
            pillarId: item.pillarId || targetPillar.id,
            freshnessScore: item.freshnessScore || 95,
            relevanceScore: item.relevanceScore || 90,
            topicScore: Math.round(((item.freshnessScore || 95) + (item.relevanceScore || 90)) / 2),
            reasoning: item.reasoning,
            status: 'candidate',
          };
          discoveredCandidates.push(candidate);
        }
      } catch (err) {
        logger.warn('AI evergreen topic generation failed, using built-in high-signal fallback', {
          error: String(err),
        });
        // Deterministic high-signal fallback
        discoveredCandidates.push({
          id: `fallback_${Date.now()}`,
          topic: 'Event Sourcing and Idempotency in Autonomous AI Agents',
          angle: 'Designing deterministic replay logs for distributed agent steps',
          pillarId: 'educational-tips',
          freshnessScore: 90,
          relevanceScore: 95,
          topicScore: 93,
          reasoning: 'Critical architectural topic with evergreen engineering relevance.',
          status: 'candidate',
        });
      }
    }

    // Save candidates to TopicRepository
    for (const cand of discoveredCandidates) {
      try {
        await this.topicRepo.saveTopicCandidate(cand);
      } catch {
        // Safe to ignore if already saved
      }
    }

    // Return the top candidates up to targetCount
    return discoveredCandidates.slice(0, targetCount);
  }
}
