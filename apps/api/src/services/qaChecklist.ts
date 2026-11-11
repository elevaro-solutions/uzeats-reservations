import {
  QA_CHECKLIST_CATALOG,
  QA_CHECKLIST_RELEASE,
  type QaChecklistCatalogItem,
} from './qaChecklistCatalog.js';
import { QA_CHECKLIST_ARCHIVE } from './qaChecklistArchive.js';
import { QaReleaseChecklist, type QaReleaseChecklistDocument } from '../models/QaReleaseChecklist.js';
import { ValidationError } from '../lib/errors.js';
import { readQaReleaseHistory } from './qaReleaseHistory.js';

type Actor = { id: string; name: string; role: string };

export type SaveQaChecklistInput = {
  release?: string | null;
  envNote?: string | null;
  p0Clear?: boolean | null;
  notes?: string | null;
  checks?: Array<{ itemId: string; checked?: boolean | null; note?: string | null }> | null;
  signOff?: boolean | null;
  reopen?: boolean | null;
};

function displayName(firstName?: string | null, lastName?: string | null) {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

export function qaActorName(user: { firstName?: string | null; lastName?: string | null; email?: string | null }) {
  return displayName(user.firstName, user.lastName) || user.email || 'QA';
}

function snapshotCatalog(items: QaChecklistCatalogItem[] = QA_CHECKLIST_CATALOG) {
  return items.map((item) => ({
    id: item.id,
    gate: item.gate,
    group: item.group,
    label: item.label,
    steps: [...item.steps],
  }));
}

function catalogFromDoc(doc: QaReleaseChecklistDocument): QaChecklistCatalogItem[] {
  const stored = (doc.catalog ?? []) as QaChecklistCatalogItem[];
  if (stored.length > 0) {
    return stored.map((item) => ({
      id: item.id,
      gate: item.gate === 'recommended' ? 'recommended' : 'required',
      group: item.group,
      label: item.label,
      steps: Array.isArray(item.steps) ? [...item.steps] : [],
    }));
  }

  // Legacy rows created before catalog snapshots: keep known ids from the live catalog,
  // and surface any saved check ids that no longer exist so progress is not dropped.
  const byId = new Map(QA_CHECKLIST_CATALOG.map((item) => [item.id, item]));
  const fromChecks: QaChecklistCatalogItem[] = [];
  for (const check of doc.checks ?? []) {
    const known = byId.get(check.itemId);
    if (known) {
      fromChecks.push(known);
      byId.delete(check.itemId);
      continue;
    }
    fromChecks.push({
      id: check.itemId,
      gate: 'required',
      group: 'Previous release',
      label: check.itemId,
      steps: ['This task was saved before catalogs were snapshotted. Use the note and checked state as the record.'],
    });
  }
  if (doc.release === QA_CHECKLIST_RELEASE) {
    return [...QA_CHECKLIST_CATALOG];
  }
  return fromChecks;
}

async function ensureCatalogSnapshot(doc: QaReleaseChecklistDocument) {
  const isCurrent = doc.release === QA_CHECKLIST_RELEASE;
  const hasCatalog = Array.isArray(doc.catalog) && doc.catalog.length > 0;

  if (!hasCatalog) {
    if (isCurrent) {
      doc.catalog = snapshotCatalog() as typeof doc.catalog;
      await doc.save();
      return;
    }
    const archived = QA_CHECKLIST_ARCHIVE[doc.release];
    const reconstructed = archived?.length ? archived : catalogFromDoc(doc);
    if (reconstructed.length > 0) {
      doc.catalog = snapshotCatalog(reconstructed) as typeof doc.catalog;
      await doc.save();
    }
    return;
  }

  // Keep the live release catalog in sync while it is still open so catalog edits in a patch land.
  if (isCurrent && doc.status !== 'signed') {
    const next = snapshotCatalog();
    const same =
      next.length === doc.catalog.length &&
      next.every((item, index) => {
        const row = doc.catalog[index];
        return (
          row &&
          row.id === item.id &&
          row.gate === item.gate &&
          row.group === item.group &&
          row.label === item.label &&
          JSON.stringify(row.steps ?? []) === JSON.stringify(item.steps)
        );
      });
    if (!same) {
      doc.catalog = next as typeof doc.catalog;
      await doc.save();
    }
  }
}

async function loadOrCreate(release: string) {
  const existing = await QaReleaseChecklist.findOne({ release });
  if (existing) {
    await ensureCatalogSnapshot(existing);
    return existing;
  }
  const archived = QA_CHECKLIST_ARCHIVE[release];
  return QaReleaseChecklist.create({
    release,
    checks: [],
    catalog:
      release === QA_CHECKLIST_RELEASE
        ? snapshotCatalog()
        : archived
          ? snapshotCatalog(archived)
          : [],
    status: 'active',
  });
}

/**
 * Runs are otherwise created the first time someone opens `/admin/qa`, so a release that
 * was live only briefly never reached History. Called on API start.
 */
export async function ensureQaChecklistRuns(): Promise<string[]> {
  const releases = [QA_CHECKLIST_RELEASE, ...Object.keys(QA_CHECKLIST_ARCHIVE)];
  const created: string[] = [];
  for (const release of new Set(releases)) {
    const exists = await QaReleaseChecklist.exists({ release });
    await loadOrCreate(release);
    if (!exists) created.push(release);
  }
  return created;
}

function summarizeDoc(doc: QaReleaseChecklistDocument) {
  const catalog = catalogFromDoc(doc);
  const byId = new Map((doc.checks ?? []).map((c) => [c.itemId, c]));
  const required = catalog.filter((item) => item.gate === 'required');
  const recommended = catalog.filter((item) => item.gate === 'recommended');
  const requiredChecked = required.filter((item) => byId.get(item.id)?.checked).length;
  const recommendedChecked = recommended.filter((item) => byId.get(item.id)?.checked).length;
  const itemChecked = catalog.filter((item) => byId.get(item.id)?.checked).length;
  return {
    release: doc.release,
    envNote: doc.envNote ?? '',
    p0Clear: Boolean(doc.p0Clear),
    notes: doc.notes ?? '',
    status: doc.status === 'signed' ? 'signed' : 'active',
    signedOffName: doc.signedOffName ?? '',
    signedOffRole: doc.signedOffRole ?? '',
    signedAt: doc.signedAt ? doc.signedAt.toISOString() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt as Date).toISOString() : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt as Date).toISOString() : null,
    requiredTotal: required.length,
    requiredChecked,
    recommendedTotal: recommended.length,
    recommendedChecked,
    itemTotal: catalog.length,
    itemChecked,
    requiredDone: required.length === 0 ? true : requiredChecked === required.length,
    isCurrent: doc.release === QA_CHECKLIST_RELEASE,
  };
}

function compareReleaseDesc(a: string, b: string) {
  const pa = a.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const pb = b.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return b.localeCompare(a);
}

export async function getQaChecklist(release = QA_CHECKLIST_RELEASE) {
  const doc = await loadOrCreate(release);
  const catalog = catalogFromDoc(doc);
  const byId = new Map(doc.checks.map((c) => [c.itemId, c]));
  const requiredIds = catalog.filter((item) => item.gate === 'required').map((item) => item.id);
  const requiredDone = requiredIds.every((id) => byId.get(id)?.checked);
  return {
    release: doc.release,
    envNote: doc.envNote ?? '',
    p0Clear: Boolean(doc.p0Clear),
    notes: doc.notes ?? '',
    status: doc.status === 'signed' ? 'signed' : 'active',
    signedOffName: doc.signedOffName ?? '',
    signedOffRole: doc.signedOffRole ?? '',
    signedAt: doc.signedAt ? doc.signedAt.toISOString() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt as Date).toISOString() : null,
    requiredDone,
    isCurrent: doc.release === QA_CHECKLIST_RELEASE,
    currentRelease: QA_CHECKLIST_RELEASE,
    items: catalog.map((item) => {
      const saved = byId.get(item.id);
      const checked = Boolean(saved?.checked);
      const checkedAt = saved?.checkedAt ?? (checked ? saved?.updatedAt : null);
      return {
        id: item.id,
        gate: item.gate,
        group: item.group,
        label: item.label,
        steps: item.steps,
        checked,
        note: saved?.note ?? '',
        checkedAt: checkedAt ? new Date(checkedAt).toISOString() : null,
        updatedAt: saved?.updatedAt ? new Date(saved.updatedAt).toISOString() : null,
      };
    }),
    history: readQaReleaseHistory(),
  };
}

export async function listQaChecklistRuns() {
  const docs = await QaReleaseChecklist.find({}).lean();
  const summaries = docs.map((doc) => summarizeDoc(doc as QaReleaseChecklistDocument));
  summaries.sort((a, b) => compareReleaseDesc(a.release, b.release));
  return summaries;
}

export async function getQaChecklistDashboard() {
  const runs = await listQaChecklistRuns();
  const signedRuns = runs.filter((run) => run.status === 'signed');
  const activeRuns = runs.filter((run) => run.status === 'active');
  const withRequired = runs.filter((run) => run.requiredTotal > 0);
  const averageRequiredProgress =
    withRequired.length === 0
      ? 0
      : withRequired.reduce((sum, run) => sum + (run.requiredChecked / run.requiredTotal) * 100, 0) /
        withRequired.length;
  const current = runs.find((run) => run.isCurrent) ?? null;
  return {
    currentRelease: QA_CHECKLIST_RELEASE,
    totalRuns: runs.length,
    signedRuns: signedRuns.length,
    activeRuns: activeRuns.length,
    averageRequiredProgress: Math.round(averageRequiredProgress * 10) / 10,
    current,
    runs,
    recentSignOffs: signedRuns
      .slice()
      .sort((a, b) => (b.signedAt ?? '').localeCompare(a.signedAt ?? ''))
      .slice(0, 8),
  };
}

export async function saveQaChecklist(input: SaveQaChecklistInput, actor: Actor) {
  const release = (input.release || QA_CHECKLIST_RELEASE).trim();
  if (!release) throw new ValidationError('Release is required');
  const doc = await loadOrCreate(release);
  const catalog = catalogFromDoc(doc);
  const signed = doc.status === 'signed';

  if (signed && !input.reopen && (input.checks?.length || input.signOff)) {
    throw new ValidationError('Checklist is signed off. Reopen it before changing checks.');
  }

  if (input.reopen) {
    doc.status = 'active';
    doc.signedOffBy = undefined;
    doc.signedOffName = '';
    doc.signedOffRole = '';
    doc.signedAt = undefined;
  }

  if (input.envNote != null) doc.envNote = input.envNote;
  if (input.notes != null) doc.notes = input.notes;
  if (input.p0Clear != null) doc.p0Clear = input.p0Clear;

  if (input.checks?.length) {
    const allowed = new Set(catalog.map((item) => item.id));
    const now = new Date();
    for (const check of input.checks) {
      if (!allowed.has(check.itemId)) continue;
      if (check.checked == null && check.note == null) continue;
      const current = doc.checks.find((row) => row.itemId === check.itemId);
      if (current) {
        if (check.note != null && current.checked && !current.checkedAt && current.updatedAt) {
          current.checkedAt = current.updatedAt;
        }
        if (check.checked != null) {
          const wasChecked = Boolean(current.checked);
          current.checked = check.checked;
          if (check.checked && !wasChecked) current.checkedAt = now;
          if (!check.checked) current.checkedAt = undefined;
        }
        if (check.note != null) current.note = check.note;
        current.updatedBy = actor.id as unknown as typeof current.updatedBy;
        current.updatedAt = now;
      } else {
        const checked = Boolean(check.checked);
        doc.checks.push({
          itemId: check.itemId,
          checked,
          note: check.note ?? '',
          checkedAt: checked ? now : undefined,
          updatedBy: actor.id as never,
          updatedAt: now,
        });
      }
    }
  }

  if (input.signOff) {
    const byId = new Map(doc.checks.map((c) => [c.itemId, Boolean(c.checked)]));
    const stillOpen = catalog.some((item) => item.gate === 'required' && !byId.get(item.id));
    if (stillOpen) throw new ValidationError('Check every required item before sign-off');
    if (!doc.p0Clear) throw new ValidationError('Confirm open P0 bugs are zero before sign-off');
    doc.status = 'signed';
    doc.signedOffBy = actor.id as never;
    doc.signedOffName = actor.name;
    doc.signedOffRole = actor.role;
    doc.signedAt = new Date();
  }

  await doc.save();
  return getQaChecklist(release);
}
