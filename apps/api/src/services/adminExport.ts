/** Admin data export builders and formatters (CSV / JSON / PDF / Excel). */

import {
  TABLEVERA_LOGO_WHITE_HEIGHT,
  TABLEVERA_LOGO_WHITE_JPEG,
  TABLEVERA_LOGO_WHITE_WIDTH,
} from '../assets/tableveraLogoWhite.js';

export type ExportFormat = 'csv' | 'json' | 'pdf' | 'xlsx';

export type ExportTable = {
  title: string;
  headers: string[];
  rows: unknown[][];
  /** Column indexes printed in the PDF (wide tables stay readable); Excel keeps every column. */
  pdfColumns?: number[];
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

/** Windows-1252 bytes for the 0x80–0x9F range (Helvetica /WinAnsiEncoding). */
const WIN_ANSI_EXTRA: Record<string, number> = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88,
  '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92, '“': 0x93,
  '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b,
  'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f,
  // Uzbek Latin apostrophes (oʻ, gʻ, ʼ) print as a plain quote.
  'ʻ': 0x27, 'ʼ': 0x27, '★': 0x2a,
};

/** One char per byte (latin1 string) so the file is written as single-byte WinAnsi. */
function toWinAnsi(text: string) {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0x3f;
    if ((code >= 0x20 && code < 0x7f) || (code >= 0xa0 && code <= 0xff)) out += ch;
    else if (WIN_ANSI_EXTRA[ch] != null) out += String.fromCharCode(WIN_ANSI_EXTRA[ch]!);
    else if (/\s/.test(ch)) out += ' ';
    else out += '?';
  }
  return out;
}

function pdfText(text: string) {
  return toWinAnsi(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function cellText(value: unknown) {
  return value == null ? '' : String(value).replace(/\s+/g, ' ').trim();
}

/** Helvetica averages ~0.5em per glyph; good enough to size columns without font metrics. */
const PDF_CHAR_EM = 0.56;
const PDF_MAX_AUTO_COLUMNS = 10;

function clip(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return maxChars <= 1 ? '…' : `${text.slice(0, maxChars - 1)}…`;
}

type Rgb = { r: number; g: number; b: number };

function hexRgb(hex: string): Rgb {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

/** Tablevera export palette — forest/gold from the invoice PDF and the logo's own background. */
const BRAND_HEX = {
  forest: '0B3D2E',
  gold: 'C5A059',
  ink: '1F2421',
  muted: '6B6F6C',
  zebra: 'F6F4EF',
  rule: 'E3E1DC',
  white: 'FFFFFF',
} as const;

const BRAND = Object.fromEntries(
  Object.entries(BRAND_HEX).map(([key, hex]) => [key, hexRgb(hex)]),
) as Record<keyof typeof BRAND_HEX, Rgb>;

const EXPORT_SITE_LABEL = 'tablevera.app';

function pdfFill(c: Rgb) {
  return `${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} rg`;
}

function pdfStroke(c: Rgb) {
  return `${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} RG`;
}

function exportDateLabel(now = new Date()) {
  return now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Branded multi-page landscape PDF table (Helvetica + embedded logo) — no external dependency. */
export function toPdf(table: ExportTable) {
  const pageWidth = 792; // landscape letter
  const pageHeight = 612;
  const marginX = 32;
  const marginBottom = 36;
  const fontSize = 8;
  const lineHeight = 14;
  const titleSize = 14;
  const cellPad = 12;
  const usableWidth = pageWidth - marginX * 2;

  const allColumns = table.headers.map((_, i) => i);
  const columns = (
    table.pdfColumns?.filter((i) => i >= 0 && i < table.headers.length) ??
    allColumns.slice(0, PDF_MAX_AUTO_COLUMNS)
  ).slice(0, 14);
  const hiddenCount = table.headers.length - columns.length;

  const charWidth = fontSize * PDF_CHAR_EM;
  const desired = columns.map((c) => {
    const lengths = table.rows.slice(0, 200).map((row) => cellText(row[c]).length);
    lengths.sort((a, b) => a - b);
    const typical = lengths.length ? lengths[Math.floor(lengths.length * 0.9)]! : 0;
    const chars = Math.min(Math.max(cellText(table.headers[c]).length, typical, 4), 42);
    return chars * charWidth + cellPad;
  });
  const total = desired.reduce((s, w) => s + w, 0) || 1;
  // Shrink to fit, or spread spare width (capped) so short tables do not crowd the left edge.
  const scale = Math.min(usableWidth / total, 1.6);
  const widths = desired.map((w) => w * scale);

  const exportedOn = exportDateLabel();
  const subtitle =
    `${table.rows.length} row${table.rows.length === 1 ? '' : 's'}` +
    ` · Exported ${exportedOn}` +
    (hiddenCount > 0 ? ` · ${hiddenCount} more columns in the Excel export` : '');

  const bandHeight = 56;
  const logoH = 28;
  const logoW = (logoH * TABLEVERA_LOGO_WHITE_WIDTH) / TABLEVERA_LOGO_WHITE_HEIGHT;
  const tableTop = pageHeight - bandHeight - 3 - 24 - titleSize - 6 - lineHeight - 14;
  const footerTop = marginBottom + 10;
  const rowsPerPage = Math.max(1, Math.floor((tableTop - lineHeight - footerTop) / lineHeight));
  const pageCount = Math.max(1, Math.ceil(table.rows.length / rowsPerPage));
  const textWidth = (text: string, size: number) => toWinAnsi(text).length * size * 0.5;

  const pages: string[][] = [];
  for (let p = 0; p < pageCount; p++) {
    const chunk = table.rows.slice(p * rowsPerPage, (p + 1) * rowsPerPage);
    const lines: string[] = [];

    // Forest band with the wordmark (its JPEG background is the same forest) + gold rule.
    lines.push(`${pdfFill(BRAND.forest)} 0 ${pageHeight - bandHeight} ${pageWidth} ${bandHeight} re f`);
    lines.push(`${pdfFill(BRAND.gold)} 0 ${pageHeight - bandHeight - 3} ${pageWidth} 3 re f`);
    lines.push(
      `q ${logoW.toFixed(1)} 0 0 ${logoH} ${marginX} ${pageHeight - bandHeight + (bandHeight - logoH) / 2} cm /Im1 Do Q`,
    );
    const bandLabel = 'PARTNER HUB EXPORT';
    lines.push(
      `${pdfFill(BRAND.gold)} BT /F2 8 Tf ${(pageWidth - marginX - textWidth(bandLabel, 8) - 8).toFixed(1)} ${pageHeight - bandHeight / 2 - 3} Td (${pdfText(bandLabel)}) Tj ET`,
    );

    let y = pageHeight - bandHeight - 3 - 24;
    lines.push(
      `${pdfFill(BRAND.forest)} BT /F2 ${titleSize} Tf ${marginX} ${y} Td (${pdfText(table.title)}) Tj ET`,
    );
    y -= titleSize + 6;
    lines.push(
      `${pdfFill(BRAND.muted)} BT /F1 ${fontSize} Tf ${marginX} ${y} Td (${pdfText(subtitle)}) Tj ET`,
    );
    y = tableTop;

    const drawRow = (cells: string[], font: '/F1' | '/F2', color: Rgb) => {
      let x = marginX;
      lines.push(pdfFill(color));
      cells.forEach((cell, i) => {
        const width = widths[i] ?? 40;
        const maxChars = Math.max(1, Math.floor((width - cellPad) / charWidth));
        lines.push(
          `BT ${font} ${fontSize} Tf ${(x + 5).toFixed(1)} ${y.toFixed(1)} Td (${pdfText(clip(cell, maxChars))}) Tj ET`,
        );
        x += width;
      });
    };

    lines.push(
      `${pdfFill(BRAND.forest)} ${marginX} ${(y - 5).toFixed(1)} ${usableWidth} ${lineHeight + 2} re f`,
    );
    drawRow(columns.map((c) => cellText(table.headers[c])), '/F2', BRAND.white);
    y -= lineHeight + 2;
    chunk.forEach((row, ri) => {
      if (ri % 2 === 1) {
        lines.push(
          `${pdfFill(BRAND.zebra)} ${marginX} ${(y - 4).toFixed(1)} ${usableWidth} ${lineHeight} re f`,
        );
      }
      drawRow(columns.map((c) => cellText(row[c])), '/F1', BRAND.ink);
      lines.push(
        `${pdfStroke(BRAND.rule)} 0.4 w ${marginX} ${(y - 4).toFixed(1)} m ${marginX + usableWidth} ${(y - 4).toFixed(1)} l S`,
      );
      y -= lineHeight;
    });
    if (table.rows.length === 0) {
      drawRow(['No rows match this export.'], '/F1', BRAND.muted);
    }

    lines.push(`${pdfFill(BRAND.gold)} ${marginX} ${footerTop} ${usableWidth} 0.8 re f`);
    lines.push(
      `${pdfFill(BRAND.muted)} BT /F1 7 Tf ${marginX} ${footerTop - 12} Td (${pdfText(`Tablevera · ${EXPORT_SITE_LABEL} · Confidential — for your restaurant team`)}) Tj ET`,
    );
    const pageLabel = `Page ${p + 1} of ${pageCount}`;
    lines.push(
      `BT /F1 7 Tf ${(pageWidth - marginX - textWidth(pageLabel, 7)).toFixed(1)} ${footerTop - 12} Td (${pdfText(pageLabel)}) Tj ET`,
    );
    pages.push(lines);
  }

  // Objects: 1 catalog, 2 pages, then page+content pairs, then 2 fonts and the logo image.
  const fontObjNum = 3 + pages.length * 2;
  const imageObjNum = fontObjNum + 2;
  const objects: Buffer[] = [];
  const latin1 = (s: string) => Buffer.from(s, 'latin1');
  objects.push(latin1('<< /Type /Catalog /Pages 2 0 R >>'));
  const kids = pages.map((_, i) => `${3 + i * 2} 0 R`).join(' ');
  objects.push(latin1(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`));
  for (let i = 0; i < pages.length; i++) {
    const contentObj = 3 + i * 2 + 1;
    objects.push(
      latin1(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObj} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R /F2 ${fontObjNum + 1} 0 R >> /XObject << /Im1 ${imageObjNum} 0 R >> >> >>`,
      ),
    );
    const stream = (pages[i] ?? []).join('\n');
    objects.push(latin1(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));
  }
  objects.push(latin1('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));
  objects.push(
    latin1('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'),
  );
  objects.push(
    Buffer.concat([
      latin1(
        `<< /Type /XObject /Subtype /Image /Width ${TABLEVERA_LOGO_WHITE_WIDTH} /Height ${TABLEVERA_LOGO_WHITE_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${TABLEVERA_LOGO_WHITE_JPEG.length} >>\nstream\n`,
      ),
      TABLEVERA_LOGO_WHITE_JPEG,
      latin1('\nendstream'),
    ]),
  );

  const parts: Buffer[] = [latin1('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')];
  let size = parts[0]!.length;
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(size);
    const chunk = Buffer.concat([latin1(`${i + 1} 0 obj\n`), body, latin1('\nendobj\n')]);
    parts.push(chunk);
    size += chunk.length;
  });
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${size}\n%%EOF`;
  parts.push(latin1(xref));
  return Buffer.concat(parts).toString('base64');
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

function xlsxCell(value: unknown, ref: string, style?: number) {
  const s = style ? ` s="${style}"` : '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"${s}><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c r="${ref}"${s} t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  const text = value == null ? '' : String(value);
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
}

/** cellXfs: 1 header, 2 banner, 3 title, 4 meta, 5 body, 6 body (zebra). */
const XLSX_STYLE = { header: 1, banner: 2, title: 3, meta: 4, body: 5, zebra: 6 } as const;

const XLSX_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="11"/><color rgb="FF${BRAND_HEX.ink}"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF${BRAND_HEX.white}"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FF${BRAND_HEX.forest}"/><name val="Calibri"/></font><font><sz val="10"/><color rgb="FF${BRAND_HEX.muted}"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF${BRAND_HEX.forest}"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF${BRAND_HEX.zebra}"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FF${BRAND_HEX.rule}"/></bottom><diagonal/></border><border><left/><right/><top/><bottom style="medium"><color rgb="FF${BRAND_HEX.gold}"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="2" borderId="2" xfId="0" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

const EMU_PER_PT = 12700;

function xlsxLogoDrawing() {
  const heightPt = 26;
  const widthPt = (heightPt * TABLEVERA_LOGO_WHITE_WIDTH) / TABLEVERA_LOGO_WHITE_HEIGHT;
  const cx = Math.round(widthPt * EMU_PER_PT);
  const cy = Math.round(heightPt * EMU_PER_PT);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>${8 * EMU_PER_PT}</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>${8 * EMU_PER_PT}</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Tablevera logo" descr="Tablevera"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`;
}

/** Branded Office Open XML spreadsheet: logo banner, title, frozen header, filters (no deps). */
export function toXlsx(table: ExportTable) {
  const colCount = Math.max(table.headers.length, 1);
  const bannerCols = Math.max(colCount, 8);
  const headerRowNum = 5;
  const firstDataRow = headerRowNum + 1;
  const lastRow = headerRowNum + table.rows.length;
  const meta = `${table.rows.length} row${table.rows.length === 1 ? '' : 's'} · Exported ${exportDateLabel()} · Tablevera Partner Hub`;

  const bannerRow = `<row r="1" ht="42" customHeight="1">${Array.from({ length: bannerCols }, (_, i) =>
    `<c r="${colName(i + 1)}1" s="${XLSX_STYLE.banner}"/>`,
  ).join('')}</row>`;
  const titleRow = `<row r="2" ht="30" customHeight="1">${xlsxCell(table.title, 'A2', XLSX_STYLE.title)}</row>`;
  const metaRow = `<row r="3" ht="16" customHeight="1">${xlsxCell(meta, 'A3', XLSX_STYLE.meta)}</row>`;
  const spacerRow = `<row r="4" ht="8" customHeight="1"/>`;
  const headerRow = `<row r="${headerRowNum}" ht="22" customHeight="1">${table.headers
    .map((h, i) => xlsxCell(h, `${colName(i + 1)}${headerRowNum}`, XLSX_STYLE.header))
    .join('')}</row>`;
  const body = table.rows
    .map((row, ri) => {
      const r = firstDataRow + ri;
      const style = ri % 2 === 1 ? XLSX_STYLE.zebra : XLSX_STYLE.body;
      return `<row r="${r}" ht="18" customHeight="1">${table.headers
        .map((_, i) => xlsxCell(row[i], `${colName(i + 1)}${r}`, style))
        .join('')}</row>`;
    })
    .join('');
  const cols = Array.from({ length: bannerCols }, (_, i) => {
    const longest = table.rows
      .slice(0, 500)
      .reduce((max, row) => Math.max(max, cellText(row[i]).length), cellText(table.headers[i]).length);
    const width = i < colCount ? Math.min(Math.max(longest + 3, 10), 60) : 10;
    return `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`;
  }).join('');
  const lastCol = colName(colCount);
  const tableRange = `A${headerRowNum}:${lastCol}${Math.max(lastRow, headerRowNum)}`;
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${colName(bannerCols)}${Math.max(lastRow, headerRowNum)}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="${headerRowNum}" topLeftCell="A${firstDataRow}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${bannerRow}${titleRow}${metaRow}${spacerRow}${headerRow}${body}</sheetData><autoFilter ref="${tableRange}"/><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;L&amp;8Tablevera · ${EXPORT_SITE_LABEL}&amp;R&amp;8Page &amp;P of &amp;N</oddFooter></headerFooter><drawing r:id="rId1"/></worksheet>`;
  const name = xmlEscape(sheetName(table.title));
  const quoted = `'${name.replace(/'/g, "''")}'`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${quoted}!$A$${headerRowNum}:$${lastCol}$${Math.max(lastRow, headerRowNum)}</definedName><definedName name="_xlnm.Print_Titles" localSheetId="0">${quoted}!$${headerRowNum}:$${headerRowNum}</definedName></definedNames></workbook>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const sheetRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`;
  const drawingRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/tablevera-logo.jpeg"/></Relationships>`;

  return zipStore([
    { name: '[Content_Types].xml', data: Buffer.from(contentTypes, 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(rels, 'utf8') },
    { name: 'xl/workbook.xml', data: Buffer.from(workbook, 'utf8') },
    { name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(workbookRels, 'utf8') },
    { name: 'xl/styles.xml', data: Buffer.from(XLSX_STYLES, 'utf8') },
    { name: 'xl/worksheets/sheet1.xml', data: Buffer.from(sheet, 'utf8') },
    { name: 'xl/worksheets/_rels/sheet1.xml.rels', data: Buffer.from(sheetRels, 'utf8') },
    { name: 'xl/drawings/drawing1.xml', data: Buffer.from(xlsxLogoDrawing(), 'utf8') },
    { name: 'xl/drawings/_rels/drawing1.xml.rels', data: Buffer.from(drawingRels, 'utf8') },
    { name: 'xl/media/tablevera-logo.jpeg', data: TABLEVERA_LOGO_WHITE_JPEG },
  ]).toString('base64');
}

export type DocxSection = {
  heading: string;
  paragraphs: string[];
};

function docxParagraph(text: string, heading: boolean) {
  const rPr = heading ? '<w:rPr><w:b/><w:sz w:val="28"/></w:rPr>' : '';
  return `<w:p><w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
}

/** Office Open XML document (stored zip, no extra deps). */
export function toDocx(title: string, sections: DocxSection[]) {
  const paragraphs = [docxParagraph(title, true)];
  for (const section of sections) {
    paragraphs.push(docxParagraph(section.heading, true));
    const lines = section.paragraphs.length > 0 ? section.paragraphs : [''];
    for (const paragraph of lines) {
      const chunks = paragraph.split(/\n/);
      for (const chunk of chunks.length > 0 ? chunks : ['']) {
        paragraphs.push(docxParagraph(chunk, false));
      }
    }
  }
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.join('')}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  return zipStore([
    { name: '[Content_Types].xml', data: Buffer.from(contentTypes, 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(rels, 'utf8') },
    { name: 'word/document.xml', data: Buffer.from(document, 'utf8') },
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
