import mongoose from 'mongoose';
import {
  QA_ISSUE_ATTACHMENT_MAX,
  QA_ISSUE_DESCRIPTION_MAX,
  QA_ISSUE_PATH_MAX,
  QA_ISSUE_STATUS_LABELS,
  QA_ISSUE_SEVERITY_LABELS,
  QA_ISSUE_TAG_MAX,
  QA_ISSUE_TITLE_MAX,
  SUPPORT_TICKET_ATTACHMENT_CONTENT_TYPES,
  SUPPORT_TICKET_ATTACHMENT_MAX_BYTES,
  isQaIssueSeverity,
  isQaIssueStatus,
  sanitizeBlogHtml,
  type QaIssueSeverity,
  type QaIssueStatus,
} from '@reservations/shared';
import { QaIssue, type QaIssueDocument } from '../models/QaIssue.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { isOwnUploadUrl } from './spaces.js';
import { formatExport, toDocx, type ExportPayload } from './adminExport.js';

const IMAGE_TYPES = new Set<string>(SUPPORT_TICKET_ATTACHMENT_CONTENT_TYPES);

export type QaIssueActor = { id: string; name: string };

export type QaIssueAttachmentInput = {
  url: string;
  key?: string | null;
  filename: string;
  contentType: string;
  size?: number | null;
};

export type SaveQaIssueInput = {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  tags?: string[] | null;
  status?: string | null;
  severity?: string | null;
  path?: string | null;
  environment?: string | null;
  release?: string | null;
  attachments?: QaIssueAttachmentInput[] | null;
};

export type QaIssueListFilter = {
  search?: string | null;
  status?: string | null;
  severity?: string | null;
  tags?: string[] | null;
  limit?: number | null;
  offset?: number | null;
};

const EXPORT_CAP = 1000;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeQaIssueTag(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

export function normalizeQaIssueTags(tags: string[]) {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const tag of tags) {
    const normalized = normalizeQaIssueTag(tag);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    next.push(normalized);
    if (next.length > QA_ISSUE_TAG_MAX) {
      throw new ValidationError(`Use at most ${QA_ISSUE_TAG_MAX} tags`);
    }
  }
  if (next.length === 0) throw new ValidationError('Add at least one tag, such as bug or feature');
  return next;
}

export function normalizeQaIssuePath(raw: string) {
  const value = raw.trim();
  if (!value) return '';
  if (value.startsWith('/')) return value.slice(0, QA_ISSUE_PATH_MAX);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ValidationError('Issue path must start with / or be a full http(s) URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ValidationError('Issue path must start with / or be a full http(s) URL');
  }
  return `${url.pathname}${url.search}${url.hash}`.slice(0, QA_ISSUE_PATH_MAX);
}

export function plainIssueText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanDescription(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const html = sanitizeBlogHtml(trimmed);
  if (html.length > QA_ISSUE_DESCRIPTION_MAX) {
    throw new ValidationError(`Description must be ${QA_ISSUE_DESCRIPTION_MAX} characters or fewer`);
  }
  return html;
}

function cleanAttachments(rows: QaIssueAttachmentInput[]) {
  if (rows.length > QA_ISSUE_ATTACHMENT_MAX) {
    throw new ValidationError(`Attach at most ${QA_ISSUE_ATTACHMENT_MAX} files`);
  }
  return rows.map((row) => {
    const url = row.url?.trim() ?? '';
    if (!url || !isOwnUploadUrl(url)) throw new ValidationError('Attachment must be an uploaded file');
    const contentType = (row.contentType || '').split(';')[0]?.trim().toLowerCase() ?? '';
    const normalized = contentType === 'image/jpg' ? 'image/jpeg' : contentType;
    if (!IMAGE_TYPES.has(normalized)) {
      throw new ValidationError('Attachments must be JPEG, PNG, WebP, or GIF');
    }
    const filename = (row.filename || 'attachment').trim().slice(0, 255);
    if (!filename) throw new ValidationError('Attachment needs a filename');
    const size = row.size == null ? undefined : Number(row.size);
    if (size != null && (!Number.isFinite(size) || size < 0 || size > SUPPORT_TICKET_ATTACHMENT_MAX_BYTES)) {
      throw new ValidationError('Each attachment must be 10 MB or smaller');
    }
    return {
      url,
      key: (row.key || '').trim(),
      filename,
      contentType: normalized,
      size,
    };
  });
}

function issueCode(number: number) {
  return `QA-${String(number).padStart(3, '0')}`;
}

export function presentQaIssue(doc: QaIssueDocument) {
  return {
    id: doc._id.toString(),
    number: doc.number,
    code: issueCode(doc.number),
    title: doc.title,
    description: doc.description ?? '',
    tags: doc.tags ?? [],
    status: doc.status,
    severity: doc.severity,
    path: doc.path ?? '',
    environment: doc.environment ?? '',
    release: doc.release ?? '',
    attachments: (doc.attachments ?? []).map((file) => ({
      id: file._id.toString(),
      url: file.url,
      key: file.key ?? '',
      filename: file.filename,
      contentType: file.contentType,
      size: file.size ?? null,
    })),
    reporterName: doc.reporterName,
    createdAt: doc.createdAt ? new Date(doc.createdAt as Date).toISOString() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt as Date).toISOString() : null,
  };
}

export function qaIssueFilter(input: QaIssueListFilter) {
  const filter: Record<string, unknown> = {};
  if (input.status) {
    if (!isQaIssueStatus(input.status)) throw new ValidationError('Unknown status');
    filter.status = input.status;
  }
  if (input.severity) {
    if (!isQaIssueSeverity(input.severity)) throw new ValidationError('Unknown severity');
    filter.severity = input.severity;
  }
  const tags = (input.tags ?? []).map(normalizeQaIssueTag).filter(Boolean);
  if (tags.length) filter.tags = { $all: tags };

  const search = (input.search ?? '').trim().slice(0, 120);
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    const or: Record<string, unknown>[] = [
      { title: pattern },
      { description: pattern },
      { path: pattern },
      { environment: pattern },
      { release: pattern },
      { reporterName: pattern },
      { tags: pattern },
    ];
    const numeric = search.replace(/^#/, '').replace(/^qa-?/i, '');
    if (/^\d+$/.test(numeric)) or.push({ number: Number(numeric) });
    filter.$or = or;
  }
  return filter;
}

export async function listQaIssues(input: QaIssueListFilter) {
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
  const offset = Math.max(input.offset ?? 0, 0);
  const filter = qaIssueFilter(input);
  const [total, docs] = await Promise.all([
    QaIssue.countDocuments(filter),
    QaIssue.find(filter).sort({ updatedAt: -1, number: -1 }).skip(offset).limit(limit),
  ]);
  return {
    total,
    limit,
    offset,
    items: docs.map(presentQaIssue),
  };
}

async function nextNumber() {
  const latest = await QaIssue.findOne().sort({ number: -1 }).select('number').lean();
  return (latest?.number ?? 0) + 1;
}

export async function saveQaIssue(input: SaveQaIssueInput, actor: QaIssueActor) {
  if (input.id) {
    if (!mongoose.isValidObjectId(input.id)) throw new NotFoundError('Issue');
    const doc = await QaIssue.findById(input.id);
    if (!doc) throw new NotFoundError('Issue');
    if (input.title != null) {
      const title = input.title.trim();
      if (title.length < 3 || title.length > QA_ISSUE_TITLE_MAX) {
        throw new ValidationError(`Title must be 3–${QA_ISSUE_TITLE_MAX} characters`);
      }
      doc.title = title;
    }
    if (input.description != null) doc.description = cleanDescription(input.description);
    if (input.tags != null) doc.tags = normalizeQaIssueTags(input.tags);
    if (input.status != null) {
      if (!isQaIssueStatus(input.status)) throw new ValidationError('Unknown status');
      doc.status = input.status;
    }
    if (input.severity != null) {
      if (!isQaIssueSeverity(input.severity)) throw new ValidationError('Unknown severity');
      doc.severity = input.severity;
    }
    if (input.path != null) doc.path = normalizeQaIssuePath(input.path);
    if (input.environment != null) doc.environment = input.environment.trim().slice(0, 200);
    if (input.release != null) doc.release = input.release.trim().slice(0, 40);
    if (input.attachments != null) doc.attachments = cleanAttachments(input.attachments) as typeof doc.attachments;
    await doc.save();
    return presentQaIssue(doc);
  }

  const title = (input.title ?? '').trim();
  if (title.length < 3 || title.length > QA_ISSUE_TITLE_MAX) {
    throw new ValidationError(`Title must be 3–${QA_ISSUE_TITLE_MAX} characters`);
  }
  const status: QaIssueStatus = input.status ? (input.status as QaIssueStatus) : 'open';
  const severity: QaIssueSeverity = input.severity ? (input.severity as QaIssueSeverity) : 'p2';
  if (!isQaIssueStatus(status)) throw new ValidationError('Unknown status');
  if (!isQaIssueSeverity(severity)) throw new ValidationError('Unknown severity');

  const payload = {
    title,
    description: cleanDescription(input.description ?? ''),
    tags: normalizeQaIssueTags(input.tags ?? ['bug']),
    status,
    severity,
    path: normalizeQaIssuePath(input.path ?? ''),
    environment: (input.environment ?? '').trim().slice(0, 200),
    release: (input.release ?? '').trim().slice(0, 40),
    attachments: cleanAttachments(input.attachments ?? []),
    reporterId: actor.id,
    reporterName: actor.name.slice(0, 200) || 'QA',
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const doc = await QaIssue.create({ ...payload, number: await nextNumber() });
      return presentQaIssue(doc);
    } catch (err) {
      const code = (err as { code?: number }).code;
      if (code === 11000 && attempt < 2) continue;
      throw err;
    }
  }
  throw new ValidationError('Could not assign an issue number');
}

export async function deleteQaIssue(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Issue');
  const doc = await QaIssue.findByIdAndDelete(id);
  if (!doc) throw new NotFoundError('Issue');
  return true;
}

function exportRows(items: ReturnType<typeof presentQaIssue>[]) {
  return items.map((issue) => [
    issue.code,
    issue.title,
    QA_ISSUE_SEVERITY_LABELS[issue.severity as QaIssueSeverity] ?? issue.severity,
    QA_ISSUE_STATUS_LABELS[issue.status as QaIssueStatus] ?? issue.status,
    issue.tags.join(', '),
    issue.path,
    issue.environment,
    issue.release,
    issue.reporterName,
    issue.updatedAt ? issue.updatedAt.slice(0, 10) : '',
    plainIssueText(issue.description),
    issue.attachments.map((file) => file.filename).join(', '),
  ]);
}

const EXPORT_HEADERS = [
  'Issue',
  'Title',
  'Severity',
  'Status',
  'Tags',
  'Path',
  'Environment',
  'Release',
  'Reporter',
  'Updated',
  'Description',
  'Attachments',
];

export async function exportQaIssues(
  input: QaIssueListFilter,
  format: string,
): Promise<ExportPayload> {
  const kind = format.toLowerCase();
  const normalized = kind === 'excel' || kind === 'xlsx' ? 'xlsx' : kind === 'word' || kind === 'docx' ? 'docx' : kind;
  if (normalized !== 'pdf' && normalized !== 'xlsx' && normalized !== 'docx') {
    throw new ValidationError('Export format must be pdf, excel, or word');
  }
  const filter = qaIssueFilter(input);
  const docs = await QaIssue.find(filter).sort({ number: 1 }).limit(EXPORT_CAP);
  const items = docs.map(presentQaIssue);
  const stamp = new Date().toISOString().slice(0, 10);

  if (normalized === 'docx') {
    return {
      filename: `qa-issues-${stamp}.docx`,
      content: toDocx(
        `QA issues · ${stamp}`,
        items.length
          ? items.map((issue) => ({
              heading: `${issue.code} · ${issue.title}`,
              paragraphs: [
                `Severity: ${QA_ISSUE_SEVERITY_LABELS[issue.severity as QaIssueSeverity] ?? issue.severity}`,
                `Status: ${QA_ISSUE_STATUS_LABELS[issue.status as QaIssueStatus] ?? issue.status}`,
                `Tags: ${issue.tags.join(', ') || '—'}`,
                `Path: ${issue.path || '—'}`,
                `Environment: ${issue.environment || '—'}`,
                `Release: ${issue.release || '—'}`,
                `Reporter: ${issue.reporterName}`,
                `Updated: ${issue.updatedAt ? issue.updatedAt.slice(0, 10) : '—'}`,
                plainIssueText(issue.description) || 'No description',
                issue.attachments.length
                  ? `Attachments: ${issue.attachments.map((file) => file.filename).join(', ')}`
                  : 'Attachments: none',
              ],
            }))
          : [{ heading: 'No issues', paragraphs: ['Nothing matches these filters.'] }],
      ),
      rowCount: items.length,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      encoding: 'base64',
    };
  }

  return formatExport(
    `qa-issues-${stamp}`,
    { title: `QA issues ${stamp}`, headers: EXPORT_HEADERS, rows: exportRows(items) },
    normalized,
  );
}
