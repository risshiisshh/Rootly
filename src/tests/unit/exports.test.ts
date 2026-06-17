import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock Firebase Admin
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  cert: vi.fn(),
}))

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: vi.fn(async (token: string) => {
      if (token === 'valid-token') {
        return { uid: 'test-user-id', email: 'test@rootly.green' }
      }
      throw new Error('Invalid token')
    }),
  }),
}))

import { exportsService } from '@/backend/features/exports/exports.service'
import { exportsRepository } from '@/backend/features/exports/exports.repository'
import { exportsController } from '@/backend/features/exports/exports.controller'
import { NextRequest } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'

describe('Environmental Exports Integration Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ExportsService Data Formatting', () => {
    it('generates valid CSV header and rows for activity-history', () => {
      const mockActivities = [
        {
          activity: 'Commute train',
          category: 'transport',
          quantity: 12,
          emission: 1.45,
          description: 'Weekly train commute',
          source: 'manual',
          timestamp: Timestamp.fromDate(new Date('2026-06-15')),
        },
      ]

      const csv = exportsService.generateCSV(mockActivities, 'activity-history')
      expect(csv).toContain('Activity,Category,Quantity,Emission (kg CO2e),Description,Source,Date')
      expect(csv).toContain('"Commute train"')
      expect(csv).toContain('1.4500')
      expect(csv).toContain('manual')
    })

    it('generates compliance-themed PDF/text disclosures', () => {
      const mockGoals = [
        {
          title: 'Reduce natural gas usage',
          description: 'Lower thermostat by 1C',
          category: 'energy',
          status: 'active',
          targetReductionKg: 45,
          currentProgressKg: 10,
          deadline: Timestamp.fromDate(new Date('2026-07-15')),
          createdAt: Timestamp.fromDate(new Date('2026-06-15')),
        },
      ]

      const text = exportsService.generatePDFText(mockGoals, 'goals-progress', 'user@rootly.green')
      expect(text).toContain('ROOTLY ENVIRONMENTAL COMPLIANCE REPORT')
      expect(text).toContain('Category: GOALS PROGRESS')
      expect(text).toContain('SUMMARY STATS:')
      expect(text).toContain('Reduce natural gas usage')
      expect(text).toContain('Target Reduction: 45 kg CO2e')
    })

    it('generates mock Google Sheets sync URLs', async () => {
      const url = await exportsService.generateGoogleSheets('test-user-id', [], 'weekly-reports')
      expect(url).toContain('https://docs.google.com/spreadsheets/d/rootly-sync-')
    })
  })

  describe('ExportsRepository Fallbacks', () => {
    it('manages an in-memory export log history in demo mode', async () => {
      const recordId = await exportsRepository.createRecord('demo-user-id', {
        userId: 'demo-user-id',
        format: 'pdf',
        contentType: 'weekly-reports',
        dateRange: '30d',
        status: 'pending',
      })

      expect(recordId).toBeDefined()
      expect(recordId).toContain('mock-exp-')

      await exportsRepository.updateRecordStatus(recordId, 'completed', {
        downloadUrl: 'data:text/plain;base64,TU9DSw==',
      })

      const history = await exportsRepository.findByUserId('demo-user-id')
      const createdRecord = history.find((h) => h.id === recordId)

      expect(createdRecord).toBeDefined()
      expect(createdRecord?.status).toBe('completed')
      expect(createdRecord?.downloadUrl).toBe('data:text/plain;base64,TU9DSw==')
    })
  })

  describe('ExportsController Routes & Throttling', () => {
    it('processes valid export payloads and writes them to history', async () => {
      const req = new NextRequest('http://localhost/api/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          format: 'csv',
          range: '30d',
          contentType: 'activity-history',
        }),
      })

      const res = await exportsController.handleCreateExport(req)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.recordId).toBeDefined()
      expect(body.downloadUrl).toContain('data:text/csv;base64,')
      expect(body.filename).toBe('rootly-export-activity-history-30d.csv')
    })

    it('rejects unsupported schemas (400 Bad Request)', async () => {
      const req = new NextRequest('http://localhost/api/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          format: 'xls', // Unsupported
          range: 'infinite', // Unsupported
          contentType: 'activity-history',
        }),
      })

      const res = await exportsController.handleCreateExport(req)
      expect(res.status).toBe(400)
    })

    it('enforces strict rate limits for API abuse (429 Too Many Requests)', async () => {
      // Send 6 sequential requests to trigger rate limit (config is limit: 5 in controller)
      const triggerRequests = Array.from({ length: 6 }).map(() =>
        new NextRequest('http://localhost/api/exports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-token',
          },
          body: JSON.stringify({
            format: 'csv',
            range: '30d',
            contentType: 'activity-history',
          }),
        })
      )

      let lastResponse: any = null
      for (const req of triggerRequests) {
        lastResponse = await exportsController.handleCreateExport(req)
      }

      expect(lastResponse.status).toBe(429)
    })
  })
})
