/**
 * Branded Tablevera legal-agreement PDF — ISO A4, forest/gold header + white logo.
 */

import {
  TABLEVERA_LOGO_WHITE_HEIGHT,
  TABLEVERA_LOGO_WHITE_JPEG,
  TABLEVERA_LOGO_WHITE_WIDTH,
} from '../assets/tableveraLogoWhite.js';
import type { LegalAgreementKey } from '../models/LegalAgreement.js';
import type { PdfImage } from './signatureImage.js';

/** ISO 216 A4 in PDF points (1 pt = 1/72 in). */
export const A4_PAGE_WIDTH = 595.28;
export const A4_PAGE_HEIGHT = 841.89;

const C = {
  header: { r: 0.043, g: 0.239, b: 0.18 },
  gold: { r: 0.773, g: 0.627, b: 0.349 },
  ink: { r: 0.102, g: 0.094, b: 0.086 },
  muted: { r: 0.353, g: 0.333, b: 0.302 },
  line: { r: 0.89, g: 0.875, b: 0.847 },
  white: { r: 1, g: 1, b: 1 },
};

function pdfEscape(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function pdfSafe(value: string) {
  return value
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u2022\u00B7]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/[^\x20-\x7E\n]/g, '');
}

function fill(c: { r: number; g: number; b: number }) {
  return `${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} rg`;
}

function stroke(c: { r: number; g: number; b: number }) {
  return `${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} RG`;
}

function text(
  x: number,
  y: number,
  value: string,
  size: number,
  font: '/F1' | '/F2' | '/F3' = '/F1',
) {
  return `BT ${font} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${pdfEscape(pdfSafe(value))}) Tj ET`;
}

function rect(x: number, y: number, w: number, h: number, c: { r: number; g: number; b: number }) {
  return `${fill(c)}\n${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`;
}

function htmlToPlainLines(html: string): string[] {
  const withBreaks = html
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(ul|ol|table|thead|tbody)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<h[1-6][^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '');
  return pdfSafe(withBreaks)
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function wrapLine(value: string, maxChars: number): string[] {
  const words = value.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

export type LegalAgreementPdfInput = {
  key: LegalAgreementKey;
  name: string;
  version: number;
  bodyHtml: string;
  publishedAt?: Date | null;
  /** When set, a signature block is appended (signed copy). */
  signature?: LegalAgreementPdfSignature | null;
};

export type LegalAgreementPdfSignature = {
  method: 'typed' | 'drawn';
  signedFullName: string;
  /** Decoded drawn signature (null for typed, or when the stored image can't be read). */
  image: PdfImage | null;
  signedAt: Date;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

function formatSignedAt(d: Date) {
  return `${d.toLocaleString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })} UTC`;
}

export function renderLegalAgreementPdf(doc: LegalAgreementPdfInput): string {
  const pageWidth = A4_PAGE_WIDTH;
  const pageHeight = A4_PAGE_HEIGHT;
  const marginX = 48;
  const marginBottom = 56;
  const maxChars = 92;
  const lineHeight = 13;
  const headerH = 72;

  type Row = { text: string; heading: boolean };
  const rows: Row[] = [];
  for (const line of htmlToPlainLines(doc.bodyHtml)) {
    const heading = /^\d+\.\s/.test(line);
    const parts = wrapLine(line, maxChars);
    parts.forEach((w, idx) => rows.push({ text: w, heading: heading && idx === 0 }));
    rows.push({ text: '', heading: false });
  }

  const pageOpsList: string[][] = [];
  let ops: string[] = [];
  let y = 0;

  const drawHeader = () => {
    const local: string[] = [];
    local.push(rect(0, pageHeight - headerH, pageWidth, headerH, C.header));
    const logoW = 150;
    const logoH = (logoW * TABLEVERA_LOGO_WHITE_HEIGHT) / TABLEVERA_LOGO_WHITE_WIDTH;
    const logoX = marginX;
    const logoY = pageHeight - headerH + (headerH - logoH) / 2;
    local.push(
      `q\n${logoW.toFixed(1)} 0 0 ${logoH.toFixed(1)} ${logoX.toFixed(1)} ${logoY.toFixed(1)} cm\n/Im1 Do\nQ`,
    );
    local.push(fill(C.gold));
    local.push(text(pageWidth - marginX - 118, pageHeight - 42, 'LEGAL AGREEMENT', 9, '/F2'));
    local.push(rect(0, pageHeight - headerH - 3, pageWidth, 3, C.gold));
    return local;
  };

  const drawFooter = (pageNum: number, pageCount: number) => {
    const local: string[] = [];
    local.push(stroke(C.line));
    local.push(
      `0.6 w\n${marginX.toFixed(1)} ${(marginBottom - 18).toFixed(1)} m ${(pageWidth - marginX).toFixed(1)} ${(marginBottom - 18).toFixed(1)} l S`,
    );
    local.push(fill(C.muted));
    local.push(
      text(
        marginX,
        marginBottom - 32,
        `Tablevera  |  ${doc.name}  |  Version ${doc.version}`,
        8,
        '/F1',
      ),
    );
    local.push(
      text(pageWidth - marginX - 70, marginBottom - 32, `Page ${pageNum} of ${pageCount}`, 8, '/F1'),
    );
    return local;
  };

  const newPage = () => {
    ops = drawHeader();
    y = pageHeight - headerH - 28;
  };

  newPage();
  ops.push(fill(C.ink));
  ops.push(text(marginX, y, doc.name.slice(0, 80), 16, '/F2'));
  y -= 18;
  ops.push(fill(C.muted));
  const published = doc.publishedAt
    ? doc.publishedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';
  ops.push(
    text(
      marginX,
      y,
      `Version ${doc.version}${published ? `  ·  Effective ${published}` : ''}  ·  tablevera.online`,
      9,
      '/F1',
    ),
  );
  y -= 22;
  ops.push(stroke(C.gold));
  ops.push(
    `1.2 w\n${marginX.toFixed(1)} ${y.toFixed(1)} m ${(marginX + 80).toFixed(1)} ${y.toFixed(1)} l S`,
  );
  y -= 20;

  for (const row of rows) {
    if (y < marginBottom + 24) {
      pageOpsList.push(ops);
      newPage();
    }
    if (!row.text) {
      y -= 6;
      continue;
    }
    if (row.heading) {
      y -= 4;
      ops.push(fill(C.header));
      ops.push(text(marginX, y, row.text.slice(0, maxChars), 11, '/F2'));
      y -= lineHeight + 2;
    } else {
      ops.push(fill(C.ink));
      ops.push(text(marginX, y, row.text.slice(0, maxChars), 10, '/F1'));
      y -= lineHeight;
    }
  }

  const sig = doc.signature;
  if (sig) {
    const boxW = 280;
    const boxH = 90;
    const blockH = 24 + boxH + 16 + 7 * 13;
    if (y - blockH < marginBottom + 8) {
      pageOpsList.push(ops);
      newPage();
    }
    y -= 10;
    ops.push(stroke(C.gold));
    ops.push(
      `1.2 w\n${marginX.toFixed(1)} ${y.toFixed(1)} m ${(marginX + 80).toFixed(1)} ${y.toFixed(1)} l S`,
    );
    y -= 20;
    ops.push(fill(C.header));
    ops.push(text(marginX, y, 'Signature', 12, '/F2'));
    y -= 10;

    const boxTop = y;
    const boxBottom = boxTop - boxH;
    ops.push(stroke(C.line));
    ops.push(
      `0.8 w\n${marginX.toFixed(1)} ${boxBottom.toFixed(1)} ${boxW.toFixed(1)} ${boxH.toFixed(1)} re S`,
    );
    const typedName = pdfSafe(sig.signedFullName).trim();
    if (sig.method === 'drawn' && sig.image) {
      const pad = 8;
      const scale = Math.min(
        (boxW - pad * 2) / sig.image.width,
        (boxH - pad * 2) / sig.image.height,
      );
      const w = sig.image.width * scale;
      const h = sig.image.height * scale;
      const ix = marginX + (boxW - w) / 2;
      const iy = boxBottom + (boxH - h) / 2;
      ops.push(`q\n${w.toFixed(1)} 0 0 ${h.toFixed(1)} ${ix.toFixed(1)} ${iy.toFixed(1)} cm\n/Im2 Do\nQ`);
    } else {
      ops.push(fill(C.ink));
      const shown = typedName || 'Signed electronically';
      ops.push(text(marginX + 14, boxBottom + boxH / 2 - 8, shown.slice(0, 32), typedName ? 24 : 12, '/F3'));
    }
    y = boxBottom - 16;

    const details: [string, string][] = [
      ['Signed by', typedName || sig.email || '-'],
      ['Email', sig.email || '-'],
      ['Signed on', formatSignedAt(sig.signedAt)],
      ['Agreement', `${doc.name} - version ${doc.version}`],
      ['Method', sig.method === 'drawn' ? 'Drawn signature' : 'Typed full legal name'],
      ['IP address', sig.ip || '-'],
      ['Device', (sig.userAgent || '-').slice(0, 80)],
    ];
    for (const [label, value] of details) {
      ops.push(fill(C.muted));
      ops.push(text(marginX, y, `${label}:`, 9, '/F2'));
      ops.push(fill(C.ink));
      ops.push(text(marginX + 74, y, value, 9, '/F1'));
      y -= 13;
    }
  }
  pageOpsList.push(ops);

  const pageCount = pageOpsList.length;
  const finalized = pageOpsList.map((pageOps, i) => [...pageOps, ...drawFooter(i + 1, pageCount)]);

  const logoBytes = TABLEVERA_LOGO_WHITE_JPEG;
  const rebuild: Buffer[] = [Buffer.from('%PDF-1.4\n', 'utf8')];
  const offsets: number[] = [0];
  let cursor = 8;

  const add = (content: Buffer) => {
    offsets.push(cursor);
    const header = Buffer.from(`${offsets.length - 1} 0 obj\n`, 'utf8');
    const footer = Buffer.from('\nendobj\n', 'utf8');
    rebuild.push(header, content, footer);
    cursor += header.length + content.length + footer.length;
  };

  const firstPageObj = 3;
  const kids = finalized.map((_, i) => `${firstPageObj + i * 2} 0 R`).join(' ');
  const font1Id = firstPageObj + pageCount * 2;
  const font2Id = font1Id + 1;
  const font3Id = font2Id + 1;
  const imageId = font3Id + 1;
  const sigImage = sig?.method === 'drawn' ? sig.image : null;
  const sigImageId = sigImage ? imageId + 1 : null;
  const xobjects = `/Im1 ${imageId} 0 R${sigImageId ? ` /Im2 ${sigImageId} 0 R` : ''}`;

  add(Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'utf8'));
  add(Buffer.from(`<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`, 'utf8'));

  for (let i = 0; i < finalized.length; i++) {
    const pageObjId = firstPageObj + i * 2;
    const contentObjId = pageObjId + 1;
    const stream = finalized[i]!.join('\n');
    add(
      Buffer.from(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Contents ${contentObjId} 0 R /Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R /F3 ${font3Id} 0 R >> /XObject << ${xobjects} >> >> >>`,
        'utf8',
      ),
    );
    add(
      Buffer.from(
        `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`,
        'utf8',
      ),
    );
  }

  add(Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', 'utf8'));
  add(Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>', 'utf8'));
  add(Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >>', 'utf8'));
  add(
    Buffer.concat([
      Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width ${TABLEVERA_LOGO_WHITE_WIDTH} /Height ${TABLEVERA_LOGO_WHITE_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoBytes.length} >>\nstream\n`,
        'utf8',
      ),
      logoBytes,
      Buffer.from('\nendstream', 'utf8'),
    ]),
  );
  if (sigImage) {
    add(
      Buffer.concat([
        Buffer.from(
          `<< /Type /XObject /Subtype /Image /Width ${sigImage.width} /Height ${sigImage.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /${sigImage.filter} /Length ${sigImage.data.length} >>\nstream\n`,
          'utf8',
        ),
        sigImage.data,
        Buffer.from('\nendstream', 'utf8'),
      ]),
    );
  }

  const pdfBody = Buffer.concat(rebuild);
  const xrefOffset = pdfBody.length;
  let xref = `xref\n0 ${offsets.length}\n`;
  xref += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.concat([pdfBody, Buffer.from(xref, 'utf8')]).toString('base64');
}

export function legalAgreementPdfFilename(
  key: LegalAgreementKey,
  version: number,
  opts?: { signed?: boolean },
) {
  const slug = key === 'partner_agreement' ? 'partner-agreement' : 'terms-of-use';
  return `tablevera-${slug}-v${version}${opts?.signed ? '-signed' : ''}.pdf`;
}
