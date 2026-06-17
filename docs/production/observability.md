# Observability & Production Monitoring Guide

## Overview

This guide details the logging and error monitoring strategy for **Rootly AI** when deployed to Google Cloud Run. It covers structured logging formats, GCP Cloud Logging integrations, and Error Reporting mappings.

---

## 1. Structured Logging Integration

In production (`NODE_ENV === 'production'`), Rootly's custom `Logger` (`src/backend/lib/logger.ts`) bypasses unstructured plaintext outputs in favor of structured single-line JSON logs.

### Production JSON Schema:
```json
{
  "severity": "INFO" | "WARNING" | "ERROR",
  "message": "The log message details",
  "timestamp": "2026-06-17T14:46:49.000Z",
  "meta": {
    "key": "value"
  }
}
```

### Benefits for GCP Cloud Logging:
- **Severity Mapping**: Cloud Logging automatically parses the `severity` field (mapped to uppercase `INFO`, `WARNING`, or `ERROR`) and assigns correct icons and log levels in the Log Explorer UI.
- **Payload Indexing**: Elements inside the `meta` object are parsed as structured fields, enabling developers to query logs by custom attributes (e.g. `jsonPayload.meta.userId = "user-123"`).
- **Fast Parsing**: Avoids slow, fragile regex parsing of plaintext logs in the Cloud Console.

---

## 2. Cloud Error Reporting Integration

GCP Cloud Error Reporting monitors application logs for unhandled errors. To ensure Rootly's exceptions are automatically captured and grouped:

- **Stack Trace Formatting**: The `logger.error(message, stack, meta)` method outputs the error stack trace inside the log payload.
- **Format Matcher**: When the `severity` is `ERROR` and the payload contains a `stack` property, Cloud Error Reporting parses it, alerts the DevOps team, and groups similar exceptions by stack location.
- **Global Error Boundary**: The Next.js API global error handler catches all unhandled controller errors and invokes `logger.error` to ensure they are visible in GCP.

---

## 3. Correlation Tracking

For request tracing across downstream services:

- **User Context Mappings**: Server log payloads include the verified `userId` inside the `meta` parameter when executing database queries, AI coach chats, or voice analysis.
- **Trace Mappings**: If Rootly is connected to an API Gateway (like Cloud Endpoints or Apigee), incoming `X-Cloud-Trace-Context` headers are passed to Next.js routes and can be injected into the log's `logging.googleapis.com/trace` field, enabling end-to-end distributed tracing.
