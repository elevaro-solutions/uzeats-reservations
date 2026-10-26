export const QA_ISSUE_STATUSES = [
  'open',
  'in_progress',
  'blocked',
  'ready_for_retest',
  'fixed',
  'wont_fix',
  'duplicate',
] as const;

export type QaIssueStatus = (typeof QA_ISSUE_STATUSES)[number];

export const QA_ISSUE_SEVERITIES = ['p0', 'p1', 'p2', 'p3'] as const;

export type QaIssueSeverity = (typeof QA_ISSUE_SEVERITIES)[number];

/** Suggested tags. Custom tags are allowed if they match the same shape. */
export const QA_ISSUE_TAG_PRESETS = [
  'bug',
  'feature',
  'regression',
  'ui',
  'api',
  'copy',
  'performance',
  'accessibility',
  'blocker',
] as const;

export const QA_ISSUE_TITLE_MAX = 200;
export const QA_ISSUE_DESCRIPTION_MAX = 20_000;
export const QA_ISSUE_PATH_MAX = 500;
export const QA_ISSUE_TAG_MAX = 8;
export const QA_ISSUE_ATTACHMENT_MAX = 8;

export const QA_ISSUE_STATUS_LABELS: Record<QaIssueStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  blocked: 'Blocked',
  ready_for_retest: 'Ready for retest',
  fixed: 'Fixed',
  wont_fix: "Won't fix",
  duplicate: 'Duplicate',
};

export const QA_ISSUE_SEVERITY_LABELS: Record<QaIssueSeverity, string> = {
  p0: 'P0',
  p1: 'P1',
  p2: 'P2',
  p3: 'P3',
};

export function isQaIssueStatus(value: string): value is QaIssueStatus {
  return (QA_ISSUE_STATUSES as readonly string[]).includes(value);
}

export function isQaIssueSeverity(value: string): value is QaIssueSeverity {
  return (QA_ISSUE_SEVERITIES as readonly string[]).includes(value);
}
