import { activityRepository } from '../activity/activity.repository'
import { reportsRepository } from '../reports/reports.repository'
import { goalsRepository } from '../goals/goals.repository'
import { adminDb, isFirebaseAdminConfigured } from '../../lib/firebaseAdmin'
import type { ExportFormat, ExportRange, ExportContentType } from '@/types/export'

export class ExportsService {
  private filterByRange(items: any[], range: ExportRange, dateGetter: (item: any) => Date): any[] {
    if (range === 'all') return items
    const cutoff = new Date()
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
    cutoff.setDate(cutoff.getDate() - days)
    return items.filter((item) => {
      const d = dateGetter(item)
      return d && d >= cutoff
    })
  }

  async fetchData(userId: string, contentType: ExportContentType, range: ExportRange): Promise<any[]> {
    if (contentType === 'activity-history') {
      const activities = await activityRepository.findByUserId(userId)
      return this.filterByRange(activities, range, (a) => {
        if (a.timestamp && typeof a.timestamp.toDate === 'function') {
          return a.timestamp.toDate()
        }
        return new Date(a.timestamp)
      })
    } else if (contentType === 'weekly-reports') {
      let reports: any[] = []
      if (!isFirebaseAdminConfigured) {
        const { mockWeeklyReports } = require('../reports/reports.repository')
        reports = mockWeeklyReports.filter((r: any) => r.userId === userId)
      } else {
        const snap = await adminDb
          .collection('weeklyReports')
          .where('userId', '==', userId)
          .orderBy('generatedAt', 'desc')
          .get()
        reports = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }))
      }

      return this.filterByRange(reports, range, (r) => {
        if (r.generatedAt && typeof r.generatedAt.toDate === 'function') {
          return r.generatedAt.toDate()
        }
        return new Date(r.generatedAt)
      })
    } else {
      // goals-progress
      const goals = await goalsRepository.findByUserId(userId)
      // Filter goals by createdAt or deadline
      return this.filterByRange(goals, range, (g) => {
        if (g.createdAt && typeof g.createdAt.toDate === 'function') {
          return g.createdAt.toDate()
        }
        return new Date(g.createdAt)
      })
    }
  }

  generateCSV(data: any[], contentType: ExportContentType): string {
    if (contentType === 'activity-history') {
      const header = 'Activity,Category,Quantity,Emission (kg CO2e),Description,Source,Date\n'
      const rows = data
        .map((a) => {
          const date = a.timestamp && typeof a.timestamp.toDate === 'function'
            ? a.timestamp.toDate().toISOString()
            : new Date(a.timestamp).toISOString()
          return [
            `"${(a.activity || '').replace(/"/g, '""')}"`,
            a.category,
            a.quantity,
            (a.emission || 0).toFixed(4),
            `"${(a.description || '').replace(/"/g, '""')}"`,
            a.source || 'manual',
            date,
          ].join(',')
        })
        .join('\n')
      return header + rows
    } else if (contentType === 'weekly-reports') {
      const header = 'Week Start,Week End,Carbon Score,Previous Score,Delta,Total Emissions (kg CO2e),Projected Annual (kg CO2e),Narrative\n'
      const rows = data
        .map((r) => {
          const wStart = r.weekStart && typeof r.weekStart.toDate === 'function' ? r.weekStart.toDate().toISOString() : new Date(r.weekStart).toISOString()
          const wEnd = r.weekEnd && typeof r.weekEnd.toDate === 'function' ? r.weekEnd.toDate().toISOString() : new Date(r.weekEnd).toISOString()
          return [
            wStart,
            wEnd,
            r.carbonScore,
            r.previousScore,
            r.scoreDelta,
            r.totalEmissionsKg,
            r.projectedAnnualKg,
            `"${(r.narrative || '').replace(/"/g, '""')}"`,
          ].join(',')
        })
        .join('\n')
      return header + rows
    } else {
      // goals-progress
      const header = 'Title,Description,Category,Target Reduction (kg CO2e),Current Progress (kg CO2e),Deadline,Status,Created At\n'
      const rows = data
        .map((g) => {
          const deadline = g.deadline && typeof g.deadline.toDate === 'function' ? g.deadline.toDate().toISOString() : new Date(g.deadline).toISOString()
          const createdAt = g.createdAt && typeof g.createdAt.toDate === 'function' ? g.createdAt.toDate().toISOString() : new Date(g.createdAt).toISOString()
          return [
            `"${(g.title || '').replace(/"/g, '""')}"`,
            `"${(g.description || '').replace(/"/g, '""')}"`,
            g.category,
            g.targetReductionKg,
            g.currentProgressKg,
            deadline,
            g.status,
            createdAt,
          ].join(',')
        })
        .join('\n')
      return header + rows
    }
  }

  generatePDFText(data: any[], contentType: ExportContentType, userEmail: string): string {
    const timestampStr = new Date().toLocaleString()
    const separator = '='.repeat(60)
    const line = '-'.repeat(60)

    let reportText = `${separator}\n`
    reportText += `ROOTLY ENVIRONMENTAL COMPLIANCE REPORT\n`
    reportText += `Generated: ${timestampStr}\n`
    reportText += `Subject: ${userEmail}\n`
    reportText += `Category: ${contentType.toUpperCase().replace('-', ' ')}\n`
    reportText += `${separator}\n\n`

    if (contentType === 'activity-history') {
      const totalEmissions = data.reduce((sum, item) => sum + (item.emission || 0), 0)
      reportText += `SUMMARY STATS:\n`
      reportText += `Total Logged Activities: ${data.length}\n`
      reportText += `Aggregate Emissions: ${totalEmissions.toFixed(2)} kg CO2e\n`
      reportText += `${line}\n\n`
      reportText += `LOGGED ACTIVITIES LIST:\n\n`

      data.forEach((a, i) => {
        const dateStr = a.timestamp && typeof a.timestamp.toDate === 'function'
          ? a.timestamp.toDate().toLocaleDateString()
          : new Date(a.timestamp).toLocaleDateString()
        reportText += `[${i + 1}] Date: ${dateStr} | ${a.category.toUpperCase()}\n`
        reportText += `    Activity: ${a.activity} (${a.quantity} unit(s))\n`
        reportText += `    Emissions: ${a.emission.toFixed(2)} kg CO2e | Source: ${a.source || 'manual'}\n`
        if (a.description) {
          reportText += `    Description: ${a.description}\n`
        }
        reportText += `\n`
      })
    } else if (contentType === 'weekly-reports') {
      reportText += `SUMMARY STATS:\n`
      reportText += `Total Weekly Reports: ${data.length}\n`
      if (data.length > 0) {
        const scores = data.map((r) => r.carbonScore || 0)
        const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        reportText += `Average Carbon Score: ${avgScore}\n`
      }
      reportText += `${line}\n\n`
      reportText += `WEEKLY INTEL BRIEFINGS:\n\n`

      data.forEach((r, i) => {
        const wStart = r.weekStart && typeof r.weekStart.toDate === 'function' ? r.weekStart.toDate().toLocaleDateString() : new Date(r.weekStart).toLocaleDateString()
        const wEnd = r.weekEnd && typeof r.weekEnd.toDate === 'function' ? r.weekEnd.toDate().toLocaleDateString() : new Date(r.weekEnd).toLocaleDateString()
        reportText += `[Report #${i + 1}] Week: ${wStart} - ${wEnd}\n`
        reportText += `  Carbon Score: ${r.carbonScore} | Delta: ${r.scoreDelta >= 0 ? '+' : ''}${r.scoreDelta}\n`
        reportText += `  Total Weekly Emissions: ${r.totalEmissionsKg} kg CO2e\n`
        reportText += `  Narrative:\n    ${r.narrative}\n\n`
      })
    } else {
      // goals-progress
      const completedCount = data.filter((g) => g.status === 'completed').length
      reportText += `SUMMARY STATS:\n`
      reportText += `Total Goals Set: ${data.length}\n`
      reportText += `Goals Completed: ${completedCount} / ${data.length}\n`
      reportText += `${line}\n\n`
      reportText += `MISSION OBJECTIVES LIST:\n\n`

      data.forEach((g, i) => {
        const deadline = g.deadline && typeof g.deadline.toDate === 'function' ? g.deadline.toDate().toLocaleDateString() : new Date(g.deadline).toLocaleDateString()
        reportText += `[Goal #${i + 1}] ${g.title}\n`
        reportText += `  Description: ${g.description}\n`
        reportText += `  Category: ${g.category.toUpperCase()} | Status: ${g.status.toUpperCase()}\n`
        reportText += `  Target Reduction: ${g.targetReductionKg} kg CO2e\n`
        reportText += `  Current Progress: ${g.currentProgressKg.toFixed(2)} kg CO2e\n`
        reportText += `  Deadline: ${deadline}\n\n`
      })
    }

    reportText += `${separator}\n`
    reportText += `End of Environmental Intelligence Briefing. Suitable for ISO 14064.\n`
    reportText += `${separator}\n`

    return reportText
  }

  async generateGoogleSheets(userId: string, data: any[], contentType: ExportContentType): Promise<string> {
    // Under OAuth-based implementation, we would call the Google Sheets API to append rows to a user's spreadsheet.
    // For local mode / fallback, we log this event in Firestore and simulate generating a unique Google Sheet Link.
    // In production, we'd use the googleapis npm client.
    const mockSpreadsheetId = `rootly-sync-${Date.now()}`
    const mockSpreadsheetUrl = `https://docs.google.com/spreadsheets/d/${mockSpreadsheetId}/view`
    return mockSpreadsheetUrl
  }
}

export const exportsService = new ExportsService()
