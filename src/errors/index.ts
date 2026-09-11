export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN_TARGET'
  | 'QUEUE_FULL'
  | 'TIMEOUT'
  | 'OUTPUT_TOO_LARGE'
  | 'BROWSER_ERROR'
  | 'INTERNAL_ERROR';

export class DocumentKitError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'DocumentKitError';
  }
}

export class QueueFullError extends DocumentKitError {
  constructor() {
    super('QUEUE_FULL', 'The render queue is full. Retry later.', 503);
  }
}

export class JobTimeoutError extends DocumentKitError {
  constructor() {
    super('TIMEOUT', 'The render job exceeded its time limit.', 504);
  }
}

export class ForbiddenTargetError extends DocumentKitError {
  constructor(message = 'The target URL is not allowed by the network policy.') {
    super('FORBIDDEN_TARGET', message, 403);
  }
}

export class OutputTooLargeError extends DocumentKitError {
  constructor(maxBytes: number) {
    super('OUTPUT_TOO_LARGE', `Generated output exceeds the ${maxBytes} byte limit.`, 413);
  }
}
