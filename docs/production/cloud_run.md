# Google Cloud Run Infrastructure & Resource Guide

## Overview

This document outlines the container hosting architecture on Google Cloud Run for the **Rootly AI** application. It describes CPU/Memory sizing, concurrency parameters, autoscaling behaviors, and cold-start mitigations.

---

## 1. Instance Resource Sizing

Google Cloud Run dynamically allocates resources per container instance. Rootly is configured with the following production thresholds:

- **CPU Limit**: 1 vCPU (`1000m` millicores). Next.js standalone server handles routing, page compilation, and API controller mappings efficiently within this allocation.
- **Memory Limit**: 1024 MiB (`1024Mi`). This allocation accommodates:
  - Next.js standalone process footprint (~120MB).
  - Node.js runtime garbage collection bounds.
  - Temporary memory allocations during server-side CSV/PDF exports.
- **CPU Throttling**: Configured as `true` (CPU is only allocated during request processing) to minimize idle running costs.
- **Startup CPU Boost**: Enabled (`true`). Cloud Run temporarily boosts CPU to 2 vCPUs during container startup to accelerate Next.js boot sequence and reduce first-request latency.

---

## 2. Concurrency Profile

- **Container Concurrency**: Configured to `80` concurrent requests.
- **Rationale**: Next.js is highly concurrent due to the asynchronous non-blocking event-loop architecture of Node.js. 80 concurrent connections prevent a single container from bottlenecking under simultaneous dashboard loads while protecting memory limits from expanding too rapidly.
- **Request Timeout**: Configured to `60` seconds. Any request exceeding this limit (e.g. slow Maps API queries or massive report exports) is terminated to free connection slots.

---

## 3. Autoscaling Configurations

To achieve cost efficiency while maintaining performance under load spikes:

- **Minimum Instances**: `0`. The system scales down to zero instances when there is no traffic. This minimizes base operational cost.
- **Maximum Instances**: `10`. Limits total capacity to prevent runaway GCP costs during load spikes or potential denial-of-service attempts.
- **Scaling Metric**: Cloud Run automatically scales out new instances when average container concurrency exceeds 60% of the maximum limit (i.e. >48 concurrent active connections on existing instances).

---

## 4. Cold Start Mitigations

Because Rootly is configured with a minimum instance count of `0`, the first request after an idle period triggers a "cold start". We mitigate this latency using:

1. **Lightweight Container Base**: The Dockerfile uses `node:18-alpine` (~170MB compressed) which speeds up container pulling and loading times.
2. **Next.js Standalone Mode**: Only copies the compiled outputs and required `node_modules` instead of the entire project context, speeding up container filesystem scans.
3. **Startup CPU Boost**: Enabled to compile modules and initialize the Server instance rapidly.
4. **Fast API Initialization**: Third-party SDK connections (Firebase, Gemini API fetch) are initialized lazily upon the first request rather than during startup, ensuring the server starts listening within <1.5s of container load.
