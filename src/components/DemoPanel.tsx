import { useState } from 'react'
import {
  CalendarClock,
  ChevronDown,
  Database,
  Download,
  FastForward,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import type { AppState } from '../types'
import { clockDate, formatDate } from '../lib/domain'
import { Button, cx, useToast } from './ui'
import { useDemo } from '../lib/store'

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function csvEscape(value: unknown): string {
  const string = value === null || value === undefined ? '' : String(value)
  if (/[",\n\r]/.test(string)) return `"${string.replace(/"/g, '""')}"`
  return string
}

function rowsToCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')
}

export function exportJson(state: AppState) {
  const payload = {
    exportedAt: new Date().toISOString(),
    prototypeClock: clockDate(state),
    certificates: state.certificates,
    results: state.certificates.map((certificate) => ({
      certificateId: certificate.id,
      learnerId: certificate.learnerId,
      courseId: certificate.courseId,
      courseVersion: certificate.courseVersion,
      state: certificate.state,
      items: certificate.items,
      projectFeedback: certificate.projectFeedback ?? null,
    })),
    accessRequests: state.accessRequests,
    disputes: state.disputes,
    policies: state.policies,
    courses: state.courses,
    learners: state.learners,
    events: state.events,
  }
  downloadFile(
    `career-180-demo-${clockDate(state)}.json`,
    JSON.stringify(payload, null, 2),
    'application/json',
  )
}

export function exportEventsCsv(state: AppState, events = state.events) {
  const rows: (string | number | null | undefined)[][] = [
    ['timestamp', 'event_type', 'certificate_id', 'payload_json'],
    ...events.map((event) => [
      event.at,
      event.type,
      event.certificateId ?? '',
      JSON.stringify(event.payload),
    ]),
  ]
  downloadFile(
    `career-180-events-${clockDate(state)}.csv`,
    rowsToCsv(rows),
    'text/csv;charset=utf-8',
  )
}

export function exportAllCsv(state: AppState) {
  const blocks: string[] = []
  blocks.push('CERTIFICATES')
  blocks.push(
    rowsToCsv([
      [
        'certificate_id',
        'learner_id',
        'learner_name',
        'source',
        'employer',
        'course_id',
        'course_version',
        'issued_at',
        'state',
        'revoked_at',
        'revoke_reason',
      ],
      ...state.certificates.map((certificate) => {
        const learner = state.learners.find((entry) => entry.id === certificate.learnerId)
        return [
          certificate.id,
          certificate.learnerId,
          certificate.learnerName,
          learner?.source ?? '',
          learner?.employer ?? '',
          certificate.courseId,
          certificate.courseVersion,
          certificate.issuedAt,
          certificate.state,
          certificate.revokedAt ?? '',
          certificate.revokeReason ?? '',
        ]
      }),
    ]),
  )
  blocks.push('')
  blocks.push('RESULTS')
  blocks.push(
    rowsToCsv([
      [
        'certificate_id',
        'course_version',
        'item_id',
        'score',
        'attempts_used',
        'locked',
        'project_feedback',
      ],
      ...state.certificates.flatMap((certificate) =>
        certificate.items.length
          ? certificate.items.map((item) => [
              certificate.id,
              certificate.courseVersion,
              item.itemId,
              item.score ?? '',
              item.attemptsUsed,
              item.locked ? 'true' : 'false',
              certificate.projectFeedback ?? '',
            ])
          : [['', '', '', '', '', '', '']],
      ),
    ]),
  )
  blocks.push('')
  blocks.push('ACCESS_REQUESTS')
  blocks.push(
    rowsToCsv([
      [
        'request_id',
        'certificate_id',
        'learner_id',
        'email',
        'name_company',
        'created_at',
        'status',
        'approved_at',
        'expires_at',
        'responded_at',
      ],
      ...state.accessRequests.map((request) => [
        request.id,
        request.certificateId,
        request.learnerId,
        request.email,
        request.nameCompany,
        request.createdAt,
        request.status,
        request.approvedAt ?? '',
        request.expiresAt ?? '',
        request.respondedAt ?? '',
      ]),
    ]),
  )
  blocks.push('')
  blocks.push('DISPUTES')
  blocks.push(
    rowsToCsv([
      ['dispute_id', 'certificate_id', 'learner_id', 'reason', 'contact_email', 'created_at', 'status', 'outcome', 'resolved_at'],
      ...state.disputes.map((dispute) => [
        dispute.id,
        dispute.certificateId,
        dispute.learnerId,
        dispute.reason,
        dispute.contactEmail,
        dispute.createdAt,
        dispute.status,
        dispute.outcome ?? '',
        dispute.resolvedAt ?? '',
      ]),
    ]),
  )
  blocks.push('')
  blocks.push('EVENTS')
  blocks.push(
    rowsToCsv([
      ['timestamp', 'event_type', 'certificate_id', 'payload_json'],
      ...state.events.map((event) => [
        event.at,
        event.type,
        event.certificateId ?? '',
        JSON.stringify(event.payload),
      ]),
    ]),
  )
  downloadFile(
    `career-180-demo-${clockDate(state)}.csv`,
    blocks.join('\r\n'),
    'text/csv;charset=utf-8',
  )
}

export function DemoPanel() {
  const { state, fastForward, resetDemo, today } = useDemo()
  const { pushToast } = useToast()
  const [open, setOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 sm:bottom-5 sm:right-5">
      {open && (
        <div className="animate-fade-up w-[calc(100vw-2rem)] max-w-[340px] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0d0f18]/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <SlidersHorizontal className="h-4 w-4 text-[#8ea0ff]" />
              Demo tools
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-slate-500 hover:bg-white/[0.06] hover:text-white"
              aria-label="Close demo tools"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CalendarClock className="h-4 w-4 text-[#8ea0ff]" />
                Prototype date
              </div>
              <div className="font-mono text-xs font-semibold text-white">{formatDate(today)}</div>
            </div>

            <div>
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => {
                  fastForward()
                  pushToast('Prototype clock advanced by 14 days. Expired access is updated.', 'info')
                }}
              >
                <FastForward className="h-4 w-4 text-[#9cb0ff]" />
                Fast-forward 14 days
              </Button>
              <p className="mt-1.5 px-1 text-[10px] leading-4 text-slate-600">
                Access approvals and pending requests expire automatically.
              </p>
            </div>

            <div className="border-t border-white/[0.07] pt-3">
              <button
                onClick={() => setExportOpen((value) => !value)}
                className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-xs font-semibold text-slate-300 hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-slate-500" />
                  Export data
                </span>
                <ChevronDown
                  className={cx('h-3.5 w-3.5 text-slate-500 transition', exportOpen && 'rotate-180')}
                />
              </button>
              {exportOpen && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      exportJson(state)
                      pushToast('JSON export downloaded.')
                    }}
                  >
                    <Database className="h-3.5 w-3.5" />
                    JSON
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      exportAllCsv(state)
                      pushToast('CSV export downloaded.')
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    CSV
                  </Button>
                </div>
              )}
              <p className="mt-2 px-1 text-[10px] leading-4 text-slate-600">
                JSON contains every dataset. CSV includes certificates, results, requests, disputes and
                events.
              </p>
            </div>

            <div className="border-t border-white/[0.07] pt-3">
              <Button
                variant="danger"
                className="w-full justify-start"
                onClick={() => {
                  if (window.confirm('Reset all demo data and the prototype clock?')) {
                    resetDemo()
                    try {
                      sessionStorage.removeItem('career180.last-lookup')
                    } catch {
                      // Session storage is optional.
                    }
                    pushToast('Demo data restored to the seed.', 'info')
                  }
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Reset demo data
              </Button>
              <p className="mt-1.5 px-1 text-[10px] leading-4 text-slate-600">
                Restores 24 certificates, seed requests, disputes and policies.
              </p>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((value) => !value)}
        className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-[#0d0f18]/95 px-4 py-2.5 text-xs font-semibold text-slate-200 shadow-2xl backdrop-blur-xl transition hover:border-white/[0.18] hover:text-white"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7890ff] opacity-40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7890ff]" />
        </span>
        Demo tools
        <span className="hidden border-l border-white/10 pl-2 text-[10px] font-normal text-slate-500 sm:inline">
          {formatDate(today)}
        </span>
      </button>
    </div>
  )
}
