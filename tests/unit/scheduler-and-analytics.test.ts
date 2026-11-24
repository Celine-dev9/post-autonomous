import { describe, it, expect } from 'vitest';
import { AutonomousScheduler } from '../../src/scheduler/scheduler.js';
import { AnalyticsCollector } from '../../src/analytics/analytics-collector.js';
import { PerformanceAnalyzer } from '../../src/analytics/performance-analyzer.js';
import { LearningEngine } from '../../src/analytics/learning-engine.js';

describe('Phase 9 & 10: Scheduler & Analytics', () => {
  it('should compute and randomize scheduled daily run slots', () => {
    const scheduler = new AutonomousScheduler();
    const slots = scheduler.getNextRunTimes();

    expect(slots.length).toBeGreaterThanOrEqual(1);
    expect(slots[0] instanceof Date).toBe(true);
    expect(slots[0].getTime()).not.toBeNaN();
  });

  it('should collect analytics and synthesize performance insights', async () => {
    const collector = new AnalyticsCollector();
    const collectionResult = await collector.collectRecent(5);
    expect(collectionResult.postsChecked).toBeGreaterThanOrEqual(0);

    const analyzer = new PerformanceAnalyzer();
    const insights = await analyzer.analyze();
    expect(insights.platformScores).toBeDefined();
    expect(insights.platformScores.length).toBeGreaterThanOrEqual(4);

    const engine = new LearningEngine();
    const recs = await engine.generateRecommendations();
    expect(recs.recommendedPillarWeights).toBeDefined();
    expect(recs.guidanceNotes.length).toBeGreaterThan(0);
  });
});
