# Rootly AI — Carbon Footprint Awareness Platform

## Overview

Rootly is a premium AI-powered sustainability coach that transforms carbon footprint tracking into an intelligent, action-oriented experience. Unlike dashboards that just show data, Rootly functions as a contextual AI coach that understands your behaviour patterns and gives personalized, quantified recommendations.

Built with **Next.js 15 App Router**, **TypeScript**, **Firebase**, and **Claude AI (Anthropic)**.

---

## Screenshots

> The design is based on a Stitch-generated glassmorphism design system featuring dark surfaces, kinetic green gradients, dot-grid backgrounds, and pill-shaped floating navigation.

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Firebase project (Firestore + Auth enabled)
- Anthropic API key (Claude access)
- Google Maps Platform API key (Directions API enabled)

### 1. Clone and install

```bash
git clone <repo>
cd Rootly
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your keys
```

See [SETUP.md](./SETUP.md) for detailed environment configuration.

### 3. Deploy Firestore rules and indexes

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Feature Overview

| Feature | Route | Description |
|---|---|---|
| Landing | `/` | Animated Precision Forest hero with video background |
| Auth | `/auth/signin` | Google OAuth + email/password |
| Dashboard | `/dashboard` | Score ring, weekly summary, quick actions |
| AI Coach | `/coach` | Real-time chat with context-aware Claude |
| Voice Logging | `/voice` | Speak activities — AI extracts and categorises |
| Activity Log | `/activity` | Manual log with AI-assisted parsing |
| Route Compare | `/routes` | Compare transport options by CO₂ + Maps API |
| Insights | `/insights` | Trend charts, monthly breakdown, patterns |
| Weekly Report | `/reports` | Claude Opus generates narrative briefing |
| Goals | `/goals` | Mission objectives with circular progress |
| Profile | `/profile` | Stats, achievements, heatmap, settings |
| Exports | `/exports` | Download data as JSON, CSV, or PDF report |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + custom glassmorphism CSS |
| Animation | Framer Motion |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| AI | Anthropic Claude (Sonnet 4 + Opus 4) |
| Maps | Google Maps Directions API |
| State | Zustand |
| Data fetching | TanStack React Query |
| Validation | Zod |
| Testing | Vitest + React Testing Library |

---

## Project Structure

```
src/
  app/          → Next.js App Router routes
  features/     → Isolated feature modules (Client components)
  components/   → Shared UI components
  services/     → External API integrations
  hooks/        → React Query + stateful hooks
  store/        → Zustand state stores
  types/        → TypeScript interfaces
  lib/          → Pure utilities and constants
  tests/        → Unit, integration, accessibility tests
docs/           → Project documentation
firestore.rules → Firestore security rules
firestore.indexes.json → Compound index definitions
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full system design.

---

## Scripts

```bash
npm run dev      # Start development server (port 3000)
npm run build    # Production build
npm run start    # Run production build locally
npm run lint     # ESLint check
npm run test     # Vitest unit + integration tests
npm run test:ui  # Vitest UI mode
```

---

## Security

All API keys are server-side only. The client never sees Anthropic or Google Maps keys. See [SECURITY.md](./SECURITY.md).

---

## License

Private — all rights reserved.
