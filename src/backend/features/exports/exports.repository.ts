import { adminDb, isFirebaseAdminConfigured } from '../../lib/firebaseAdmin'
import { Timestamp } from 'firebase-admin/firestore'
import type { ExportFormat, ExportRange, ExportContentType, ExportRecord } from '@/types/export'

// In-memory mock database for demo mode
const mockExports: any[] = [
  {
    id: 'mock-exp-1',
    userId: 'demo-user-id',
    format: 'csv' as ExportFormat,
    contentType: 'activity-history' as ExportContentType,
    dateRange: '30d' as ExportRange,
    status: 'completed' as const,
    downloadUrl: 'data:text/csv;base64,QWN0aXZpdHksQ2F0ZWdvcnksUXVhbnRpdHksRW1pc3Npb24sRGF0ZQpNZWFsLEZvb2QsMSwwLjgsMjAyNi0wNi0xNg==',
    createdAt: Timestamp.fromDate(new Date(Date.now() - 2 * 60 * 60 * 1000)) as any,
  },
  {
    id: 'mock-exp-2',
    userId: 'demo-user-id',
    format: 'sheets' as ExportFormat,
    contentType: 'goals-progress' as ExportContentType,
    dateRange: 'all' as ExportRange,
    status: 'completed' as const,
    downloadUrl: 'https://docs.google.com/spreadsheets/d/mock-rootly-export-goals/view',
    createdAt: Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)) as any,
  }
]

export class ExportsRepository {
  async createRecord(
    userId: string,
    record: Omit<ExportRecord, 'id' | 'createdAt'>
  ): Promise<string> {
    if (!isFirebaseAdminConfigured) {
      const id = `mock-exp-${Date.now()}`
      mockExports.unshift({
        id,
        ...record,
        createdAt: Timestamp.now() as any,
      })
      return id
    }

    const docRef = await adminDb.collection('exports_history').add({
      ...record,
      createdAt: Timestamp.now(),
    })
    return docRef.id
  }

  async updateRecordStatus(
    id: string,
    status: 'completed' | 'failed',
    details: { downloadUrl?: string; errorMessage?: string }
  ): Promise<void> {
    if (!isFirebaseAdminConfigured) {
      const idx = mockExports.findIndex((e) => e.id === id)
      if (idx !== -1) {
        mockExports[idx] = {
          ...mockExports[idx],
          status,
          ...details,
        }
      }
      return
    }

    await adminDb.collection('exports_history').doc(id).update({
      status,
      ...details,
    })
  }

  async findByUserId(userId: string): Promise<ExportRecord[]> {
    if (!isFirebaseAdminConfigured) {
      return mockExports.filter((e) => e.userId === userId) as any[]
    }

    const snap = await adminDb
      .collection('exports_history')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    return snap.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
      } as ExportRecord
    })
  }
}

export const exportsRepository = new ExportsRepository()
export { mockExports }
