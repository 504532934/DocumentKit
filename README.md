# DocumentKit

[English](README.md) | [简体中文](README.zh-CN.md)

Secure, high-throughput webpage-to-PDF and screenshot service for Node.js. DocumentKit exposes the same rendering core through a REST API, MCP Streamable HTTP, and MCP stdio.

> Status: early development (`0.x`). APIs may change before `1.0`.

## Features

- Render a URL or HTML string to PDF
- Capture PNG, JPEG, or WebP screenshots
- Memory-only output: generated documents are never persisted by DocumentKit
- Reused Chromium process with isolated browser contexts per request
- Bounded concurrency, queue backpressure, timeouts, and output limits
- SSRF protection for navigations, redirects, and subresources
- REST, MCP Streamable HTTP, and MCP stdio interfaces
- OpenAPI documentation and Docker support
- Reserved `ArtifactStore` interface for future disk or object-storage adapters

## Requirements

- Node.js 22 or newer
- macOS or Linux supported by Playwright

The npm package installs a compatible Chromium automatically, so no separate browser installation is normally required.

### Install Node.js and Playwright

1. Install Node.js 22 or newer from the [Node.js download page](https://nodejs.org/en/download) or with a Node.js version manager, then verify the installation:

   ```bash
   node --version
   npm --version
   ```

2. Install the project dependencies from the repository root:

   ```bash
   npm install
   ```

   This installs `playwright-core` and downloads the compatible Chromium build through `@playwright/browser-chromium`. Do not install Playwright globally.

3. On Linux, install Chromium's operating-system dependencies if they are not already available:

   ```bash
   sudo npx playwright-core install-deps chromium
   ```

If browser downloading was disabled during `npm install` (for example, with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`), download Chromium afterward with:

```bash
npx playwright-core install chromium
```

## Quick start

```bash
npx documentkit serve
```

The server listens on `127.0.0.1:3000` by default:

- REST: `http://127.0.0.1:3000/v1`
- MCP: `http://127.0.0.1:3000/mcp`
- OpenAPI UI: `http://127.0.0.1:3000/docs`
- Health: `http://127.0.0.1:3000/health/live`

Render HTML to PDF:

```bash
curl -sS http://127.0.0.1:3000/v1/pdf \
  -H 'content-type: application/json' \
  -d '{"html":"<!doctype html><h1>Hello from DocumentKit</h1>"}' \
  --output document.pdf
```

Capture a webpage screenshot:

```bash
curl -sS http://127.0.0.1:3000/v1/screenshots \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com","screenshot":{"fullPage":true}}' \
  --output screenshot.png
```

## CLI

```text
documentkit serve [--host 127.0.0.1] [--port 3000] [--api-key TOKEN]
documentkit mcp
documentkit doctor
```

For MCP stdio configuration:

```json
{
  "mcpServers": {
    "documentkit": {
      "command": "npx",
      "args": ["-y", "documentkit", "mcp"]
    }
  }
}
```

## HTTP API

### `POST /v1/pdf`

```json
{
  "url": "https://example.com",
  "page": {
    "waitUntil": "load",
    "viewport": { "width": 1440, "height": 900, "deviceScaleFactor": 1 }
  },
  "pdf": {
    "format": "A4",
    "printBackground": true,
    "landscape": false
  }
}
```

### `POST /v1/screenshots`

```json
{
  "html": "<!doctype html><h1>Hello</h1>",
  "screenshot": {
    "type": "png",
    "fullPage": true,
    "scale": "css"
  }
}
```

Exactly one of `url` and `html` is required. Responses are raw binary data with `Cache-Control: no-store`. DocumentKit does not write generated output to disk.

See [API documentation](docs/api.md), [MCP documentation](docs/mcp.md), and [configuration](docs/configuration.md).

## Security

DocumentKit defaults to loopback-only listening and blocks private, local, reserved, and link-local network targets. Binding to a non-loopback address requires an API key:

```bash
DOCUMENTKIT_API_KEY='replace-with-at-least-16-random-characters' \
  npx documentkit serve --host 0.0.0.0
```

An application-level URL filter cannot replace an operating-system or container egress firewall. Production deployments should deny private network destinations at the network layer as well. Read [SECURITY.md](SECURITY.md) and [the security model](docs/security.md) before exposing the service.

## Performance model

DocumentKit starts one Chromium process and reuses it. Each render receives a fresh, isolated browser context which is closed after completion. A bounded queue prevents unbounded memory growth:

- concurrency: 4 jobs
- waiting queue: 32 jobs
- job timeout: 45 seconds
- output limit: 25 MiB
- MCP inline limit: 5 MiB
- declared network budget: 50 MiB per page

Chromium disk and media caches are minimized. Application output remains in memory and is released after the response. Tune concurrency based on available RAM; Chromium-heavy jobs commonly need substantially more memory than their final PDF size.

## Development

```bash
npm install
npm run check
npm run dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
