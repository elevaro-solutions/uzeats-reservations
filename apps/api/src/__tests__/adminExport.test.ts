import { describe, expect, it } from 'vitest';
import {
  formatExport,
  parseExportFormat,
  resolveExportDateRange,
  toCsv,
} from '../services/adminExport.js';

describe('adminExport', () => {
  it('resolves billing period bounds', () => {
    const range = resolveExportDateRange({ period: '2026-02' });
    expect(range.label).toBe('2026-02');
    expect(range.period).toBe('2026-02');
    expect(range.start?.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(range.end?.toISOString()).toBe('2026-02-28T23:59:59.999Z');
  });

  it('resolves custom date ranges', () => {
    const range = resolveExportDateRange({
      startDate: '2026-01-15',
      endDate: '2026-03-01',
    });
    expect(range.label).toBe('2026-01-15_to_2026-03-01');
    expect(range.period).toBeUndefined();
  });

  it('supports all-time exports', () => {
    expect(resolveExportDateRange({ period: 'all' })).toEqual({ label: 'all' });
  });

  it('formats csv json and pdf', () => {
    const table = {
      title: 'Test',
      headers: ['a', 'b'],
      rows: [
        [1, 'x'],
        [2, 'y,z'],
      ],
    };
    const csv = formatExport('test', table, 'csv');
    expect(csv.mimeType).toContain('csv');
    expect(csv.content).toContain('a,b');
    expect(csv.content).toContain('"y,z"');

    const json = formatExport('test', table, 'json');
    expect(JSON.parse(json.content).rowCount).toBe(2);

    const pdf = formatExport('test', table, 'pdf');
    expect(pdf.encoding).toBe('base64');
    expect(Buffer.from(pdf.content, 'base64').toString('utf8').startsWith('%PDF')).toBe(true);
  });

  it('parses formats and builds csv', () => {
    expect(parseExportFormat('JSON')).toBe('json');
    expect(toCsv(['h'], [['v']])).toBe('h\nv');
  });
});
