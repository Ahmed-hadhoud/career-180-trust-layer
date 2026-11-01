import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AccessRequest,
  AppEvent,
  AppState,
  Certificate,
  CourseItem,
  Dispute,
  EventPayload,
  Policy,
  RevokeReason,
} from '../types'
import {
  ACCESS_DAYS,
  MAX_REQUESTS_PER_EMAIL,
  addDays,
  approvedAccessFor,
  buildSeedState,
  clockDate,
  clockIso,
  currentPolicy,
  dateFromOffset,
  effectiveRequestStatus,
  findCertificate,
  getCourse,
  getLearner,
  isAfter,
  latestVersion,
  lookupResult,
  policyAt,
  requiredItems,
  resultFor,
  uid,
  versionOf,
} from './domain'

const STORAGE_KEY = 'career180.trust-layer.v1'

interface LookupResponse {
  outcome: 'Valid' | 'Revoked' | 'Not found'
  certificate?: Certificate
  warning?: { failures: number; windowSeconds: number }
}

interface AccessResult {
  ok: boolean
  message: string
}

interface DemoContextValue {
  state: AppState
  today: string
  verifierEmail: string
  lookup: (input: string) => LookupResponse
  logEvent: (type: string, certificateId: string | undefined, payload?: EventPayload) => void
  setVerifierEmail: (email: string) => void
  openEvidence: (certificateId: string) => void
  openAiSummary: (certificateId: string) => void
  requestAccess: (certificateId: string, email: string, nameCompany: string) => AccessResult
  approveAccess: (requestId: string) => void
  declineAccess: (requestId: string) => void
  setSharing: (learnerId: string, publicResults: boolean) => void
  simulatePass: (certificateId: string) => AccessResult
  upgradeLegacy: (certificateId: string) => AccessResult
  retakeCourse: (certificateId: string) => void
  revokeCertificate: (
    certificateId: string,
    reason: RevokeReason,
    date: string,
    note: string,
  ) => void
  openDispute: (certificateId: string, reason: string, email: string) => AccessResult
  resolveDispute: (
    disputeId: string,
    action: 'rejected' | 'corrected' | 'revoked',
    outcome: string,
    edits?: { learnerName?: string; courseId?: string; issuedAt?: string },
  ) => void
  toggleRequired: (courseId: string, itemId: string) => void
  publishCourseVersion: (courseId: string, note: string) => AccessResult
  publishPolicy: (title: string, summary: string) => AccessResult
  dismissPolicy: (learnerId: string, policyId: string) => void
  markPolicySeen: (learnerId: string, policyId: string) => void
  fastForward: () => void
  resetDemo: () => void
  getAccess: (certificateId: string, email: string) => AccessRequest | undefined
  requestStatusFor: (
    certificateId: string,
    email: string,
  ) => ReturnType<typeof effectiveRequestStatus> | undefined
  hasApprovedAccess: (certificateId: string, email: string) => boolean
}

const DemoContext = createContext<DemoContextValue | null>(null)

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as AppState
      return {
        ...buildSeedState(),
        ...parsed,
        lookupFailures: parsed.lookupFailures ?? [],
        dismissedPolicyIds: parsed.dismissedPolicyIds ?? [],
        verifierEmail: parsed.verifierEmail ?? '',
      }
    }
  } catch {
    // Fall through to a clean demo.
  }
  return buildSeedState()
}

function withEvent(
  state: AppState,
  type: string,
  certificateId: string | undefined,
  payload: EventPayload = {},
): AppState {
  const event: AppEvent = {
    id: uid('evt'),
    at: clockIso(state),
    type,
    certificateId,
    payload,
  }
  return { ...state, events: [event, ...state.events] }
}

function appendHistory(
  certificate: Certificate,
  date: string,
  state: Certificate['state'],
  issueDate: string,
  note: string,
): Certificate {
  return {
    ...certificate,
    history: [
      ...certificate.history,
      { date, state, issueDate: date === issueDate ? date : issueDate, note },
    ],
  }
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // localStorage can be unavailable in private browsing; the in-memory demo still works.
    }
  }, [state])

  const update = useCallback((mutator: (current: AppState) => AppState) => {
    const next = mutator(stateRef.current)
    stateRef.current = next
    setState(next)
  }, [])

  const today = clockDate(state)

  const logEvent = useCallback(
    (type: string, certificateId: string | undefined, payload: EventPayload = {}) => {
      update((current) => withEvent(current, type, certificateId, payload))
    },
    [update],
  )

  const setVerifierEmail = useCallback(
    (email: string) => {
      update((current) => ({ ...current, verifierEmail: email }))
    },
    [update],
  )

  const lookup = useCallback(
    (input: string): LookupResponse => {
      const current = stateRef.current
      const nowMs = Date.now()
      const normalized = input.trim().toUpperCase()

      const certificate = findCertificate(current.certificates, normalized)
      if (certificate) {
        update((latest) =>
          withEvent(
            { ...latest, lookupFailures: [] },
            'lookup_found',
            certificate.id,
            {
              input: normalized,
              result: lookupResult(certificate),
              state: certificate.state,
            },
          ),
        )
        return { outcome: lookupResult(certificate), certificate }
      }

      const recent = current.lookupFailures.filter((stamp) => nowMs - stamp <= 60_000)
      const failures = [...recent, nowMs]
      const warning = failures.length >= 5
      const nextFailures = warning ? [] : failures
      update((latest) =>
        withEvent(
          { ...latest, lookupFailures: nextFailures },
          'lookup_not_found',
          normalized || undefined,
          {
            input: normalized,
            result: 'Not found',
            ...(warning ? { warning: true, failures: failures.length } : {}),
          },
        ),
      )
      return {
        outcome: 'Not found',
        warning: warning ? { failures: failures.length, windowSeconds: 60 } : undefined,
      }
    },
    [update],
  )

  const openEvidence = useCallback(
    (certificateId: string) => {
      update((current) => {
        const certificate = current.certificates.find((entry) => entry.id === certificateId)
        const learner = certificate ? getLearner(current, certificate.learnerId) : undefined
        return withEvent(current, 'evidence_opened', certificateId, {
          resultsPublic: learner?.resultsPublic ?? false,
          verifierEmail: current.verifierEmail,
        })
      })
    },
    [update],
  )

  const openAiSummary = useCallback(
    (certificateId: string) => {
      update((current) =>
        withEvent(current, 'ai_summary_opened', certificateId, {
          prototypeOnly: true,
        }),
      )
    },
    [update],
  )

  const requestAccess = useCallback(
    (certificateId: string, email: string, nameCompany: string): AccessResult => {
      const current = stateRef.current
      const card = current.certificates.find((entry) => entry.id === certificateId)
      if (!card) return { ok: false, message: 'Certificate not found.' }
      const normalizedEmail = email.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return { ok: false, message: 'Enter a valid email address.' }
      }
      if (!nameCompany.trim()) {
        return { ok: false, message: 'Enter your name or company.' }
      }
      const requests = current.accessRequests.filter(
        (entry) =>
          entry.certificateId === certificateId &&
          entry.email.toLowerCase() === normalizedEmail,
      )
      const active = requests.find(
        (entry) =>
          effectiveRequestStatus(entry, clockDate(current)) === 'pending' ||
          effectiveRequestStatus(entry, clockDate(current)) === 'approved',
      )
      if (active) {
        return {
          ok: false,
          message:
            effectiveRequestStatus(active, clockDate(current)) === 'pending'
              ? 'You already have a pending request for this learner.'
              : 'You already have access to this learner’s results.',
        }
      }
      if (requests.length >= MAX_REQUESTS_PER_EMAIL) {
        return {
          ok: false,
          message: `You have reached the limit of ${MAX_REQUESTS_PER_EMAIL} access requests for this learner.`,
        }
      }
      const request: AccessRequest = {
        id: uid('req'),
        certificateId,
        learnerId: card.learnerId,
        email: normalizedEmail,
        nameCompany: nameCompany.trim(),
        createdAt: clockDate(current),
        status: 'pending',
      }
      update((latest) => {
        const next = {
          ...latest,
          accessRequests: [request, ...latest.accessRequests],
          verifierEmail: normalizedEmail,
        }
        return withEvent(next, 'access_requested', certificateId, {
          email: normalizedEmail,
          nameCompany: request.nameCompany,
          requestId: request.id,
        })
      })
      return { ok: true, message: 'Access request sent to the learner.' }
    },
    [update],
  )

  const approveAccess = useCallback(
    (requestId: string) => {
      update((current) => {
        const request = current.accessRequests.find((entry) => entry.id === requestId)
        if (!request) return current
        const currentDate = clockDate(current)
        const approved: AccessRequest = {
          ...request,
          status: 'approved',
          approvedAt: currentDate,
          expiresAt: addDays(currentDate, ACCESS_DAYS),
          respondedAt: currentDate,
        }
        return withEvent(
          {
            ...current,
            accessRequests: current.accessRequests.map((entry) =>
              entry.id === requestId ? approved : entry,
            ),
          },
          'access_approved',
          request.certificateId,
          {
            email: request.email,
            expiresAt: approved.expiresAt,
            requestId,
          },
        )
      })
    },
    [update],
  )

  const declineAccess = useCallback(
    (requestId: string) => {
      update((current) => {
        const request = current.accessRequests.find((entry) => entry.id === requestId)
        if (!request) return current
        const declined: AccessRequest = {
          ...request,
          status: 'declined',
          respondedAt: clockDate(current),
        }
        return withEvent(
          {
            ...current,
            accessRequests: current.accessRequests.map((entry) =>
              entry.id === requestId ? declined : entry,
            ),
          },
          'access_declined',
          request.certificateId,
          { email: request.email, requestId },
        )
      })
    },
    [update],
  )

  const setSharing = useCallback(
    (learnerId: string, publicResults: boolean) => {
      update((current) => {
        const certificate = current.certificates.find((entry) => entry.learnerId === learnerId)
        return withEvent(
          {
            ...current,
            learners: current.learners.map((learner) =>
              learner.id === learnerId
                ? { ...learner, resultsPublic: publicResults }
                : learner,
            ),
          },
          'setting_changed',
          certificate?.id,
          {
            learnerId,
            setting: publicResults ? 'public' : 'private',
          },
        )
      })
    },
    [update],
  )

  const simulatePass = useCallback(
    (certificateId: string): AccessResult => {
      const current = stateRef.current
      const certificate = current.certificates.find((entry) => entry.id === certificateId)
      if (!certificate) return { ok: false, message: 'Certificate not found.' }
      if (certificate.state !== 'Completed') {
        return { ok: false, message: 'Only Completed certificates can be upgraded this way.' }
      }
      const course = getCourse(current.courses, certificate.courseId)
      if (!course) return { ok: false, message: 'Course not found.' }
      const version = versionOf(course, certificate.courseVersion)
      const items = requiredItems(version)
      if (!items.length) {
        return { ok: false, message: 'This course has no assessment.' }
      }
      const locked = items.filter((item) => {
        const result = resultFor(certificate, item.id)
        return result?.locked || (result && result.attemptsUsed >= 5 && (result.score ?? 0) < 70)
      })
      if (locked.length) {
        return {
          ok: false,
          message: 'A failed item is locked. Retake the course before simulating a pass.',
        }
      }
      const missing = items.filter((item) => {
        const result = resultFor(certificate, item.id)
        return !result || result.score === null || result.score < 70
      })
      if (!missing.length) {
        return { ok: false, message: 'All required items are already passed.' }
      }
      const passedIds = new Set(missing.map((item) => item.id))
      let nextItems = certificate.items.map((result) =>
        passedIds.has(result.itemId)
          ? {
              ...result,
              score: 85,
              attemptsUsed: result.attemptsUsed + 1,
              locked: false,
            }
          : result,
      )
      for (const item of missing) {
        if (!nextItems.some((result) => result.itemId === item.id)) {
          nextItems.push({ itemId: item.id, score: 85, attemptsUsed: 1, locked: false })
        }
      }
      const passedProject = missing.some((item) => item.type === 'project')
      const newState = items.every((item) => {
        const result = nextItems.find((entry) => entry.itemId === item.id)
        return result?.score !== null && (result?.score ?? 0) >= 70
      })
        ? ('Verified' as const)
        : certificate.state
      let updatedCertificate: Certificate = {
        ...certificate,
        items: nextItems,
        state: newState,
        projectFeedback:
          passedProject && !certificate.projectFeedback
            ? 'Project passed at 85%. Instructor feedback was not recorded in this demo.'
            : certificate.projectFeedback,
      }
      if (newState === 'Verified') {
        updatedCertificate = appendHistory(
          updatedCertificate,
          clockDate(current),
          'Verified',
          certificate.issuedAt,
          'All required items reached 70 or more; upgraded from Completed.',
        )
      }
      update((latest) => {
        let next: AppState = {
          ...latest,
          certificates: latest.certificates.map((entry) =>
            entry.id === certificateId ? updatedCertificate : entry,
          ),
        }
        for (const item of missing) {
          next = withEvent(next, 'assessment_passed', certificateId, {
            itemId: item.id,
            itemLabel: item.label,
            simulatedScore: 85,
          })
        }
        if (newState === 'Verified') {
          next = withEvent(next, 'certificate_upgraded', certificateId, {
            from: 'Completed',
            to: 'Verified',
            issueDate: certificate.issuedAt,
          })
        }
        return next
      })
      return {
        ok: true,
        message:
          newState === 'Verified'
            ? 'All required items passed. The certificate is now Verified.'
            : 'Required items updated.',
      }
    },
    [update],
  )

  const upgradeLegacy = useCallback(
    (certificateId: string): AccessResult => {
      const current = stateRef.current
      const certificate = current.certificates.find((entry) => entry.id === certificateId)
      if (!certificate) return { ok: false, message: 'Certificate not found.' }
      if (certificate.state !== 'Legacy') {
        return { ok: false, message: 'Only Legacy certificates can use the free upgrade.' }
      }
      const course = getCourse(current.courses, certificate.courseId)
      if (!course) return { ok: false, message: 'Course not found.' }
      const version = latestVersion(course)
      const items = requiredItems(version)
      const currentDate = clockDate(current)
      const nextItems = items.map((item) => ({
        itemId: item.id,
        score: 85,
        attemptsUsed: 1,
        locked: false,
      }))
      const newState = items.length ? ('Verified' as const) : ('Completed' as const)
      let updatedCertificate: Certificate = {
        ...certificate,
        courseVersion: version.version,
        issuedAt: currentDate,
        state: newState,
        items: nextItems,
        projectFeedback: items.some((item) => item.type === 'project')
          ? 'Project passed at 85%. Instructor feedback was not recorded in this demo.'
          : certificate.projectFeedback,
      }
      updatedCertificate = appendHistory(
        updatedCertificate,
        currentDate,
        'Legacy',
        certificate.issuedAt,
        'Legacy record retained before the free upgrade.',
      )
      updatedCertificate = appendHistory(
        updatedCertificate,
        currentDate,
        newState,
        currentDate,
        items.length
          ? 'Upgraded for free after passing every required item in the current course version.'
          : 'Upgraded under the current policy. This course has no assessment.',
      )
      update((latest) => {
        let next: AppState = {
          ...latest,
          certificates: latest.certificates.map((entry) =>
            entry.id === certificateId ? updatedCertificate : entry,
          ),
        }
        for (const item of items) {
          next = withEvent(next, 'assessment_passed', certificateId, {
            itemId: item.id,
            itemLabel: item.label,
            simulatedScore: 85,
            context: 'Legacy free upgrade',
          })
        }
        next = withEvent(next, 'certificate_upgraded', certificateId, {
          from: 'Legacy',
          to: newState,
          issueDate: currentDate,
          previousIssueDate: certificate.issuedAt,
        })
        return next
      })
      return {
        ok: true,
        message: items.length
          ? 'Legacy certificate upgraded for free. The certificate ID stays the same.'
          : 'Legacy certificate updated under the current policy. This course has no assessment.',
      }
    },
    [update],
  )

  const retakeCourse = useCallback(
    (certificateId: string) => {
      update((current) => {
        const certificate = current.certificates.find((entry) => entry.id === certificateId)
        if (!certificate) return current
        const updated: Certificate = {
          ...certificate,
          items: certificate.items.map((result) => ({
            ...result,
            attemptsUsed: 0,
            locked: false,
          })),
        }
        return withEvent(
          {
            ...current,
            certificates: current.certificates.map((entry) =>
              entry.id === certificateId ? updated : entry,
            ),
          },
          'course_retaken',
          certificateId,
          { note: 'Attempt counters reset. Certificate state unchanged.' },
        )
      })
    },
    [update],
  )

  const revokeCertificate = useCallback(
    (certificateId: string, reason: RevokeReason, date: string, note: string) => {
      update((current) => {
        const certificate = current.certificates.find((entry) => entry.id === certificateId)
        if (!certificate || certificate.state === 'Revoked') return current
        let revoked: Certificate = {
          ...certificate,
          state: 'Revoked',
          revokedAt: date,
          revokeReason: reason,
          revokeNote: note,
        }
        revoked = appendHistory(
          revoked,
          date,
          'Revoked',
          certificate.issuedAt,
          `Revoked (${reason}): ${note || 'No note supplied.'}`,
        )
        return withEvent(
          {
            ...current,
            certificates: current.certificates.map((entry) =>
              entry.id === certificateId ? revoked : entry,
            ),
          },
          'certificate_revoked',
          certificateId,
          { reason, date, note, final: true },
        )
      })
    },
    [update],
  )

  const openDispute = useCallback(
    (certificateId: string, reason: string, email: string): AccessResult => {
      if (!reason.trim()) return { ok: false, message: 'Enter a reason for the dispute.' }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return { ok: false, message: 'Enter a valid contact email.' }
      }
      const current = stateRef.current
      const certificate = current.certificates.find((entry) => entry.id === certificateId)
      if (!certificate) return { ok: false, message: 'Certificate not found.' }
      const dispute: Dispute = {
        id: uid('dsp'),
        certificateId,
        learnerId: certificate.learnerId,
        reason: reason.trim(),
        contactEmail: email.trim().toLowerCase(),
        createdAt: clockDate(current),
        status: 'open',
      }
      update((latest) =>
        withEvent(
          { ...latest, disputes: [dispute, ...latest.disputes] },
          'dispute_opened',
          certificateId,
          { disputeId: dispute.id, reason: dispute.reason, contactEmail: dispute.contactEmail },
        ),
      )
      return { ok: true, message: 'Dispute submitted. Career-180 will review it.' }
    },
    [update],
  )

  const resolveDispute = useCallback(
    (
      disputeId: string,
      action: 'rejected' | 'corrected' | 'revoked',
      outcome: string,
      edits?: { learnerName?: string; courseId?: string; issuedAt?: string },
    ) => {
      update((current) => {
        const dispute = current.disputes.find((entry) => entry.id === disputeId)
        if (!dispute) return current
        const currentDate = clockDate(current)
        let certificates = current.certificates
        let next = current
        let certificateId = dispute.certificateId
        if (action === 'revoked') {
          const certificate = current.certificates.find((entry) => entry.id === dispute.certificateId)
          if (certificate && certificate.state !== 'Revoked') {
            let revoked: Certificate = {
              ...certificate,
              state: 'Revoked',
              revokedAt: currentDate,
              revokeReason: 'legal',
              revokeNote: `Revoked after dispute review: ${outcome}`,
            }
            revoked = appendHistory(
              revoked,
              currentDate,
              'Revoked',
              certificate.issuedAt,
              `Revoked after dispute review: ${outcome}`,
            )
            certificates = current.certificates.map((entry) =>
              entry.id === certificate.id ? revoked : entry,
            )
            next = withEvent({ ...current, certificates }, 'certificate_revoked', certificate.id, {
              reason: 'legal',
              date: currentDate,
              note: outcome,
              source: 'dispute',
            })
          }
        }
        if (action === 'corrected' && edits) {
          const certificate = current.certificates.find((entry) => entry.id === dispute.certificateId)
          if (certificate) {
            const targetCourse = edits.courseId
              ? getCourse(current.courses, edits.courseId)
              : undefined
            let corrected: Certificate = {
              ...certificate,
              learnerName: edits.learnerName?.trim() || certificate.learnerName,
              courseId: edits.courseId || certificate.courseId,
              courseVersion:
                edits.courseId && edits.courseId !== certificate.courseId && targetCourse
                  ? latestVersion(targetCourse).version
                  : certificate.courseVersion,
              issuedAt: edits.issuedAt || certificate.issuedAt,
            }
            corrected = appendHistory(
              corrected,
              currentDate,
              corrected.state,
              corrected.issuedAt,
              `Certificate corrected after dispute: ${outcome}`,
            )
            certificates = current.certificates.map((entry) =>
              entry.id === certificate.id ? corrected : entry,
            )
            next = withEvent({ ...current, certificates }, 'certificate_corrected', certificate.id, {
              changes: JSON.stringify(edits),
              outcome,
            })
          }
        }
        const resolved: Dispute = {
          ...dispute,
          status: action === 'rejected' ? 'rejected' : 'upheld',
          outcome: outcome.trim() || (action === 'rejected' ? 'No change required.' : 'Certificate updated.'),
          resolvedAt: currentDate,
          action,
        }
        next = withEvent(
          {
            ...next,
            disputes: next.disputes.map((entry) => (entry.id === disputeId ? resolved : entry)),
          },
          'dispute_closed',
          certificateId,
          {
            disputeId,
            action,
            outcome: resolved.outcome,
          },
        )
        return next
      })
    },
    [update],
  )

  const toggleRequired = useCallback(
    (courseId: string, itemId: string) => {
      update((current) => {
        const course = getCourse(current.courses, courseId)
        if (!course) return current
        const latest = latestVersion(course)
        return {
          ...current,
          courses: current.courses.map((entry) =>
            entry.id !== courseId
              ? entry
              : {
                  ...entry,
                  versions: entry.versions.map((version) =>
                    version.version !== latest.version
                      ? version
                      : {
                          ...version,
                          items: version.items.map((item: CourseItem) =>
                            item.id === itemId ? { ...item, required: !item.required } : item,
                          ),
                        },
                  ),
                },
          ),
        }
      })
    },
    [update],
  )

  const publishCourseVersion = useCallback(
    (courseId: string, note: string): AccessResult => {
      if (!note.trim()) return { ok: false, message: 'A change note is required.' }
      const current = stateRef.current
      const course = getCourse(current.courses, courseId)
      if (!course) return { ok: false, message: 'Course not found.' }
      const latest = latestVersion(course)
      const nextVersion = latest.version + 1
      const currentDate = clockDate(current)
      update((latestState) => {
        const next = {
          ...latestState,
          courses: latestState.courses.map((entry) =>
            entry.id !== courseId
              ? entry
              : {
                  ...entry,
                  versions: [
                    ...entry.versions,
                    {
                      version: nextVersion,
                      note: note.trim(),
                      publishedAt: currentDate,
                      items: latest.items.map((item) => ({ ...item })),
                    },
                  ],
                },
          ),
        }
        return withEvent(next, 'course_version_published', undefined, {
          courseId,
          courseName: course.name,
          version: nextVersion,
          note: note.trim(),
        })
      })
      return {
        ok: true,
        message: `Course version v${nextVersion} published. Existing certificate states are unchanged.`,
      }
    },
    [update],
  )

  const publishPolicy = useCallback(
    (title: string, summary: string): AccessResult => {
      if (!title.trim() || !summary.trim()) {
        return { ok: false, message: 'A title and summary are required.' }
      }
      const current = stateRef.current
      const previous = currentPolicy(current.policies)
      const version = previous ? previous.version + 1 : 1
      const currentDate = clockDate(current)
      const policy: Policy = {
        version,
        title: title.trim(),
        summary: summary.trim(),
        effectiveFrom: currentDate,
        effectiveTo: null,
        announcement: true,
        publishedAt: currentDate,
      }
      update((latestState) => {
        const next = withEvent(
          {
            ...latestState,
            policies: [
              ...latestState.policies.map((entry) =>
                entry.effectiveTo === null
                  ? { ...entry, effectiveTo: addDays(currentDate, -1) }
                  : entry,
              ),
              policy,
            ],
          },
          'policy_published',
          undefined,
          { version, title: policy.title, summary: policy.summary, infoOnly: true },
        )
        return next
      })
      return {
        ok: true,
        message: `Policy v${version} published. It is an information-only notice.`,
      }
    },
    [update],
  )

  const dismissPolicy = useCallback(
    (learnerId: string, policyId: string) => {
      update((current) => ({
        ...current,
        dismissedPolicyIds: [...new Set([...current.dismissedPolicyIds, `${learnerId}:${policyId}`])],
      }))
    },
    [update],
  )

  const markPolicySeen = useCallback(
    (learnerId: string, policyId: string) => {
      const alreadySeen = stateRef.current.events.some(
        (event) =>
          event.type === 'policy_banner_seen' &&
          event.payload.learnerId === learnerId &&
          event.payload.policyId === policyId,
      )
      if (alreadySeen) return
      update((current) =>
        withEvent(current, 'policy_banner_seen', undefined, {
          learnerId,
          policyId,
        }),
      )
    },
    [update],
  )

  const fastForward = useCallback(() => {
    update((current) => {
      const nextOffset = current.clockOffsetDays + 14
      const nextDate = dateFromOffset(nextOffset)
      const expired = current.accessRequests.filter((request) => {
        if (request.status === 'pending') {
          return nextDate >= addDays(request.createdAt, 14)
        }
        if (request.status === 'approved' && request.expiresAt) {
          return nextDate >= request.expiresAt
        }
        return false
      })
      let next: AppState = {
        ...current,
        clockOffsetDays: nextOffset,
        accessRequests: current.accessRequests.map((request) =>
          expired.some((entry) => entry.id === request.id)
            ? { ...request, status: 'expired', respondedAt: nextDate }
            : request,
        ),
      }
      for (const request of expired) {
        next = withEvent(next, 'access_expired', request.certificateId, {
          email: request.email,
          requestId: request.id,
          previousStatus: request.status,
        })
      }
      return next
    })
  }, [update])

  const resetDemo = useCallback(() => {
    const fresh = buildSeedState()
    stateRef.current = fresh
    setState(fresh)
  }, [])

  const getAccess = useCallback(
    (certificateId: string, email: string) => {
      const current = stateRef.current
      return approvedAccessFor(current, certificateId, email, clockDate(current))
    },
    [],
  )

  const requestStatusFor = useCallback(
    (certificateId: string, email: string) => {
      const current = stateRef.current
      const normalizedEmail = email.trim().toLowerCase()
      const request = current.accessRequests
        .filter(
          (entry) =>
            entry.certificateId === certificateId &&
            entry.email.toLowerCase() === normalizedEmail,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
      return request ? effectiveRequestStatus(request, clockDate(current)) : undefined
    },
    [],
  )

  const hasApprovedAccess = useCallback(
    (certificateId: string, email: string) => Boolean(getAccess(certificateId, email)),
    [getAccess],
  )

  const value = useMemo<DemoContextValue>(
    () => ({
      state,
      today,
      verifierEmail: state.verifierEmail,
      lookup,
      logEvent,
      setVerifierEmail,
      openEvidence,
      openAiSummary,
      requestAccess,
      approveAccess,
      declineAccess,
      setSharing,
      simulatePass,
      upgradeLegacy,
      retakeCourse,
      revokeCertificate,
      openDispute,
      resolveDispute,
      toggleRequired,
      publishCourseVersion,
      publishPolicy,
      dismissPolicy,
      markPolicySeen,
      fastForward,
      resetDemo,
      getAccess,
      requestStatusFor,
      hasApprovedAccess,
    }),
    [
      state,
      today,
      lookup,
      logEvent,
      setVerifierEmail,
      openEvidence,
      openAiSummary,
      requestAccess,
      approveAccess,
      declineAccess,
      setSharing,
      simulatePass,
      upgradeLegacy,
      retakeCourse,
      revokeCertificate,
      openDispute,
      resolveDispute,
      toggleRequired,
      publishCourseVersion,
      publishPolicy,
      dismissPolicy,
      markPolicySeen,
      fastForward,
      resetDemo,
      getAccess,
      requestStatusFor,
      hasApprovedAccess,
    ],
  )

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemo(): DemoContextValue {
  const context = useContext(DemoContext)
  if (!context) throw new Error('useDemo must be used inside DemoProvider')
  return context
}

export { STORAGE_KEY }
