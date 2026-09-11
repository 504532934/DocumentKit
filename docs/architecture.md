# Architecture

DocumentKit separates transports from document processing. REST and MCP validate their inputs and call the same `DocumentKit` application service. That service submits work to a bounded queue and delegates to a processor.

The initial processors use a shared Chromium process. Each job creates a new incognito browser context, installs the network policy before opening a page, renders into a `Buffer`, and closes the context in a `finally` block.

## Backpressure

The queue admits at most `maxConcurrency + maxQueue` jobs. Once full, new work receives `QUEUE_FULL` immediately. This is intentional: an overloaded document renderer should shed load rather than exhaust memory or create an unbounded backlog.

Timeout cancellation closes the browser context. A disconnected Chromium process is recreated for the next job.

## Memory-only output

No generated PDF or image is written by the application. REST sends the render buffer directly. MCP embeds a size-limited base64 resource. Chromium itself may create small runtime files, but application and Chromium cache settings minimize disk I/O.

The public `ArtifactStore` TypeScript interface is reserved for a future opt-in storage layer. There is currently no implementation and no API setting that enables persistence.

## Future processors

Future features such as PDF text extraction belong in separate processor modules. Protocol handlers must not contain processor-specific behavior beyond input/output translation.
