import { adminDb, isFirebaseAdminConfigured } from '../../lib/firebaseAdmin'
import type { WeeklyReport } from '@/types/report'
import { Timestamp } from 'firebase-admin/firestore'

const mockWeeklyReports: WeeklyReport[] = [
  {
    id: 'mock-rep-1',
    userId: 'demo-user-id',
    weekStart: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) as any,
    weekEnd: Timestamp.now() as any,
    totalEmissionsKg: 34.5,
    carbonScore: 82,
    previousScore: 78,
    scoreDelta: 4,
    topContributors: [
      { category: 'energy', percentage: 55, emissionsKg: 19.0 },
      { category: 'transportation', percentage: 30, emissionsKg: 10.35 },
      { category: 'diet', percentage: 15, emissionsKg: 5.15 },
    ],
    recommendations: [
      {
        id: 'mock-rec-1',
        title: 'Adjust Thermostat by 1°C',
        description: 'Lowering your heating by just 1 degree saves significant gas energy.',
        potentialSavingsKg: 5.2,
        priority: 'high',
        category: 'energy',
      },
      {
        id: 'mock-rec-2',
        title: 'Carpool or Take Transit on Thursdays',
        description: 'Your Thursday driving commute is your highest transit emitter.',
        potentialSavingsKg: 3.5,
        priority: 'medium',
        category: 'transportation',
      }
    ],
    trend: 'improving',
    narrative: 'You have done a fantastic job lowering your transport emissions this week by taking the train. Keep it up!',
    projectedAnnualKg: 1794,
    generatedAt: Timestamp.now() as any,
  }
]

export class ReportsRepository {
  async save(userId: string, report: Omit<WeeklyReport, 'id' | 'generatedAt'>): Promise<string> {
    if (!isFirebaseAdminConfigured) {
      const id = `mock-rep-${Date.now()}`
      mockWeeklyReports.unshift({
        id,
        ...report,
        generatedAt: Timestamp.now() as any,
      })
      return id
    }

    const docRef = await adminDb.collection('weeklyReports').add({
      ...report,
      userId,
      generatedAt: Timestamp.now(),
    })
    return docRef.id
  }

  async findLatest(userId: string): Promise<WeeklyReport | null> {
    if (!isFirebaseAdminConfigured) {
      const userReps = mockWeeklyReports.filter(r => r.userId === userId)
      return userReps.length > 0 ? userReps[0] : null
    }

    const snap = await adminDb.collection('weeklyReports')
      .where('userId', '==', userId)
      .orderBy('generatedAt', 'desc')
      .limit(1)
      .get()

    if (snap.empty) return null
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as WeeklyReport
  }
}

export const reportsRepository = new ReportsRepository()
export { mockWeeklyReports }
