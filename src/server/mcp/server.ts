import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DocumentKit } from '../../core/document-kit.js';
import { DocumentKitError } from '../../errors/index.js';
import {
  pdfRequestSchema,
  screenshotRequestSchema,
  type RenderResult,
} from '../../schemas/render.js';

export function createMcpServer(documentKit: DocumentKit): McpServer {
  const server = new McpServer({ name: 'documentkit', version: '0.1.1' });

  server.registerTool(
    'render_webpage_pdf',
    {
      title: 'Render webpage as PDF',
      description: 'Render exactly one URL or HTML string into an in-memory PDF.',
      inputSchema: pdfRequestSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (input) =>
      runTool(() => documentKit.renderPdf(pdfRequestSchema.parse(input)), documentKit),
  );

  server.registerTool(
    'capture_webpage_screenshot',
    {
      title: 'Capture webpage screenshot',
      description:
        'Capture exactly one URL or HTML string as an in-memory PNG, JPEG, or WebP image.',
      inputSchema: screenshotRequestSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (input) =>
      runTool(
        () => documentKit.renderScreenshot(screenshotRequestSchema.parse(input)),
        documentKit,
      ),
  );

  server.registerTool(
    'get_service_info',
    {
      title: 'Get DocumentKit service information',
      description: 'Return service limits and current queue utilization.',
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    () =>
      Promise.resolve({
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              name: 'DocumentKit',
              version: '0.1.1',
              storage: 'memory-only',
              maxOutputBytes: documentKit.config.maxOutputBytes,
              maxMcpOutputBytes: documentKit.config.maxMcpOutputBytes,
              queue: documentKit.stats(),
            }),
          },
        ],
      }),
  );

  return server;
}

async function runTool(operation: () => Promise<RenderResult>, documentKit: DocumentKit) {
  try {
    const result = await operation();
    if (result.data.byteLength > documentKit.config.maxMcpOutputBytes) {
      throw new DocumentKitError(
        'OUTPUT_TOO_LARGE',
        `MCP inline output exceeds ${documentKit.config.maxMcpOutputBytes} bytes. Use the HTTP API.`,
        413,
      );
    }
    return {
      content: [
        {
          type: 'resource' as const,
          resource: {
            uri: `documentkit://memory/${crypto.randomUUID()}.${result.extension}`,
            mimeType: result.contentType,
            blob: result.data.toString('base64'),
          },
        },
      ],
    };
  } catch (error) {
    const message =
      error instanceof DocumentKitError ? error.message : 'Document rendering failed.';
    return { isError: true, content: [{ type: 'text' as const, text: message }] };
  }
}
