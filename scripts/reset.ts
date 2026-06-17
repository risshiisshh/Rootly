import * as fs from 'fs'
import * as path from 'path'
import { personas } from './personas'

// 1. Manually parse .env.local before importing firebaseAdmin to avoid ESM hoisting evaluation issues
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    console.log(`[Env] Loading environment variables from ${envPath}`)
    const envContent = fs.readFileSync(envPath, 'utf8')
    const lines = envContent.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const firstEq = trimmed.indexOf('=')
      if (firstEq === -1) continue
      const key = trimmed.substring(0, firstEq).trim()
      let val = trimmed.substring(firstEq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1)
      }
      process.env[key] = val
    }
  } else {
    console.warn(`[Env] Warning: .env.local not found at ${envPath}`)
  }
}

loadEnv()

async function main() {
  // 2. Dynamic import firebaseAdmin after env variables have been loaded
  const { adminDb, adminAuth, isFirebaseAdminConfigured } = await import('../src/backend/lib/firebaseAdmin')

  if (!isFirebaseAdminConfigured) {
    console.error('[-] Error: Firebase Admin is not configured. Please check your credentials in .env.local.')
    process.exit(1)
  }

  console.log('[*] Starting Database Reset...')

  const uids = personas.map(p => p.uid)
  const emails = personas.map(p => p.email)

  // 3. Delete Firebase Auth Users
  console.log('[*] Cleaning up Firebase Auth users...')
  for (const email of emails) {
    try {
      const userRecord = await adminAuth.getUserByEmail(email)
      await adminAuth.deleteUser(userRecord.uid)
      console.log(`[+] Deleted Auth user: ${email} (${userRecord.uid})`)
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        console.log(`[ ] Auth user not found (already clean): ${email}`)
      } else {
        console.error(`[-] Failed to delete Auth user ${email}:`, err.message || err)
      }
    }
  }

  // 4. Delete Firestore Data
  const collectionsWithUserId = [
    'activities',
    'goals',
    'recommendations',
    'weeklyReports',
    'routeComparisons',
    'voiceLogs',
  ]

  for (const uid of uids) {
    console.log(`\n[*] Deleting Firestore documents for User: ${uid}`)

    // Delete matching records in flat root collections
    for (const colName of collectionsWithUserId) {
      try {
        const snap = await adminDb.collection(colName).where('userId', '==', uid).get()
        if (snap.empty) {
          console.log(`[ ] No documents found in ${colName}`)
          continue
        }

        const batch = adminDb.batch()
        snap.docs.forEach((doc: any) => {
          batch.delete(doc.ref)
        })
        await batch.commit()
        console.log(`[+] Deleted ${snap.size} documents from ${colName}`)
      } catch (err: any) {
        console.error(`[-] Error deleting from ${colName}:`, err.message || err)
      }
    }

    // Delete messages from subcollection and their conversations
    try {
      const convSnap = await adminDb.collection('conversations').where('userId', '==', uid).get()
      if (!convSnap.empty) {
        console.log(`[*] Deleting ${convSnap.size} conversations and their message subcollections...`)
        
        for (const convDoc of convSnap.docs) {
          // Get messages in subcollection
          const msgSnap = await convDoc.ref.collection('messages').get()
          if (!msgSnap.empty) {
            const msgBatch = adminDb.batch()
            msgSnap.docs.forEach((msgDoc: any) => {
              msgBatch.delete(msgDoc.ref)
            })
            await msgBatch.commit()
            console.log(`  [+] Deleted ${msgSnap.size} messages inside conversation ${convDoc.id}`)
          }
          
          // Delete conversation doc
          await convDoc.ref.delete()
          console.log(`  [+] Deleted conversation document ${convDoc.id}`)
        }
      } else {
        console.log('[ ] No conversations found')
      }
    } catch (err: any) {
      console.error('[-] Error deleting conversations:', err.message || err)
    }

    // Delete User profile itself
    try {
      const userRef = adminDb.collection('users').doc(uid)
      const userDoc = await userRef.get()
      if (userDoc.exists) {
        await userRef.delete()
        console.log(`[+] Deleted user profile document in 'users'`)
      } else {
        console.log(`[ ] User profile document in 'users' already deleted`)
      }
    } catch (err: any) {
      console.error(`[-] Error deleting user doc for ${uid}:`, err.message || err)
    }
  }

  console.log('\n[+] Database Reset Complete.')
}

main().catch(err => {
  console.error('[-] Critical failure in reset script:', err)
  process.exit(1)
})
