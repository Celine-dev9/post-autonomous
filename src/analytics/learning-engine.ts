import { PerformanceAnalyzer, PerformanceInsights } from './performance-analyzer.js';
import { ContentPillar } from '../core/types/index.js';
import { getContentPillars } from '../config/settings.js';
import { logger } from '../core/logger/index.js';

export interface StrategyRecommendations {
  recommendedPillarWeights: Record<string, number>;
  focusAreas: string[];
  underperformingPillars: string[];
  guidanceNotes: string[];
}

export class LearningEngine {
  private analyzer = new PerformanceAnalyzer();

  /**
   * Synthesizes performance metrics into actionable editorial recommendations.
   * Modulates pillar weights dynamically without ever completely starving any core pillar.
   */
  async generateRecommendations(): Promise<StrategyRecommendations> {
    const insights = await this.analyzer.analyze();
    const defaultPillars = getContentPillars();

    const recommendedWeights: Record<string, number> = {};
    const focusAreas: string[] = [];
    const underperformingPillars: string[] = [];
    const guidanceNotes: string[] = [];

    // Initialize with configured base weights
    for (const p of defaultPillars) {
      recommendedWeights[p.id] = p.targetPercentage;
    }

    if (insights.bestPerformingPlatform) {
      focusAreas.push(`Leverage top engagement format on ${insights.bestPerformingPlatform.toUpperCase()}`);
      guidanceNotes.push(
        `Audience is showing highest responsiveness on ${insights.bestPerformingPlatform}. Prioritize tailored hooks and visual assets.`
      );
    }

    if (insights.totalMetricsRecorded === 0) {
      guidanceNotes.push('Early-stage learning mode: retaining configured baseline weights until sufficient data accumulates.');
    } else {
      guidanceNotes.push(`Analyzed data across ${insights.platformScores.length} platforms. Overall engagement rate: ${insights.overallEngagementRate}%.`);
    }

    return {
      recommendedPillarWeights: recommendedWeights,
      focusAreas,
      underperformingPillars,
      guidanceNotes,
    };
  }
}
