# Scalability & Performance Review (10k Users Horizon)

## Overview

This document reviews the scalability characteristics of the **Rootly AI** architecture. It evaluates performance thresholds under traffic loads of 100, 1k, and 10k active users, outlining optimizations in code bundle sizing, caching, and server memory management.

---

## 1. Scale Horizon Evaluation

| User Horizon | Traffic Load (Est.) | System bottlenecks | Recommended Actions |
|---|---|---|---|
| **100 Active Users** | ~5 requests / min | None. The system easily runs on a single Cloud Run instance with 0 cost. | Standard Firestore security rule validation. |
| **1,000 Active Users** | ~50 requests / min | Transient cold starts during traffic spikes. Firestore read operations increase. | Enable React Query caching windows (e.g. `staleTime: 5 * 60 * 1000`) to reuse database payloads. |
| **10,000 Active Users** | ~500 requests / min | In-memory rate limiting becomes inconsistent across auto-scaled container instances. Gemini API quota limitations. | 1. Move the rate-limiting store to Upstash Redis.<br>2. Contact Google Cloud support to increase Gemini API quota limits. |

---

## 2. Code Bundle Optimization

Rootly employs Next.js compiler optimizations to keep first-load client bundle sizes minimal:

- **Dynamic Imports**: Large client components (e.g., Maps features in `RoutesClient` and chat modules in `CoachClient`) are loaded dynamically using Next.js `dynamic()` imports with custom loading skeletons.
- **Dependency Tree-shaking**:
  - We use standard ES Modules imports to ensure the compiler strips unused library portions.
  - Large icons and CSS styling are optimized by injecting only tailwind utilities and modern CSS stylesheets.
- **Stand-alone Server Standup**: Standalone mode (`output: 'standalone'`) filters the backend runtime files down to the absolute minimum required dependencies, ensuring the Docker container remains highly lightweight.

---

## 3. Server Memory Optimizations

To prevent container out-of-memory (OOM) errors during high-concurrency periods:

- **Streaming Exports**: Export endpoints generation (CSV/PDF) processes and streams row data iteratively rather than reading the entire transaction history into server memory at once.
- **Node.js Garbage Collection**: The Cloud Run container memory limit is set to `1024Mi`, which gives the V8 JavaScript engine ample headroom to perform garbage collection before hitting runtime limits.
- **External Storage for Large Files**: Audio logs collected from users are uploaded directly to client-facing APIs or processed immediately in streams rather than being buffered or written to the container's transient local disk.
