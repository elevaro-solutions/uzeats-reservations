/** Admin data export builders and formatters (CSV / JSON / PDF / Excel). */

export type ExportFormat = 'csv' | 'json' | 'pdf' | 'xlsx';

export type ExportTable = {
  title: string;
  headers: string[];
  rows: unknown[][];
};

export type ExportPayload = {
  filename: string;
  content: string;
  rowCount: number;
  mimeType: string;
  encoding: 'utf8' | 'base64';
};

export type DateRange = {
  start?: Date;
  end?: Date;
  /** Filename-safe label, e.g. 2026-01 or 2026-01-01_to_2026-03-31 */
  label: string;
  /** YYYY-MM when the range is exactly one calendar month */
  period?: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function endOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function parseIsoDate(value: string, endOfDay: boolean) {
  if (!ISO_DATE.test(value)) {
    throw new Error('Dates must be YYYY-MM-DD');
  }
  const parts = value.split('-').map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  return endOfDay
    ? new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999))
    : new Date(Date.UTC(y, m - 1, d));
}

function periodBounds(period: string) {
  if (!ISO_MONTH.test(period)) {
    throw new Error('period must be YYYY-MM');
  }
  const parts = period.split('-').map(Number);
  const year = parts[0]!;
  const month = parts[1]!;
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
    period,
    label: period,
  };
}

/** Resolve export window from custom dates and/or billing period. */
export function resolveExportDateRange(args: {
  period?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): DateRange {
  if (args.period === 'all') {
    return { label: 'all' };
  }

  if (args.startDate || args.endDate) {
    if (!args.startDate || !args.endDate) {
      throw new Error('Both startDate and endDate are required for a custom range');
    }
    const start = parseIsoDate(args.startDate, false);
    const end = parseIsoDate(args.endDate, true);
    if (start > end) throw new Error('startDate must be on or before endDate');

    const sameMonth =
      start.getUTCFullYear() === end.getUTCFullYear() &&
      start.getUTCMonth() === end.getUTCMonth() &&
      start.getUTCDate() === 1 &&
      end.getUTCDate() ===
        new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();

    return {
      start,
      end,
      label: `${args.startDate}_to_${args.endDate}`,
      period: sameMonth
        ? `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`
        : undefined,
    };
  }

  const period = args.period ?? new Date().toISOString().slice(0, 7);
  return periodBounds(period);
}

export function createdAtFilter(range: DateRange): Record<string, Date> | undefined {
  if (!range.start && !range.end) return undefined;
  const filter: Record<string, Date> = {};
  if (range.start) filter.$gte = range.start;
  if (range.end) filter.$lte = range.end;
  return filter;
}

export function billingPeriodsInRange(range: DateRange): string[] | undefined {
  if (range.period) return [range.period];
  if (!range.start || !range.end) return undefined;
  const periods: string[] = [];
  let y = range.start.getUTCFullYear();
  let m = range.start.getUTCMonth();
  const endY = range.end.getUTCFullYear();
  const endM = range.end.getUTCMonth();
  while (y < endY || (y === endY && m <= endM)) {
    periods.push(`${y}-${String(m + 1).padStart(2, '0')}`);
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return periods;
}

function csvEscape(value: unknown) {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
}

function toJson(table: ExportTable) {
  const objects = table.rows.map((row) =>
    Object.fromEntries(table.headers.map((h, i) => [h, row[i] ?? null])),
  );
  return JSON.stringify(
    {
      title: table.title,
      exportedAt: new Date().toISOString(),
      rowCount: objects.length,
      rows: objects,
    },
    null,
    2,
  );
}

function pdfEscape(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function truncate(value: unknown, max = 48) {
  const s = value == null ? '' : String(value).replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Minimal multi-page PDF (Helvetica) — no external dependency. */
export function toPdf(table: ExportTable) {
  const pageWidth = 792; // landscape letter
  const pageHeight = 612;
  const marginX = 36;
  const marginTop = 40;
  const lineHeight = 12;
  const fontSize = 8;
  const titleSize = 12;
  const colCount = Math.max(table.headers.length, 1);
  const usableWidth = pageWidth - marginX * 2;
  const colWidth = usableWidth / colCount;
  const rowsPerPage = Math.max(
    1,
    Math.floor((pageHeight - marginTop - 48) / lineHeight) - 1,
  );

  const pages: string[][] = [];
  const headerLine = table.headers.map((h) => truncate(h, 40));
  for (let i = 0; i < table.rows.length || (i === 0 && table.rows.length === 0); i += rowsPerPage) {
    const chunk = table.rows.slice(i, i + rowsPerPage);
    const lines: string[] = [];
    let y = pageHeight - marginTop;
    lines.push(`BT /F1 ${titleSize} Tf ${marginX} ${y} Td (${pdfEscape(table.title)}) Tj ET`);
    y -= titleSize + 8;
    lines.push(`BT /F1 ${fontSize} Tf ${marginX} ${y} Td (${pdfEscape(`Rows: ${table.rows.length}`)}) Tj ET`);
    y -= lineHeight + 4;

    const drawRow = (cells: string[], bold = false) => {
      let x = marginX;
      for (const cell of cells) {
        const font = bold ? '/F1' : '/F1';
        lines.push(
          `BT ${font} ${fontSize} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${pdfEscape(cell)}) Tj ET`,
        );
        x += colWidth;
      }
      y -= lineHeight;
    };

    drawRow(headerLine, true);
    for (const row of chunk) {
      drawRow(row.map((c) => truncate(c, Math.floor(48 * (12 / colCount)))));
    }
    pages.push(lines);
  }

  const objects: string[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  const kids = pages.map((_, i) => `${3 + i * 2} 0 R`).join(' ');
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);

  const fontObjNum = 3 + pages.length * 2;
  for (let i = 0; i < pages.length; i++) {
    const pageObj = 3 + i * 2;
    const contentObj = pageObj + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObj} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>`,
    );
    const stream = (pages[i] ?? []).join('\n');
    objects.push(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
  }
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8').toString('base64');
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files: Array<{ name: string; data: Buffer }>) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const crc = crc32(file.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(file.data.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const localEntry = Buffer.concat([local, nameBuf, file.data]);
    locals.push(localEntry);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(file.data.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, nameBuf]));
    offset += localEntry.length;
  }
  const centralDir = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDir, eocd]);
}

function xmlEscape(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colName(n: number) {
  let s = '';
  let i = n;
  while (i > 0) {
    const r = (i - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

function sheetName(title: string) {
  const cleaned = title.replace(/[:\\/?*[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  return (cleaned || 'Sheet1').slice(0, 31);
}

function xlsxCell(value: unknown, ref: string) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  const text = value == null ? '' : String(value);
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
}

/** Office Open XML spreadsheet (no compression / no extra deps). */
export function toXlsx(table: ExportTable) {
  const headerRow = `<row r="1">${table.headers
    .map((h, i) => xlsxCell(h, `${colName(i + 1)}1`))
    .join('')}</row>`;
  const body = table.rows
    .map((row, ri) => {
      const r = ri + 2;
      return `<row r="${r}">${row
        .map((cell, i) => xlsxCell(cell, `${colName(i + 1)}${r}`))
        .join('')}</row>`;
    })
    .join('');
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${headerRow}${body}</sheetData></worksheet>`;
  const name = xmlEscape(sheetName(table.title));
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;

  return zipStore([
    { name: '[Content_Types].xml', data: Buffer.from(contentTypes, 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(rels, 'utf8') },
    { name: 'xl/workbook.xml', data: Buffer.from(workbook, 'utf8') },
    { name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(workbookRels, 'utf8') },
    { name: 'xl/worksheets/sheet1.xml', data: Buffer.from(sheet, 'utf8') },
  ]).toString('base64');
}

export function formatExport(
  basename: string,
  table: ExportTable,
  format: ExportFormat,
): ExportPayload {
  const rowCount = table.rows.length;
  if (format === 'json') {
    return {
      filename: `${basename}.json`,
      content: toJson(table),
      rowCount,
      mimeType: 'application/json',
      encoding: 'utf8',
    };
  }
  if (format === 'pdf') {
    return {
      filename: `${basename}.pdf`,
      content: toPdf(table),
      rowCount,
      mimeType: 'application/pdf',
      encoding: 'base64',
    };
  }
  if (format === 'xlsx') {
    return {
      filename: `${basename}.xlsx`,
      content: toXlsx(table),
      rowCount,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      encoding: 'base64',
    };
  }
  return {
    filename: `${basename}.csv`,
    content: toCsv(table.headers, table.rows),
    rowCount,
    mimeType: 'text/csv;charset=utf-8',
    encoding: 'utf8',
  };
}

export function parseExportFormat(raw?: string | null): ExportFormat {
  const format = (raw ?? 'csv').toLowerCase();
  if (format === 'excel' || format === 'xlsx') return 'xlsx';
  if (format === 'csv' || format === 'json' || format === 'pdf') return format;
  throw new Error('Unsupported format. Use csv, json, pdf, or excel.');
}

export function iso(value?: Date | null) {
  return value?.toISOString?.() ?? '';
}

export { startOfUtcDay, endOfUtcDay };
