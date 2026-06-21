// Node.js v22+ introduces a native global localStorage that is incomplete or lacks typical methods
// during Next.js SSR. This causes Firebase Auth to crash with "localStorage.getItem is not a function".
// We delete it on the server side so Firebase falls back to memory persistence safely.
if (typeof window === 'undefined' && typeof global !== 'undefined' && 'localStorage' in global) {
  try {
    delete (global as any).localStorage
  } catch (e) {
    // Ignore
  }
}

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore'
import { getClientEnv } from '@/lib/env'

const firebaseConfig = {
  apiKey: getClientEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: getClientEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getClientEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: getClientEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getClientEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getClientEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
}

const apiKey = getClientEnv('NEXT_PUBLIC_FIREBASE_API_KEY')
const forceDemo = getClientEnv('NEXT_PUBLIC_FORCE_DEMO') === 'true'
export const isFirebaseConfigured = !forceDemo && !!apiKey && apiKey !== '' && apiKey !== 'your_firebase_api_key'

// Initialize Firebase only when a real API key is available.
// During Next.js build/static analysis no env vars are present — guard against that.
let app: FirebaseApp
let auth: Auth
let db: Firestore

if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  auth = getAuth(app)
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  } catch (e) {
    db = getFirestore(app)
  }
} else {
  // Stub values used only during build-time static analysis.
  // No actual Firebase calls will succeed without real config.
  app = {} as FirebaseApp
  auth = {} as Auth
  db = {} as Firestore
}

export { auth, db }
export default app
