'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/userStore'
import { GlassCard, DotGrid } from '@/components/glass/GlassCard'

type ExportFormat = 'csv' | 'pdf' | 'sheets'
type ExportRange = '7d' | '30d' | '90d' | 'all'
type ExportContentType = 'activity-history' | 'weekly-reports' | 'goals-progress'

const FORMAT_META: Record<ExportFormat, { icon: string; label: string; desc: string }> = {
  csv: { icon: 'table', label: 'CSV File', desc: 'Spreadsheet-compatible comma-separated values' },
  pdf: { icon: 'picture_as_pdf', label: 'PDF Report', desc: 'Structured compliance text document' },
  sheets: { icon: 'grid_on', label: 'Google Sheets', desc: 'Sync data directly to cloud spreadsheets' },
}

const CONTENT_TYPE_META: Record<ExportContentType, { icon: string; label: string; desc: string }> = {
  'activity-history': { icon: 'history', label: 'Activity History', desc: 'Granular carbon footprint logs' },
  'weekly-reports': { icon: 'date_range', label: 'Weekly Reports', desc: 'AI intelligence briefings' },
  'goals-progress': { icon: 'flag', label: 'Goals Progress', desc: 'Sustainability milestones and metrics' },
}

const RANGE_LABELS: Record<ExportRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
}

export function ExportsClient() {
  const { firebaseUser } = useAuthStore()
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [range, setRange] = useState<ExportRange>('30d')
  const [contentType, setContentType] = useState<ExportContentType>('activity-history')
  const [isExporting, setIsExporting] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const loadHistory = async () => {
    try {
      const token = firebaseUser ? await firebaseUser.getIdToken() : 'demo-token'
      const res = await fetch('/api/exports', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Failed to load export history')
      const data = await res.json()
      setHistory(data.history || [])
    } catch (err: any) {
      console.error(err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [firebaseUser])

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const token = firebaseUser ? await firebaseUser.getIdToken() : 'demo-token'
      const res = await fetch('/api/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          format,
          range,
          contentType,
        }),
      })

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Rate limit exceeded. Please wait 1 minute before exporting again.')
        }
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to compile and export data')
      }

      const result = await res.json()

      if (format === 'sheets') {
        setSuccessMsg('Google Sheets sync initiated successfully!')
        if (result.downloadUrl) {
          window.open(result.downloadUrl, '_blank')
        }
      } else {
        if (result.downloadUrl) {
          const a = document.createElement('a')
          a.href = result.downloadUrl
          a.download = result.filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        }
        setSuccessMsg('Compliance report compiled and downloaded successfully!')
      }

      await loadHistory()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An error occurred during export generation.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="relative min-h-screen px-4 md:px-16 py-8 max-w-5xl mx-auto">
      <DotGrid className="opacity-40" />

      <header className="relative z-10 mb-8">
        <p className="font-geist text-[11px] text-primary uppercase tracking-widest mb-1">
          Exports // Compliance Reporting
        </p>
        <h1 className="font-geist font-bold text-on-surface text-4xl md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
          Environmental <span className="text-primary">Exports</span>
        </h1>
        <p className="font-hanken text-on-surface-variant mt-2">
          Compile certified emissions disclosures, objectives, and historical tracking logs.
        </p>
      </header>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Config panel */}
        <div className="lg:col-span-7 space-y-5">
          {/* Content Type Selector */}
          <GlassCard className="p-6" hover={false}>
            <h2 className="font-geist font-bold text-on-surface text-lg mb-4">1. Select Content</h2>
            <div className="space-y-3" role="radiogroup" aria-label="Content type">
              {(Object.entries(CONTENT_TYPE_META) as [ExportContentType, typeof CONTENT_TYPE_META[ExportContentType]][]).map(([type, meta]) => (
                <button
                  key={type}
                  role="radio"
                  aria-checked={contentType === type}
                  onClick={() => setContentType(type)}
                  className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all text-left ${
                    contentType === type
                      ? 'bg-primary-container/20 border-primary/40'
                      : 'border-outline-variant/20 hover:border-outline-variant/40 bg-surface-container'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-2xl ${contentType === type ? 'text-primary' : 'text-on-surface-variant'}`}
                    aria-hidden="true"
                  >
                    {meta.icon}
                  </span>
                  <div>
                    <p className={`font-geist font-bold text-sm ${contentType === type ? 'text-primary' : 'text-on-surface'}`}>
                      {meta.label}
                    </p>
                    <p className="font-hanken text-on-surface-variant text-xs mt-0.5">{meta.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Format selector */}
          <GlassCard className="p-6" hover={false}>
            <h2 className="font-geist font-bold text-on-surface text-lg mb-4">2. Export Format</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Export format">
              {(Object.entries(FORMAT_META) as [ExportFormat, typeof FORMAT_META[ExportFormat]][]).map(([fmt, meta]) => (
                <button
                  key={fmt}
                  role="radio"
                  aria-checked={format === fmt}
                  onClick={() => setFormat(fmt)}
                  className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                    format === fmt
                      ? 'bg-primary-container/20 border-primary/40'
                      : 'border-outline-variant/20 hover:border-outline-variant/40 bg-surface-container'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-3xl mb-2 block ${format === fmt ? 'text-primary' : 'text-on-surface-variant'}`}
                    aria-hidden="true"
                  >
                    {meta.icon}
                  </span>
                  <p className={`font-geist font-bold text-xs ${format === fmt ? 'text-primary' : 'text-on-surface'}`}>
                    {meta.label}
                  </p>
                  <p className="font-hanken text-on-surface-variant text-[10px] mt-1 leading-tight">{meta.desc}</p>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Date range */}
          <GlassCard className="p-6" hover={false}>
            <h2 className="font-geist font-bold text-on-surface text-lg mb-4">3. Temporal Filter</h2>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Date range">
              {(Object.entries(RANGE_LABELS) as [ExportRange, string][]).map(([r, label]) => (
                <button
                  key={r}
                  role="radio"
                  aria-checked={range === r}
                  onClick={() => setRange(r)}
                  className={`px-4 py-2 rounded-full font-geist text-xs transition-all ${
                    range === r
                      ? 'bg-primary text-on-primary font-bold'
                      : 'bg-surface-container text-on-surface-variant border border-white/5 hover:border-outline-variant/30'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Preview + export */}
        <div className="lg:col-span-5 space-y-5">
          {/* Preview card */}
          <GlassCard variant="primary" className="p-6 space-y-4" hover={false}>
            <h2 className="font-geist font-bold text-on-surface text-lg">Briefing Config</h2>

            <div className="space-y-3 text-xs">
              {[
                { label: 'Content Type', value: CONTENT_TYPE_META[contentType].label },
                { label: 'Format Type', value: FORMAT_META[format].label },
                { label: 'Range Filter', value: RANGE_LABELS[range] },
                { label: 'Source', value: 'Rootly Secure Server' },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center border-b border-outline-variant/10 pb-2 last:border-0">
                  <span className="font-geist text-on-surface-variant">{row.label}</span>
                  <span className="font-geist font-bold text-on-surface text-right">{row.value}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-start gap-2">
                <span className="material-symbols-outlined text-error text-[16px] mt-0.5" aria-hidden="true">error</span>
                <p className="font-hanken text-xs text-error leading-tight">{error}</p>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-[16px] mt-0.5" aria-hidden="true">check_circle</span>
                <p className="font-hanken text-xs text-primary leading-tight">{successMsg}</p>
              </div>
            )}

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-3 rounded-full bg-primary text-on-primary font-geist font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" aria-hidden="true" />
                  Generating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    {format === 'sheets' ? 'sync' : 'download'}
                  </span>
                  Compile & Export
                </>
              )}
            </button>
          </GlassCard>

          {/* Security note */}
          <GlassCard className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden="true">
                shield
              </span>
              <h3 className="font-geist font-bold text-on-surface text-xs">Compliance & Auditing Standards</h3>
            </div>
            <p className="font-hanken text-on-surface-variant text-[11px] leading-relaxed">
              Disclosures generated via server-side cryptography. Access keys and personal identity tokens are anonymized to align with global environmental reporting mandates.
            </p>
            <div className="flex gap-1.5 flex-wrap pt-1">
              {['ISO 14064', 'GDPR Anonymity', 'GHG Protocol'].map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 bg-primary/10 text-primary font-geist text-[9px] uppercase rounded border border-primary/20">
                  {tag}
                </span>
              ))}
            </div>
          </GlassCard>

          {/* Recent exports history */}
          <GlassCard className="p-5">
            <h3 className="font-geist text-[10px] text-outline uppercase tracking-widest mb-3">Audit Logs (History)</h3>
            {isLoadingHistory ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : history.length > 0 ? (
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {history.map((log) => {
                  const dateStr = log.createdAt && typeof log.createdAt.toDate === 'function'
                    ? log.createdAt.toDate().toLocaleString()
                    : new Date(log.createdAt?.seconds * 1000 || Date.now()).toLocaleString()
                  return (
                    <div
                      key={log.id}
                      className="p-2.5 bg-surface-container border border-outline-variant/10 rounded-lg flex items-center justify-between gap-3 text-[11px]"
                    >
                      <div className="space-y-0.5">
                        <p className="font-geist font-bold text-on-surface flex items-center gap-1.5">
                          <span className="capitalize">{log.contentType.replace('-', ' ')}</span>
                          <span className="text-[9px] px-1 bg-white/5 border border-white/10 rounded text-on-surface-variant uppercase">
                            {log.format}
                          </span>
                        </p>
                        <p className="font-hanken text-[9px] text-on-surface-variant">{dateStr}</p>
                      </div>
                      
                      {log.status === 'completed' && log.downloadUrl && (
                        <a
                          href={log.downloadUrl}
                          target={log.format === 'sheets' ? '_blank' : '_self'}
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded font-geist font-bold text-[9px] text-primary uppercase transition-all"
                        >
                          <span className="material-symbols-outlined text-[10px]">
                            {log.format === 'sheets' ? 'launch' : 'download'}
                          </span>
                          {log.format === 'sheets' ? 'Open' : 'Save'}
                        </a>
                      )}
                      {log.status === 'failed' && (
                        <span className="text-error font-geist font-bold uppercase text-[9px] flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[10px]">cancel</span>
                          Error
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="font-hanken text-on-surface-variant text-[11px] text-center py-4">
                No past export transactions recorded.
              </p>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
