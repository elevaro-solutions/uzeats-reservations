import { afterEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { toDocx } from '../services/adminExport.js';
import {
  deleteQaIssue,
  exportQaIssues,
  listQaIssues,
  normalizeQaIssuePath,
  normalizeQaIssueTag,
  plainIssueText,
  saveQaIssue,
} from '../services/qaIssues.js';
import { QaIssue } from '../models/QaIssue.js';

const actor = { id: new mongoose.Types.ObjectId().toString(), name: 'Ada QA' };

describe('qa issues', () => {
  afterEach(async () => {
    await QaIssue.deleteMany({});
  });

  it('normalizes tags, paths, and rich text', () => {
    expect(normalizeQaIssueTag(' UI Bug ')).toBe('ui-bug');
    expect(normalizeQaIssuePath('https://staging.example.com/reservations?tab=list#top')).toBe(
      '/reservations?tab=list#top',
    );
    expect(plainIssueText('<p>Expected <strong>ok</strong></p><ul><li>step</li></ul>')).toContain(
      'Expected ok',
    );
  });

  it('creates, filters, exports, and deletes an issue', async () => {
    const created = await saveQaIssue(
      {
        title: 'Party size ignores the floor cap',
        description: '<p>Book 9 guests</p>',
        tags: ['Bug', 'regression'],
        severity: 'p1',
        status: 'open',
        path: 'https://dashboard.example.com/reservations',
        environment: 'staging',
        release: '0.87.0',
      },
      actor,
    );
    expect(created.code).toBe('QA-001');
    expect(created.path).toBe('/reservations');
    expect(created.tags).toEqual(['bug', 'regression']);

    const filtered = await listQaIssues({ search: 'QA-001', tags: ['bug'], severity: 'p1' });
    expect(filtered.total).toBe(1);
    expect(filtered.items[0]?.title).toContain('Party size');

    const missed = await listQaIssues({ status: 'fixed' });
    expect(missed.total).toBe(0);

    const docx = await exportQaIssues({ tags: ['bug'] }, 'word');
    expect(docx.filename.endsWith('.docx')).toBe(true);
    expect(docx.rowCount).toBe(1);
    const xml = Buffer.from(docx.content, 'base64').toString('utf8');
    expect(xml.startsWith('PK')).toBe(true);
    expect(xml).toContain('Party size ignores the floor cap');

    const pdf = await exportQaIssues({}, 'pdf');
    expect(Buffer.from(pdf.content, 'base64').toString('utf8').startsWith('%PDF')).toBe(true);

    await deleteQaIssue(created.id);
    expect(await QaIssue.countDocuments()).toBe(0);
  });

  it('builds a word document', () => {
    const buf = Buffer.from(toDocx('QA issues', [{ heading: 'QA-001 · A & B', paragraphs: ['Line'] }]), 'base64');
    expect(buf.subarray(0, 2).toString()).toBe('PK');
    expect(buf.toString('utf8')).toContain('A &amp; B');
    expect(buf.toString('utf8')).toContain('word/document.xml');
  });
});
