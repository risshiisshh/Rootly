import { Timestamp } from 'firebase/firestore'

export type ExportFormat = 'csv' | 'pdf' | 'sheets'
export type ExportRange = '7d' | '30d' | '90d' | 'all'
export type ExportContentType = 'activity-history' | 'weekly-reports' | 'goals-progress'

export interface ExportRecord {
  id: string
  userId: string
  format: ExportFormat
  contentType: ExportContentType
  dateRange: ExportRange
  status: 'pending' | 'completed' | 'failed'
  downloadUrl?: string
  errorMessage?: string
  createdAt: Timestamp
}
