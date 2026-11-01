import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  History,
  LockKeyhole,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useDemo } from '../lib/store'
import {
  OLD_POLICY_TEXT,
  buildCertificateView,
  formatDate,
  getCourse,
  latestVersion,
  lookupResult,
  sampleGroups,
  versionOf,
} from '../lib/domain'
import type { Certificate } from '../types'
import { SegmentedInput, CertificatePreview } from '../components/CertificatePreview'
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

type ResultState =
  | { kind: 'Valid' | 'Revoked' | 'Not found'; certificateId?: string; input: string }
  | null

const LAST_LOOKUP_KEY = 'career180.last-lookup'

const stateDot = (state: string) =>
  state === 'Verified'
    ? 'bg-emerald-400'
    : state === 'Completed'
      ? 'bg-sky-400'
      : state === 'Legacy'
        ? 'bg-amber-400'
        : 'bg-red-400'

const stateBadge = (state: string) =>
  state === 'Verified'
    ? 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300'
    : state === 'Completed'
      ? 'border-sky-400/20 bg-sky-400/[0.08] text-sky-300'
      : state === 'Legacy'
        ? 'border-amber-400/20 bg-amber-400/[0.08] text-amber-300'
        : 'border-red-400/20 bg-red-400/[0.08] text-red-300'

function loadLastResult(): { value: string; result: ResultState } | null {
  try {
    const raw = sessionStorage.getItem(LAST_LOOKUP_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { value?: string; result?: ResultState }
    const stored = parsed.result as { kind?: string } | null | undefined
    const result = stored && stored.kind !== 'Blocked' ? (stored as ResultState) : null
    return { value: parsed.value ?? '', result }
  } catch {
    return null
  }
}

export function VerifierPage() {
  const { state, lookup, setVerifierEmail, openDispute } = useDemo()
  const { pushToast } = useToast()
  const restored = loadLastResult()
  const [value, setValue] = useState(restored?.value ?? '')
  const [result, setResult] = useState<ResultState>(restored?.result ?? null)
  const [samplesOpen, setSamplesOpen] = useState(true)
  const [lookupWarning, setLookupWarning] = useState<{
    failures: number
    windowSeconds: number
  } | null>(null)
  const resultRef = useRef<HTMLDivElement | null>(null)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeEmail, setDisputeEmail] = useState(state.verifierEmail)

  const certificateId = result && 'certificateId' in result ? result.certificateId : undefined
  const certificate = certificateId
    ? state.certificates.find((entry) => entry.id === certificateId)
    : undefined
  const effectiveKind =
    result?.kind === 'Valid' && certificate?.state === 'Revoked'
      ? 'Revoked'
      : result?.kind === 'Revoked' && certificate && certificate.state !== 'Revoked'
        ? 'Valid'
        : result?.kind
  const view = certificate ? buildCertificateView(state, certificate) : null
  const privateResults = view ? !view.learner.resultsPublic : false

  const persistResult = (nextValue: string, nextResult: ResultState) => {
    try {
      if (nextResult) {
        sessionStorage.setItem(LAST_LOOKUP_KEY, JSON.stringify({ value: nextValue, result: nextResult }))
      } else {
        sessionStorage.removeItem(LAST_LOOKUP_KEY)
      }
    } catch {
      // Session storage is optional.
    }
  }

  const groups = useMemo(() => sampleGroups(state), [state])

  useEffect(() => {
    if (result) {
      window.requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [result])

  const runLookup = (input: string) => {
    if (!/^\d{6}$/.test(input)) {
      pushToast('Enter all 6 digits of the certificate ID.', 'error')
      return
    }
    const response = lookup(input)
    const nextResult: ResultState = {
      kind: response.outcome,
      certificateId: response.certificate?.id,
      input,
    }
    setResult(nextResult)
    persistResult(input, nextResult)
    if (response.warning) {
      setLookupWarning(response.warning)
    }
  }

  const chooseSample = (id: string) => {
    setValue(id)
    runLookup(id)
  }

  const submitDispute = () => {
    if (!certificate) return
    const outcome = openDispute(certificate.id, disputeReason, disputeEmail)
    if (!outcome.ok) {
      pushToast(outcome.message, 'error')
      return
    }
    setVerifierEmail(disputeEmail)
    setDisputeOpen(false)
    setDisputeReason('')
    pushToast(outcome.message, 'success')
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] overflow-hidden">
        <div className="absolute left-[18%] top-[-270px] h-[520px] w-[520px] rounded-full bg-[#2f5dff]/20 blur-[120px]" />
        <div className="absolute right-[12%] top-[-300px] h-[560px] w-[560px] rounded-full bg-[#a044ff]/18 blur-[130px]" />
        <div className="absolute left-1/2 top-0 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#7088ff]/30 to-transparent" />
      </div>

      <Container className="relative pb-24 pt-12 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#728cff]/25 bg-[#6f86ff]/[0.08] px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.04em] text-[#aab9ff] shadow-[0_0_32px_rgba(87,112,255,0.1)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure Verification System
          </div>
          <h1 className="mt-5 font-display text-[48px] font-semibold leading-[0.96] tracking-[-0.055em] text-white sm:text-[66px]">
            Certificate
            <span className="gradient-text mt-1 block">Verification</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-slate-400 sm:text-[15px]">
            Confirm a Career-180 certificate in seconds. Enter the 6-digit certificate ID to see its
            authenticity and the evidence behind it.
          </p>
        </div>

        <div className="mx-auto mt-9 max-w-[760px]">
          <div className="glass-panel overflow-hidden">
            <div className="border-b border-white/[0.07] px-5 pb-5 pt-5 sm:px-8 sm:pt-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.17em] text-slate-500">
                    Certificate ID
                  </div>
                  <div className="mt-1 text-[13px] text-slate-400">
                    Enter the 6-digit ID printed on the certificate.
                  </div>
                </div>
                <span className="pill border-[#8194ff]/20 bg-[#8194ff]/[0.08] text-[#b6c2ff]">
                  6 digits
                </span>
              </div>

              <div className="mt-5">
                <SegmentedInput
                  length={6}
                  value={value}
                  onChange={setValue}
                  onComplete={(completed) => runLookup(completed)}
                />
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-[11px] text-slate-600">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Repeated misses trigger a warning, never a lockout.
                </div>
                <Button
                  variant="primary"
                  className="w-full sm:w-auto"
                  onClick={() => runLookup(value)}
                >
                  <Search className="h-4 w-4" />
                  Verify certificate
                </Button>
              </div>
            </div>
          </div>

          <div
            id="sample-chips"
            className="mt-5 overflow-hidden rounded-2xl border border-white/[0.1] bg-[#090b12] shadow-[0_18px_70px_rgba(0,0,0,0.22)]"
          >
            <button
              type="button"
              onClick={() => setSamplesOpen((open) => !open)}
              aria-expanded={samplesOpen}
              aria-controls="sample-groups"
              className="focus-ring flex w-full items-start justify-between gap-3 border-b border-white/[0.07] bg-white/[0.02] px-4 py-4 text-left transition hover:bg-white/[0.035] sm:px-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-300">
                    <Sparkles className="h-3.5 w-3.5 text-[#8b9cff]" />
                    Sample data
                  </span>
                  <span className="pill border-amber-400/20 bg-amber-400/[0.07] text-amber-300">
                    Demo only · not real learners
                  </span>
                </div>
                <p className="mt-1.5 max-w-2xl text-[11px] leading-5 text-slate-500">
                  These fictional records show why each certificate gets its state. Click any card to
                  verify that certificate ID.
                </p>
              </div>
              <span className="mt-0.5 inline-flex flex-none items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#080a11] px-2.5 py-1.5 text-[10px] font-semibold text-slate-400">
                <span className="hidden sm:inline">
                  {samplesOpen ? 'Hide sample data' : 'Show sample data'}
                </span>
                <ChevronDown
                  className={cx('h-3.5 w-3.5 transition', !samplesOpen && '-rotate-90')}
                />
              </span>
            </button>

            {samplesOpen && (
              <div id="sample-groups" className="divide-y divide-white/[0.055]">
                {groups.map((group) => (
                <div key={group.label} className="p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <span className={cx('h-2 w-2 rounded-full', stateDot(group.label))} />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                      {group.label}
                    </span>
                    <span className="text-[10px] text-slate-600">{group.items.length}</span>
                  </div>
                  <p className="mt-1 max-w-2xl text-[10px] leading-4 text-slate-500">
                    {group.description}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <button
                        key={`${group.label}-${item.id}`}
                        onClick={() => chooseSample(item.id)}
                        className="group flex flex-col rounded-xl border border-white/[0.075] bg-white/[0.025] p-3 text-left transition hover:border-[#7c91ff]/35 hover:bg-[#7c91ff]/[0.06]"
                        title={`${item.name} · ${item.course}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[12px] font-semibold text-slate-200 group-hover:text-white">
                            {item.name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 group-hover:text-[#a9b8ff]">
                            {item.id}
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] text-slate-500">{item.course}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span
                            className={cx(
                              'rounded-full border px-2 py-0.5 text-[9px] font-semibold',
                              stateBadge(item.state),
                            )}
                          >
                            {item.state}
                          </span>
                          {item.visibility && (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] text-slate-400">
                              {item.visibility}
                            </span>
                          )}
                          {item.source === 'Corporate-enrolled' && (
                            <span className="rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-2 py-0.5 text-[9px] text-violet-300">
                              Corporate
                            </span>
                          )}
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] text-slate-500">
                            {item.detail}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div ref={resultRef} className="scroll-mt-6">
          {effectiveKind === 'Not found' && <NotFoundResult />}
          {effectiveKind === 'Revoked' && certificate && (
            <RevokedResult
              certificate={certificate}
              courseName={getCourse(state.courses, certificate.courseId)?.name ?? 'Course'}
              onDispute={() => {
                setDisputeEmail(state.verifierEmail)
                setDisputeOpen(true)
              }}
            />
          )}
          {effectiveKind === 'Valid' && view && (
            <div className="mx-auto mt-10 max-w-[900px] animate-fade-up space-y-6">
              <div
                className={cx(
                  'overflow-hidden rounded-3xl border',
                  view.certificate.state === 'Verified'
                    ? 'border-emerald-400/25 bg-[#0b1714] shadow-[0_24px_100px_rgba(6,60,42,0.28)]'
                    : view.certificate.state === 'Legacy'
                      ? 'border-amber-400/25 bg-[#17130b] shadow-[0_24px_100px_rgba(80,55,5,0.2)]'
                      : 'border-sky-400/25 bg-[#0a131b] shadow-[0_24px_100px_rgba(8,45,80,0.22)]',
                )}
              >
                <div
                  className={cx(
                    'h-px bg-gradient-to-r from-transparent to-transparent',
                    view.certificate.state === 'Verified'
                      ? 'via-emerald-300/60'
                      : view.certificate.state === 'Legacy'
                        ? 'via-amber-300/60'
                        : 'via-sky-300/60',
                  )}
                />
                <div className="p-5 sm:p-8">
                  <div
                    className={cx(
                      'flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-center sm:justify-between',
                      view.certificate.state === 'Verified'
                        ? 'border-emerald-300/10'
                        : view.certificate.state === 'Legacy'
                          ? 'border-amber-300/10'
                          : 'border-sky-300/10',
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cx(
                          'grid h-12 w-12 flex-none place-items-center rounded-full border',
                          view.certificate.state === 'Verified'
                            ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-300 shadow-[0_0_35px_rgba(52,211,153,0.12)]'
                            : view.certificate.state === 'Legacy'
                              ? 'border-amber-300/25 bg-amber-400/10 text-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.12)]'
                              : 'border-sky-300/25 bg-sky-400/10 text-sky-300 shadow-[0_0_35px_rgba(56,189,248,0.12)]',
                        )}
                      >
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">
                          {view.certificate.state === 'Verified'
                            ? 'Certificate Verified Successfully'
                            : view.certificate.state === 'Legacy'
                              ? 'Legacy Certificate Found'
                              : 'Certificate Found'}
                        </h2>
                        <p
                          className={cx(
                            'mt-1 text-xs',
                            view.certificate.state === 'Verified'
                              ? 'text-emerald-200/65'
                              : view.certificate.state === 'Legacy'
                                ? 'text-amber-200/65'
                                : 'text-sky-200/65',
                          )}
                        >
                          {view.certificate.state === 'Verified'
                            ? 'This certificate ID is recognised by Career-180.'
                            : view.certificate.state === 'Legacy'
                              ? 'Recognised, but issued under the previous policy.'
                              : 'Recognised, but the course is not Verified.'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cx(
                        'inline-flex self-start items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold',
                        view.certificate.state === 'Verified'
                          ? 'border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-200'
                          : view.certificate.state === 'Legacy'
                            ? 'border-amber-300/20 bg-amber-400/[0.08] text-amber-200'
                            : 'border-sky-300/20 bg-sky-400/[0.08] text-sky-200',
                      )}
                    >
                      <span
                        className={cx(
                          'h-1.5 w-1.5 rounded-full',
                          view.certificate.state === 'Verified'
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                            : view.certificate.state === 'Legacy'
                              ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                              : 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]',
                        )}
                      />
                      {view.certificate.state}
                    </span>
                  </div>

                  <div className="grid gap-x-8 gap-y-5 py-6 sm:grid-cols-2">
                    <ResultField label="Full Name" value={view.certificate.learnerName} />
                    <ResultField label="Course" value={view.course.name} />
                    <ResultField label="Certificate ID" value={view.certificate.id} mono />
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                        Status
                      </div>
                      <div className="mt-1.5">
                        <StateBadge state={view.certificate.state} />
                      </div>
                    </div>
                  </div>

                  <CertificatePreview
                    certificate={view.certificate}
                    course={view.course}
                    learnerName={view.certificate.learnerName}
                  />
                </div>
              </div>

              {view.certificate.state === 'Verified' ? (
                <TrustCard
                  certificate={view.certificate}
                  privateResults={privateResults}
                  onDispute={() => {
                    setDisputeEmail(state.verifierEmail)
                    setDisputeOpen(true)
                  }}
                />
              ) : (
                <CompletionNote view={view} />
              )}
            </div>
          )}
        </div>
      </Container>

      <Modal
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        eyebrow="Review request"
        title="Dispute this result"
      >
        <div className="space-y-4">
          <p className="text-xs leading-5 text-slate-400">
            Tell Career-180 what looks wrong. Disputes are reviewed by an administrator, and the
            outcome is recorded. The certificate stays unchanged while a dispute is open.
          </p>
          <div>
            <label className="label" htmlFor="dispute-reason">
              Reason
            </label>
            <textarea
              id="dispute-reason"
              className="field min-h-24 resize-y"
              value={disputeReason}
              onChange={(event) => setDisputeReason(event.target.value)}
              placeholder="What should Career-180 review?"
            />
          </div>
          <div>
            <label className="label" htmlFor="dispute-email">
              Contact email
            </label>
            <input
              id="dispute-email"
              type="email"
              className="field"
              value={disputeEmail}
              onChange={(event) => setDisputeEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setDisputeOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submitDispute}>
              Submit dispute
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!lookupWarning}
        onClose={() => setLookupWarning(null)}
        eyebrow="Lookup warning"
        title="Too many unsuccessful lookups"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 flex-none text-amber-300" />
            <p className="text-xs leading-5 text-amber-100/80">
              You entered {lookupWarning?.failures ?? 5} certificate IDs that could not be found in
              the last {Math.max(1, Math.round((lookupWarning?.windowSeconds ?? 60) / 60))} minute.
              Double-check the 6-digit ID printed on the certificate.
            </p>
          </div>
          <p className="text-xs leading-5 text-slate-400">
            This is a warning only — verification is{' '}
            <span className="font-semibold text-white">not paused or blocked</span>. Keep trying IDs
            or use the sample data to continue the demo.
          </p>
          <div className="flex justify-end pt-1">
            <Button variant="primary" onClick={() => setLookupWarning(null)}>
              Continue demoing
            </Button>
          </div>
        </div>
      </Modal>

      <Footer />
    </div>
  )
}

function ResultField({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {label}
      </div>
      <div
        className={cx(
          'mt-1.5 text-[13px] font-medium leading-5 text-white',
          mono && 'font-mono tracking-[0.03em]',
        )}
      >
        {value}
      </div>
    </div>
  )
}

function CompletionNote({ view }: { view: NonNullable<ReturnType<typeof buildCertificateView>> }) {
  const legacy = view.certificate.state === 'Legacy'
  const noAssessment = view.requiredItems.length === 0
  return (
    <div
      className={cx(
        'glass-panel overflow-hidden border',
        legacy ? 'border-amber-400/20' : 'border-sky-400/20',
      )}
    >
      <div
        className={cx(
          'flex items-center gap-2.5 border-b px-5 py-4 sm:px-6',
          legacy ? 'border-amber-300/10' : 'border-sky-300/10',
        )}
      >
        <span
          className={cx(
            'grid h-8 w-8 flex-none place-items-center rounded-xl border',
            legacy
              ? 'border-amber-400/25 bg-amber-400/10 text-amber-300'
              : 'border-sky-400/25 bg-sky-400/10 text-sky-300',
          )}
        >
          <AlertCircle className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-display text-base font-semibold text-white">
            {legacy ? 'Why this certificate is Legacy' : 'Why this certificate is not Verified'}
          </h2>
          <p className="text-[11px] text-slate-500">
            This certificate is valid, but the trust layer is only shown for Verified certificates.
          </p>
        </div>
      </div>
      <div className="space-y-3 p-5 text-[12px] leading-5 text-slate-400 sm:p-6">
        {legacy ? (
          <>
            <p>
              Issued under the previous policy before January 2027. Assessment results were never
              stored, so Career-180 cannot show evidence for this certificate.
            </p>
            <p className="text-[11px] text-slate-500">
              The learner can upgrade for free by passing the current required items. The certificate
              ID stays the same and the old record remains in history.
            </p>
          </>
        ) : noAssessment ? (
          <p>
            This course has no assessment. The certificate records course completion only, so it
            cannot become Verified.
          </p>
        ) : (
          <>
            <p>The learner finished the course, but these required items are not at 70 or more:</p>
            {view.missingItems.length ? (
              <div className="space-y-2">
                {view.missingItems.map((item) => {
                  const result = view.certificate.items.find((entry) => entry.itemId === item.id)
                  const score = result?.score ?? null
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-sky-400/15 bg-sky-400/[0.035] px-3.5 py-2.5"
                    >
                      <span className="text-[11px] font-medium text-sky-100/85">{item.label}</span>
                      <span className="text-[10px] text-sky-200/55">
                        {score === null ? 'Not taken' : `${score} · below 70`}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p>No required items are missing. The learner can simulate passing them.</p>
            )}
            {view.lockedItems.length > 0 && (
              <p className="text-[11px] text-amber-300/70">
                A required item is locked after 5 failed attempts. The learner can retake the course
                from the learner area.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TrustCard({
  certificate,
  privateResults,
  onDispute,
}: {
  certificate: Certificate
  privateResults: boolean
  onDispute: () => void
}) {
  const { state } = useDemo()
  const view = buildCertificateView(state, certificate)
  if (!view) return null
  const newer = view.latestVersion.version > certificate.courseVersion
  const assessed = view.requiredItems.length > 0
  const policy = view.policy
  return (
    <div className="glass-panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl border border-[#8497ff]/25 bg-[#8497ff]/10 text-[#a5b4ff]">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-white">Trust layer</h2>
            <p className="text-[11px] text-slate-500">Evidence behind the verification result</p>
          </div>
        </div>
        {privateResults && (
          <span className="pill self-start border-amber-400/20 bg-amber-400/[0.07] text-amber-300">
            <LockKeyhole className="h-3 w-3" />
            Results private
          </span>
        )}
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Level
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StateBadge
              state={certificate.state}
              label={certificate.state === 'Verified' ? 'Completed and Verified' : undefined}
            />
            {certificate.state === 'Verified' && (
              <InfoPopover title="What Verified means" align="left">
                Verified means the learner passed all the quizzes and assessments, and the course
                project where the course has one, each with at least 70%. It shows how much the
                learner benefited from the course and how far their skills in it can be trusted.
              </InfoPopover>
            )}
            {certificate.state === 'Legacy' && (
              <InfoPopover title="Old policy" align="left">
                {OLD_POLICY_TEXT}
              </InfoPopover>
            )}
          </div>
          {certificate.state === 'Completed' && (
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              {assessed
                ? 'The learner completed the course, but one or more required assessments are below 70 or not taken.'
                : 'This course has no assessment.'}
            </p>
          )}
          {certificate.state === 'Legacy' && (
            <p className="mt-2 text-[11px] leading-5 text-amber-300/75">
              Issued under the previous standard
            </p>
          )}
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Learner source
          </div>
          <div className="mt-2">
            <SourceBadge source={view.learner.source} />
            {view.learner.employer && (
              <span className="ml-2 text-[11px] text-slate-500">{view.learner.employer}</span>
            )}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Course and version
          </div>
          <div className="mt-1.5 text-[13px] font-medium text-white">
            {view.course.name} <span className="text-slate-500">· v{certificate.courseVersion}</span>
          </div>
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Policy in force at issue
          </div>
          <div className="mt-1.5 text-[13px] font-medium text-white">
            {policy ? `${policy.title} (v${policy.version})` : 'Not recorded'}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Certificate ID
          </div>
          <div className="mt-1.5 font-mono text-[13px] font-medium text-white">
            {certificate.id}
          </div>
        </div>

        {newer && (
          <div className="sm:col-span-2">
            <div className="flex items-start gap-3 rounded-xl border border-[#778cff]/20 bg-[#778cff]/[0.06] px-3.5 py-3">
              <History className="mt-0.5 h-4 w-4 flex-none text-[#98a8ff]" />
              <div>
                <div className="text-[12px] font-semibold text-[#c7d0ff]">
                  A newer version of this course exists (v{view.latestVersion.version}):{' '}
                  {view.latestVersion.note}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">
                  The certificate state is unchanged by the course revision.
                </div>
              </div>
            </div>
          </div>
        )}

        {!assessed && (
          <div className="sm:col-span-2">
            <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-3 text-[12px] text-slate-400">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-slate-500" />
              This course has no assessment. The certificate records course completion only.
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {certificate.state === 'Verified' ? (
              <a href={`#/evidence/${certificate.id}`}>
                <Button variant="primary">
                  <GraduationCap className="h-4 w-4" />
                  View results
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </a>
            ) : (
              <span className="text-[11px] text-slate-500">
                Evidence is available for Verified certificates only.
              </span>
            )}
            {privateResults && certificate.state === 'Verified' && (
              <span className="text-[10px] leading-4 text-amber-300/70">
                Learner approval may be required.
              </span>
            )}
          </div>
          <button
            onClick={onDispute}
            className="focus-ring self-start rounded-lg text-[11px] font-medium text-slate-500 underline decoration-slate-700 underline-offset-4 transition hover:text-slate-300 sm:self-auto"
          >
            Dispute this result
          </button>
        </div>
      </div>
    </div>
  )
}

function RevokedResult({
  certificate,
  courseName,
  onDispute,
}: {
  certificate: Certificate
  courseName: string
  onDispute: () => void
}) {
  return (
    <div className="mx-auto mt-10 max-w-[900px] animate-fade-up">
      <div className="overflow-hidden rounded-3xl border border-red-400/25 bg-[#180d10] shadow-[0_24px_100px_rgba(70,10,20,0.25)]">
        <div className="h-px bg-gradient-to-r from-transparent via-red-300/50 to-transparent" />
        <div className="p-6 sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 flex-none place-items-center rounded-full border border-red-400/25 bg-red-400/10 text-red-300">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">
                  Certificate Revoked
                </h2>
                <p className="mt-1.5 text-sm text-red-200/70">
                  Revoked on {formatDate(certificate.revokedAt)}
                </p>
              </div>
            </div>
            <span className="pill self-start border-red-400/20 bg-red-400/[0.08] text-red-300">
              Not valid
            </span>
          </div>
          <div className="mt-6 rounded-xl border border-red-300/10 bg-red-400/[0.03] p-4 text-[12px] leading-5 text-red-100/60">
            This certificate is not presented as valid. Its evidence is hidden. Revocation is final,
            and the certificate cannot be restored.
          </div>
          <div className="mt-5 grid gap-4 text-[12px] sm:grid-cols-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-red-200/35">Certificate</div>
              <div className="mt-1 font-mono text-red-50/80">{certificate.id}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-red-200/35">Course</div>
              <div className="mt-1 text-red-50/80">{courseName}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-red-200/35">Reason</div>
              <div className="mt-1 capitalize text-red-50/80">{certificate.revokeReason ?? '—'}</div>
            </div>
          </div>
          <button
            onClick={onDispute}
            className="mt-6 text-[11px] font-medium text-red-200/55 underline decoration-red-400/20 underline-offset-4 transition hover:text-red-100"
          >
            Dispute this result
          </button>
        </div>
      </div>
    </div>
  )
}

function NotFoundResult() {
  return (
    <div className="mx-auto mt-10 max-w-[900px] animate-fade-up rounded-3xl border border-red-400/25 bg-[#180b0d] p-6 shadow-[0_24px_100px_rgba(80,5,15,0.2)] sm:p-9">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 flex-none place-items-center rounded-full border border-red-400/25 bg-red-400/10 text-red-300">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">
            Certificate not found
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-red-100/65">
            We could not find a certificate with this 6-digit ID. Check the number and try again, or
            contact Career-180.
          </p>
        </div>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06]">
      <Container className="flex flex-col items-center justify-between gap-2 py-7 text-[11px] text-slate-600 sm:flex-row">
        <span>© 2027 Career-180. All rights reserved.</span>
        <span className="flex items-center gap-1.5">
          <Shield className="h-3 w-3" />
          Certificate trust layer prototype
        </span>
      </Container>
    </footer>
  )
}
