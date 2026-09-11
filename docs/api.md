# HTTP API

All rendering endpoints accept JSON and return binary output. The maximum JSON request body is approximately 2.1 MiB. Responses use `Cache-Control: no-store`.

## Authentication

When `DOCUMENTKIT_API_KEY` is configured, send:

```http
Authorization: Bearer <token>
```

Health endpoints remain unauthenticated.

## Render PDF

`POST /v1/pdf` accepts exactly one `url` or `html` field. Supported paper formats are Letter, Legal, Tabloid, Ledger, and A0 through A6.

## Capture screenshot

`POST /v1/screenshots` accepts exactly one `url` or `html` field. Supported formats are PNG, JPEG, and WebP. `quality` applies only to JPEG and WebP.

## Errors

```json
{
  "error": {
    "code": "QUEUE_FULL",
    "message": "The render queue is full. Retry later."
  }
}
```

Clients should retry `429` and `503` responses with exponential backoff and jitter. Do not automatically retry validation, authentication, or forbidden-target errors.
