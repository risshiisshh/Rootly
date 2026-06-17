import * as fs from 'fs'
import * as path from 'path'
import { Timestamp } from 'firebase-admin/firestore'
import { personas } from './personas'
import {
  generateActivities,
  generateGoals,
  generateWeeklyReports,
  generateRecommendations,
  generateChatHistory,
  generateRouteComparisons,
  generateVoiceLogs
} from './generators'

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

// Helper to write Firestore documents in batches of 400 (Firestore limit is 500)
async function batchWrite(adminDb: any, collectionName: string, items: any[]) {
  const chunkSize = 400
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    const batch = adminDb.batch()
    for (const item of chunk) {
      const docRef = adminDb.collection(collectionName).doc(item.id)
      batch.set(docRef, item)
    }
    await batch.commit()
  }
}

async function main() {
  // 2. Dynamic import firebaseAdmin after env variables have been loaded
  const { adminDb, adminAuth, isFirebaseAdminConfigured } = await import('../src/backend/lib/firebaseAdmin')
  const isDryRun = !isFirebaseAdminConfigured || process.argv.includes('--dry-run')

  if (isDryRun) {
    console.log('\n⚠️  WARNING: Firebase Admin is not configured or --dry-run was specified.')
    console.log('👉 Running in DRY-RUN mode. All mock data will be generated and validated in-memory, but nothing will be written to Firestore or Firebase Auth.\n')
  }

  console.log('[*] Starting Database Seeding Process...')

  for (const persona of personas) {
    console.log(`\n==================================================`)
    console.log(`[*] Processing Profile: ${persona.displayName} (${persona.email})`)
    console.log(`==================================================`)

    if (!isDryRun) {
      // Create/Retrieve Auth User
      try {
        await adminAuth.createUser({
          uid: persona.uid,
          email: persona.email,
          password: 'RootlyDemo123!',
          displayName: persona.displayName,
        })
        console.log(`[+] Created Firebase Auth user: ${persona.email}`)
      } catch (err: any) {
        if (err.code === 'auth/email-already-exists' || err.code === 'auth/uid-already-exists') {
          console.log(`[ ] Firebase Auth user already exists: ${persona.email}`)
        } else {
          console.error(`[-] Warning during Auth creation:`, err.message || err)
        }
      }
    }

    // Generate Mock Data (60 Days of History)
    const activities = generateActivities(persona, 60)
    const goals = generateGoals(persona.uid)
    const reports = generateWeeklyReports(persona.uid, activities, persona.weeklyGoalKg)
    const recommendations = generateRecommendations(persona.uid)
    const { conversations, messages } = generateChatHistory(persona.uid)
    const routeComparisons = generateRouteComparisons(persona.uid)
    const voiceLogs = generateVoiceLogs(persona.uid)

    // Calculate Coherent User Profile Metrics
    const totalEmissionsKg = parseFloat(activities.reduce((sum, a) => sum + a.emission, 0).toFixed(2))
    const latestScore = reports.length > 1 ? reports[1].carbonScore : (reports.length > 0 ? reports[0].carbonScore : persona.carbonScore)

    const userProfileDoc = {
      uid: persona.uid,
      displayName: persona.displayName,
      email: persona.email,
      photoURL: null,
      carbonScore: latestScore,
      totalEmissionsKg,
      weeklyGoalKg: persona.weeklyGoalKg,
      createdAt: Timestamp.fromDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)),
      updatedAt: Timestamp.now()
    }

    // Validation Logging
    console.log(`📊 In-Memory Validation Summary for ${persona.displayName}:`)
    console.log(`   - Carbon Score (Latest Profile): ${latestScore} / 100`)
    console.log(`   - 60-Day Total Emissions: ${totalEmissionsKg.toFixed(1)} kg CO2e`)
    console.log(`   - Activities Generated: ${activities.length} records`)
    console.log(`   - Goals Configured: ${goals.length} targets`)
    console.log(`   - Weekly Reports Compiled: ${reports.length} reports`)
    if (reports.length > 0) {
      console.log(`     Report Scores (latest 3 weeks): ${reports.slice(0, 3).map(r => `Week starting ${r.weekStart.toDate().toLocaleDateString()}: Score ${r.carbonScore} (${r.totalEmissionsKg.toFixed(1)} kg)`).join(' | ')}`)
    }
    console.log(`   - Route Comparisons: ${routeComparisons.length} routes`)
    console.log(`   - Voice Transcript Logs: ${voiceLogs.length} entries`)
    console.log(`   - Chat Conversations: ${conversations.length} sessions`)
    
    // Check Date Coverage
    if (activities.length > 0) {
      const timestamps = activities.map(a => {
        const t = a.timestamp as any
        return t.toDate ? t.toDate() : new Date(t)
      })
      const minDate = new Date(Math.min(...timestamps.map(t => t.getTime())))
      const maxDate = new Date(Math.max(...timestamps.map(t => t.getTime())))
      console.log(`   - Historical Date Span: ${minDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}`)
    }

    if (!isDryRun) {
      // Ingest Data into Firestore
      console.log(`[*] Ingesting user profile document...`)
      await adminDb.collection('users').doc(persona.uid).set(userProfileDoc)

      console.log(`[*] Ingesting activities in batches...`)
      await batchWrite(adminDb, 'activities', activities)
      console.log(`    [+] Ingested ${activities.length} activities.`)

      console.log(`[*] Ingesting goals...`)
      await batchWrite(adminDb, 'goals', goals)
      console.log(`    [+] Ingested ${goals.length} goals.`)

      console.log(`[*] Ingesting weekly reports...`)
      await batchWrite(adminDb, 'weeklyReports', reports)
      console.log(`    [+] Ingested ${reports.length} reports.`)

      console.log(`[*] Ingesting AI recommendations...`)
      await batchWrite(adminDb, 'recommendations', recommendations)
      console.log(`    [+] Ingested ${recommendations.length} recommendations.`)

      console.log(`[*] Ingesting route comparisons...`)
      await batchWrite(adminDb, 'routeComparisons', routeComparisons)
      console.log(`    [+] Ingested ${routeComparisons.length} route comparisons.`)

      console.log(`[*] Ingesting voice logs...`)
      await batchWrite(adminDb, 'voiceLogs', voiceLogs)
      console.log(`    [+] Ingested ${voiceLogs.length} voice logs.`)

      console.log(`[*] Ingesting chat sessions and messages...`)
      for (const conv of conversations) {
        const convRef = adminDb.collection('conversations').doc(conv.id)
        await convRef.set(conv)
        
        const convMsgs = messages[conv.id] || []
        if (convMsgs.length > 0) {
          const msgBatch = adminDb.batch()
          for (const msg of convMsgs) {
            const msgRef = convRef.collection('messages').doc(msg.id)
            msgBatch.set(msgRef, msg)
          }
          await msgBatch.commit()
        }
        console.log(`    [+] Ingested conversation "${conv.title}" with ${convMsgs.length} messages.`)
      }
    }
  }

  console.log(`\n==================================================`)
  if (isDryRun) {
    console.log(`[+] DRY-RUN Validation Complete! All data generated successfully.`)
  } else {
    console.log(`[+] Database Seeding Completed Successfully!`)
  }
  console.log(`==================================================`)
}

main().catch(err => {
  console.error('[-] Critical failure in seeding script:', err)
  process.exit(1)
})
