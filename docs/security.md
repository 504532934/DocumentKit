# Security model

Document rendering processes untrusted active content. Treat DocumentKit as a security-sensitive service.

## Built-in controls

- Only HTTP and HTTPS URLs on ports 80 and 443 are accepted.
- URL credentials and dangerous custom headers are rejected.
- Private, loopback, reserved, multicast, and link-local addresses are blocked after DNS resolution.
- The same policy runs for top-level requests, redirects, and subresources.
- Service workers and downloads are disabled.
- Browser state is isolated per job and destroyed afterward.
- Concurrency, queue length, time, request count, declared network bytes, viewport dimensions, request bodies, and output sizes are bounded.
- Public binding requires bearer authentication; CORS is not enabled.
- Generated output is never persisted.

## Defense in depth

DNS validation in application code has an unavoidable time-of-check/time-of-use boundary because Chromium performs its own connection. Production deployments must also block private networks and cloud metadata endpoints with container, host, VPC, or proxy egress rules.

Run the container as a non-root user with Chromium's sandbox enabled. Do not add `--no-sandbox`. Put the service behind TLS, authentication, request-size limits, and rate limiting. Prefer a destination allowlist for sensitive environments.

`DOCUMENTKIT_ALLOW_PRIVATE_NETWORKS=true` deliberately weakens SSRF protection and should only be used in a trusted network with a restrictive hostname allowlist.

## Reporting

See the repository [security policy](../SECURITY.md) for private vulnerability reporting instructions.
