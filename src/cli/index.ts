#!/usr/bin/env node
import { Command } from 'commander';
import { statusCommand } from './commands/status.js';
import { testConnectionsCommand } from './commands/test-connections.js';
import { logger } from '../core/logger/index.js';

const program = new Command();

program
  .name('autonomous-social-publisher')
  .description('Autonomous AI social media content generation and publishing engine')
  .version('1.0.0');

program
  .command('status')
  .description('Display engine health, configuration, and platform connectivity status')
  .action(async () => {
    try {
      await statusCommand();
    } catch (err) {
      logger.error('Failed to display status', { error: String(err) });
      process.exit(1);
    }
  });

program
  .command('test-connections')
  .description('Verify credentials and connectivity for database, AI, and social platforms')
  .action(async () => {
    try {
      await testConnectionsCommand();
    } catch (err) {
      logger.error('Connection test failed', { error: String(err) });
      process.exit(1);
    }
  });

program
  .command('research')
  .description('Autonomously discover and score content topics from RSS and AI ideation')
  .option('-c, --count <number>', 'Number of topics to retrieve', '5')
  .action(async (options) => {
    try {
      const { researchCommand } = await import('./commands/research.js');
      await researchCommand(parseInt(options.count, 10));
    } catch (err) {
      logger.error('Research failed', { error: String(err) });
      process.exit(1);
    }
  });

program
  .command('generate')
  .description('Generate master content package and platform variants for a selected topic')
  .option('-t, --topic <string>', 'Specific topic override')
  .action(async (options) => {
    try {
      const { generateCommand } = await import('./commands/generate.js');
      await generateCommand(options.topic);
    } catch (err) {
      logger.error('Content generation failed', { error: String(err) });
      process.exit(1);
    }
  });

program
  .command('publish')
  .description('Execute full publishing cycle (research, generate, QA, media, publish)')
  .option('--dry-run', 'Run pipeline without broadcasting to live platforms', false)
  .option('-p, --platforms <list>', 'Comma-separated platform filter (e.g. x,linkedin)')
  .action(async (options) => {
    try {
      const { publishCommand } = await import('./commands/publish.js');
      await publishCommand({
        dryRun: Boolean(options.dryRun),
        platforms: options.platforms ? options.platforms.split(',') : undefined,
      });
    } catch (err) {
      logger.error('Publishing run failed', { error: String(err) });
      process.exit(1);
    }
  });

program
  .command('dry-run')
  .description('Execute complete autonomous pipeline end-to-end without publishing')
  .action(async () => {
    try {
      const { dryRunCommand } = await import('./commands/dry-run.js');
      await dryRunCommand();
    } catch (err) {
      logger.error('Dry-run execution failed', { error: String(err) });
      process.exit(1);
    }
  });

program
  .command('analytics')
  .description('Collect engagement metrics from platforms and update AI performance memory')
  .action(async () => {
    try {
      const { analyticsCommand } = await import('./commands/analytics.js');
      await analyticsCommand();
    } catch (err) {
      logger.error('Analytics collection failed', { error: String(err) });
      process.exit(1);
    }
  });

program
  .command('migrate')
  .description('Apply database migrations to Supabase PostgreSQL')
  .action(async () => {
    try {
      const { migrateCommand } = await import('./commands/migrate.js');
      await migrateCommand();
    } catch (err) {
      logger.error('Database migration failed', { error: String(err) });
      process.exit(1);
    }
  });

program
  .command('unlock')
  .description('Force release any stale scheduler job lock')
  .action(async () => {
    try {
      const { unlockCommand } = await import('./commands/unlock.js');
      await unlockCommand();
    } catch (err) {
      logger.error('Failed to release lock', { error: String(err) });
      process.exit(1);
    }
  });

program.parse(process.argv);
