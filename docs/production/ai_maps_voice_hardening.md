# AI, Maps & Voice Service Hardening Guide

## Overview

This guide details the integration hardening, resilience frameworks, and security boundaries implemented in the **Rootly AI** downstream services layers. These controls protect the application from transient failures, prompt injection, and excessive billing charges.

---

## 1. Google Gemini API Resilience & Retries

All interaction with the Google Gemini API (orchestrated through `src/services/claude.ts`) is designed with defensive programming controls:

- **Structured JSON Schemas**: We enforce structured outputs (`responseMimeType: 'application/json'`) and strict schemas on the model calls.
- **Fail-safe Fallbacks**: If the Gemini API key is missing or the endpoint throws an error (e.g. rate limit exhaustion), the system automatically falls back to local rule-based engines:
  - **Chat Coaching**: Falls back to the Local Recommendation Engine (`recommendation.engine.ts`), returning tailored tips based on logged data.
  - **Voice Extraction**: Falls back to a deterministic regex parser that extracts activities (e.g., matching keywords like "drive 10km" or "red meat").
- **Retry Mechanism**: The integration routes implement exponential backoff retry algorithms for transient `503 Service Unavailable` or `429 Too Many Requests` API failures.

---

## 2. Google Maps API Caching & Cost Containment

Google Maps Directions API can generate high billing costs if queried repeatedly. We manage maps requests using the following optimizations:

- **Debounced Input Queries**: Address search inputs on the route planner `/routes` are debounced by `500ms` on the client side, preventing intermediate keystroke queries.
- **Duplicate Request Elimination**: Identical routing parameters (same Origin, Destination, and Transit Mode) are cached in the browser's session storage for the current session.
- **Backend Validation**: Next.js route handlers validate coordinates before calling downstream Maps endpoints, preventing unnecessary requests for invalid location names.

---

## 3. Audio & Voice Transcription Boundaries

The voice logging pipeline (`/voice`) handles audio capture and analysis using clear error boundaries:

- **Codec Constraints**: Client-side recording uses the `MediaRecorder` API constrained to `audio/webm` or `audio/ogg` (at 44.1kHz sample rates), minimizing file sizes uploaded over the network.
- **Size & Duration Limits**: Audio recordings are restricted to a maximum of **60 seconds** and **2MB** in file size. Uploads exceeding these thresholds are rejected immediately at the Next.js API controller.
- **Microphone Permissions**: The React component handles device access errors explicitly, showing clear instructions to the user if microphone access is blocked or unavailable in the browser.

---

## 4. Prompt Injection & Input Filtering

To protect Gemini API prompts from hijacking attempts (where a user attempts to override instructions and use the LLM to output malicious content):

- **Input Sanitization**: Next.js controller endpoints parse all text inputs through Zod validation boundaries, rejecting strings with suspicious script tags or abnormal characters.
- **Strict Role-Scoping**: Chat messages are parsed and structured into strict `{ role: 'user' | 'model', parts: [...] }` arrays. User text is never directly interpolated inside system prompt instructions.
- **System Instructions Enforcement**: The system instructions are isolated in the `systemInstruction` field, which Gemini processes independently of the conversation history, ensuring strict adherence to the carbon coaching persona.
