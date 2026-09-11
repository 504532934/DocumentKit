import dns from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import { ForbiddenTargetError } from '../../errors/index.js';

export interface NetworkPolicyOptions {
  allowPrivateNetworks: boolean;
  allowedHosts: string[];
}

const allowedProtocols = new Set(['http:', 'https:']);
const allowedPorts = new Set(['', '80', '443']);

export class NetworkPolicy {
  constructor(private readonly options: NetworkPolicyOptions) {}

  async assertUrlAllowed(rawUrl: string): Promise<URL> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new ForbiddenTargetError('The target is not a valid URL.');
    }

    if (!allowedProtocols.has(url.protocol)) {
      throw new ForbiddenTargetError('Only HTTP and HTTPS targets are allowed.');
    }
    if (url.username || url.password) {
      throw new ForbiddenTargetError('Credentials in target URLs are not allowed.');
    }
    if (!allowedPorts.has(url.port)) {
      throw new ForbiddenTargetError('The target port is not allowed.');
    }

    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (this.options.allowedHosts.length > 0 && !this.isAllowlisted(hostname)) {
      throw new ForbiddenTargetError('The target host is not on the allowlist.');
    }

    if (!this.options.allowPrivateNetworks) {
      const addresses = ipaddr.isValid(hostname)
        ? [hostname]
        : (await dns.lookup(hostname, { all: true, verbatim: true })).map(({ address }) => address);
      if (addresses.length === 0 || addresses.some((address) => !isPublicAddress(address))) {
        throw new ForbiddenTargetError(
          'Private, local, or non-public network targets are blocked.',
        );
      }
    }

    return url;
  }

  private isAllowlisted(hostname: string): boolean {
    return this.options.allowedHosts.some((pattern) => {
      if (pattern.startsWith('*.')) {
        const suffix = pattern.slice(2);
        return hostname.endsWith(`.${suffix}`) && hostname !== suffix;
      }
      return hostname === pattern;
    });
  }
}

export function isPublicAddress(address: string): boolean {
  let parsed: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    parsed = ipaddr.parse(address);
  } catch {
    return false;
  }
  if (parsed.kind() === 'ipv6' && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) {
    parsed = (parsed as ipaddr.IPv6).toIPv4Address();
  }
  return parsed.range() === 'unicast';
}
