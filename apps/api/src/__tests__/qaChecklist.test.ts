import { afterEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { QA_CHECKLIST_RELEASE } from '../services/qaChecklistCatalog.js';
import {
  getQaChecklist,
  getQaChecklistDashboard,
  listQaChecklistRuns,
  saveQaChecklist,
} from '../services/qaChecklist.js';
import { QaReleaseChecklist } from '../models/QaReleaseChecklist.js';

const actor = { id: new mongoose.Types.ObjectId().toString(), name: 'Ada QA', role: 'qa' };

describe('qa checklist history', () => {
  afterEach(async () => {
    await QaReleaseChecklist.deleteMany({});
  });

  it('snapshots the catalog and keeps a prior release after the current gate moves on', async () => {
    const prior = await QaReleaseChecklist.create({
      release: '0.97.1',
      status: 'active',
      p0Clear: false,
      catalog: [
        {
          id: 'legacy-item',
          gate: 'required',
          group: 'Legacy',
          label: 'Previous release task',
          steps: ['Do the old check'],
        },
      ],
      checks: [
        {
          itemId: 'legacy-item',
          checked: true,
          note: 'Passed on staging',
          checkedAt: new Date('2026-11-01T12:00:00.000Z'),
          updatedAt: new Date('2026-11-01T12:00:00.000Z'),
        },
      ],
    });

    const current = await getQaChecklist();
    expect(current.release).toBe(QA_CHECKLIST_RELEASE);
    expect(current.isCurrent).toBe(true);
    expect(current.items.some((item) => item.id === 'legacy-item')).toBe(false);
    expect(current.items.length).toBeGreaterThan(0);

    const old = await getQaChecklist('0.97.1');
    expect(old.release).toBe('0.97.1');
    expect(old.isCurrent).toBe(false);
    expect(old.items).toHaveLength(1);
    expect(old.items[0]?.label).toBe('Previous release task');
    expect(old.items[0]?.checked).toBe(true);
    expect(old.items[0]?.note).toBe('Passed on staging');

    await saveQaChecklist(
      {
        release: '0.97.1',
        notes: 'Still finishing prior gate',
        checks: [{ itemId: 'legacy-item', note: 'Re-checked after hotfix' }],
      },
      actor,
    );
    const refreshed = await getQaChecklist('0.97.1');
    expect(refreshed.notes).toBe('Still finishing prior gate');
    expect(refreshed.items[0]?.note).toBe('Re-checked after hotfix');

    const runs = await listQaChecklistRuns();
    expect(runs.map((run) => run.release)).toEqual(
      expect.arrayContaining([QA_CHECKLIST_RELEASE, '0.97.1']),
    );
    expect(runs.find((run) => run.release === '0.97.1')?.requiredChecked).toBe(1);

    const dashboard = await getQaChecklistDashboard();
    expect(dashboard.currentRelease).toBe(QA_CHECKLIST_RELEASE);
    expect(dashboard.totalRuns).toBeGreaterThanOrEqual(2);
    expect(dashboard.activeRuns).toBeGreaterThanOrEqual(2);
    expect(dashboard.current?.release).toBe(QA_CHECKLIST_RELEASE);

    expect(prior.release).toBe('0.97.1');
  });

  it('signs off the current release and reports it on the dashboard', async () => {
    const checklist = await getQaChecklist();
    const required = checklist.items.filter((item) => item.gate === 'required');
    await saveQaChecklist(
      {
        p0Clear: true,
        checks: required.map((item) => ({ itemId: item.id, checked: true })),
        signOff: true,
      },
      actor,
    );

    const signed = await getQaChecklist();
    expect(signed.status).toBe('signed');
    expect(signed.signedOffName).toBe('Ada QA');

    const dashboard = await getQaChecklistDashboard();
    expect(dashboard.signedRuns).toBe(1);
    expect(dashboard.recentSignOffs[0]?.release).toBe(QA_CHECKLIST_RELEASE);
  });
});
