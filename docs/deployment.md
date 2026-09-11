# Deployment

## Docker

```bash
docker build -t documentkit .
docker run --rm -p 127.0.0.1:3000:3000 \
  -e DOCUMENTKIT_HOST=0.0.0.0 \
  -e DOCUMENTKIT_API_KEY='replace-with-a-random-secret' \
  documentkit
```

The image runs as Playwright's unprivileged `pwuser`. Apply CPU and memory limits, a read-only root filesystem where practical, and network egress controls. Scale horizontally rather than setting very high concurrency in one process.

Readiness returns 503 until Chromium has started. Use `/health/live` for liveness and `/health/ready` for readiness.
