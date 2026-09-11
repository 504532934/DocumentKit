import type { BrowserContext, Page, Route } from 'playwright-core';
import type { Logger } from 'pino';
import type { AppConfig } from '../../config/index.js';
import { DocumentKitError, ForbiddenTargetError, OutputTooLargeError } from '../../errors/index.js';
import type { PdfRequest, RenderResult, ScreenshotRequest } from '../../schemas/render.js';
import { NetworkPolicy } from '../security/network-policy.js';
import type { BrowserManager } from './browser-manager.js';

const forbiddenHeaders = new Set([
  'connection',
  'content-length',
  'cookie',
  'host',
  'proxy-authorization',
  'transfer-encoding',
]);

export class RenderService {
  private readonly networkPolicy: NetworkPolicy;

  constructor(
    private readonly browserManager: BrowserManager,
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {
    this.networkPolicy = new NetworkPolicy(config);
  }

  async renderPdf(request: PdfRequest, signal: AbortSignal): Promise<RenderResult> {
    return this.withPage(request, signal, async (page) => {
      const data = await page.pdf({
        format: request.pdf.format,
        landscape: request.pdf.landscape,
        printBackground: request.pdf.printBackground,
        preferCSSPageSize: request.pdf.preferCSSPageSize,
        displayHeaderFooter: request.pdf.displayHeaderFooter,
        headerTemplate: request.pdf.headerTemplate,
        footerTemplate: request.pdf.footerTemplate,
        margin: request.pdf.margin,
        tagged: request.pdf.tagged,
        outline: request.pdf.outline,
      });
      this.assertOutputSize(data);
      return { data: asBuffer(data), contentType: 'application/pdf', extension: 'pdf' };
    });
  }

  async renderScreenshot(request: ScreenshotRequest, signal: AbortSignal): Promise<RenderResult> {
    return this.withPage(request, signal, async (page) => {
      const options = request.screenshot;
      const data = await page.screenshot({
        type: options.type,
        fullPage: options.fullPage,
        omitBackground: options.omitBackground,
        scale: options.scale,
        ...(options.quality === undefined ? {} : { quality: options.quality }),
      });
      this.assertOutputSize(data);
      const contentType = options.type === 'jpeg' ? 'image/jpeg' : `image/${options.type}`;
      return { data: asBuffer(data), contentType, extension: options.type };
    });
  }

  private async withPage<T>(
    request: PdfRequest | ScreenshotRequest,
    signal: AbortSignal,
    operation: (page: Page) => Promise<T>,
  ): Promise<T> {
    if (request.url) await this.networkPolicy.assertUrlAllowed(request.url);
    this.validateHeaders(request.page.extraHeaders);

    const browser = await this.browserManager.getBrowser();
    const context = await browser.newContext({
      acceptDownloads: false,
      serviceWorkers: 'block',
      viewport: {
        width: request.page.viewport.width,
        height: request.page.viewport.height,
      },
      deviceScaleFactor: request.page.viewport.deviceScaleFactor,
      colorScheme: request.page.colorScheme,
      reducedMotion: request.page.reducedMotion,
      locale: request.page.locale,
      ...(request.page.userAgent ? { userAgent: request.page.userAgent } : {}),
      ...(request.page.extraHeaders ? { extraHTTPHeaders: request.page.extraHeaders } : {}),
    });

    const abort = (): void => void context.close().catch(() => undefined);
    signal.addEventListener('abort', abort, { once: true });

    try {
      return await this.executeInContext(context, request, operation);
    } catch (error) {
      if (signal.aborted) {
        throw signal.reason instanceof Error ? signal.reason : new Error('Render job aborted');
      }
      if (error instanceof DocumentKitError) throw error;
      throw new DocumentKitError(
        'BROWSER_ERROR',
        'The browser could not render the document.',
        502,
        {
          cause: error,
        },
      );
    } finally {
      signal.removeEventListener('abort', abort);
      await context.close().catch(() => undefined);
    }
  }

  private async executeInContext<T>(
    context: BrowserContext,
    request: PdfRequest | ScreenshotRequest,
    operation: (page: Page) => Promise<T>,
  ): Promise<T> {
    let requestCount = 0;
    let declaredBytes = 0;
    const policyState: { error?: Error } = {};

    await context.route('**/*', async (route: Route) => {
      try {
        requestCount += 1;
        if (requestCount > this.config.maxRequestsPerJob) {
          throw new ForbiddenTargetError('The page exceeded the network request limit.');
        }
        await this.networkPolicy.assertUrlAllowed(route.request().url());
        await route.continue();
      } catch (error) {
        policyState.error = error instanceof Error ? error : new Error('Network request blocked');
        await route.abort('blockedbyclient').catch(() => undefined);
      }
    });

    const page = await context.newPage();
    page.on('response', (response) => {
      const length = Number(response.headers()['content-length'] ?? 0);
      if (Number.isFinite(length) && length > 0) declaredBytes += length;
      if (declaredBytes > this.config.maxDeclaredNetworkBytes) {
        policyState.error = new ForbiddenTargetError(
          'The page exceeded the declared network byte limit.',
        );
        void page.close().catch(() => undefined);
      }
    });

    const timeout = request.page.timeoutMs ?? this.config.navigationTimeoutMs;
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);

    if (request.url) {
      await page.goto(request.url, { waitUntil: request.page.waitUntil, timeout });
    } else {
      await page.setContent(request.html ?? '', { waitUntil: request.page.waitUntil, timeout });
    }
    const loadPolicyError: Error | undefined = policyState.error;
    if (loadPolicyError) throw loadPolicyError;
    if (request.page.css) await page.addStyleTag({ content: request.page.css });
    if (request.page.delayMs > 0) await page.waitForTimeout(request.page.delayMs);
    const renderPolicyError = readPolicyError(policyState);
    if (renderPolicyError) throw renderPolicyError;

    this.logger.debug({ requestCount, declaredBytes }, 'Page loaded');
    return operation(page);
  }

  private validateHeaders(headers: Record<string, string> | undefined): void {
    if (!headers) return;
    for (const name of Object.keys(headers)) {
      if (forbiddenHeaders.has(name.toLowerCase())) {
        throw new ForbiddenTargetError(`The ${name} request header is not allowed.`);
      }
    }
  }

  private assertOutputSize(data: Uint8Array): void {
    if (data.byteLength > this.config.maxOutputBytes) {
      throw new OutputTooLargeError(this.config.maxOutputBytes);
    }
  }
}

function readPolicyError(state: { error?: Error }): Error | undefined {
  return state.error;
}

function asBuffer(data: Uint8Array): Buffer {
  return Buffer.isBuffer(data) ? data : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
}
