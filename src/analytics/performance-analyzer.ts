import { Platform } from '../core/types/index.js';
import { AnalyticsRepository } from '../database/repositories/analytics-repository.js';
import { getPlatformsConfig } from '../config/platform-config.js';
import { getContentPillars } from '../config/settings.js';
import { logger } from '../core/logger/index.js';

export interface PlatformScore {
  platform: Platform;
  totalImpressions: number;
  totalEngagements: number;
  averageEngagementRate: number;
}

export interface PerformanceInsights {
  platformScores: PlatformScore[];
  bestPerformingPlatform?: Platform;
  overallEngagementRate: number;
  totalMetricsRecorded: number;
  insightsGeneratedAt: Date;
}

export class PerformanceAnalyzer {
  private analyticsRepo = new AnalyticsRepository();

  async analyze(): Promise<PerformanceInsights> {
    logger.info('Analyzing platform performance and engagement metrics');
    const platforms = Object.keys(getPlatformsConfig()) as Platform[];
    const platformScores: PlatformScore[] = [];

    let totalImpressionsAll = 0;
    let totalEngagementsAll = 0;
    let metricsCount = 0;

    for (const platform of platforms) {
      const summary = await this.analyticsRepo.getPlatformPerformanceSummary(platform);
      const impressions = summary.impressions || summary.views || 0;
      const likes = summary.likes || 0;
      const comments = summary.comments || 0;
      const shares = summary.shares || 0;
      const engagements = likes + comments + shares;
      const rate = summary.engagement_rate || (impressions > 0 ? (engagements / impressions) * 100 : 0);

      platformScores.push({
        platform,
        totalImpressions: impressions,
        totalEngagements: engagements,
        averageEngagementRate: Number(rate.toFixed(2)),
      });

      totalImpressionsAll += impressions;
      totalEngagementsAll += engagements;
      metricsCount += Object.keys(summary).length;
    }

    // Rank platforms by engagement rate
    platformScores.sort((a, b) => b.averageEngagementRate - a.averageEngagementRate);
    const bestPerformingPlatform = platformScores.length > 0 && platformScores[0].totalImpressions > 0
      ? platformScores[0].platform
      : undefined;

    const overallEngagementRate = totalImpressionsAll > 0
      ? Number(((totalEngagementsAll / totalImpressionsAll) * 100).toFixed(2))
      : 0;

    return {
      platformScores,
      bestPerformingPlatform,
      overallEngagementRate,
      totalMetricsRecorded: metricsCount,
      insightsGeneratedAt: new Date(),
    };
  }
}
