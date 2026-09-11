import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/index.js';

describe('loadConfig', () => {
  it('uses safe local defaults', () => {
    const config = loadConfig({});
    expect(config.host).toBe('127.0.0.1');
    expect(config.allowPrivateNetworks).toBe(false);
    expect(config.maxConcurrency).toBe(4);
  });

  it('requires authentication on public bindings', () => {
    expect(() => loadConfig({ DOCUMENTKIT_HOST: '0.0.0.0' })).toThrow(/API_KEY/);
  });

  it('accepts a public binding with a sufficiently long key', () => {
    const config = loadConfig({
      DOCUMENTKIT_HOST: '0.0.0.0',
      DOCUMENTKIT_API_KEY: '0123456789abcdef',
    });
    expect(config.apiKey).toBe('0123456789abcdef');
  });
});
