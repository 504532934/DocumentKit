import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { DocumentKit } from '../../core/document-kit.js';
import { createMcpServer } from './server.js';

export async function startStdioMcp(documentKit: DocumentKit): Promise<void> {
  const server = createMcpServer(documentKit);
  const transport = new StdioServerTransport(process.stdin, process.stdout, {
    maxBufferSize: 3 * 1024 * 1024,
  });
  await server.connect(transport);
}
