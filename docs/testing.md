# Rootly - Testing Strategy

This document outlines the testing strategy, frameworks, execution guidelines, mock servers, and directory structures.

---

## 1. Testing Frameworks

Rootly uses Vitest for low-latency testing, combined with testing utilities for API and UI rendering:

- **Vitest**: Unit testing runner. Combines fast ES module parsing with Jest-compatible matching APIs.
- **Mock Service Worker (MSW)**: Intercepts network calls (`fetch`) at the network layer during integration tests. This allows testing components against actual API routes without hitting real endpoints (e.g. Gemini, Google Maps).
- **React Testing Library (RTL)**: Renders and tests UI components under jsdom environment configurations.

---

## 2. Testing Environments & Setup

The test configuration is split across global vitest configs and setup overrides:

### A. Config: `vitest.config.ts`
Sets up path mappings (e.g. `@/*` resolving to `src/*`), enables CSS parsing stubs, and sets up the test environment to `jsdom`.

### B. Global Setup: `src/tests/setup.ts`
- Mocks out the browser environment parameters (e.g. `MediaRecorder`, `window.localStorage`, and Web Crypto APIs).
- Initializes MSW server hooks to automatically intercept and mock all network calls:
  ```typescript
  beforeAll(() => mswServer.listen())
  afterEach(() => mswServer.resetHandlers())
  afterAll(() => mswServer.close())
  ```
- Mocks Firebase Client SDK functions (`getAuth`, `initializeApp`) to run in local-only demo mode during execution.

---

## 3. Test File Layout

Test suites are located in the `src/tests/` directory:

```
src/tests/
├── setup.ts                    # Global vitest bootstrap & MSW lifecycle
├── mocks/                      # MSW handlers and json responses
│   ├── handlers.ts             # Intercepts /api/chat, /api/voice, etc.
│   └── responseTemplates/      # Mock payloads for Gemini API calls
│
├── unit/                       # Component-level isolated logic tests
│   ├── analytics.test.ts       # Validates tracker, hashing, batching
│   ├── exports.test.ts         # Validates CSV, PDF generators, rate limiters
│   ├── emission-calc.test.ts   # Core math verification for carbon calculations
│   └── validators.test.ts      # Checks Zod schema validation rules
│
└── integration/                # Feature-level UI component tests
    ├── hooks.test.ts           # React Query custom hook pipelines
    ├── components.test.tsx     # Custom GlassCard, FloatingNav renders
    └── features.test.tsx       # Auth-state rendering and user actions
```

---

## 4. Execution Commands

Run tests using npm scripts:

```bash
# Run the complete test suite once
npm run test

# Run tests in hot-reload watch mode (ideal for active development)
npm run test:watch

# Launch visual interactive vitest dashboard
npm run test:ui

# Generate test coverage report
npm run test:coverage
```

The test coverage report is configured in `vitest.config.ts` to output HTML reports under the `coverage/` directory using standard V8 metrics.

---

## 5. Mocking Third-Party Vendors

During tests, outbound requests are stubbed to avoid API calls:
- **Google Gemini Calls**: MSW intercepts POST `/api/chat` and `/api/reports` and returns pre-configured mock JSON reports.
- **Google Maps Directions**: Mocked inside `src/tests/mocks/handlers.ts` to return static route coordinates and travel distance (e.g., 4.2 km).
- **Firebase Auth**: Verifies tokens using static stubs. The authorization token `'valid-token'` automatically resolves to a mock user record.
- **Google Speech-to-Text**: Mocked inside `src/tests/unit/voice.test.ts` to return static transcripts when audio blobs are processed.
