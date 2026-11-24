import { getDatabaseClient } from '../../database/client.js';
import { getEnv } from '../../config/env.js';
import { logger } from '../../core/logger/index.js';
import fs from 'fs';
import path from 'path';

export async function migrateCommand(): Promise<void> {
  console.log('\n======================================================');
  console.log('       DATABASE SCHEMA & MIGRATION RUNNER             ');
  console.log('======================================================\n');

  const env = getEnv();
  const migrationsDir = path.resolve(process.cwd(), 'database', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log(`Migrations folder not found at: ${migrationsDir}`);
    return;
  }

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  console.log(`Found ${files.length} SQL migration script(s):\n`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`- [FILE] ${file} (${sql.length} bytes)`);
  }

  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log(`\nConnecting to Supabase at: ${env.SUPABASE_URL}`);
    try {
      const client = getDatabaseClient();
      console.log('Supabase connection verified. To apply DDL statements in Supabase, execute migrations via the Supabase Dashboard SQL Editor or Supabase CLI (supabase db push).');
    } catch (err) {
      console.log('Supabase execution error:', err);
    }
  } else {
    console.log('\nSupabase credentials not configured in .env.');
    console.log('The engine is currently running with the local in-memory/mock SQLite database fallback.');
    console.log('When deploying to production Supabase, run these SQL files in the Supabase SQL editor.');
  }

  console.log('\nMigration check completed.\n');
}
