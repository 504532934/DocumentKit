import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DocumentKit } from '../../src/core/document-kit.js';
import { createHttpApp } from '../../src/server/http/app.js';
import { testDocumentKit } from '../helpers.js';

describe('HTTP API', () => {
  let documentKit: DocumentKit;
  let app: Awaited<ReturnType<typeof createHttpApp>>;

  beforeAll(async () => {
    documentKit = testDocumentKit();
    await documentKit.warmup();
    app = await createHttpApp(documentKit);
  });

  afterAll(async () => {
    await app.close();
    await documentKit.close();
  });

  it('renders a PDF entirely in memory', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/pdf',
      payload: { html: '<!doctype html><h1>DocumentKit PDF</h1>' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.rawPayload.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('renders a PNG entirely in memory', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/screenshots',
      payload: { html: '<!doctype html><h1>DocumentKit PNG</h1>' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('image/png');
    expect(response.rawPayload.subarray(1, 4).toString()).toBe('PNG');
  });

  it('handles bursts through the bounded render queue', async () => {
    const responses = await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        app.inject({
          method: 'POST',
          url: '/v1/screenshots',
          payload: { html: `<!doctype html><p>Burst ${index}</p>` },
        }),
      ),
    );
    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
    expect(documentKit.stats()).toMatchObject({ active: 0, queued: 0 });
  });

  it('returns structured validation errors', async () => {
    const response = await app.inject({ method: 'POST', url: '/v1/pdf', payload: {} });
    expect(response.statusCode).toBe(400);
    const body = response.json<{ error: { code: string } }>();
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('enforces bearer authentication when an API key is configured', async () => {
    const protectedDocumentKit = testDocumentKit({ apiKey: '0123456789abcdef' });
    const protectedApp = await createHttpApp(protectedDocumentKit);
    try {
      const unauthorized = await protectedApp.inject({
        method: 'POST',
        url: '/v1/pdf',
        payload: {},
      });
      expect(unauthorized.statusCode).toBe(401);

      const authorized = await protectedApp.inject({
        method: 'POST',
        url: '/v1/pdf',
        headers: { authorization: 'Bearer 0123456789abcdef' },
        payload: {},
      });
      expect(authorized.statusCode).toBe(400);
    } finally {
      await protectedApp.close();
      await protectedDocumentKit.close();
    }
  });
});
