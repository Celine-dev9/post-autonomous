import { AnalyticsCollector } from '../../analytics/analytics-collector.js';
import { PerformanceAnalyzer } from '../../analytics/performance-analyzer.js';
import { LearningEngine } from '../../analytics/learning-engine.js';
import { logger } from '../../core/logger/index.js';

export async function analyticsCommand(): Promise<void> {
  console.log('\n======================================================');
  console.log('       PLATFORM ENGAGEMENT ANALYTICS & LEARNING       ');
  console.log('======================================================\n');

  console.log('1. Collecting latest platform performance metrics...');
  const collector = new AnalyticsCollector();
  const collectionResult = await collector.collectRecent(20);
  console.log(`Checked ${collectionResult.postsChecked} posts, recorded ${collectionResult.metricsCollected} metrics.`);

  console.log('\n2. Synthesizing performance insights...');
  const analyzer = new PerformanceAnalyzer();
  const insights = await analyzer.analyze();

  console.log(`\nOverall Engagement Rate: ${insights.overallEngagementRate}%`);
  console.log(`Best Performing Platform: ${insights.bestPerformingPlatform || 'Insufficient data'}`);

  console.log('\nBreakdown by Platform:');
  for (const score of insights.platformScores) {
    console.log(`- ${score.platform.toUpperCase().padEnd(10)}: ${score.totalImpressions} impressions, ${score.totalEngagements} engagements (${score.averageEngagementRate}% engagement rate)`);
  }

  console.log('\n3. AI Strategy Recommendations:');
  const engine = new LearningEngine();
  const recs = await engine.generateRecommendations();

  recs.focusAreas.forEach((f) => console.log(`  * Focus: ${f}`));
  recs.guidanceNotes.forEach((g) => console.log(`  * Note:  ${g}`));

  console.log('\n======================================================\n');
}
