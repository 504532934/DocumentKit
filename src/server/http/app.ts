import { timingSafeEqual } from 'node:crypto';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import type { DocumentKit } from '../../core/document-kit.js';
import { DocumentKitError } from '../../errors/index.js';
import { pdfRequestSchema, screenshotRequestSchema } from '../../schemas/render.js';
import { createMcpServer } from '../mcp/server.js';

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: { code: { type: 'string' }, message: { type: 'string' } },
      required: ['code', 'message'],
    },
  },
  required: ['error'],
} as const;

export async function createHttpApp(documentKit: DocumentKit) {
  const app = Fastify({
    loggerInstance: documentKit.logger,
    bodyLimit: 2_200_000,
    requestTimeout: documentKit.config.jobTimeoutMs + 5_000,
    connectionTimeout: 10_000,
    keepAliveTimeout: 10_000,
    maxRequestsPerSocket: 100,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'DocumentKit API',
        description: 'In-memory webpage PDF and screenshot service.',
        version: '0.1.0',
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
  await app.register(rateLimit, {
    max: documentKit.config.rateLimitMax,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded.',
    }),
  });

  app.addHook('onRequest', async (request, reply) => {
    void reply.header('x-content-type-options', 'nosniff');
    void reply.header('referrer-policy', 'no-referrer');
    if (!documentKit.config.apiKey || request.url.startsWith('/health/')) return;
    const authorization = request.headers.authorization;
    const supplied = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!secureEqual(supplied, documentKit.config.apiKey)) {
      await reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid API key.' } });
    }
  });

  app.get('/health/live', { config: { rateLimit: false } }, () => ({ status: 'ok' }));
  app.get('/health/ready', { config: { rateLimit: false } }, async (_request, reply) => {
    if (!documentKit.isReady()) return reply.code(503).send({ status: 'not-ready' });
    return { status: 'ready', queue: documentKit.stats() };
  });

  app.post(
    '/v1/pdf',
    {
      schema: {
        tags: ['render'],
        summary: 'Render a URL or HTML string as PDF',
        response: { 400: errorResponseSchema, 413: errorResponseSchema, 503: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const input = pdfRequestSchema.parse(request.body);
      const result = await documentKit.renderPdf(input);
      return reply
        .header('content-type', result.contentType)
        .header('content-disposition', 'inline; filename="document.pdf"')
        .header('cache-control', 'no-store')
        .header('content-length', result.data.byteLength)
        .send(result.data);
    },
  );

  app.post(
    '/v1/screenshots',
    {
      schema: {
        tags: ['render'],
        summary: 'Capture a URL or HTML string as an image',
        response: { 400: errorResponseSchema, 413: errorResponseSchema, 503: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const input = screenshotRequestSchema.parse(request.body);
      const result = await documentKit.renderScreenshot(input);
      return reply
        .header('content-type', result.contentType)
        .header('content-disposition', `inline; filename="screenshot.${result.extension}"`)
        .header('cache-control', 'no-store')
        .header('content-length', result.data.byteLength)
        .send(result.data);
    },
  );

  app.post('/mcp', async (request, reply) => {
    reply.hijack();
    const server = createMcpServer(documentKit);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(request.raw, reply.raw, request.body);
    } finally {
      await transport.close().catch(() => undefined);
      await server.close().catch(() => undefined);
    }
  });

  app.get('/mcp', async (_request, reply) =>
    reply.code(405).send({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed in stateless mode.' },
      id: null,
    }),
  );
  app.delete('/mcp', async (_request, reply) =>
    reply.code(405).send({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed in stateless mode.' },
      id: null,
    }),
  );

  app.setNotFoundHandler(async (_request, reply) => {
    await reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });

  app.setErrorHandler(async (error, request, reply) => {
    if (reply.sent) return;
    if (error instanceof ZodError) {
      await reply.code(400).send({
        error: { code: 'BAD_REQUEST', message: 'Request validation failed.', issues: error.issues },
      });
      return;
    }
    if (error instanceof DocumentKitError) {
      request.log.warn({ code: error.code }, error.message);
      await reply
        .code(error.statusCode)
        .send({ error: { code: error.code, message: error.message } });
      return;
    }
    request.log.error({ err: error }, 'Unhandled request error');
    await reply
      .code(500)
      .send({ error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred.' } });
  });

  return app;
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
