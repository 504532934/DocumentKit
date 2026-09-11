import { describe, expect, it } from 'vitest';
import { pdfRequestSchema, screenshotRequestSchema } from '../../src/schemas/render.js';

describe('render request schemas', () => {
  it('applies safe defaults', () => {
    const input = pdfRequestSchema.parse({ html: '<h1>Hello</h1>' });
    expect(input.pdf.format).toBe('A4');
    expect(input.page.viewport.width).toBe(1440);
  });

  it('requires exactly one source', () => {
    expect(() => pdfRequestSchema.parse({})).toThrow();
    expect(() => pdfRequestSchema.parse({ url: 'https://example.com', html: 'x' })).toThrow();
  });

  it('rejects PNG quality', () => {
    expect(() =>
      screenshotRequestSchema.parse({ html: '<p>x</p>', screenshot: { quality: 80 } }),
    ).toThrow();
  });
});
