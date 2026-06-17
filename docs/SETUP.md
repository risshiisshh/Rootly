# Rootly — Development Setup Guide

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 18.17 | [nodejs.org](https://nodejs.org) |
| npm | ≥ 9.0 | Included with Node.js |
| Firebase CLI | Latest | `npx firebase-tools@latest` |
| Git | Any | [git-scm.com](https://git-scm.com) |

---

## Step 1 — Firebase Project Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Enable **Authentication**:
   - Go to Authentication → Sign-in method
   - Enable **Google** and **Email/Password**
4. Enable **Firestore Database**:
   - Go to Firestore Database → Create database
   - Start in **production mode** (rules will be deployed)
   - Choose a region close to your users
5. Generate a **Service Account** key:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

---

## Step 2 — Google Maps API Key

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select your project or create one
3. Enable the **Directions API**:
   - APIs & Services → Library → search "Directions API" → Enable
4. Create an API key:
   - APIs & Services → Credentials → Create Credentials → API Key
5. Restrict the key:
   - API restrictions: Directions API only
   - Application restrictions: HTTP referrers (your domain)

---

## Step 3 — Google Gemini API Key

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Create an account or sign in
3. Click "Get API key" and then "Create API key"
4. Save the key

**Models used:**
- `gemini-3.5-flash` — real-time chat, voice extraction, weekly reports, route reasoning

---

## Step 4 — Environment Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```bash
# ─── Firebase Client (public — safe to expose) ───────────
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# ─── Firebase Admin (server-side only) ───────────────────
FIREBASE_ADMIN_PROJECT_ID=your-project
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"

# ─── Google Gemini (server-side only) ────────────────────
GEMINI_API_KEY=AQ.Ab8RN6IJXqQ7...

# ─── Google Maps (server-side only) ──────────────────────
GOOGLE_MAPS_API_KEY=AIzaSy...
```

**Important:** The `FIREBASE_ADMIN_PRIVATE_KEY` must include the `\n` newlines as literal characters in the `.env.local` file, wrapped in double quotes.

---

## Step 5 — Install Dependencies

```bash
npm install
```

---

## Step 6 — Deploy Firestore Rules and Indexes

```bash
# Authenticate with Firebase
npx firebase-tools login

# Set active project
npx firebase-tools use your-project-id

# Deploy rules and indexes
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

---

## Step 7 — Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The first load will show the landing page. Click "Begin Mission" to sign in.

---

## Step 8 — Verify Setup

Test each feature:

- [ ] Sign in with Google
- [ ] Dashboard loads with score ring
- [ ] AI Coach responds to a message
- [ ] Voice logging: click mic, speak, see extraction
- [ ] Activity log: type an activity, AI parses it
- [ ] Routes: enter two locations, see comparison
- [ ] Reports: click "Generate Briefing"
- [ ] Goals: create a mission
- [ ] Exports: download CSV

---

## Common Issues

### "Firebase Admin key not found"

The `FIREBASE_ADMIN_PRIVATE_KEY` environment variable contains literal `\n`. Make sure you:
1. Wrap the entire value in double quotes in `.env.local`
2. The key content has `\n` as literal two-character sequences (not newlines)

### "Gemini API quota exceeded"

If you hit API quota or rate limits on Google Gemini, check the Google AI Studio console for quota allocations and billing configurations.

### "Maps Directions API error"

Ensure the Directions API is enabled in your Google Cloud project and your API key has no overly-restrictive HTTP referrer restrictions in development.

### Port already in use

```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

---

## Running Tests

```bash
# Unit + integration tests
npm run test

# Watch mode
npm run test -- --watch

# Coverage report
npm run test -- --coverage
```

---

## Building for Production

```bash
npm run build
npm run start
```

A successful build with zero TypeScript errors confirms the application is production-ready.
