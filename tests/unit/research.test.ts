import { describe, it, expect } from 'vitest';
import { SourceRegistry } from '../../src/research/source-registry.js';
import { RSSReader } from '../../src/research/rss-reader.js';
import { TopicDiscovery } from '../../src/research/topic-discovery.js';
import { ResearchEngine } from '../../src/research/research-engine.js';
import { ResearchItem } from '../../src/core/types/index.js';

describe('Phase 4: Autonomous Research', () => {
  it('should load active RSS sources from registry', () => {
    const registry = new SourceRegistry();
    const sources = registry.getActiveSources();
    expect(sources.length).toBeGreaterThan(0);
    expect(sources[0].url).toContain('http');
  });

  it('should generate consistent deterministic topic hashes in RSSReader', () => {
    const reader = new RSSReader();
    const hash1 = reader.generateTopicHash('New AI Agent Release', 'https://example.com/ai');
    const hash2 = reader.generateTopicHash('New AI Agent Release', 'https://example.com/ai');
    const hash3 = reader.generateTopicHash('Different Title', 'https://example.com/ai');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(32);
  });

  it('should score and filter raw research items in TopicDiscovery', async () => {
    const discovery = new TopicDiscovery();
    const sampleItems: ResearchItem[] = [
      {
        id: 'rss_test_1',
        sourceName: 'Tech Source',
        sourceUrl: 'https://example.com/1',
        sourceType: 'rss',
        articleTitle: 'Breakthrough in Distributed AI Agent Architecture',
        articleSummary: 'A new approach to scaling agent workloads across clusters.',
        publishedAt: new Date(),
        retrievedAt: new Date(),
        category: 'ai',
        keywords: ['ai', 'agent', 'architecture'],
        topicHash: 'hash_test_1',
      },
      {
        id: 'rss_test_2',
        sourceName: 'Tech Source',
        sourceUrl: 'https://example.com/2',
        sourceType: 'rss',
        articleTitle: 'General Tech Update With Few Details',
        articleSummary: 'A general overview.',
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day old
        retrievedAt: new Date(),
        category: 'general',
        keywords: ['tech'],
        topicHash: 'hash_test_2',
      },
    ];

    const scored = await discovery.filterAndScoreItems(sampleItems);
    expect(scored.length).toBe(2);
    // The breakthrough agent architecture item should have higher relevance and overall score
    expect(scored[0].topic).toContain('Breakthrough in Distributed AI Agent Architecture');
    expect(scored[0].topicScore).toBeGreaterThanOrEqual(scored[1].topicScore);
    expect(scored[0].pillarId).toBe('industry-news');
  });

  it('should discover topics autonomously via ResearchEngine with fallback', async () => {
    const engine = new ResearchEngine();
    const topics = await engine.discoverTopics(2);

    expect(topics.length).toBe(2);
    expect(topics[0].topic).toBeDefined();
    expect(topics[0].angle).toBeDefined();
    expect(topics[0].topicScore).toBeGreaterThan(0);
  });
});
