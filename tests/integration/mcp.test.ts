import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DocumentKit } from '../../src/core/document-kit.js';
import { createMcpServer } from '../../src/server/mcp/server.js';
import { testDocumentKit } from '../helpers.js';

describe('MCP server', () => {
  let documentKit: DocumentKit;

  beforeAll(async () => {
    documentKit = testDocumentKit();
    await documentKit.warmup();
  });

  afterAll(async () => documentKit.close());

  it('lists and executes tools over an MCP transport', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer(documentKit);
    const client = new Client({ name: 'documentkit-test', version: '1.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain('render_webpage_pdf');
    const result = await client.callTool({ name: 'get_service_info', arguments: {} });
    expect(result.isError).not.toBe(true);

    await client.close();
    await server.close();
  });
});
