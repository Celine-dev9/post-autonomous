import { Application } from './app.js';
import { logger } from './core/logger/index.js';

async function main(): Promise<void> {
  const app = new Application();
  await app.initialize();

  const isContinuous = process.argv.includes('--daemon') || process.env.DAEMON_MODE === 'true';

  if (isContinuous) {
    app.startDaemon();

    // Graceful shutdown handling
    const shutdown = () => {
      logger.info('Received shutdown signal, terminating publisher daemon...');
      app.stopDaemon();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } else {
    // Default single execution mode (e.g. for CI/CD GitHub Actions or direct invocation)
    logger.info('Running single publishing cycle');
    await app.runDailyBatch();
  }
}

main().catch((err) => {
  logger.error('Unhandled fatal exception in main process', { error: String(err) });
  process.exit(1);
});
