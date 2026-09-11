# MCP

DocumentKit exposes these tools:

- `render_webpage_pdf`
- `capture_webpage_screenshot`
- `get_service_info`

## Local stdio

```bash
npx --yes @crossdo/documentkit mcp
```

Logs are written to stderr so stdout remains valid MCP JSON-RPC.

## Streamable HTTP

Start the normal service and connect to `http://127.0.0.1:3000/mcp`. The endpoint is stateless and uses JSON responses. Configure the same bearer token as the REST API when authentication is enabled.

MCP embeds generated files as base64 resources and therefore uses a lower default output limit of 5 MiB. For larger results, use the REST interface. No MCP result is persisted.
