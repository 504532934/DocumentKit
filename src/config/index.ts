import { z } from 'zod';

const booleanFromEnv = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const environmentSchema = z.object({
  DOCUMENTKIT_HOST: z.string().default('0.0.0.0'),
  DOCUMENTKIT_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DOCUMENTKIT_API_KEY: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(16).optional(),
  ),
  DOCUMENTKIT_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(64).default(4),
  DOCUMENTKIT_MAX_QUEUE: z.coerce.number().int().min(0).max(10_000).default(32),
  DOCUMENTKIT_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100_000).default(60),
  DOCUMENTKIT_JOB_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(300_000).default(45_000),
  DOCUMENTKIT_NAVIGATION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(120_000)
    .default(30_000),
  DOCUMENTKIT_MAX_OUTPUT_BYTES: z.coerce
    .number()
    .int()
    .min(1_024)
    .max(250 * 1024 * 1024)
    .default(25 * 1024 * 1024),
  DOCUMENTKIT_MAX_MCP_OUTPUT_BYTES: z.coerce
    .number()
    .int()
    .min(1_024)
    .max(25 * 1024 * 1024)
    .default(5 * 1024 * 1024),
  DOCUMENTKIT_MAX_REQUESTS_PER_JOB: z.coerce.number().int().min(1).max(10_000).default(300),
  DOCUMENTKIT_MAX_DECLARED_NETWORK_BYTES: z.coerce
    .number()
    .int()
    .min(1_024)
    .max(1024 * 1024 * 1024)
    .default(50 * 1024 * 1024),
  DOCUMENTKIT_ALLOW_PRIVATE_NETWORKS: booleanFromEnv,
  DOCUMENTKIT_ALLOWED_HOSTS: z.string().default(''),
  DOCUMENTKIT_LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

export interface AppConfig {
  host: string;
  port: number;
  apiKey?: string;
  maxConcurrency: number;
  maxQueue: number;
  rateLimitMax: number;
  jobTimeoutMs: number;
  navigationTimeoutMs: number;
  maxOutputBytes: number;
  maxMcpOutputBytes: number;
  maxRequestsPerJob: number;
  maxDeclaredNetworkBytes: number;
  allowPrivateNetworks: boolean;
  allowedHosts: string[];
  logLevel: string;
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const value = environmentSchema.parse(environment);
  const config: AppConfig = {
    host: value.DOCUMENTKIT_HOST,
    port: value.DOCUMENTKIT_PORT,
    maxConcurrency: value.DOCUMENTKIT_MAX_CONCURRENCY,
    maxQueue: value.DOCUMENTKIT_MAX_QUEUE,
    rateLimitMax: value.DOCUMENTKIT_RATE_LIMIT_MAX,
    jobTimeoutMs: value.DOCUMENTKIT_JOB_TIMEOUT_MS,
    navigationTimeoutMs: value.DOCUMENTKIT_NAVIGATION_TIMEOUT_MS,
    maxOutputBytes: value.DOCUMENTKIT_MAX_OUTPUT_BYTES,
    maxMcpOutputBytes: value.DOCUMENTKIT_MAX_MCP_OUTPUT_BYTES,
    maxRequestsPerJob: value.DOCUMENTKIT_MAX_REQUESTS_PER_JOB,
    maxDeclaredNetworkBytes: value.DOCUMENTKIT_MAX_DECLARED_NETWORK_BYTES,
    allowPrivateNetworks: value.DOCUMENTKIT_ALLOW_PRIVATE_NETWORKS,
    allowedHosts: value.DOCUMENTKIT_ALLOWED_HOSTS.split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
    logLevel: value.DOCUMENTKIT_LOG_LEVEL,
  };

  if (value.DOCUMENTKIT_API_KEY) config.apiKey = value.DOCUMENTKIT_API_KEY;
  return config;
}
