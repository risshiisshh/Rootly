import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '../../middleware/auth'
import { checkRateLimit } from '../../middleware/rateLimit'
import { validateBody } from '../../middleware/validate'
import { catchAsync } from '../../errors/errorHandler'
import { exportsRepository } from './exports.repository'
import { exportsService } from './exports.service'
import { z } from 'zod'

const createExportSchema = z.object({
  format: z.enum(['csv', 'pdf', 'sheets']),
  range: z.enum(['7d', '30d', '90d', 'all']),
  contentType: z.enum(['activity-history', 'weekly-reports', 'goals-progress']),
})

export class ExportsController {
  handleCreateExport = catchAsync(async (req: NextRequest) => {
    // 1. Authenticate user
    const uid = await verifyAuth(req)

    // 2. Enforce strict rate limits: max 5 exports per minute
    checkRateLimit(uid, 'exports:create', { limit: 5, windowMs: 60000 })

    const body = await req.json()
    const { format, range, contentType } = validateBody(createExportSchema, body)

    // 3. Create a pending record in Firestore
    const recordId = await exportsRepository.createRecord(uid, {
      userId: uid,
      format,
      contentType,
      dateRange: range,
      status: 'pending',
    })

    try {
      // 4. Fetch the target compliance data
      const data = await exportsService.fetchData(uid, contentType, range)

      let downloadUrl = ''
      let fileContent = ''

      const userEmail = 'user@rootly.green' // Or dynamic if token returns email

      // 5. Generate export file representation
      if (format === 'csv') {
        fileContent = exportsService.generateCSV(data, contentType)
        // Convert to data URI for immediate download fallback
        const base64 = Buffer.from(fileContent).toString('base64')
        downloadUrl = `data:text/csv;base64,${base64}`
      } else if (format === 'pdf') {
        fileContent = exportsService.generatePDFText(data, contentType, userEmail)
        const base64 = Buffer.from(fileContent).toString('base64')
        downloadUrl = `data:text/plain;base64,${base64}`
      } else if (format === 'sheets') {
        downloadUrl = await exportsService.generateGoogleSheets(uid, data, contentType)
        fileContent = 'Sync to Google Sheets successful.'
      }

      // 6. Update the record to completed
      await exportsRepository.updateRecordStatus(recordId, 'completed', {
        downloadUrl,
      })

      return NextResponse.json({
        success: true,
        recordId,
        downloadUrl,
        fileContent,
        filename: `rootly-export-${contentType}-${range}.${format === 'sheets' ? 'sheets' : format === 'pdf' ? 'txt' : 'csv'}`,
      })
    } catch (err: any) {
      console.error('Export creation failed:', err)
      const errMsg = err?.message || 'Failed to compile data'
      await exportsRepository.updateRecordStatus(recordId, 'failed', {
        errorMessage: errMsg,
      })
      return NextResponse.json(
        { success: false, error: errMsg },
        { status: 500 }
      )
    }
  })

  handleGetHistory = catchAsync(async (req: NextRequest) => {
    // 1. Authenticate user
    const uid = await verifyAuth(req)

    // 2. Enforce rate limiting on history fetch
    checkRateLimit(uid, 'exports:history', { limit: 20, windowMs: 60000 })

    // 3. Retrieve database records
    const history = await exportsRepository.findByUserId(uid)

    return NextResponse.json({ history })
  })
}

export const exportsController = new ExportsController()
