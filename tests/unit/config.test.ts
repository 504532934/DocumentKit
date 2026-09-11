import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/index.js';

describe('loadConfig', () => {
  it('uses network-accessible defaults with private destinations blocked', () => {
    const config = loadConfig({});
    expect(config.host).toBe('0.0.0.0');
    expect(config.allowPrivateNetworks).toBe(false);
    expect(config.maxConcurrency).toBe(4);
  });

  it('allows a public binding without authentication', () => {
    const config = loadConfig({ DOCUMENTKIT_HOST: '0.0.0.0', DOCUMENTKIT_API_KEY: '' });
    expect(config.host).toBe('0.0.0.0');
    expect(config.apiKey).toBeUndefined();
  });

  it('accepts a public binding with a sufficiently long key', () => {
    const config = loadConfig({
      DOCUMENTKIT_HOST: '0.0.0.0',
      DOCUMENTKIT_API_KEY: '0123456789abcdef',
    });
    expect(config.apiKey).toBe('0123456789abcdef');
  });
});
