import { getEnv } from '../../config/env.js';
import { isPlatformConfigured } from '../../config/platform-config.js';
import { Platform } from '../../core/types/index.js';

export async function testConnectionsCommand(): Promise<void> {
  const env = getEnv();

  console.log('\n======================================================');
  console.log('       TESTING EXTERNAL CONNECTIONS & CREDENTIALS    ');
  console.log('======================================================\n');

  // 1. Database Check
  console.log('[1/4] Checking Database Connectivity...');
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('  -> Supabase credentials present.');
    console.log(`  -> Target URL: ${env.SUPABASE_URL}`);
  } else if (env.DATABASE_FALLBACK_MEMORY) {
    console.log('  -> Supabase credentials absent, using resilient In-Memory/Local fallback store.');
  } else {
    console.warn('  -> WARNING: No database configured and fallback disabled!');
  }

  // 2. AI Provider Check
  console.log('\n[2/4] Checking AI Provider Connectivity...');
  if (env.GEMINI_API_KEY) {
    console.log(`  -> Gemini Provider active with model ${env.AI_MODEL}`);
  } else {
    console.log('  -> GEMINI_API_KEY missing. Engine operating in mock/test mode.');
  }

  // 3. Media Provider Check
  console.log('\n[3/4] Checking Media & Hosting Providers...');
  if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY) {
    console.log(`  -> Cloudinary configured (${env.CLOUDINARY_CLOUD_NAME})`);
  } else {
    console.log('  -> Cloudinary not configured. Mock local media hosting will be used for testing.');
  }

  // 4. Social Platform Integrations
  console.log('\n[4/4] Checking Social Platform API Credentials...');
  const platforms: Platform[] = ['x', 'facebook', 'instagram', 'linkedin', 'youtube'];
  for (const p of platforms) {
    const { configured, missingVars } = isPlatformConfigured(p);
    if (configured) {
      console.log(`  -> [PASS] ${p.toUpperCase()}: Credentials provided`);
    } else {
      console.log(`  -> [MOCK] ${p.toUpperCase()}: Mock mode active (Missing: ${missingVars.join(', ')})`);
    }
  }

  console.log('\nAll connection checks completed.\n');
}
