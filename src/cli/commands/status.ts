import { getEnv } from '../../config/env.js';
import { getPublishingConfig } from '../../config/settings.js';
import { getPlatformsConfig, isPlatformConfigured } from '../../config/platform-config.js';
import { Platform } from '../../core/types/index.js';

export async function statusCommand(): Promise<void> {
  const env = getEnv();
  const publishingConfig = getPublishingConfig();
  const platformsConfig = getPlatformsConfig();

  console.log('\n======================================================');
  console.log('       AUTONOMOUS SOCIAL PUBLISHER - SYSTEM STATUS    ');
  console.log('======================================================\n');

  console.log('--- ENGINE ENVIRONMENT ---');
  console.log(`Node Environment:    ${env.NODE_ENV}`);
  console.log(`Log Level:           ${env.LOG_LEVEL}`);
  console.log(`Configured Timezone: ${env.TIMEZONE}`);
  console.log(`Dry Run Mode:        ${env.DRY_RUN ? 'ENABLED (Safe)' : 'Disabled (Live Publishing)'}`);

  console.log('\n--- SCHEDULE CONFIGURATION ---');
  console.log(`Posts Per Day:       ${publishingConfig.scheduler.postsPerDay}`);
  console.log(`Scheduled Times:     ${publishingConfig.scheduler.times.join(', ')} (${publishingConfig.scheduler.timezone})`);
  console.log(`Randomization:       ${publishingConfig.scheduler.randomizeTime ? `+/- ${publishingConfig.scheduler.randomWindowMinutes} mins` : 'Disabled'}`);
  console.log(`Quality Threshold:   ${publishingConfig.qualityThreshold}/100`);

  console.log('\n--- AI & RESEARCH PROVIDER ---');
  console.log(`AI Provider:         ${env.AI_PROVIDER}`);
  console.log(`AI Model:            ${env.AI_MODEL}`);
  console.log(`Gemini Key Present:  ${Boolean(env.GEMINI_API_KEY)}`);
  console.log(`RSS Ingestion:       ${env.RSS_ENABLED ? 'Enabled' : 'Disabled'}`);
  console.log(`Max Article Age:     ${env.MAX_ARTICLE_AGE_DAYS} days`);

  console.log('\n--- DATABASE & PERSISTENCE ---');
  console.log(`Supabase URL:        ${env.SUPABASE_URL ? env.SUPABASE_URL : 'Not configured'}`);
  console.log(`Service Key Present: ${Boolean(env.SUPABASE_SERVICE_ROLE_KEY)}`);
  console.log(`In-Memory Fallback:  ${env.DATABASE_FALLBACK_MEMORY ? 'Enabled (offline resilient)' : 'Disabled'}`);

  console.log('\n--- MEDIA SERVICES ---');
  console.log(`Image Provider:      ${env.IMAGE_PROVIDER}`);
  console.log(`Video Provider:      ${env.VIDEO_PROVIDER}`);
  console.log(`Cloudinary Cloud:    ${env.CLOUDINARY_CLOUD_NAME || 'Not configured'}`);

  console.log('\n--- PLATFORM INTEGRATION STATUS ---');
  const platforms: Platform[] = ['x', 'facebook', 'instagram', 'linkedin', 'youtube'];
  for (const p of platforms) {
    const config = platformsConfig[p];
    const { configured, missingVars } = isPlatformConfigured(p);
    const statusText = !config.enabled
      ? 'DISABLED'
      : configured
        ? 'READY (Credentials configured)'
        : `ATTENTION REQUIRED (Missing: ${missingVars.join(', ')})`;
    console.log(`- ${p.padEnd(12)}: ${statusText}`);
  }
  console.log('\n======================================================\n');
}
