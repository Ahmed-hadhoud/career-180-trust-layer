import type {
  AccessRequest,
  AppState,
  Certificate,
  CertificateState,
  CertificatesView,
  Course,
  CourseItem,
  CourseVersion,
  FinalGrade,
  ItemResult,
  Learner,
  LearnerSource,
  Policy,
  SeedData,
} from '../types'
import seed from '../data/seed.json'

export const DEMO_START = '2027-03-15'
export const MAX_ATTEMPTS = 5
export const ACCESS_DAYS = 14
export const PENDING_DAYS = 14
export const MAX_REQUESTS_PER_EMAIL = 3
export const OLD_POLICY_TEXT =
  'Before 1 Jan 2027 a certificate meant the learner finished the course. No assessment results were checked or shown.'

const DAY_MS = 24 * 60 * 60 * 1000

export function dateFromOffset(offsetDays: number): string {
  const date = new Date(Date.UTC(2027, 2, 15))
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

export function clockDate(state: Pick<AppState, 'clockOffsetDays'>): string {
  return dateFromOffset(state.clockOffsetDays)
}

export function clockIso(state: Pick<AppState, 'clockOffsetDays'>): string {
  const now = new Date()
  const time = `${String(now.getUTCHours()).padStart(2, '0')}:${String(
    now.getUTCMinutes(),
  ).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`
  return `${clockDate(state)}T${time}Z`
}

export function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date)
}

export function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function isAfter(dateString: string, other: string): boolean {
  return dateString.slice(0, 10) > other.slice(0, 10)
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function getCourse(courses: Course[], courseId: string): Course | undefined {
  return courses.find((course) => course.id === courseId)
}

export function latestVersion(course: Course): CourseVersion {
  return [...course.versions].sort((a, b) => b.version - a.version)[0]
}

export function versionOf(course: Course, version: number): CourseVersion {
  return (
    course.versions.find((entry) => entry.version === version) ??
    latestVersion(course)
  )
}

export function getLearner(state: AppState, learnerId: string): Learner | undefined {
  return state.learners.find((learner) => learner.id === learnerId)
}

export function policyAt(date: string, policies: Policy[]): Policy | undefined {
  return [...policies]
    .filter((policy) => policy.effectiveFrom <= date)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
}

export function currentPolicy(policies: Policy[]): Policy | undefined {
  return [...policies].sort((a, b) => b.version - a.version)[0]
}

export function gradeBand(score: number | null): string {
  if (score === null || Number.isNaN(score)) return 'Not graded'
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Very good'
  if (score >= 70) return 'Good'
  return 'Not passed'
}

export function itemTypeLabel(type: CourseItem['type'], proctored = true): string {
  if (type === 'quiz') return 'Quiz'
  if (type === 'exam') return proctored ? 'Proctored exam' : 'Exam'
  return 'Project'
}

export function resultFor(certificate: Certificate, itemId: string): ItemResult | undefined {
  return certificate.items.find((result) => result.itemId === itemId)
}

export function requiredItems(version: CourseVersion): CourseItem[] {
  return version.items.filter((item) => item.required)
}

export function missingRequiredItems(
  certificate: Certificate,
  version: CourseVersion,
): CourseItem[] {
  return requiredItems(version).filter((item) => {
    const result = resultFor(certificate, item.id)
    return !result || result.score === null || result.score < 70
  })
}

export function lockedItems(certificate: Certificate, version: CourseVersion): CourseItem[] {
  return requiredItems(version).filter((item) => resultFor(certificate, item.id)?.locked)
}

export function isItemLocked(result?: ItemResult): boolean {
  return Boolean(result?.locked) || Boolean(result && result.attemptsUsed >= MAX_ATTEMPTS && (result.score ?? 0) < 70)
}

export function calculateFinalGrade(
  certificate: Certificate,
  version: CourseVersion,
): FinalGrade {
  if (!version.items.length) return { score: null, band: 'No assessment', hasProject: false }
  if (!certificate.items.length) return { score: null, band: 'No stored results', hasProject: version.items.some((item) => item.type === 'project') }
  const hasProject = version.items.some((item) => item.type === 'project')
  const scoredItem = (item: CourseItem) => {
    const result = resultFor(certificate, item.id)
    return result?.score ?? 0
  }
  let score = 0
  if (hasProject) {
    const project = version.items.find((item) => item.type === 'project')!
    const projectScore = scoredItem(project)
    const others = version.items.filter((item) => item.type !== 'project')
    const otherAverage = others.length
      ? others.reduce((total, item) => total + scoredItem(item), 0) / others.length
      : 0
    score = projectScore * 0.5 + otherAverage * 0.5
  } else {
    score = version.items.reduce((total, item) => total + scoredItem(item), 0) / version.items.length
  }
  const rounded = Math.round(score * 10) / 10
  return { score: rounded, band: gradeBand(rounded), hasProject }
}

export function buildCertificateView(
  state: AppState,
  certificate: Certificate,
): CertificatesView | null {
  const learner = getLearner(state, certificate.learnerId)
  const course = getCourse(state.courses, certificate.courseId)
  if (!learner || !course) return null
  const version = versionOf(course, certificate.courseVersion)
  const latest = latestVersion(course)
  return {
    certificate,
    learner,
    course,
    version,
    latestVersion: latest,
    finalGrade: calculateFinalGrade(certificate, version),
    requiredItems: requiredItems(version),
    missingItems: missingRequiredItems(certificate, version),
    lockedItems: lockedItems(certificate, version),
    policy: policyAt(certificate.issuedAt, state.policies),
  }
}

export function certificateStateLabel(state: CertificateState): string {
  if (state === 'Verified') return 'Completed and Verified'
  if (state === 'Legacy') return 'Legacy'
  return state
}

export function lookupResult(certificate: Certificate | undefined): 'Valid' | 'Revoked' | 'Not found' {
  if (!certificate) return 'Not found'
  if (certificate.state === 'Revoked') return 'Revoked'
  return 'Valid'
}

export function findCertificate(certificates: Certificate[], rawInput: string): Certificate | undefined {
  const input = rawInput.trim()
  return certificates.find((certificate) => certificate.id === input)
}

export function effectiveRequestStatus(
  request: AccessRequest,
  today: string,
): AccessRequest['status'] {
  if (request.status === 'pending' && today >= addDays(request.createdAt, PENDING_DAYS)) {
    return 'expired'
  }
  if (request.status === 'approved' && request.expiresAt && today >= request.expiresAt) {
    return 'expired'
  }
  return request.status
}

export function approvedAccessFor(
  state: AppState,
  certificateId: string,
  email: string,
  today: string,
): AccessRequest | undefined {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return undefined
  return state.accessRequests.find(
    (request) =>
      request.certificateId === certificateId &&
      request.email.toLowerCase() === normalizedEmail &&
      effectiveRequestStatus(request, today) === 'approved',
  )
}

export function requestsForEmail(
  state: AppState,
  certificateId: string,
  email: string,
  today: string,
): AccessRequest[] {
  const normalizedEmail = email.trim().toLowerCase()
  return state.accessRequests.filter(
    (request) =>
      request.certificateId === certificateId &&
      request.email.toLowerCase() === normalizedEmail,
  ).map((request) => ({ ...request, status: effectiveRequestStatus(request, today) }))
}

export function isPrivate(certificate: Certificate, learner: Learner): boolean {
  return !learner.resultsPublic
}

export function itemAttemptsRemaining(result?: ItemResult): number {
  return Math.max(0, MAX_ATTEMPTS - (result?.attemptsUsed ?? 0))
}

export function hydrateSeed(raw: SeedData): AppState {
  const data = structuredClone(raw) as SeedData
  const certificates = data.certificates.map((certificate) => {
    if (certificate.history.length) return certificate
    const history = [
      {
        date: certificate.issuedAt,
        state: certificate.state === 'Revoked' ? ('Completed' as CertificateState) : certificate.state,
        issueDate: certificate.issuedAt,
        note:
          certificate.state === 'Revoked'
            ? 'Certificate issued.'
            : certificate.state === 'Legacy'
              ? 'Issued under the pre-standard policy.'
              : 'Certificate issued.',
      },
    ]
    if (certificate.state === 'Revoked' && certificate.revokedAt) {
      history.push({
        date: certificate.revokedAt,
        state: 'Revoked' as CertificateState,
        issueDate: certificate.issuedAt,
        note: `Revoked (${certificate.revokeReason ?? 'error'}): ${
          certificate.revokeNote ?? 'No reason supplied.'
        }`,
      })
    }
    return { ...certificate, history }
  })
  return {
    courses: data.courses,
    certificates,
    learners: data.learners,
    policies: data.policies,
    accessRequests: data.accessRequests,
    disputes: data.disputes,
    events: [],
    clockOffsetDays: 0,
    verifierEmail: '',
    dismissedPolicyIds: [],
    lookupFailures: [],
  }
}

export function buildSeedState(): AppState {
  return hydrateSeed(seed as SeedData)
}

export type SampleState = CertificateState | 'Not found'

export interface SampleItem {
  id: string
  name: string
  course: string
  state: SampleState
  source?: LearnerSource
  visibility?: 'Public' | 'Private'
  detail: string
}

export interface SampleGroup {
  label: SampleState
  description: string
  items: SampleItem[]
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

export function sampleGroups(
  state: Pick<AppState, 'certificates' | 'courses' | 'learners'>,
): SampleGroup[] {
  const groups: Record<CertificateState, SampleItem[]> = {
    Verified: [],
    Completed: [],
    Legacy: [],
    Revoked: [],
  }

  for (const certificate of state.certificates) {
    const course = getCourse(state.courses, certificate.courseId)
    const learner = state.learners.find((entry) => entry.id === certificate.learnerId)
    const version = course ? versionOf(course, certificate.courseVersion) : undefined
    const missing = version ? missingRequiredItems(certificate, version) : []
    const locked = version ? lockedItems(certificate, version) : []
    let detail = ''

    if (certificate.state === 'Verified') {
      detail = 'All required items passed'
    } else if (certificate.state === 'Completed') {
      if (!version || !requiredItems(version).length) detail = 'No assessment'
      else if (locked.length) detail = `Locked ${locked[0].label.toLowerCase()}`
      else if (missing.length) detail = `Missing ${missing[0].label.toLowerCase()}`
      else detail = 'Course completed'
    } else if (certificate.state === 'Legacy') {
      detail = 'No assessment results stored'
    } else {
      detail = `${capitalize(certificate.revokeReason ?? 'revoked')} · final`
    }

    groups[certificate.state].push({
      id: certificate.id,
      name: certificate.learnerName,
      course: course?.name ?? certificate.courseId,
      state: certificate.state,
      source: learner?.source,
      visibility:
        certificate.state === 'Verified'
          ? learner?.resultsPublic
            ? 'Public'
            : 'Private'
          : undefined,
      detail,
    })
  }

  return [
    {
      label: 'Verified',
      description:
        'Passed every required assessment at 70 or more. Public samples open evidence directly; private samples require learner approval.',
      items: groups.Verified,
    },
    {
      label: 'Completed',
      description:
        'Finished the course, but one or more required items are missing, below 70, or the course has no assessment.',
      items: groups.Completed,
    },
    {
      label: 'Legacy',
      description:
        'Issued before January 2027 under the old policy. Completion only; assessment results were never stored.',
      items: groups.Legacy,
    },
    {
      label: 'Revoked',
      description: 'Permanently invalid. The certificate is shown as Revoked and its evidence is hidden.',
      items: groups.Revoked,
    },
    {
      label: 'Not found',
      description: 'A made-up ID that previews the red not-found state.',
      items: [
        {
          id: '000000',
          name: 'Unknown certificate',
          course: 'No matching record',
          state: 'Not found',
          detail: 'Shows the not-found result',
        },
      ],
    },
  ]
}

export function daysBetween(start: string, end: string): number {
  return Math.round(
    (new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) /
      DAY_MS,
  )
}
