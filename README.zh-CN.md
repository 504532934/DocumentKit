# DocumentKit

[English](README.md) | [简体中文](README.zh-CN.md)

DocumentKit 是一个安全、高吞吐的 Node.js 网页转 PDF 与网页截图服务。REST API、MCP Streamable HTTP 和 MCP stdio 共用同一套渲染核心。

> 当前状态：早期开发阶段（`0.x`）。在 `1.0` 发布前，API 可能发生变化。

## 功能特性

- 将 URL 或 HTML 字符串渲染为 PDF
- 生成 PNG、JPEG 或 WebP 网页截图
- 仅使用内存输出：DocumentKit 不会持久化生成的文档
- 复用 Chromium 进程，每个请求使用独立的浏览器上下文
- 提供并发限制、队列背压、超时和输出大小限制
- 对页面导航、重定向及子资源请求提供 SSRF 防护
- 支持 REST、MCP Streamable HTTP 和 MCP stdio
- 提供 OpenAPI 文档及 Docker 部署支持
- 预留 `ArtifactStore` 接口，以便未来扩展磁盘或对象存储

## 环境要求

- Node.js 22 或更高版本
- Playwright 支持的 macOS 或 Linux 系统

npm 包会自动安装兼容版本的 Chromium，通常不需要单独安装浏览器。

### 安装 Node.js 和 Playwright

1. 从 [Node.js 下载页面](https://nodejs.org/zh-cn/download)或通过 Node.js 版本管理器安装 Node.js 22 或更高版本，然后确认安装成功：

   ```bash
   node --version
   npm --version
   ```

2. 在项目根目录安装依赖：

   ```bash
   npm install
   ```

   此命令会安装 `playwright-core`，并通过 `@playwright/browser-chromium` 下载版本匹配的 Chromium，无需全局安装 Playwright。

3. 在 Linux 上，如果系统尚未安装 Chromium 所需的系统依赖，请执行：

   ```bash
   sudo npx playwright-core install-deps chromium
   ```

如果执行 `npm install` 时禁用了浏览器下载（例如设置了 `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`），请随后手动下载 Chromium：

```bash
npx playwright-core install chromium
```

## 快速开始

```bash
npx documentkit serve
```

服务默认监听 `127.0.0.1:3000`：

- REST：`http://127.0.0.1:3000/v1`
- MCP：`http://127.0.0.1:3000/mcp`
- OpenAPI UI：`http://127.0.0.1:3000/docs`
- 健康检查：`http://127.0.0.1:3000/health/live`

将 HTML 渲染为 PDF：

```bash
curl -sS http://127.0.0.1:3000/v1/pdf \
  -H 'content-type: application/json' \
  -d '{"html":"<!doctype html><h1>Hello from DocumentKit</h1>"}' \
  --output document.pdf
```

生成网页截图：

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

MCP stdio 配置示例：

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

请求必须且只能提供 `url` 或 `html` 其中之一。响应为原始二进制数据，并带有 `Cache-Control: no-store`。DocumentKit 不会将生成物写入磁盘。

更多信息请参阅 [API 文档](docs/api.md)、[MCP 文档](docs/mcp.md)和[配置文档](docs/configuration.md)。

## 安全性

DocumentKit 默认仅监听本机回环地址，并阻止访问私有、本地、保留及链路本地网络地址。监听非回环地址时必须配置 API Key：

```bash
DOCUMENTKIT_API_KEY='replace-with-at-least-16-random-characters' \
  npx documentkit serve --host 0.0.0.0
```

应用层 URL 过滤不能替代操作系统或容器层面的出口防火墙。生产环境还应在网络层阻止访问私有网络目标。将服务暴露到网络前，请阅读 [SECURITY.md](SECURITY.md) 和[安全模型](docs/security.md)。

## 性能模型

DocumentKit 启动并复用一个 Chromium 进程。每个渲染任务使用全新的隔离浏览器上下文，任务完成后立即关闭。有限队列可防止内存无限增长：

- 并发任务：4
- 等待队列：32
- 任务超时：45 秒
- 输出上限：25 MiB
- MCP 内联输出上限：5 MiB
- 每个页面声明的网络流量预算：50 MiB

Chromium 的磁盘缓存和媒体缓存会被限制到最低。应用输出始终保留在内存中，并在响应结束后释放。请根据可用内存调整并发数；Chromium 渲染任务占用的内存通常会明显高于最终 PDF 文件大小。

## 开发

```bash
npm install
npm run check
npm run dev
```

贡献代码前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

[MIT](LICENSE)
