# Rootly - System Architecture

This document provides a comprehensive overview of the Rootly system architecture, request flow, component directory design, AI integration pipelines, state management strategies, and architectural tradeoffs.

---

## 1. System Design

Rootly is built as a feature-based Next.js 15 App Router application running on Node.js. It features a client-server boundary that maximizes React Server Components (RSC) for initial rendering while using dynamic client modules for responsive user interactions.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Next.js App Shell                             │
│  ├─ Layout & Context Providers (React Query, Auth, UI)                  │
│  └─ Floating Pill Navigation Interface                                  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
    ┌─────────────────────────┐             ┌─────────────────────────┐
    │  RSC (Static / Meta)   │             │   Client Feature Pages  │
    │  • Landing Page (/)     │             │   • /dashboard, /coach  │
    │  • Route Layout Shells  │             │   • Zustand state synchronization│
    └─────────────────────────┘             └────────────┬────────────┘
                                                         │
                                                         ▼
                                            ┌─────────────────────────┐
                                            │    React Query Hooks    │
                                            │    • useGoals, useVoice │
                                            └────────────┬────────────┘
                                                         │
                                                         ▼
                                            ┌─────────────────────────┐
                                            │    Next.js API Routes   │
                                            │    • Auth & rate limits │
                                            └────────────┬────────────┘
                                                         │
                                      ┌──────────────────┼──────────────────┐
                                      ▼                  ▼                  ▼
                              ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
                              │  Anthropic    │  │  Google Maps  │  │  Firestore    │
                              │  (Claude APIs)│  │  (Directions) │  │  (Data Store) │
                              └───────────────┘  └───────────────┘  └───────────────┘
```

---

## 2. Request Flow

Rootly follows a strict decoupled data-fetch flow to ensure caching, validation, security, and rate limiting:

1. **Trigger**: A Client Component or user action triggers a state mutation or data query via a custom hook (wrapped in React Query).
2. **Client-side caching**: React Query checks the local cache. If the query is fresh, it resolves instantly. If stale or a mutation is triggered, a `fetch()` is made to the Next.js API route with the user's `Authorization: Bearer <Firebase_ID_Token>` header.
3. **Authentication & Throttling**: The Next.js API route verifies the token using the `Firebase Admin SDK` (via `verifyAuth` middleware) and enforces rate limits (via `checkRateLimit` middleware) to protect AI or downstream APIs from abuse.
4. **Zod Validation**: Request payloads are parsed and validated at the input boundary.
5. **Services Layer**: The controller forwards to the feature service layer, which communicates with Firestore, the Anthropic API, or Google Maps.
6. **Return**: The API route returns a structured, typed JSON response to the client hook, which refreshes the UI state.

---

## 3. Directory Structure

```
src/
├── app/                        # Next.js App Router root layout and paths
│   ├── api/                    # Server-side Next.js API Endpoints
│   │   ├── activity/           # Logs carbon-emitting activities
│   │   ├── analytics/          # Product metrics and aggregation telemetry
│   │   ├── chat/               # Coach conversations with Anthropic SDK
│   │   ├── exports/            # Server-side CSV/PDF/Sheets data compile
│   │   ├── goals/              # Goals CRUD
│   │   ├── reports/            # Weekly intelligence generation
│   │   ├── routes/             # Route maps comparison
│   │   └── voice/              # Audio file transcriptions & Claude extraction
│   └── (app)/                  # Auth-guarded core client route group
│
├── features/                   # Isolated client feature folders
│   ├── activity/               # Interactive activity logs and calendar dashboard
│   ├── analytics/              # Telemetry dashboard
│   ├── chat/                   # Coach client and message lists
│   ├── exports/                # Export management panels and log history
│   └── ...                     # Feature UI pages (goals, voice, profile)
│
├── components/                 # Reusable UI system components
│   ├── glass/                  # Glassmorphism primitives (GlassCard, DotGrid)
│   ├── layout/                 # Floating navigation layouts
│   └── shared/                 # Custom charts (ScoreRing, KineticBar)
│
├── services/                   # Frontend Firebase initialization
│
├── backend/                    # Server-side Business Logic layer
│   ├── features/               # Feature repositories, services, controllers
│   ├── middleware/             # Rate limiter, Zod validations, verifyAuth
│   └── lib/                    # Firebase Admin and helper modules
│
├── store/                      # Zustand frontend state stores (auth, chat)
└── types/                      # Universal TypeScript interfaces
```

---

## 4. AI Pipelines Architecture

Rootly leverages Anthropic's Claude models to orchestrate intelligence briefings, conversational coaching, and speech-to-text semantic parsing.

### A. Conversation Coach (`/api/chat`)
- **Model**: `claude-3-5-sonnet` (low latency, high logic).
- **Execution Flow**:
  1. Authenticates the client token.
  2. Queries user statistics (carbon score, active goals, weekly activities).
  3. Formulates a system prompt containing the user's specific context.
  4. Calls the Anthropic API with conversation history.
  5. Stores the assistant response in the user's conversation collection.

### B. Weekly Intelligence Reports (`/api/reports`)
- **Model**: `claude-3-5-sonnet` or `claude-3-opus`.
- **Execution Flow**:
  1. Gathers the last 7 days of activities and compares them with the previous week.
  2. Submits activities, emission breakdowns, and current goals to Claude.
  3. Claude returns a structured JSON payload containing a narrative summary, category emissions delta, and prioritized action recommendations.
  4. Saves the generated report to Firestore.

### C. Voice Activity Logger (`/api/voice`)
- **Model**: Google Speech-to-Text + `claude-3-5-sonnet`.
- **Execution Flow**:
  1. Receives an audio file (WebM / Opus format).
  2. Transcribes the audio into raw text.
  3. Submits the raw transcript to Claude with instructions to extract structured activities (description, quantity, category, and transport type).
  4. Applies standard emission factors to the extractions.
  5. Returns structured items to the client for final verification.

---

## 5. State Management Strategy

Rootly balances Zustand and React Query (TanStack Query) to manage state efficiently:

| State Type | Management tool | Architectural Rationale |
|---|---|---|
| **Auth Session** | Zustand `userStore` | Synchronous, globally required, handles client redirects. |
| **Active Chat** | Zustand `chatStore` | Supports optimistic UI updates and response buffering. |
| **Logged Activities** | Zustand + React Query | Syncs with Firestore on mutation; Zustand caches for instant dashboard renders. |
| **Active Goals** | React Query | Server-authoritative data; cached automatically based on token expiration. |
| **Weekly Reports** | React Query | Static documents; immutable after server generation. |

---

## 6. Architectural Decisions and Tradeoffs

1. **In-Memory Rate Limiting vs. Redis**:
   - *Decision*: Next.js memory-cache (`Map`) limits requests.
   - *Tradeoff*: Quick setup and zero infrastructure cost. However, it resets on serverless cold starts. Scalability plans include moving to a Redis-backed rate limiter (e.g. Upstash).
2. **Serverless Exports vs. Storage Buckets**:
   - *Decision*: Generate CSV/PDF on the server dynamically, convert to Base64 data-URIs, and download instantly without saving physical files in Cloud Storage.
   - *Tradeoff*: Saves storage cost and simplifies data privacy (GDPR compliance), but limits exports to a reasonable payload size (handled by Zod validations).
3. **Stubs / Fallbacks for Local Mode**:
   - *Decision*: Both repositories (Goals, Reports, Exports, Activities) support fallback memory storage when `FIREBASE_SERVICE_ACCOUNT_KEY` is not present.
   - *Tradeoff*: Simplifies local testing and local onboarding, but requires careful synchronization during integration testing.
