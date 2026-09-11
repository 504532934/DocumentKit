import { describe, expect, it } from 'vitest';
import { RenderQueue } from '../../src/core/queue/render-queue.js';

describe('RenderQueue', () => {
  it('limits concurrency and reports backpressure', async () => {
    const queue = new RenderQueue(1, 1);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const first = queue.run(() => gate.then(() => 1), 1_000);
    const second = queue.run(() => Promise.resolve(2), 1_000);

    await expect(queue.run(() => Promise.resolve(3), 1_000)).rejects.toMatchObject({
      code: 'QUEUE_FULL',
    });
    expect(queue.stats()).toMatchObject({ active: 1, queued: 1 });
    release();
    await expect(Promise.all([first, second])).resolves.toEqual([1, 2]);
  });

  it('aborts jobs that exceed their timeout', async () => {
    const queue = new RenderQueue(1, 0);
    await expect(queue.run(() => new Promise(() => undefined), 10)).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
  });
});
