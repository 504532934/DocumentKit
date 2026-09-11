import pino, { type Logger } from 'pino';
import type { AppConfig } from '../config/index.js';
import type { PdfRequest, RenderResult, ScreenshotRequest } from '../schemas/render.js';
import { BrowserManager } from './browser/browser-manager.js';
import { RenderService } from './browser/render-service.js';
import { RenderQueue, type QueueStats } from './queue/render-queue.js';

export interface DocumentKitOptions {
  config: AppConfig;
  logger?: Logger;
}

export class DocumentKit {
  readonly config: AppConfig;
  readonly logger: Logger;
  private readonly browserManager: BrowserManager;
  private readonly renderService: RenderService;
  private readonly queue: RenderQueue;

  constructor(options: DocumentKitOptions) {
    this.config = options.config;
    this.logger = options.logger ?? pino({ level: options.config.logLevel });
    this.browserManager = new BrowserManager(this.logger);
    this.renderService = new RenderService(this.browserManager, this.config, this.logger);
    this.queue = new RenderQueue(this.config.maxConcurrency, this.config.maxQueue);
  }

  renderPdf(request: PdfRequest): Promise<RenderResult> {
    return this.queue.run(
      (signal) => this.renderService.renderPdf(request, signal),
      this.config.jobTimeoutMs,
    );
  }

  renderScreenshot(request: ScreenshotRequest): Promise<RenderResult> {
    return this.queue.run(
      (signal) => this.renderService.renderScreenshot(request, signal),
      this.config.jobTimeoutMs,
    );
  }

  stats(): QueueStats {
    return this.queue.stats();
  }

  async warmup(): Promise<void> {
    await this.browserManager.warmup();
  }

  isReady(): boolean {
    return this.browserManager.isReady();
  }

  async close(): Promise<void> {
    await this.browserManager.close();
  }
}
