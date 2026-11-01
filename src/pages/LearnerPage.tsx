import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Bell,
  BookOpenCheck,
  Check,
  ChevronDown,
  Clock3,
  Download,
  Eye,
  EyeOff,
  Inbox,
  KeyRound,
  Linkedin,
  UserRound,
  X,
} from 'lucide-react'
import { useDemo } from '../lib/store'
import {
  OLD_POLICY_TEXT,
  addDays,
  buildCertificateView,
  daysBetween,
  effectiveRequestStatus,
  formatDate,
  getCourse,
  policyAt,
} from '../lib/domain'
import type { AccessRequest } from '../types'
import { CertificatePreview } from '../components/CertificatePreview'
import {
  Button,
  Container,
  cx,
  EmptyState,
  InfoPopover,
  Modal,
  PageHeader,
  SourceBadge,
  StateBadge,
  useToast,
} from '../components/ui'

export function LearnerPage() {
  const {
    state,
    today,
    setSharing,
    approveAccess,
    declineAccess,
    dismissPolicy,
    markPolicySeen,
  } = useDemo()
  const { pushToast } = useToast()
  const [selectedLearnerId, setSelectedLearnerId] = useState(() => {
    const pending = state.accessRequests.find(
      (request) => effectiveRequestStatus(request, today) === 'pending',
    )
    return pending?.learnerId ?? state.learners[0]?.id ?? ''
  })
  const [certificateOpen, setCertificateOpen] = useState(false)
  const learner = state.learners.find((entry) => entry.id === selectedLearnerId) ?? state.learners[0]
  const certificate = learner
    ? state.certificates.find((entry) => entry.learnerId === learner.id)
    : undefined
  const view = certificate ? buildCertificateView(state, certificate) : null
  const policyNotice = useMemo(
    () =>
      [...state.policies]
        .filter(
          (policy) =>
            policy.announcement &&
            policy.effectiveFrom <= today &&
            learner &&
            !state.dismissedPolicyIds.includes(`${learner.id}:${policy.version}`),
        )
        .sort((a, b) => b.version - a.version)[0],
    [state.policies, state.dismissedPolicyIds, today, learner],
  )

  useEffect(() => {
    if (learner && policyNotice) {
      markPolicySeen(learner.id, String(policyNotice.version))
    }
  }, [learner, markPolicySeen, policyNotice])

  if (!learner || !certificate || !view) {
    return (
      <Container className="py-16">
        <EmptyState title="Learner not found" description="Choose a demo learner to continue." />
      </Container>
    )
  }

  const accessRequests = state.accessRequests
    .filter((request) => request.learnerId === learner.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const pendingRequests = accessRequests.filter(
    (request) => effectiveRequestStatus(request, today) === 'pending',
  )
  const spotlightRequest = pendingRequests[0]
  const courseNameForRequest = (request: AccessRequest) => {
    const requestCertificate = state.certificates.find(
      (entry) => entry.id === request.certificateId,
    )
    return requestCertificate
      ? getCourse(state.courses, requestCertificate.courseId)?.name ?? requestCertificate.courseId
      : 'Course'
  }
  const approveRequest = (request: AccessRequest) => {
    approveAccess(request.id)
    pushToast(`Access approved until ${formatDate(addDays(today, 14))}.`, 'success')
  }
  const declineRequest = (request: AccessRequest) => {
    declineAccess(request.id)
    pushToast('Access request declined.', 'info')
  }

  return (
    <Container className="pb-24">
      <PageHeader
        eyebrow="Demo learner login"
        title="Learner area"
        description="Demo the learner’s own view: certificate, sharing setting and access requests. No real authentication is used."
        actions={
          <div className="relative">
            <select
              value={learner.id}
              onChange={(event) => {
                setSelectedLearnerId(event.target.value)
                setCertificateOpen(false)
              }}
              className="focus-ring appearance-none rounded-xl border border-white/[0.1] bg-[#0d0f18] py-2.5 pl-3.5 pr-10 text-xs font-semibold text-white outline-none transition hover:border-white/[0.18]"
              aria-label="Demo learner login"
            >
              {state.learners.map((entry) => {
                const card = state.certificates.find((item) => item.learnerId === entry.id)
                return (
                  <option key={entry.id} value={entry.id}>
                    {entry.name} · {card?.id}
                  </option>
                )
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
        }
      />

      <div className="mb-5 animate-fade-up rounded-2xl border border-[#8194ff]/25 bg-[#111528] p-4 shadow-[0_12px_50px_rgba(55,70,160,0.15)] sm:p-5">
        <div className="flex items-start gap-3.5">
          <div className="grid h-9 w-9 flex-none place-items-center rounded-xl border border-[#8194ff]/20 bg-[#8194ff]/10 text-[#a7b5ff]">
            <UserRound className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-white">
                You are demoing as a learner
              </span>
              <span className="pill border-[#8194ff]/20 bg-[#8194ff]/[0.08] text-[#b6c2ff]">
                Learner view
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-400">
              You are seeing <span className="font-semibold text-slate-200">{learner.name}</span>’s
              own certificate. Open it to download or add it to LinkedIn, choose what employers can
              see, and review access requests below.
            </p>
          </div>
        </div>
      </div>

      {spotlightRequest && (
        <div className="mb-5 animate-fade-up rounded-2xl border border-amber-400/25 bg-[#1a1508] p-4 shadow-[0_12px_50px_rgba(120,85,10,0.16)] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="grid h-9 w-9 flex-none place-items-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-white">
                    {spotlightRequest.nameCompany} requested access
                  </span>
                  <span className="pill border-amber-400/25 bg-amber-400/[0.08] text-amber-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Pending approval
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-400">
                  <span className="font-semibold text-slate-200">{spotlightRequest.email}</span> from{' '}
                  <span className="font-semibold text-slate-200">
                    {spotlightRequest.nameCompany}
                  </span>{' '}
                  asked to view the results for{' '}
                  <span className="font-semibold text-slate-200">
                    {courseNameForRequest(spotlightRequest)}
                  </span>
                  .
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                  <Clock3 className="h-3 w-3" />
                  Sent {formatDate(spotlightRequest.createdAt)} ·{' '}
                  {sentLabel(spotlightRequest.createdAt, today)}
                  <span className="text-slate-700">·</span>
                  <span>Certificate {spotlightRequest.certificateId}</span>
                </div>
                <p className="mt-2 max-w-xl text-[10px] leading-4 text-amber-200/60">
                  Approving shares the assessment evidence for 14 days. Validity and level stay
                  visible either way.
                </p>
              </div>
            </div>
            <div className="flex flex-none gap-2 sm:pl-4">
              <Button size="sm" variant="success" onClick={() => approveRequest(spotlightRequest)}>
                <Check className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button size="sm" variant="danger" onClick={() => declineRequest(spotlightRequest)}>
                <X className="h-3.5 w-3.5" />
                Decline
              </Button>
            </div>
          </div>
        </div>
      )}

      {policyNotice && (
        <div className="mb-5 animate-fade-up rounded-2xl border border-[#8194ff]/25 bg-[#111528] p-4 shadow-[0_12px_50px_rgba(55,70,160,0.15)] sm:p-5">
          <div className="flex items-start gap-3.5">
            <div className="grid h-9 w-9 flex-none place-items-center rounded-xl border border-[#8194ff]/20 bg-[#8194ff]/10 text-[#a7b5ff]">
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-white">
                  New policy: {policyNotice.title}
                </span>
                <span className="pill border-[#8194ff]/20 bg-[#8194ff]/[0.08] text-[#b6c2ff]">
                  Information only
                </span>
              </div>
              <p className="mt-1.5 text-[11px] leading-5 text-slate-400">{policyNotice.summary}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                <button
                  onClick={() =>
                    document.getElementById('sharing-setting')?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="text-[10px] font-semibold text-[#aebcff] underline decoration-[#8194ff]/30 underline-offset-4 hover:text-white"
                >
                  Review your sharing setting
                </button>
                <button
                  onClick={() => dismissPolicy(learner.id, String(policyNotice.version))}
                  className="text-[10px] text-slate-600 hover:text-slate-300"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="glass-panel overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 flex-none place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#5f83ff]/15 to-[#a363ff]/15 font-display text-lg font-semibold text-[#b9c5ff]">
                  {learner.name
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-white">
                      {learner.name}
                    </h2>
                    <StateBadge state={certificate.state} size="sm" />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <SourceBadge source={learner.source} />
                    {learner.employer && (
                      <span className="text-[10px] text-slate-500">{learner.employer}</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setCertificateOpen(true)}
                className="focus-ring group text-left sm:text-right"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  Certificate
                </div>
                <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-semibold text-white sm:justify-end">
                  {certificate.id}
                  <Eye className="h-3.5 w-3.5 text-slate-500 transition group-hover:text-[#aab9ff]" />
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">View, download or share</div>
              </button>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-3 sm:p-6">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  Level
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <StateBadge state={certificate.state} />
                  {certificate.state === 'Verified' && (
                    <InfoPopover title="What Verified means">
                      Verified means the learner passed all the quizzes and assessments, and the course
                      project where the course has one, each with at least 70%. It shows how much the
                      learner benefited from the course and how far their skills in it can be trusted.
                    </InfoPopover>
                  )}
                  {certificate.state === 'Legacy' && (
                    <InfoPopover title="Old policy">{OLD_POLICY_TEXT}</InfoPopover>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  Course
                </div>
                <div className="mt-1.5 text-[12px] font-medium leading-5 text-white">
                  {view.course.name}
                  <span className="text-slate-500"> · v{certificate.courseVersion}</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  Issue date
                </div>
                <div className="mt-1.5 text-[12px] font-medium text-white">
                  {formatDate(certificate.issuedAt)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 px-5 pb-5 sm:px-6 sm:pb-6">
              <Button variant="secondary" onClick={() => setCertificateOpen(true)}>
                <Eye className="h-4 w-4" />
                View certificate
              </Button>
              <span className="text-[10px] text-slate-600">
                Open your certificate to download or add it to LinkedIn.
              </span>
            </div>

            {certificate.state === 'Legacy' && (
              <div className="mx-5 mb-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.045] px-4 py-3 sm:mx-6 sm:mb-6">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-amber-300" />
                  <div>
                    <div className="text-[11px] font-semibold text-amber-200">
                      Issued under the previous standard
                    </div>
                    <div className="mt-0.5 text-[10px] leading-4 text-amber-100/50">
                      No stored assessment results. The learner can upgrade for free by passing the
                      current required items.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {view.latestVersion.version > certificate.courseVersion && (
              <div className="mx-5 mb-5 rounded-xl border border-[#8194ff]/20 bg-[#8194ff]/[0.05] px-4 py-3 sm:mx-6 sm:mb-6">
                <div className="flex items-start gap-2.5">
                  <BookOpenCheck className="mt-0.5 h-4 w-4 flex-none text-[#9dacff]" />
                  <div>
                    <div className="text-[11px] font-semibold text-[#c6d0ff]">
                      A newer version of this course exists (v{view.latestVersion.version}):{' '}
                      {view.latestVersion.note}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      The certificate state does not change when a course is revised.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          
          </div>

        <aside className="space-y-5">
          <section id="sharing-setting" className="glass-panel scroll-mt-6 p-5">
            <div className="flex items-center gap-2">
              {learner.resultsPublic ? (
                <Eye className="h-4 w-4 text-emerald-300" />
              ) : (
                <EyeOff className="h-4 w-4 text-amber-300" />
              )}
              <h3 className="font-display text-sm font-semibold text-white">Sharing setting</h3>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              One setting for all of this learner’s certificates. Private hides evidence but keeps
              validity and level visible.
            </p>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3">
              <div>
                <div className="text-[11px] font-semibold text-slate-200">
                  {learner.resultsPublic ? 'Results public' : 'Results private'}
                </div>
                <div className="mt-0.5 text-[9px] text-slate-600">
                  {learner.resultsPublic ? 'Any verifier can open evidence.' : 'Verifier approval required.'}
                </div>
              </div>
              <button
                role="switch"
                aria-checked={learner.resultsPublic}
                aria-label="Toggle public results"
                onClick={() => {
                  setSharing(learner.id, !learner.resultsPublic)
                  pushToast(
                    learner.resultsPublic
                      ? 'Results switched to private. Evidence now requires approval.'
                      : 'Results switched to public. Any verifier can open evidence.',
                    'info',
                  )
                }}
                className={cx(
                  'focus-ring relative h-6 w-11 flex-none rounded-full border transition',
                  learner.resultsPublic
                    ? 'border-emerald-400/30 bg-emerald-400/25'
                    : 'border-white/10 bg-white/[0.08]',
                )}
              >
                <span
                  className={cx(
                    'absolute top-0.5 h-4.5 w-4.5 rounded-full shadow-sm transition',
                    learner.resultsPublic
                      ? 'left-[22px] bg-emerald-300'
                      : 'left-0.5 bg-slate-400',
                  )}
                  style={{ height: 18, width: 18 }}
                />
              </button>
            </div>
          </section>

          <section className="glass-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
              <div className="flex items-center gap-2">
                <Inbox className="h-4 w-4 text-[#9caaff]" />
                <h3 className="font-display text-sm font-semibold text-white">Access requests</h3>
              </div>
              <span className="pill border-white/[0.08] bg-white/[0.04] text-slate-500">
                {accessRequests.filter((request) => effectiveRequestStatus(request, today) === 'pending').length}{' '}
                pending
              </span>
            </div>
            <div className="divide-y divide-white/[0.055]">
              {accessRequests.length ? (
                accessRequests.map((request) => (
                  <AccessRequestItem
                    key={request.id}
                    request={request}
                    courseName={courseNameForRequest(request)}
                    today={today}
                    onApprove={() => approveRequest(request)}
                    onDecline={() => declineRequest(request)}
                  />
                ))
              ) : (
                <div className="px-5 py-8 text-center text-[11px] text-slate-600">
                  No access requests yet.
                </div>
              )}
            </div>
          </section>

          <section className="glass-panel-soft p-5">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <KeyRound className="h-3.5 w-3.5" />
              Policy in force at issue
            </div>
            <div className="mt-2 text-[12px] font-semibold text-slate-200">
              {policyAt(certificate.issuedAt, state.policies)?.title ?? 'Not recorded'}
            </div>
            <p className="mt-1 text-[10px] leading-4 text-slate-600">
              Policies are notices. Publishing a new policy never blocks access or changes a
              certificate.
            </p>
          </section>
        </aside>
      </div>

      <Modal
        open={certificateOpen}
        onClose={() => setCertificateOpen(false)}
        eyebrow="Your certificate"
        title="Certificate detail"
        wide
      >
        <div className="space-y-4">
          <CertificatePreview
            certificate={certificate}
            course={view.course}
            learnerName={learner.name}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="primary"
              className="flex-1"
              onClick={() =>
                pushToast('Certificate download is mocked in this prototype.', 'info')
              }
            >
              <Download className="h-4 w-4" />
              Download certificate
            </Button>
            <Button
              variant="blue"
              className="flex-1"
              onClick={() => pushToast('LinkedIn sharing is mocked in this prototype.', 'info')}
            >
              <Linkedin className="h-4 w-4" />
              Add to LinkedIn profile
            </Button>
          </div>
          <p className="text-center text-[10px] leading-4 text-slate-600">
            The download is a mock in this prototype. LinkedIn sharing would use the certificate ID
            and verification link.
          </p>
        </div>
      </Modal>
    </Container>
  )
}

function AccessRequestItem({
  request,
  courseName,
  today,
  onApprove,
  onDecline,
}: {
  request: AccessRequest
  courseName: string
  today: string
  onApprove: () => void
  onDecline: () => void
}) {
  const status = effectiveRequestStatus(request, today)
  const style =
    status === 'pending'
      ? 'border-amber-400/20 bg-amber-400/[0.07] text-amber-300'
      : status === 'approved'
        ? 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300'
        : status === 'declined'
          ? 'border-red-400/20 bg-red-400/[0.07] text-red-300'
          : 'border-white/10 bg-white/[0.04] text-slate-400'
  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-200">{request.nameCompany}</div>
          <div className="mt-0.5 break-all font-mono text-[9px] text-slate-600">{request.email}</div>
        </div>
        <span className={cx('pill capitalize', style)}>{status}</span>
      </div>
      <div className="mt-2 text-[10px] text-slate-500">Results for {courseName}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[9px] text-slate-600">
        <Clock3 className="h-3 w-3" />
        {status === 'pending'
          ? `Sent ${formatDate(request.createdAt)} · ${sentLabel(
              request.createdAt,
              today,
            )} · expires ${formatDate(addDays(request.createdAt, 14))}`
          : status === 'approved'
            ? `Approved ${formatDate(request.approvedAt)} · until ${formatDate(request.expiresAt)}`
            : `Updated ${formatDate(request.respondedAt)}`}
      </div>
      {status === 'pending' && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="success" onClick={onApprove}>
            <Check className="h-3.5 w-3.5" />
            Approve
          </Button>
          <Button size="sm" variant="danger" onClick={onDecline}>
            <X className="h-3.5 w-3.5" />
            Decline
          </Button>
        </div>
      )}
    </div>
  )
}

function sentLabel(createdAt: string, today: string) {
  const days = daysBetween(createdAt, today)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}
