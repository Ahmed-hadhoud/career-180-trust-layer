import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bot,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  GraduationCap,
  LockKeyhole,
  MessageSquare,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useDemo } from '../lib/store'
import {
  addDays,
  buildCertificateView,
  effectiveRequestStatus,
  formatDate,
  formatDateTime,
  gradeBand,
  itemTypeLabel,
  OLD_POLICY_TEXT,
  requiredItems,
  resultFor,
} from '../lib/domain'
import type { CertificatesView, CourseItem } from '../types'
import {
  BandPill,
  Button,
  Container,
  cx,
  EmptyState,
  InfoPopover,
  Modal,
  SourceBadge,
  StateBadge,
  useToast,
} from '../components/ui'

export function EvidencePage({ certificateId }: { certificateId: string }) {
  const {
    state,
    today,
    verifierEmail,
    setVerifierEmail,
    getAccess,
    requestAccess,
    openEvidence,
    openAiSummary,
    openDispute,
  } = useDemo()
  const { pushToast } = useToast()
  const certificate = state.certificates.find((entry) => entry.id === certificateId)
  const view = certificate ? buildCertificateView(state, certificate) : null
  const [email, setEmail] = useState(verifierEmail)
  const [nameCompany, setNameCompany] = useState('')
  const [error, setError] = useState('')
  const [aiOpen, setAiOpen] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeEmail, setDisputeEmail] = useState(verifierEmail)
  const loggedRef = useRef('')

  const approvedAccess = view ? getAccess(view.certificate.id, email) : undefined
  const isPublic = view?.learner.resultsPublic ?? false
  const hasEvidence = Boolean(view && view.certificate.state === 'Verified' && (isPublic || approvedAccess))
  const latestRequest = useMemo(() => {
    if (!view || !email.trim()) return undefined
    return state.accessRequests
      .filter(
        (entry) =>
          entry.certificateId === view.certificate.id &&
          entry.email.toLowerCase() === email.trim().toLowerCase(),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  }, [state.accessRequests, email, view])
  const requestStatus = latestRequest ? effectiveRequestStatus(latestRequest, today) : undefined

  useEffect(() => {
    if (!view || !hasEvidence) return
    const key = `${view.certificate.id}:${isPublic ? 'public' : approvedAccess?.id ?? 'none'}`
    if (loggedRef.current === key) return
    loggedRef.current = key
    openEvidence(view.certificate.id)
  }, [approvedAccess?.id, hasEvidence, isPublic, openEvidence, view])

  if (!certificate || !view) {
    return (
      <Container className="py-16">
        <EmptyState
          title="Certificate not found"
          description="Check the certificate ID and try again from the verifier page."
        />
      </Container>
    )
  }

  if (certificate.state === 'Revoked') {
    return (
      <div className="pb-20">
        <Container>
          <BackToVerify />
          <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-red-400/25 bg-[#180d10] p-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-red-300" />
            <h1 className="mt-4 font-display text-2xl font-semibold text-white">
              Evidence is hidden
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-red-100/60">
              This certificate was revoked on {formatDate(certificate.revokedAt)}. A revoked
              certificate is not presented as valid and its results cannot be opened.
            </p>
            <Button
              className="mt-6"
              variant="danger"
              onClick={() => {
                setDisputeEmail(verifierEmail)
                setDisputeOpen(true)
              }}
            >
              Dispute this result
            </Button>
          </div>
        </Container>
        <DisputeModal
          open={disputeOpen}
          onClose={() => setDisputeOpen(false)}
          certificateId={certificate.id}
          email={disputeEmail}
          setEmail={setDisputeEmail}
          reason={disputeReason}
          setReason={setDisputeReason}
          onSubmitted={() => {
            setDisputeOpen(false)
            pushToast('Dispute submitted. Career-180 will review it.')
          }}
          openDispute={openDispute}
          setVerifierEmail={setVerifierEmail}
        />
      </div>
    )
  }

  if (certificate.state !== 'Verified') {
    return (
      <div className="pb-20">
        <Container>
          <BackToVerify />
          <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-white/[0.09] bg-[#0c0e16] p-8 text-center">
            <FileText className="mx-auto h-10 w-10 text-slate-500" />
            <h1 className="mt-4 font-display text-2xl font-semibold text-white">
              No evidence page
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              {certificate.state === 'Legacy'
                ? 'This Legacy certificate records course completion under the old standard. Results are not stored. It can be upgraded for free in the Learner area.'
                : 'This certificate is Completed. An evidence page is available after every required item reaches 70 and the certificate becomes Verified.'}
            </p>
            <a href="#/learner" className="mt-6 inline-block">
              <Button variant="secondary">
                Open Learner area
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </Container>
      </div>
    )
  }

  if (!hasEvidence) {
    return (
      <div className="pb-20">
        <Container>
          <BackToVerify />
          <div className="mx-auto mt-8 max-w-2xl">
            <div className="glass-panel overflow-hidden">
              <div className="border-b border-white/[0.07] px-6 py-6 sm:px-8">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl border border-amber-400/20 bg-amber-400/[0.08] text-amber-300">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="font-display text-xl font-semibold text-white">
                      Results are private
                    </h1>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {certificate.learnerName} has chosen to keep the evidence private.
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 text-xs text-slate-400 sm:grid-cols-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Certificate</div>
                    <div className="mt-1 font-mono text-slate-200">{certificate.id}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Level</div>
                    <div className="mt-1.5">
                      <StateBadge state={certificate.state} size="sm" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-6 sm:px-8">
                {latestRequest && requestStatus && (
                  <RequestStatusCard
                    status={requestStatus}
                    email={latestRequest.email}
                    nameCompany={latestRequest.nameCompany}
                    createdAt={latestRequest.createdAt}
                    expiresAt={latestRequest.expiresAt}
                  />
                )}

                {(!latestRequest || requestStatus === 'declined' || requestStatus === 'expired') && (
                  <form
                    className="mt-5"
                    onSubmit={(event) => {
                      event.preventDefault()
                      setError('')
                      const normalized = email.trim().toLowerCase()
                      if (!normalized) {
                        setError('Enter your email address.')
                        return
                      }
                      setVerifierEmail(normalized)
                      if (getAccess(certificate.id, normalized)) {
                        pushToast('Access confirmed. Opening the shared results.', 'success')
                        return
                      }
                      const response = requestAccess(certificate.id, normalized, nameCompany)
                      if (!response.ok) {
                        setError(response.message)
                        return
                      }
                      setNameCompany('')
                      pushToast(response.message, 'success')
                    }}
                  >
                    <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      <UserRound className="h-3.5 w-3.5" />
                      Request access
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="label" htmlFor="access-email">
                          Your email
                        </label>
                        <input
                          id="access-email"
                          className="field"
                          type="email"
                          value={email}
                          onChange={(event) => {
                            setEmail(event.target.value)
                            setError('')
                          }}
                          placeholder="you@company.com"
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor="access-name">
                          Name or company
                        </label>
                        <input
                          id="access-name"
                          className="field"
                          value={nameCompany}
                          onChange={(event) => setNameCompany(event.target.value)}
                          placeholder="Acme HR"
                        />
                      </div>
                    </div>
                    {error && (
                      <div className="mt-3 rounded-lg border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-[11px] text-red-300">
                        {error}
                      </div>
                    )}
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[10px] leading-4 text-slate-600">
                        Your email is remembered on this device. Approved access lasts 14 days.
                      </p>
                      <Button type="submit" variant="primary" size="sm">
                        Send request
                      </Button>
                    </div>
                  </form>
                )}

                {latestRequest && requestStatus === 'pending' && (
                  <p className="mt-4 text-[10px] leading-4 text-slate-600">
                    You will see the learner’s answer here when you return to this page.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Container>
        <DisputeModal
          open={disputeOpen}
          onClose={() => setDisputeOpen(false)}
          certificateId={certificate.id}
          email={disputeEmail}
          setEmail={setDisputeEmail}
          reason={disputeReason}
          setReason={setDisputeReason}
          onSubmitted={() => {
            setDisputeOpen(false)
            pushToast('Dispute submitted. Career-180 will review it.')
          }}
          openDispute={openDispute}
          setVerifierEmail={setVerifierEmail}
        />
      </div>
    )
  }

  return (
    <div className="pb-24">
      <Container>
        <BackToVerify />

        <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-white/[0.08] bg-[#0c0e16]/90 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <div className="grid h-11 w-11 flex-none place-items-center rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">
                  {certificate.learnerName}
                </h1>
                <StateBadge state={certificate.state} size="sm" />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {view.course.name} · v{certificate.courseVersion} · ID {certificate.id}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cx(
                'pill',
                isPublic
                  ? 'border-[#8095ff]/20 bg-[#8095ff]/[0.08] text-[#b3c0ff]'
                  : 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300',
              )}
            >
              <ShieldCheck className="h-3 w-3" />
              {isPublic ? 'Public results' : `Shared with you until ${formatDate(approvedAccess?.expiresAt)}`}
            </span>
            <InfoPopover title="What Verified means" align="right">
              Verified means the learner passed all the quizzes and assessments, and the course
              project where the course has one, each with at least 70%. It shows how much the learner
              benefited from the course and how far their skills in it can be trusted.
            </InfoPopover>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="glass-panel overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="font-display text-lg font-semibold text-white">Assessment results</h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Every required item in course version v{certificate.courseVersion}
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.14em] text-slate-600">
                  {view.requiredItems.length} required item{view.requiredItems.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="divide-y divide-white/[0.055]">
                {view.requiredItems.map((item) => (
                  <EvidenceItem
                    key={item.id}
                    item={item}
                    certificateId={certificate.id}
                    view={view}
                  />
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="glass-panel p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Final course grade
                </div>
                <InfoPopover title="How the final grade works" align="right">
                  The final grade is informational only. A project counts for 50%, and the other items
                  share the other 50% equally. Verified depends only on every required item being at 70
                  or more.
                </InfoPopover>
              </div>
              <div className="mt-3 flex items-end gap-2">
                <span className="font-display text-4xl font-semibold tracking-[-0.04em] text-white">
                  {view.finalGrade.score ?? '—'}
                </span>
                <span className="mb-1 text-xs text-slate-600">/ 100</span>
              </div>
              <div className="mt-2">
                <BandPill band={view.finalGrade.band} />
              </div>
              <p className="mt-3 text-[10px] leading-4 text-slate-600">
                {view.finalGrade.hasProject
                  ? 'Project 50% · other items 50% · informational only'
                  : 'All items weighted equally · informational only'}
              </p>
            </div>

            <div className="glass-panel-soft p-5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                <Sparkles className="h-3.5 w-3.5 text-[#8fa1ff]" />
                AI summary
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Get a plain-language summary of the evidence on this page. Generated from the results,
                not an assessment.
              </p>
              <Button
                className="mt-3 w-full"
                variant="primary"
                onClick={() => {
                  setAiOpen(true)
                  openAiSummary(certificate.id)
                }}
              >
                <Bot className="h-4 w-4" />
                Summarize performance
              </Button>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold text-slate-300">Something looks wrong?</div>
                  <div className="mt-0.5 text-[10px] text-slate-600">Career-180 will review it.</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDisputeEmail(verifierEmail)
                    setDisputeOpen(true)
                  }}
                >
                  Dispute
                </Button>
              </div>
            </div>

            <a
              href="#/verify"
              className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-xs text-slate-400 transition hover:border-white/[0.12] hover:text-white"
            >
              Verify another certificate
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </aside>
        </div>
      </Container>

      <AiSummaryDialog
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        view={view}
      />
      <DisputeModal
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        certificateId={certificate.id}
        email={disputeEmail}
        setEmail={setDisputeEmail}
        reason={disputeReason}
        setReason={setDisputeReason}
        onSubmitted={() => {
          setDisputeOpen(false)
          pushToast('Dispute submitted. Career-180 will review it.')
        }}
        openDispute={openDispute}
        setVerifierEmail={setVerifierEmail}
      />
    </div>
  )
}

function BackToVerify() {
  return (
    <div className="pt-8">
      <a
        href="#/verify"
        className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-500 transition hover:text-slate-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to verification
      </a>
    </div>
  )
}

function EvidenceItem({
  item,
  certificateId,
  view,
}: {
  item: CourseItem
  certificateId: string
  view: CertificatesView
}) {
  const certificate = view.certificate
  const result = resultFor(certificate, item.id)
  const score = result?.score ?? null
  const band = gradeBand(score)
  return (
    <div className="px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div
            className={cx(
              'grid h-9 w-9 flex-none place-items-center rounded-lg border text-xs font-semibold',
              item.type === 'project'
                ? 'border-violet-400/20 bg-violet-400/[0.08] text-violet-300'
                : item.type === 'exam'
                  ? 'border-amber-400/20 bg-amber-400/[0.08] text-amber-300'
                  : 'border-sky-400/20 bg-sky-400/[0.08] text-sky-300',
            )}
          >
            {item.type === 'quiz' ? 'Q' : item.type === 'exam' ? 'E' : 'P'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-white">{item.label}</span>
              <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                {itemTypeLabel(item.type)}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-600">
              {result?.attemptsUsed ?? 0} attempt{(result?.attemptsUsed ?? 0) === 1 ? '' : 's'} used
              {' · '}
              {Math.max(0, 5 - (result?.attemptsUsed ?? 0))} remaining
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 pl-[50px] sm:pl-0">
          <div className="text-right">
            <div className="font-display text-2xl font-semibold tracking-tight text-white">
              {score ?? '—'}
            </div>
            <div className="text-[9px] uppercase tracking-[0.12em] text-slate-600">Score</div>
          </div>
          <BandPill band={band} />
        </div>
      </div>
      {item.type === 'project' && (
        <div className="mt-4 rounded-xl border border-violet-400/10 bg-violet-400/[0.035] px-4 py-3.5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-violet-300/70">
            <MessageSquare className="h-3.5 w-3.5" />
            Instructor feedback
          </div>
          <p className="mt-1.5 text-xs leading-5 text-slate-300">
            {certificate.projectFeedback || 'No instructor feedback was recorded for this project.'}
          </p>
        </div>
      )}
    </div>
  )
}

function RequestStatusCard({
  status,
  email,
  nameCompany,
  createdAt,
  expiresAt,
}: {
  status: 'pending' | 'approved' | 'declined' | 'expired'
  email: string
  nameCompany: string
  createdAt: string
  expiresAt?: string
}) {
  const map = {
    pending: {
      title: 'Request pending',
      body: 'The learner has been notified and will approve or decline your request.',
      className: 'border-amber-400/20 bg-amber-400/[0.05] text-amber-200',
    },
    approved: {
      title: 'Access approved',
      body: expiresAt ? `Results are shared with you until ${formatDate(expiresAt)}.` : 'Results are shared with you.',
      className: 'border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-200',
    },
    declined: {
      title: 'Request declined',
      body: 'The learner declined this request. You can ask again if you believe access is needed.',
      className: 'border-red-400/20 bg-red-400/[0.05] text-red-200',
    },
    expired: {
      title: 'Request expired',
      body: 'This request or approved access has expired. You can send a new request.',
      className: 'border-slate-400/20 bg-white/[0.03] text-slate-300',
    },
  }[status]
  return (
    <div className={cx('rounded-xl border px-4 py-3.5', map.className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold">{map.title}</div>
        <div className="font-mono text-[9px] opacity-60">{email}</div>
      </div>
      <p className="mt-1 text-[11px] leading-5 opacity-70">{map.body}</p>
      <div className="mt-1 text-[9px] opacity-45">
        Sent {formatDate(createdAt)} by {nameCompany || 'verifier'}
        {status === 'expired' && ' · expired after 14 days'}
      </div>
    </div>
  )
}

function DisputeModal({
  open,
  onClose,
  certificateId,
  email,
  setEmail,
  reason,
  setReason,
  onSubmitted,
  openDispute,
  setVerifierEmail,
}: {
  open: boolean
  onClose: () => void
  certificateId: string
  email: string
  setEmail: (value: string) => void
  reason: string
  setReason: (value: string) => void
  onSubmitted: () => void
  openDispute: (certificateId: string, reason: string, email: string) => { ok: boolean; message: string }
  setVerifierEmail: (value: string) => void
}) {
  const { pushToast } = useToast()
  return (
    <Modal open={open} onClose={onClose} title="Dispute this result" eyebrow="Review request">
      <div className="space-y-4">
        <p className="text-xs leading-5 text-slate-400">
          Tell Career-180 what looks wrong. Disputes are reviewed by an administrator. The
          certificate stays unchanged while a dispute is open.
        </p>
        <div>
          <label className="label" htmlFor="evidence-dispute-reason">
            Reason
          </label>
          <textarea
            id="evidence-dispute-reason"
            className="field min-h-24 resize-y"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="What should Career-180 review?"
          />
        </div>
        <div>
          <label className="label" htmlFor="evidence-dispute-email">
            Contact email
          </label>
          <input
            id="evidence-dispute-email"
            type="email"
            className="field"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              const outcome = openDispute(certificateId, reason, email)
              if (!outcome.ok) {
                pushToast(outcome.message, 'error')
                return
              }
              setVerifierEmail(email)
              setReason('')
              onSubmitted()
            }}
          >
            Submit dispute
          </Button>
        </div>
      </div>
    </Modal>
  )
}

const SUGGESTED_QUESTIONS = [
  'Summarize this learner’s performance',
  'What are the strengths and weaknesses?',
  'Which skills are best evidenced, and which are not?',
]

function AiSummaryDialog({
  open,
  onClose,
  view,
}: {
  open: boolean
  onClose: () => void
  view: CertificatesView
}) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([])
  const [question, setQuestion] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (open) {
      setMessages([
        {
          role: 'assistant',
          text: 'Ask me about the assessment evidence on this page. I can summarise results, compare strengths, or explain what the evidence does and does not show.',
        },
      ])
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages])

  const ask = (text: string) => {
    const clean = text.trim()
    if (!clean) return
    const answer = generateAnswer(clean, view)
    setMessages((current) => [
      ...current,
      { role: 'user', text: clean },
      { role: 'assistant', text: answer },
    ])
    setQuestion('')
  }

  return (
    <Modal open={open} onClose={onClose} title="AI performance summary" eyebrow="Prototype only" wide>
      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.055] px-3.5 py-3">
        <Sparkles className="mt-0.5 h-4 w-4 flex-none text-amber-300" />
        <div>
          <div className="text-[11px] font-semibold text-amber-200">
            AI-generated summary. It is not evidence.
          </div>
          <div className="mt-0.5 text-[10px] leading-4 text-amber-100/45">
            Answers are generated deterministically from the results on this page. This prototype
            feature is outside the MVP.
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {SUGGESTED_QUESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => ask(suggestion)}
            className="focus-ring rounded-full border border-[#7f93ff]/20 bg-[#7f93ff]/[0.06] px-3 py-1.5 text-left text-[10px] font-medium text-[#bdc8ff] transition hover:border-[#7f93ff]/35 hover:bg-[#7f93ff]/[0.1]"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="h-[340px] overflow-y-auto rounded-xl border border-white/[0.07] bg-[#080a11] p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cx('flex gap-2.5', message.role === 'user' && 'flex-row-reverse')}
            >
              <div
                className={cx(
                  'grid h-7 w-7 flex-none place-items-center rounded-lg border text-[10px] font-bold',
                  message.role === 'assistant'
                    ? 'border-[#8194ff]/25 bg-[#8194ff]/10 text-[#aab8ff]'
                    : 'border-white/10 bg-white/[0.06] text-slate-300',
                )}
              >
                {message.role === 'assistant' ? <Bot className="h-3.5 w-3.5" /> : 'You'}
              </div>
              <div
                className={cx(
                  'max-w-[85%] rounded-xl px-3.5 py-2.5 text-[11px] leading-5',
                  message.role === 'assistant'
                    ? 'bg-white/[0.045] text-slate-300'
                    : 'bg-[#5d77ff]/15 text-[#d9e0ff]',
                )}
              >
                {message.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          ask(question)
        }}
      >
        <input
          className="field"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about the evidence on this page…"
          aria-label="Ask the AI summary"
        />
        <Button type="submit" variant="primary" disabled={!question.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
      <p className="mt-2 text-center text-[9px] text-slate-600">
        AI-generated summary. It is not evidence.
      </p>
    </Modal>
  )
}

function generateAnswer(question: string, view: CertificatesView): string {
  const q = question.toLowerCase()
  const allowed = [
    'summar',
    'perform',
    'strength',
    'weak',
    'skill',
    'evidenc',
    'score',
    'result',
    'project',
    'feedback',
    'grade',
    'band',
    'attempt',
    'item',
    'quiz',
    'exam',
    'learner',
    'certificate',
    'verified',
    'missing',
    'highest',
    'lowest',
    'improve',
    'assessment',
    'pass',
  ]
  if (!allowed.some((term) => q.includes(term))) {
    return 'I can only answer from the evidence on this page.'
  }

  const certificate = view.certificate
  const items = view.requiredItems.map((item) => {
    const result = resultFor(certificate, item.id)
    return {
      ...item,
      score: result?.score ?? null,
      attempts: result?.attemptsUsed ?? 0,
      band: gradeBand(result?.score ?? null),
    }
  })
  if (!items.length) {
    return 'This course has no assessment, so there is no scored evidence to summarise.'
  }
  const scored = items.filter((item) => item.score !== null) as (typeof items[number] & { score: number })[]
  const highest = [...scored].sort((a, b) => b.score - a.score)[0]
  const lowest = [...scored].sort((a, b) => a.score - b.score)[0]
  const missing = items.filter((item) => item.score === null || (item.score ?? 0) < 70)
  const average = Math.round(
    (scored.reduce((sum, item) => sum + item.score, 0) / Math.max(1, scored.length)) * 10,
  ) / 10
  const strengths = scored.filter((item) => item.score >= 80)
  const weaker = scored.filter((item) => item.score < 80)
  const projectItem = items.find((item) => item.type === 'project')
  const projectFeedback = certificate.projectFeedback

  if (q.includes('strength') || q.includes('weak')) {
    return [
      `Strengths: ${
        strengths.length
          ? strengths.map((item) => `${item.label} (${item.score}, ${item.band})`).join(', ')
          : 'the evidence does not show any item at 80 or above'
      }.`,
      weaker.length
        ? `Relative weaknesses: ${weaker
            .map((item) => `${item.label} (${item.score}, ${item.band})`)
            .join(', ')}. These are the lower-scoring areas on this page.`
        : 'No required item is below 80, so the weakness is relative rather than a failed assessment.',
      missing.length
        ? `${missing.map((item) => item.label).join(', ')} is not passed and remains an evidence gap.`
        : 'Every required item is at 70 or above, which is why the certificate is Verified.',
      projectFeedback ? `The project feedback says: “${projectFeedback}”` : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  if (q.includes('skill')) {
    return [
      `The best-evidenced work is ${highest.label} at ${highest.score} (${highest.band}).`,
      lowest && lowest.id !== highest.id
        ? `${lowest.label} is the least strong evidence at ${lowest.score} (${lowest.band}).`
        : '',
      projectItem
        ? `The project is the broadest evidence of applied work${
            projectFeedback ? `; feedback: “${projectFeedback}”` : ''
          }.`
        : 'This course has no project, so the evidence comes from quizzes and exams only.',
      'The page does not map scores to a separate skill taxonomy, so it cannot prove skills that were not assessed here.',
    ]
      .filter(Boolean)
      .join(' ')
  }

  if (q.includes('attempt') || q.includes('improve')) {
    const repeated = items.filter((item) => item.attempts > 1)
    return `The learner used ${
      items.reduce((sum, item) => sum + item.attempts, 0)
    } attempts across ${items.length} required items. ${
      repeated.length
        ? `The items with more than one attempt were ${repeated
            .map((item) => `${item.label} (${item.attempts})`)
            .join(', ')}.`
        : 'Each item was passed on the first recorded attempt.'
    } ${
      weakestSentence(lowest, missing)
    }`
  }

  if (q.includes('project') || q.includes('feedback')) {
    if (!projectItem) {
      return 'This course has no project. The available evidence is limited to the quizzes and exams listed on this page.'
    }
    return `The project scored ${projectItem.score ?? '—'} (${projectItem.band}). ${
      projectFeedback
        ? `Instructor feedback says: “${projectFeedback}”`
        : 'No instructor feedback was recorded.'
    } ${missing.some((item) => item.type === 'project') ? 'The project is not yet passed.' : 'The project meets the Verified threshold.'}`
  }

  if (q.includes('missing') && missing.length) {
    return `${missing
      .map((item) => `${item.label} is at ${item.score ?? 'not taken'} (${item.band})`)
      .join('; ')}. A required item below 70 prevents Verified status.`
  }

  return `Across ${items.length} required items, the learner scored an average of ${average} and the final course grade is ${
    view.finalGrade.score ?? '—'
  } (${view.finalGrade.band}). The strongest evidence is ${highest.label} at ${highest.score} (${
    highest.band
  }); ${weakestSentence(lowest, missing)} ${
    projectFeedback ? `Project feedback notes: “${projectFeedback}”` : ''
  } Every required item is at 70 or above, which explains the Verified level.`
}

function weakestSentence(
  lowest: { label: string; score: number; band: string } | undefined,
  missing: { label: string }[],
): string {
  if (missing.length) return `The evidence gap is ${missing.map((item) => item.label).join(', ')}.`
  if (!lowest) return 'There is no scored evidence to compare.'
  return `The lowest result is ${lowest.label} at ${lowest.score} (${lowest.band}), still above the Verified threshold.`
}
