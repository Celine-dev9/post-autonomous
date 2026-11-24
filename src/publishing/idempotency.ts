import crypto from 'crypto';

export function generateIdempotencyKey(
  runId: string,
  platform: string,
  topicHash: string
): string {
  const raw = `${runId}:${platform}:${topicHash}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

export function generateRunId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(4).toString('hex');
  return `run_${dateStr}_${rand}`;
}

export function generateContentItemId(): string {
  return `ci_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

export function generatePostId(platform: string): string {
  return `post_${platform}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

export function generateTopicHash(topic: string, angle: string): string {
  return crypto
    .createHash('sha256')
    .update(`${topic}:${angle}`.toLowerCase())
    .digest('hex')
    .slice(0, 32);
}
