import { JobTimeoutError, QueueFullError } from '../../errors/index.js';

interface PendingJob<T> {
  task: (signal: AbortSignal) => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  timeoutMs: number;
}

export interface QueueStats {
  active: number;
  queued: number;
  maxConcurrency: number;
  maxQueue: number;
}

export class RenderQueue {
  private active = 0;
  private readonly pending: PendingJob<unknown>[] = [];

  constructor(
    private readonly maxConcurrency: number,
    private readonly maxQueue: number,
  ) {}

  run<T>(task: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
    if (this.active >= this.maxConcurrency && this.pending.length >= this.maxQueue) {
      return Promise.reject(new QueueFullError());
    }

    return new Promise<T>((resolve, reject) => {
      this.pending.push({ task, resolve, reject, timeoutMs } as PendingJob<unknown>);
      this.drain();
    });
  }

  stats(): QueueStats {
    return {
      active: this.active,
      queued: this.pending.length,
      maxConcurrency: this.maxConcurrency,
      maxQueue: this.maxQueue,
    };
  }

  private drain(): void {
    while (this.active < this.maxConcurrency) {
      const job = this.pending.shift();
      if (!job) return;
      this.active += 1;
      void this.execute(job).finally(() => {
        this.active -= 1;
        this.drain();
      });
    }
  }

  private async execute(job: PendingJob<unknown>): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new JobTimeoutError()), job.timeoutMs);
    timer.unref();

    try {
      const result = await Promise.race([
        job.task(controller.signal),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener(
            'abort',
            () =>
              reject(
                controller.signal.reason instanceof Error
                  ? controller.signal.reason
                  : new JobTimeoutError(),
              ),
            { once: true },
          );
        }),
      ]);
      job.resolve(result);
    } catch (error) {
      job.reject(error);
    } finally {
      clearTimeout(timer);
    }
  }
}
