import { chromium, type Browser } from 'playwright-core';
import type { Logger } from 'pino';

export class BrowserManager {
  private browser: Browser | undefined;
  private launchPromise: Promise<Browser> | undefined;
  private closing = false;

  constructor(private readonly logger: Logger) {}

  async getBrowser(): Promise<Browser> {
    if (this.browser?.isConnected()) return this.browser;
    if (this.launchPromise) return this.launchPromise;

    this.launchPromise = chromium
      .launch({
        headless: true,
        args: [
          '--disable-application-cache',
          '--disable-background-networking',
          '--disable-component-update',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-sync',
          '--disk-cache-size=1',
          '--media-cache-size=1',
          '--no-first-run',
        ],
      })
      .then((browser) => {
        this.browser = browser;
        browser.on('disconnected', () => {
          if (!this.closing) {
            this.logger.warn('Chromium disconnected; it will be restarted on the next job');
          }
          this.browser = undefined;
        });
        return browser;
      })
      .finally(() => {
        this.launchPromise = undefined;
      });

    return this.launchPromise;
  }

  isReady(): boolean {
    return this.browser?.isConnected() ?? false;
  }

  async warmup(): Promise<void> {
    await this.getBrowser();
  }

  async close(): Promise<void> {
    this.closing = true;
    const browser = this.browser;
    this.browser = undefined;
    try {
      await browser?.close();
    } finally {
      this.closing = false;
    }
  }
}
