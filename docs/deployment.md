# Deployment

## Docker

```bash
docker build -t documentkit .
docker run --rm -p 3000:3000 documentkit
```

The image runs as Playwright's unprivileged `pwuser`. The service is unauthenticated by default, so restrict port 3000 with a firewall or security group, or set `DOCUMENTKIT_API_KEY`. Apply CPU and memory limits, a read-only root filesystem where practical, and network egress controls. Scale horizontally rather than setting very high concurrency in one process.

Readiness returns 503 until Chromium has started. Use `/health/live` for liveness and `/health/ready` for readiness.
