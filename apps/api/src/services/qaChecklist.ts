import { QA_CHECKLIST_CATALOG, QA_CHECKLIST_RELEASE } from './qaChecklistCatalog.js';
import { QaReleaseChecklist } from '../models/QaReleaseChecklist.js';
import { ValidationError } from '../lib/errors.js';

type Actor = { id: string; name: string; role: string };

export type SaveQaChecklistInput = {
  release?: string | null;
  envNote?: string | null;
  p0Clear?: boolean | null;
  notes?: string | null;
  checks?: Array<{ itemId: string; checked: boolean }> | null;
  signOff?: boolean | null;
  reopen?: boolean | null;
};

function displayName(firstName?: string | null, lastName?: string | null) {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

export function qaActorName(user: { firstName?: string | null; lastName?: string | null; email?: string | null }) {
  return displayName(user.firstName, user.lastName) || user.email || 'QA';
}

async function loadOrCreate(release: string) {
  const existing = await QaReleaseChecklist.findOne({ release });
  if (existing) return existing;
  return QaReleaseChecklist.create({ release, checks: [], status: 'active' });
}

export async function getQaChecklist(release = QA_CHECKLIST_RELEASE) {
  const doc = await loadOrCreate(release);
  const byId = new Map(doc.checks.map((c) => [c.itemId, c]));
  const requiredIds = QA_CHECKLIST_CATALOG.filter((item) => item.gate === 'required').map((item) => item.id);
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
    items: QA_CHECKLIST_CATALOG.map((item) => {
      const saved = byId.get(item.id);
      return {
        id: item.id,
        gate: item.gate,
        group: item.group,
        label: item.label,
        checked: Boolean(saved?.checked),
        updatedAt: saved?.updatedAt ? new Date(saved.updatedAt).toISOString() : null,
      };
    }),
  };
}

export async function saveQaChecklist(input: SaveQaChecklistInput, actor: Actor) {
  const release = (input.release || QA_CHECKLIST_RELEASE).trim();
  if (!release) throw new ValidationError('Release is required');
  const doc = await loadOrCreate(release);
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
    const allowed = new Set(QA_CHECKLIST_CATALOG.map((item) => item.id));
    const now = new Date();
    for (const check of input.checks) {
      if (!allowed.has(check.itemId)) continue;
      const current = doc.checks.find((row) => row.itemId === check.itemId);
      if (current) {
        current.checked = check.checked;
        current.updatedBy = actor.id as unknown as typeof current.updatedBy;
        current.updatedAt = now;
      } else {
        doc.checks.push({
          itemId: check.itemId,
          checked: check.checked,
          updatedBy: actor.id as never,
          updatedAt: now,
        });
      }
    }
  }

  if (input.signOff) {
    const byId = new Map(doc.checks.map((c) => [c.itemId, Boolean(c.checked)]));
    const stillOpen = QA_CHECKLIST_CATALOG.some(
      (item) => item.gate === 'required' && !byId.get(item.id),
    );
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
