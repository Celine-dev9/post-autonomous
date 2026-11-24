import fs from 'fs';
import path from 'path';
import { getEnv } from '../config/env.js';
import { logger } from '../core/logger/index.js';

export interface RSSSourceConfig {
  id: string;
  name: string;
  url: string;
  category: string;
  enabled: boolean;
  weight: number;
}

export class SourceRegistry {
  private sources: RSSSourceConfig[] = [];

  constructor() {
    this.loadSources();
  }

  public loadSources(): RSSSourceConfig[] {
    const env = getEnv();
    const configPath = path.resolve(process.cwd(), env.RSS_SOURCES_PATH);

    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw) as RSSSourceConfig[];
        this.sources = parsed.filter((s) => s.enabled);
        logger.info(`Loaded ${this.sources.length} active RSS sources from ${configPath}`);
        return this.sources;
      } catch (err) {
        logger.warn('Failed to parse RSS sources config file, using built-in defaults', {
          error: String(err),
        });
      }
    }

    // Default fallback sources
    this.sources = [
      {
        id: 'techcrunch',
        name: 'TechCrunch',
        url: 'https://techcrunch.com/feed/',
        category: 'technology',
        enabled: true,
        weight: 1.0,
      },
      {
        id: 'hacker-news',
        name: 'Hacker News Frontpage',
        url: 'https://news.ycombinator.com/rss',
        category: 'software-development',
        enabled: true,
        weight: 1.1,
      },
      {
        id: 'venturebeat-ai',
        name: 'VentureBeat AI',
        url: 'https://venturebeat.com/category/ai/feed/',
        category: 'ai',
        enabled: true,
        weight: 1.3,
      },
    ];
    return this.sources;
  }

  public getActiveSources(): RSSSourceConfig[] {
    return this.sources;
  }
}
