import { getEnv } from '../config/env.js';
import { logger } from '../core/logger/index.js';

export async function sendWebhookAlert(message: string, context?: Record<string, unknown>): Promise<void> {
  const env = getEnv();
  if (!env.ALERT_WEBHOOK_URL) return;

  try {
    const payload = {
      text: `🚨 *Autonomous Publisher Alert*\n${message}`,
      context,
      timestamp: new Date().toISOString(),
    };

    await fetch(env.ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    logger.warn('Failed to send webhook alert', { error: String(err) });
  }
}

// Alert tracking to prevent spam
const recentAlerts = new Map<string, number>();
const ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour per alert type

export async function alertOnFailure(runId: string, error: string): Promise<void> {
  const alertKey = `failure:${error.slice(0, 50)}`;
  const lastSent = recentAlerts.get(alertKey) || 0;

  if (Date.now() - lastSent < ALERT_COOLDOWN_MS) return;

  recentAlerts.set(alertKey, Date.now());
  await sendWebhookAlert(`Run ${runId} failed: ${error}`);
}

export async function alertCredentialExpiry(platform: string): Promise<void> {
  const alertKey = `auth:${platform}`;
  const lastSent = recentAlerts.get(alertKey) || 0;

  if (Date.now() - lastSent < ALERT_COOLDOWN_MS) return;

  recentAlerts.set(alertKey, Date.now());
  await sendWebhookAlert(`Platform credentials need renewal: ${platform}`);
}
