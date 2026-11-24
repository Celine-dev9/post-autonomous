import { getDatabaseClient } from '../client.js';
import { Platform, PostAnalytics } from '../../core/types/index.js';

export class AnalyticsRepository {
  private db = getDatabaseClient();

  async recordMetrics(analytics: PostAnalytics): Promise<void> {
    const rows = Object.entries(analytics.metrics).map(([metricName, metricValue]) => ({
      id: `an_${analytics.platformPostId}_${metricName}_${Date.now()}`,
      platform_post_id: analytics.platformPostId,
      platform: analytics.platform,
      metric_name: metricName,
      metric_value: metricValue,
      collected_at: analytics.collectedAt.toISOString(),
    }));

    if (rows.length > 0) {
      await this.db.from('analytics').insert(rows);
    }
  }

  async getPlatformPerformanceSummary(platform: Platform): Promise<Record<string, number>> {
    const { data } = await this.db.from('analytics').select('*').eq('platform', platform);
    const summary: Record<string, number> = {};
    if (!data) return summary;

    for (const row of data) {
      summary[row.metric_name] = (summary[row.metric_name] || 0) + Number(row.metric_value);
    }
    return summary;
  }
}
