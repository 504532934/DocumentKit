import pino from 'pino';
import type { AppConfig } from '../src/config/index.js';
import { DocumentKit } from '../src/core/document-kit.js';

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    host: '127.0.0.1',
    port: 3000,
    maxConcurrency: 2,
    maxQueue: 2,
    rateLimitMax: 100,
    jobTimeoutMs: 20_000,
    navigationTimeoutMs: 10_000,
    maxOutputBytes: 5 * 1024 * 1024,
    maxMcpOutputBytes: 5 * 1024 * 1024,
    maxRequestsPerJob: 50,
    maxDeclaredNetworkBytes: 10 * 1024 * 1024,
    allowPrivateNetworks: false,
    allowedHosts: [],
    logLevel: 'silent',
    ...overrides,
  };
}

export function testDocumentKit(overrides: Partial<AppConfig> = {}): DocumentKit {
  return new DocumentKit({
    config: testConfig(overrides),
    logger: pino({ level: 'silent' }),
  });
}
