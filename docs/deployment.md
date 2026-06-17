# Rootly - Deployment Guide

This document describes the steps required to deploy Rootly to a production environment.

---

## 1. Deployment Requirements

Rootly is deployed as a hybrid frontend/backend application:
- **Hosting**: Vercel (or any Node.js environment supporting Next.js 15).
- **Database & Auth**: Google Firebase (Firestore Native Mode + Firebase Authentication).
- **External Services**: Anthropic (Claude models) and Google Cloud Platform (Maps Directions API).

---

## 2. Production Environment Variables

Ensure the following environment variables are configured in your hosting dashboard (e.g. Vercel Project Settings) and your local `.env.local`:

| Category | Variable Name | Access | Value Description |
|---|---|---|---|
| **Firebase Public** | `NEXT_PUBLIC_FIREBASE_API_KEY` | Browser / Server | Web client API credential |
| | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Browser / Server | `your-project.firebaseapp.com` |
| | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Browser / Server | Google Project ID |
| | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`| Browser / Server | `your-project.appspot.com` |
| | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| Browser / Server | Messaging Sender identifier |
| | `NEXT_PUBLIC_FIREBASE_APP_ID` | Browser / Server | Web client App identifier |
| **Firebase Admin** | `FIREBASE_ADMIN_PROJECT_ID` | Server Only | Google Project ID |
| | `FIREBASE_ADMIN_CLIENT_EMAIL` | Server Only | Service account IAM email address |
| | `FIREBASE_ADMIN_PRIVATE_KEY` | Server Only | Service account private certificate (include `\n`) |
| **AI Models** | `ANTHROPIC_API_KEY` | Server Only | Anthropic Console key |
| **Google Maps** | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`| Browser Only | Google Cloud API key (for maps UI) |
| | `GOOGLE_MAPS_API_KEY` | Server Only | Google Cloud API key (for backend route calls) |
| **NextAuth / Auth** | `NEXTAUTH_SECRET` | Server Only | Encryption key for session cookie tokens |
| | `NEXTAUTH_URL` | Server Only | `https://yourdomain.com` |

> [!IMPORTANT]
> **Admin Private Key Formatting**
> When pasting `FIREBASE_ADMIN_PRIVATE_KEY` into Vercel or environment managers, wrap the key in double quotes (`"`) and ensure literal `\n` characters are preserved (rather than translated into actual newlines).

---

## 3. Firebase Resource Rollout

Deploy security rules and database indexes before building the frontend application:

### A. Prerequisite Install
Ensure the Firebase CLI is installed and authenticated:
```bash
npx firebase-tools login
```

### B. Project Selection
Set the CLI to target your production project:
```bash
npx firebase-tools use your-production-project-id
```

### C. Deploy Database Configurations
Deploy `firestore.rules` and `firestore.indexes.json`:
```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

---

## 4. Building and Deploying to Vercel

Rootly can be deployed to Vercel via Git Integration or the Vercel CLI:

### A. Git Integration (Recommended)
1. Import the repository into your Vercel Dashboard.
2. Select **Next.js** as the Project Framework.
3. Configure the environment variables listed in Section 2.
4. Click **Deploy**. Vercel will automatically build the site and deploy on every push to your main branch.

### B. Manual CLI Deployment
If deploying manually:
```bash
# Install Vercel CLI
npm install -g vercel

# Link project and deploy build
vercel
# Promote build to production
vercel --prod
```

---

## 5. Post-Deployment Checklist

After the build completes, verify the system is fully operational:

1. **Auth Sandbox**: Attempt to create a user profile using Google login. Verify the record is saved to the Firestore `/users` collection.
2. **AI Telemetry**: Log an activity and send a chat message to the Coach. Check `/analytics_daily` inside Firestore to verify count increments are executing without errors.
3. **Maps Latency**: Check route comparisons between two points. Verify routes load successfully and emissions factors are correctly calculated.
4. **Data Exports**: Run a CSV and PDF export. Open the historical logs panel to verify that the download records are successfully created and saved in the history collection.
