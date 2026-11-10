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

  it('formats csv json pdf and excel', () => {
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

    const xlsx = formatExport('test', table, 'xlsx');
    expect(xlsx.filename).toBe('test.xlsx');
    expect(xlsx.encoding).toBe('base64');
    const xlsxBuf = Buffer.from(xlsx.content, 'base64');
    expect(xlsxBuf.subarray(0, 2).toString()).toBe('PK');
    expect(xlsxBuf.toString('utf8')).toContain('y,z');
  });

  it('writes PDF text as WinAnsi and prints only the chosen columns of wide tables', () => {
    const headers = Array.from({ length: 20 }, (_, i) => `Col${i}`);
    const pdf = formatExport(
      'wide',
      {
        title: 'Reservations — Osiyo Restaurant',
        headers,
        rows: [headers.map((h) => `${h}-value`)],
        pdfColumns: [0, 3],
      },
      'pdf',
    );
    const raw = Buffer.from(pdf.content, 'base64').toString('latin1');
    expect(raw).toContain('Reservations \x97 Osiyo Restaurant');
    expect(raw).not.toContain('Reservations \u00e2');
    expect(raw).toContain('/WinAnsiEncoding');
    expect(raw).toContain('(Col3)');
    expect(raw).not.toContain('(Col4)');
    expect(raw).toContain('18 more columns in the Excel export');
    const xref = Number(raw.match(/startxref\n(\d+)/)?.[1]);
    expect(raw.slice(xref, xref + 4)).toBe('xref');
  });

  it('styles Excel exports with a bold frozen header and filter', () => {
    const xlsx = formatExport(
      'styled',
      { title: 'Guests', headers: ['Name', 'Email'], rows: [['Ann', 'a@x.org']] },
      'xlsx',
    );
    const text = Buffer.from(xlsx.content, 'base64').toString('latin1');
    expect(text).toContain('xl/styles.xml');
    expect(text).toContain('xl/media/tablevera-logo.jpeg');
    expect(text).toContain('<drawing r:id="rId1"/>');
    expect(text).toContain('rgb="FF0B3D2E"');
    expect(text).toContain('<pane ySplit="5" topLeftCell="A6"');
    expect(text).toContain('<autoFilter ref="A5:B6"/>');
    expect(text).toContain('<c r="A5" s="1"');
    expect(text).toContain('<c r="A2" s="3" t="inlineStr"><is><t xml:space="preserve">Guests</t>');
  });

  it('brands the PDF with the Tablevera logo band', () => {
    const pdf = formatExport('b', { title: 'Guests', headers: ['Name'], rows: [['Ann']] }, 'pdf');
    const raw = Buffer.from(pdf.content, 'base64').toString('latin1');
    expect(raw).toContain('/Subtype /Image');
    expect(raw).toContain('/Im1 Do');
    expect(raw).toContain('(PARTNER HUB EXPORT)');
  });

  it('parses formats and builds csv', () => {
    expect(parseExportFormat('JSON')).toBe('json');
    expect(parseExportFormat('excel')).toBe('xlsx');
    expect(toCsv(['h'], [['v']])).toBe('h\nv');
  });
});
