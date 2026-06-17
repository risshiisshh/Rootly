# Rootly - Security Design

This document details the Rootly security architecture, threat model controls, credential handling policies, and data privacy policies.

---

## 1. Threat Model & Controls Matrix

Rootly enforces defensive controls at each interface layer:

| Threat Vector | Severity | Mitigation Control |
|---|---|---|
| **Unauthorized Data Exposure** | Critical | Firebase Authentication token verification required on all API endpoints. Firestore Security Rules prevent unauthorized reads. |
| **Cross-User Data Modification** | High | Every Firestore collection ruleset enforces `request.auth.uid == resource.data.userId`. |
| **Downstream API Abuse** | High | Per-user rate-limiting checkpoints on AI and Maps endpoints prevent token drainage and billing spikes. |
| **Credential & API Key Exposure** | Critical | Environment variables are server-side only. Client-side builds contain zero vendor secrets. |
| **Injection Attacks** | Medium | Strict input sanitization via Zod parsing blocks malicious payloads. React default JSX prevents DOM-based XSS. |
| **Cross-Site Request Forgery (CSRF)** | Medium | Firebase Auth session management utilizes strict token architectures and secure cookie configurations. |

---

## 2. API Key and Credential Isolation

Rootly maintains a strict boundary between client-side assets and backend execution environments.

```
┌──────────────────────────────────────┐
│            Client Browser            │
│  • Firebase Client SDK Config        │
│  • Firebase ID Token (Short-lived)   │
│  • ZERO Vendor Secret Keys           │
└──────────────────┬───────────────────┘
                   │
                   │ HTTPS Request (ID Token in Authorization Header)
                   ▼
┌──────────────────────────────────────┐
│          Next.js API Server          │
│  • FIREBASE_ADMIN_PRIVATE_KEY        │
│  • ANTHROPIC_API_KEY (Claude SDK)    │
│  • GOOGLE_MAPS_API_KEY (Directions)  │
│  • Verifies ID Token per request     │
└──────────────────────────────────────┘
```

- **Firebase Config Transparency**: The public variables (`NEXT_PUBLIC_FIREBASE_*`) are safe to expose. Firebase relies on Firestore Security Rules and Authentication checks for database isolation, not API key obscurity.
- **Backend Key Environment**: Keys like `ANTHROPIC_API_KEY` and `FIREBASE_ADMIN_PRIVATE_KEY` are read exclusively by serverless environments on the server. They are never sent to the client browser.

---

## 3. Authentication & JWT Validation Flow

Rootly relies on JWT (JSON Web Token) exchanges backed by Google Firebase Authentication:

1. **Sign-In**: The user authenticates through Google OAuth or email/password.
2. **Token Issuance**: Firebase issues a cryptographically signed ID Token (JWT) with a short time-to-live (TTL) of 1 hour.
3. **API Headers**: For every Next.js API call, the client includes the JWT in the `Authorization: Bearer <ID_Token>` header.
4. **Token Verification**: The server uses the `Firebase Admin SDK` to decode and verify the token signature. If invalid or expired, the request is rejected with `401 Unauthorized`.
5. **Session Scoping**: The verified `uid` claims are extracted and used to fetch user data.

---

## 4. Input Boundary Validation

No payload is processed by controllers before passing through Zod validations (defined in `src/lib/validators.ts`):

- **Data Size Restrictions**: Incoming chat messages are restricted to a maximum length (e.g. 10,000 characters) to prevent database overloading.
- **Value Bounds**: Emission logs and quantities must be positive numbers (`emission >= 0` and `quantity > 0`). Deadline timestamps must be in the future.
- **Strict Typing**: Values like category fields are restricted to strict TypeScript enums (e.g., `'transport' | 'food' | 'energy' | 'lifestyle'`).

---

## 5. Rate Limiting Implementation

API routes are protected by in-memory bucket limits per user (composite keys).
- **Composite Key Generation**: Requests map to a key combining the user's UID and the endpoint (e.g. `chat:user-123`).
- **Sliding Window**: Request volumes are restricted per minute.
- **Mitigation**: Exceeding the request quota throws a `RateLimitError` and returns `429 Too Many Requests`. In multi-server environments, this can be transitioned to Redis (e.g., Upstash).

---

## 6. GDPR and Data Privacy Compliance

### A. Salted UID Hashing for Analytics
To track feature adoption trends without logging personal identities, Rootly hashes UIDs using SHA-256 with a private salt:
- **Operation**: `hashUid(uid + salt)`
- **GDPR Alignment**: Ensures the telemetry database matches zero real user IDs. It is impossible to link tracking metrics to specific accounts, even if data is exposed.

### B. PII Stripping from Metadata
Before flushing events to the server, the `analyticsTracker` sanitizes payloads:
- **Filtered Fields**: Automatically deletes fields like `email`, `displayName`, `transcript`, `text`, `message`, `content`, `origin`, and `destination`.
- **Outcome**: Telemetry aggregates only contain counts and execution events, and never store personal user files or conversations.
