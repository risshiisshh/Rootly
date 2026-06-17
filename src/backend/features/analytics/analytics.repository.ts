import { adminDb, isFirebaseAdminConfigured } from '../../lib/firebaseAdmin'
import type { QueuedEvent } from '@/lib/analytics'
import { FieldValue } from 'firebase-admin/firestore'

export interface DailyAnalytics {
  date: string
  counts: Record<string, number>
  uniqueUsers: string[]
}

export interface UserDailyAnalytics {
  date: string
  hashedUid: string
  counts: Record<string, number>
}

// In-memory mocks for demo mode
const mockDailyAnalytics: Record<string, DailyAnalytics> = {
  '2026-06-12': {
    date: '2026-06-12',
    counts: { USER_LOGIN: 5, ACTIVITY_LOGGED: 12, VOICE_LOGGING: 3, CHAT_USAGE: 20, ROUTE_COMPARISON: 6, GOAL_COMPLETION: 2, REPORT_GENERATION: 4, RECOMMENDATION_ACCEPTANCE: 3 },
    uniqueUsers: ['user-hash-1', 'user-hash-2', 'user-hash-3'],
  },
  '2026-06-13': {
    date: '2026-06-13',
    counts: { USER_LOGIN: 6, ACTIVITY_LOGGED: 15, VOICE_LOGGING: 4, CHAT_USAGE: 24, ROUTE_COMPARISON: 8, GOAL_COMPLETION: 3, REPORT_GENERATION: 5, RECOMMENDATION_ACCEPTANCE: 4 },
    uniqueUsers: ['user-hash-1', 'user-hash-2', 'user-hash-3', 'user-hash-4'],
  },
  '2026-06-14': {
    date: '2026-06-14',
    counts: { USER_LOGIN: 8, ACTIVITY_LOGGED: 22, VOICE_LOGGING: 5, CHAT_USAGE: 35, ROUTE_COMPARISON: 12, GOAL_COMPLETION: 4, REPORT_GENERATION: 6, RECOMMENDATION_ACCEPTANCE: 5 },
    uniqueUsers: ['user-hash-1', 'user-hash-2', 'user-hash-3', 'user-hash-5', 'user-hash-6'],
  },
  '2026-06-15': {
    date: '2026-06-15',
    counts: { USER_LOGIN: 10, ACTIVITY_LOGGED: 28, VOICE_LOGGING: 7, CHAT_USAGE: 48, ROUTE_COMPARISON: 15, GOAL_COMPLETION: 5, REPORT_GENERATION: 8, RECOMMENDATION_ACCEPTANCE: 7 },
    uniqueUsers: ['user-hash-1', 'user-hash-2', 'user-hash-4', 'user-hash-5', 'user-hash-6', 'user-hash-7'],
  },
  '2026-06-16': {
    date: '2026-06-16',
    counts: { USER_LOGIN: 12, ACTIVITY_LOGGED: 34, VOICE_LOGGING: 8, CHAT_USAGE: 55, ROUTE_COMPARISON: 18, GOAL_COMPLETION: 6, REPORT_GENERATION: 10, RECOMMENDATION_ACCEPTANCE: 9 },
    uniqueUsers: ['user-hash-1', 'user-hash-2', 'user-hash-3', 'user-hash-4', 'user-hash-5', 'user-hash-6', 'user-hash-7', 'user-hash-8'],
  },
}

const mockUserDailyAnalytics: Record<string, UserDailyAnalytics> = {}

export class AnalyticsRepository {
  async saveBatch(events: QueuedEvent[]): Promise<void> {
    if (!isFirebaseAdminConfigured) {
      // Run in-memory updates
      for (const event of events) {
        const dateStr = new Date(event.timestamp).toISOString().split('T')[0]
        
        // 1. Update daily summary
        if (!mockDailyAnalytics[dateStr]) {
          mockDailyAnalytics[dateStr] = {
            date: dateStr,
            counts: {},
            uniqueUsers: [],
          }
        }
        const daily = mockDailyAnalytics[dateStr]
        daily.counts[event.type] = (daily.counts[event.type] || 0) + 1
        if (!daily.uniqueUsers.includes(event.hashedUid)) {
          daily.uniqueUsers.push(event.hashedUid)
        }

        // 2. Update user daily summary
        const userKey = `${event.hashedUid}_${dateStr}`
        if (!mockUserDailyAnalytics[userKey]) {
          mockUserDailyAnalytics[userKey] = {
            date: dateStr,
            hashedUid: event.hashedUid,
            counts: {},
          }
        }
        const userDaily = mockUserDailyAnalytics[userKey]
        userDaily.counts[event.type] = (userDaily.counts[event.type] || 0) + 1
      }
      return
    }

    // Process using Firestore transactions/batches
    const batch = adminDb.batch()

    for (const event of events) {
      const dateStr = new Date(event.timestamp).toISOString().split('T')[0]

      // Daily stats document ref
      const dailyRef = adminDb.collection('analytics_daily').doc(dateStr)
      // User daily stats document ref
      const userDailyRef = adminDb.collection('analytics_user_daily').doc(`${event.hashedUid}_${dateStr}`)

      // Prepare updates using FieldValue increments
      const dailyUpdate: Record<string, any> = {
        date: dateStr,
        [`counts.${event.type}`]: FieldValue.increment(1),
      }
      if (event.hashedUid !== 'anonymous') {
        dailyUpdate.uniqueUsers = FieldValue.arrayUnion(event.hashedUid)
      }

      const userDailyUpdate: Record<string, any> = {
        date: dateStr,
        hashedUid: event.hashedUid,
        [`counts.${event.type}`]: FieldValue.increment(1),
      }

      batch.set(dailyRef, dailyUpdate, { merge: true })
      batch.set(userDailyRef, userDailyUpdate, { merge: true })
    }

    await batch.commit()
  }

  async getDailyMetrics(limitDays = 30): Promise<DailyAnalytics[]> {
    if (!isFirebaseAdminConfigured) {
      return Object.values(mockDailyAnalytics)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-limitDays)
    }

    const snap = await adminDb.collection('analytics_daily')
      .orderBy('date', 'desc')
      .limit(limitDays)
      .get()

    const results = snap.docs.map((doc: any) => {
      const data = doc.data()
      return {
        date: doc.id,
        counts: data.counts || {},
        uniqueUsers: data.uniqueUsers || [],
      } as DailyAnalytics
    })

    return results.reverse()
  }
}

export const analyticsRepository = new AnalyticsRepository()
