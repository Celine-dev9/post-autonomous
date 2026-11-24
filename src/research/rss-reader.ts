import Parser from 'rss-parser';
import crypto from 'crypto';
import { ResearchItem } from '../core/types/index.js';
import { RSSSourceConfig } from './source-registry.js';
import { getEnv } from '../config/env.js';
import { logger } from '../core/logger/index.js';

export class RSSReader {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'AutoMedia-Publisher-ResearchBot/1.0',
      },
    });
  }

  public generateTopicHash(title: string, url: string): string {
    const normalized = `${title.toLowerCase().trim()}|${url.toLowerCase().trim()}`;
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32);
  }

  async fetchSource(source: RSSSourceConfig): Promise<ResearchItem[]> {
    const env = getEnv();
    const cutoffDate = new Date(Date.now() - env.MAX_ARTICLE_AGE_DAYS * 24 * 60 * 60 * 1000);
    const items: ResearchItem[] = [];

    try {
      const feed = await this.parser.parseURL(source.url);

      for (const entry of feed.items || []) {
        if (!entry.title || !entry.link) continue;

        const pubDate = entry.pubDate ? new Date(entry.pubDate) : new Date();
        // Skip stale articles
        if (pubDate < cutoffDate) continue;

        const topicHash = this.generateTopicHash(entry.title, entry.link);
        const summary = (entry.contentSnippet || entry.summary || entry.content || '').slice(0, 500);

        items.push({
          id: `rss_${topicHash}`,
          sourceName: source.name,
          sourceUrl: entry.link,
          sourceType: 'rss',
          articleTitle: entry.title.trim(),
          articleSummary: summary.trim(),
          publishedAt: pubDate,
          retrievedAt: new Date(),
          category: source.category,
          keywords: entry.categories || [source.category],
          topicHash,
        });
      }
    } catch (err) {
      logger.warn(`Failed to fetch RSS feed from ${source.name} (${source.url})`, {
        error: String(err),
      });
    }

    return items;
  }

  async fetchAllSources(sources: RSSSourceConfig[]): Promise<ResearchItem[]> {
    const allItems: ResearchItem[] = [];
    const seenHashes = new Set<string>();

    const results = await Promise.all(sources.map((s) => this.fetchSource(s)));
    for (const items of results) {
      for (const item of items) {
        if (!seenHashes.has(item.topicHash)) {
          seenHashes.add(item.topicHash);
          allItems.push(item);
        }
      }
    }

    return allItems;
  }
}
