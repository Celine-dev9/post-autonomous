import { getContentPillars } from '../config/settings.js';
import { ContentPillar } from '../core/types/index.js';
import { HistoryRepository } from '../database/repositories/history-repository.js';
import { logger } from '../core/logger/index.js';

export interface PillarBalance {
  pillarId: string;
  targetPct: number;
  actualPct: number;
  deficit: number;
}

export class PillarSelector {
  private historyRepo = new HistoryRepository();

  async selectPillarForBatch(excludePillarIds: string[] = []): Promise<ContentPillar> {
    const pillars = getContentPillars();
    const recentMemory = await this.historyRepo.getRecentMemory(50);

    // Count actual usage per pillar in recent 50 posts
    const usageMap: Record<string, number> = {};
    for (const p of pillars) usageMap[p.id] = 0;
    for (const mem of recentMemory) {
      if (mem.pillar && usageMap[mem.pillar] !== undefined) {
        usageMap[mem.pillar]++;
      }
    }

    const total = recentMemory.length || 1;

    // Calculate deficit score (how far below target %)
    const scores: Array<{ pillar: ContentPillar; deficit: number }> = pillars
      .filter((p) => !excludePillarIds.includes(p.id))
      .map((p) => ({
        pillar: p,
        deficit: p.targetPercentage / 100 - usageMap[p.id] / total,
      }));

    if (scores.length === 0) {
      return pillars[0];
    }

    // Sort by deficit descending — most underrepresented pillar first
    scores.sort((a, b) => b.deficit - a.deficit);

    const selected = scores[0].pillar;
    logger.info(`Selected content pillar: ${selected.name} (deficit: ${(scores[0].deficit * 100).toFixed(1)}%)`);
    return selected;
  }
}
