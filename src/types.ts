export type CertificateState = 'Completed' | 'Verified' | 'Legacy' | 'Revoked'
export type LookupOutcome = 'Valid' | 'Revoked' | 'Not found'
export type ItemType = 'quiz' | 'exam' | 'project'
export type LearnerSource = 'Self-directed' | 'Corporate-enrolled'
export type RevokeReason = 'error' | 'fraud' | 'legal'
export type RequestStatus = 'pending' | 'approved' | 'declined' | 'expired'
export type DisputeStatus = 'open' | 'upheld' | 'rejected'

export interface CourseItem {
  id: string
  label: string
  type: ItemType
  required: boolean
}

export interface CourseVersion {
  version: number
  note: string
  publishedAt: string
  items: CourseItem[]
}

export interface Course {
  id: string
  name: string
  versions: CourseVersion[]
}

export interface Learner {
  id: string
  name: string
  source: LearnerSource
  employer?: string
  resultsPublic: boolean
}

export interface ItemResult {
  itemId: string
  score: number | null
  attemptsUsed: number
  locked?: boolean
}

export interface CertificateHistoryEntry {
  date: string
  state: CertificateState
  issueDate: string
  note: string
}

export interface Certificate {
  id: string
  learnerId: string
  learnerName: string
  courseId: string
  courseVersion: number
  issuedAt: string
  state: CertificateState
  revokedAt?: string
  revokeReason?: RevokeReason
  revokeNote?: string
  items: ItemResult[]
  projectFeedback?: string
  history: CertificateHistoryEntry[]
}

export interface Policy {
  version: number
  title: string
  summary: string
  effectiveFrom: string
  effectiveTo?: string | null
  announcement?: boolean
  publishedAt?: string
}

export interface AccessRequest {
  id: string
  certificateId: string
  learnerId: string
  email: string
  nameCompany: string
  createdAt: string
  status: RequestStatus
  approvedAt?: string
  expiresAt?: string
  respondedAt?: string
}

export interface Dispute {
  id: string
  certificateId: string
  learnerId: string
  reason: string
  contactEmail: string
  createdAt: string
  status: DisputeStatus
  outcome?: string
  resolvedAt?: string
  action?: 'corrected' | 'revoked' | 'rejected'
}

export interface EventPayload {
  [key: string]: string | number | boolean | null | undefined
}

export interface AppEvent {
  id: string
  at: string
  type: string
  certificateId?: string
  payload: EventPayload
}

export interface AppState {
  courses: Course[]
  certificates: Certificate[]
  learners: Learner[]
  policies: Policy[]
  accessRequests: AccessRequest[]
  disputes: Dispute[]
  events: AppEvent[]
  clockOffsetDays: number
  verifierEmail: string
  dismissedPolicyIds: string[]
  lookupFailures: number[]
}

export interface SeedData {
  courses: Course[]
  certificates: Certificate[]
  learners: Learner[]
  policies: Policy[]
  accessRequests: AccessRequest[]
  disputes: Dispute[]
}

export interface FinalGrade {
  score: number | null
  band: string
  hasProject: boolean
}

export interface CertificatesView {
  certificate: Certificate
  learner: Learner
  course: Course
  version: CourseVersion
  latestVersion: CourseVersion
  finalGrade: FinalGrade
  requiredItems: CourseItem[]
  missingItems: CourseItem[]
  lockedItems: CourseItem[]
  policy: Policy | undefined
}
