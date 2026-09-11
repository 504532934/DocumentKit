import { describe, expect, it } from 'vitest';
import { NetworkPolicy, isPublicAddress } from '../../src/core/security/network-policy.js';

describe('network policy', () => {
  it.each(['127.0.0.1', '10.0.0.1', '169.254.169.254', '::1', 'fc00::1', 'fe80::1'])(
    'classifies %s as non-public',
    (address) => expect(isPublicAddress(address)).toBe(false),
  );

  it.each(['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111'])('classifies %s as public', (address) =>
    expect(isPublicAddress(address)).toBe(true),
  );

  it('blocks unsafe protocols, ports, credentials, and literal private IPs', async () => {
    const policy = new NetworkPolicy({ allowPrivateNetworks: false, allowedHosts: [] });
    await expect(policy.assertUrlAllowed('file:///etc/passwd')).rejects.toThrow();
    await expect(policy.assertUrlAllowed('http://127.0.0.1')).rejects.toThrow();
    await expect(policy.assertUrlAllowed('https://user:pass@example.com')).rejects.toThrow();
    await expect(policy.assertUrlAllowed('https://example.com:8443')).rejects.toThrow();
  });

  it('enforces exact and wildcard host allowlists', async () => {
    const policy = new NetworkPolicy({
      allowPrivateNetworks: true,
      allowedHosts: ['example.com', '*.example.org'],
    });
    await expect(policy.assertUrlAllowed('https://example.com')).resolves.toBeInstanceOf(URL);
    await expect(policy.assertUrlAllowed('https://a.example.org')).resolves.toBeInstanceOf(URL);
    await expect(policy.assertUrlAllowed('https://example.org')).rejects.toThrow(/allowlist/);
  });
});
