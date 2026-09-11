#!/usr/bin/env node
import { Command } from 'commander';
import pino from 'pino';
import { loadConfig } from '../config/index.js';
import { DocumentKit } from '../core/document-kit.js';
import { createHttpApp } from '../server/http/app.js';
import { startStdioMcp } from '../server/mcp/stdio.js';

const program = new Command()
  .name('documentkit')
  .description('Secure webpage PDF and screenshot service')
  .version('0.1.0');

program
  .command('serve', { isDefault: true })
  .description('Start the REST API and MCP Streamable HTTP server')
  .option('--host <host>', 'Listening host')
  .option('--port <port>', 'Listening port')
  .option('--api-key <key>', 'Bearer token required by clients')
  .action(async (options: { host?: string; port?: string; apiKey?: string }) => {
    const environment = {
      ...process.env,
      ...(options.host ? { DOCUMENTKIT_HOST: options.host } : {}),
      ...(options.port ? { DOCUMENTKIT_PORT: options.port } : {}),
      ...(options.apiKey ? { DOCUMENTKIT_API_KEY: options.apiKey } : {}),
    };
    const config = loadConfig(environment);
    const logger = pino({ level: config.logLevel });
    const documentKit = new DocumentKit({ config, logger });
    const app = await createHttpApp(documentKit);

    await documentKit.warmup();
    await app.listen({ host: config.host, port: config.port });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info({ signal }, 'Shutting down');
      await app.close();
      await documentKit.close();
      process.exitCode = 0;
    };
    process.once('SIGINT', () => void shutdown('SIGINT'));
    process.once('SIGTERM', () => void shutdown('SIGTERM'));
  });

program
  .command('mcp')
  .description('Start an MCP server over stdio')
  .action(async () => {
    const config = loadConfig({ ...process.env, DOCUMENTKIT_HOST: '127.0.0.1' });
    const logger = pino({ level: config.logLevel }, pino.destination(2));
    const documentKit = new DocumentKit({ config, logger });
    await documentKit.warmup();
    await startStdioMcp(documentKit);

    const shutdown = async (): Promise<void> => {
      await documentKit.close();
      process.exitCode = 0;
    };
    process.once('SIGINT', () => void shutdown());
    process.once('SIGTERM', () => void shutdown());
  });

program
  .command('doctor')
  .description('Verify configuration and Chromium startup')
  .action(async () => {
    const config = loadConfig({ ...process.env, DOCUMENTKIT_HOST: '127.0.0.1' });
    const logger = pino({ level: 'silent' });
    const documentKit = new DocumentKit({ config, logger });
    try {
      await documentKit.warmup();
      process.stdout.write('DocumentKit is ready. Chromium started successfully.\n');
    } finally {
      await documentKit.close();
    }
  });

await program.parseAsync(process.argv);
