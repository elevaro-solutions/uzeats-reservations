/**
 * Branded Tablevera invoice PDF — Diamond Co.–style layout with forest/gold brand.
 * Includes clickable pay-link URI annotations (no external PDF deps).
 */

import {
  TABLEVERA_LOGO_WHITE_HEIGHT,
  TABLEVERA_LOGO_WHITE_JPEG,
  TABLEVERA_LOGO_WHITE_WIDTH,
} from '../assets/tableveraLogoWhite.js';
import type { ExportPayload } from './adminExport.js';

export type InvoicePdfLine = {
  description: string;
  quantity: number;
  amountCents: number;
  originalAmountCents?: number | null;
};

export type InvoicePdfInput = {
  number: string;
  restaurantName: string | null;
  restaurantId: string;
  restaurantAddress?: string | null;
  status: string;
  billingPeriod: string;
  currency: string;
  totalCents: number;
  originalTotalCents?: number | null;
  isDiscounted?: boolean;
  lines: InvoicePdfLine[];
  dueDate?: Date | string | null;
  paidAt?: Date | string | null;
  notes?: string | null;
  packageDurationMonths?: number | null;
  planKey?: string | null;
  billingCycle?: string | null;
  payUrl?: string | null;
  brandName?: string;
  supportEmail?: string;
  supportPhone?: string;
  companyAddress?: string;
  websiteUrl?: string;
};

const C = {
  header: { r: 0.043, g: 0.239, b: 0.18 }, // #0b3d2e forest
  footer: { r: 0.35, g: 0.45, b: 0.48 },
  gold: { r: 0.773, g: 0.627, b: 0.349 }, // #c5a059
  ink: { r: 0.12, g: 0.12, b: 0.12 },
  muted: { r: 0.4, g: 0.4, b: 0.42 },
  tableHead: { r: 0.91, g: 0.92, b: 0.93 },
  totalBar: { r: 0.89, g: 0.9, b: 0.91 },
  line: { r: 0.85, g: 0.86, b: 0.87 },
  white: { r: 1, g: 1, b: 1 },
  link: { r: 0.043, g: 0.239, b: 0.18 },
};

const DEFAULT_COMPANY_ADDRESS =
  '20844 Waterbeach Place, Sterling, VA 20165, USA';

function pdfEscape(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** Helvetica Type1 is WinAnsi — map/strip Unicode so arrows/dashes don't show as "a". */
function pdfSafe(value: string) {
  return value
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u2022\u00B7\u22C5\u2023\u2043]/g, '|')
    .replace(/\u2026/g, '...')
    .replace(/[\u2190-\u21FF]/g, '>')
    .replace(/[^\x20-\x7E]/g, '');
}

function fill(c: { r: number; g: number; b: number }) {
  return `${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} rg`;
}

function stroke(c: { r: number; g: number; b: number }) {
  return `${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} RG`;
}

function money(cents: number, currency = 'usd') {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
}

function fmtDate(value?: Date | string | null) {
  if (!value) return '-';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  });
}

function formatPhoneDisplay(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/** Inclusive calendar range for a subscription package starting at billingPeriod (YYYY-MM). */
export function packagePeriodRange(
  billingPeriod: string,
  durationMonths?: number | null,
): { start: Date; end: Date } | null {
  if (!durationMonths || durationMonths < 1) return null;
  const [ys, ms] = billingPeriod.split('-');
  const year = Number(ys);
  const month = Number(ms);
  if (!year || !month || month < 1 || month > 12) return null;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month - 1 + durationMonths, 0));
  return { start, end };
}

function text(
  x: number,
  y: number,
  value: string,
  size: number,
  font: '/F1' | '/F2' | '/F3' | '/F4' = '/F1',
) {
  return `BT ${font} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${pdfEscape(pdfSafe(value))}) Tj ET`;
}

/** Approximate right-aligned text (Helvetica metrics ~0.5em avg). */
function textRight(
  rightX: number,
  y: number,
  value: string,
  size: number,
  font: '/F1' | '/F2' | '/F3' | '/F4' = '/F1',
  factor = 0.5,
) {
  const w = value.length * size * factor;
  return text(rightX - w, y, value, size, font);
}

function rect(x: number, y: number, w: number, h: number, c: { r: number; g: number; b: number }) {
  return `${fill(c)}\n${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`;
}

function hline(x1: number, y: number, x2: number, c: { r: number; g: number; b: number }, w = 0.6) {
  return `${stroke(c)}\n${w} w\n${x1.toFixed(1)} ${y.toFixed(1)} m ${x2.toFixed(1)} ${y.toFixed(1)} l S`;
}

function wrapText(value: string, maxChars: number): string[] {
  const words = value.replace(/\s+/g, ' ').trim().split(' ');
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

type LinkAnnot = { x1: number; y1: number; x2: number; y2: number; uri: string };

export function renderBrandedInvoicePdf(invoice: InvoicePdfInput): string {
  const pageWidth = 612;
  const pageHeight = 792;
  const marginX = 48;
  const contentW = pageWidth - marginX * 2;
  const supportEmail = invoice.supportEmail || 'support@tablevera.online';
  const supportPhone = invoice.supportPhone || '+16507707788';
  const companyAddress = (invoice.companyAddress || DEFAULT_COMPANY_ADDRESS).trim();
  const phoneDisplay = formatPhoneDisplay(supportPhone);
  const currency = invoice.currency || 'usd';
  const billTo = invoice.restaurantName || 'Restaurant';
  const address = invoice.restaurantAddress?.trim() || '';
  const packageRange = packagePeriodRange(invoice.billingPeriod, invoice.packageDurationMonths);
  const links: LinkAnnot[] = [];

  const ops: string[] = [];

  // —— Header bar + original logo ——
  const headerH = 78;
  ops.push(rect(0, pageHeight - headerH, pageWidth, headerH, C.header));
  // Logo draw size (points); keep aspect of 720×171
  const logoW = 168;
  const logoH = (logoW * TABLEVERA_LOGO_WHITE_HEIGHT) / TABLEVERA_LOGO_WHITE_WIDTH;
  const logoX = marginX;
  const logoY = pageHeight - headerH + (headerH - logoH) / 2;
  ops.push(
    `q\n${logoW.toFixed(1)} 0 0 ${logoH.toFixed(1)} ${logoX.toFixed(1)} ${logoY.toFixed(1)} cm\n/Im1 Do\nQ`,
  );
  ops.push(fill(C.white));
  ops.push(textRight(pageWidth - marginX, pageHeight - 48, 'INVOICE', 28, '/F3', 0.58));

  // —— Invoice to / company contact / meta ——
  let y = pageHeight - headerH - 28;
  ops.push(fill(C.muted));
  ops.push(text(marginX, y, 'Invoice to:', 10, '/F1'));
  ops.push(fill(C.ink));
  ops.push(text(marginX, y - 16, billTo.slice(0, 48), 12, '/F2'));

  let billBottom = y - 32;
  if (address) {
    const addrLines = wrapText(address, 42).slice(0, 3);
    ops.push(fill(C.muted));
    for (const line of addrLines) {
      ops.push(text(marginX, billBottom, line, 9, '/F1'));
      billBottom -= 12;
    }
  }

  // Issuer / package summary under bill-to
  const packageBits = [
    invoice.planKey ? `Plan ${invoice.planKey}` : null,
    invoice.billingCycle || null,
    invoice.packageDurationMonths ? `${invoice.packageDurationMonths} mo package` : null,
  ]
    .filter(Boolean)
    .join(' | ');
  if (packageBits) {
    ops.push(fill(C.muted));
    ops.push(text(marginX, billBottom, packageBits.slice(0, 55), 9, '/F1'));
    billBottom -= 12;
  }

  // Right meta
  const metaRight = pageWidth - marginX;
  let metaY = y;
  ops.push(fill(C.ink));
  ops.push(textRight(metaRight - 70, metaY, 'Invoice #', 10, '/F1', 0.5));
  ops.push(
    textRight(
      metaRight,
      metaY,
      invoice.number.replace(/^INV-/, '') || invoice.number,
      10,
      '/F2',
      0.5,
    ),
  );
  metaY -= 16;
  ops.push(textRight(metaRight - 70, metaY, 'Date', 10, '/F1', 0.5));
  ops.push(textRight(metaRight, metaY, fmtDate(invoice.dueDate), 10, '/F2', 0.5));
  metaY -= 16;
  ops.push(textRight(metaRight - 70, metaY, 'Status', 10, '/F1', 0.5));
  ops.push(
    textRight(
      metaRight,
      metaY,
      invoice.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      10,
      '/F2',
      0.48,
    ),
  );
  metaY -= 16;
  ops.push(textRight(metaRight - 70, metaY, 'Period', 10, '/F1', 0.5));
  ops.push(textRight(metaRight, metaY, invoice.billingPeriod, 10, '/F2', 0.5));

  // —— Table ——
  y = Math.min(billBottom, metaY) - 28;
  const colNo = marginX + 8;
  const colDesc = marginX + 40;
  const colPrice = marginX + contentW - 200;
  const colQty = marginX + contentW - 120;
  const colTotal = marginX + contentW - 12;

  ops.push(rect(marginX, y - 8, contentW, 24, C.tableHead));
  ops.push(fill(C.ink));
  ops.push(text(colNo, y, 'No.', 9, '/F2'));
  ops.push(text(colDesc, y, 'Service Description', 9, '/F2'));
  ops.push(text(colPrice, y, 'Price', 9, '/F2'));
  ops.push(text(colQty, y, 'Qty.', 9, '/F2'));
  ops.push(textRight(colTotal, y, 'Total', 9, '/F2', 0.55));

  y -= 28;
  const lines = invoice.lines?.length
    ? invoice.lines
    : [{ description: 'Invoice total', quantity: 1, amountCents: invoice.totalCents }];

  const periodSuffix = packageRange
    ? ` (${fmtDate(packageRange.start)} - ${fmtDate(packageRange.end)})`
    : '';

  let subtotalCents = 0;
  lines.forEach((item, idx) => {
    if (y < 240) return;
    const qty = item.quantity || 1;
    const unit = qty > 0 ? Math.round(item.amountCents / qty) : item.amountCents;
    subtotalCents += item.amountCents;

    let desc = item.description;
    // Append service dates only on the primary/plan line for subscription packages
    if (periodSuffix && idx === 0 && !/\d{2}\/\d{2}\/\d{4}/.test(desc)) {
      desc = `${desc}${periodSuffix}`;
    }

    ops.push(fill(C.ink));
    ops.push(text(colNo, y, String(idx + 1).padStart(2, '0'), 9, '/F1'));
    ops.push(text(colDesc, y, desc.slice(0, 48), 9, '/F1'));
    ops.push(text(colPrice, y, money(unit, currency), 9, '/F1'));
    ops.push(text(colQty + 8, y, String(qty), 9, '/F1'));
    ops.push(textRight(colTotal, y, money(item.amountCents, currency), 9, '/F1', 0.5));
    ops.push(hline(marginX, y - 10, marginX + contentW, C.line, 0.5));
    y -= 26;
  });

  // —— Terms + totals ——
  y -= 16;
  const termsTop = y;
  ops.push(fill(C.ink));
  ops.push(text(marginX, termsTop, 'Terms and Conditions', 10, '/F2'));
  ops.push(fill(C.muted));
  const terms = (
    invoice.notes?.trim() ||
    'Payment is due by the date shown. Services remain active while the account is in good standing. Questions about this invoice can be sent to our support team.'
  )
    .replace(/\s+/g, ' ')
    .trim();
  let ty = termsTop - 16;
  for (const line of wrapText(terms, 48).slice(0, 5)) {
    ops.push(text(marginX, ty, line, 8, '/F1'));
    ty -= 11;
  }

  let totY = termsTop;
  const totLabelX = marginX + contentW - 180;
  const totValueX = marginX + contentW - 12;
  const listCents =
    invoice.isDiscounted && invoice.originalTotalCents != null
      ? invoice.originalTotalCents
      : subtotalCents || invoice.totalCents;

  const rows: Array<[string, string]> = [['Subtotal', money(listCents, currency)]];
  if (invoice.isDiscounted && invoice.originalTotalCents != null) {
    const saved = invoice.originalTotalCents - invoice.totalCents;
    if (saved > 0) rows.push(['Discount', `-${money(saved, currency)}`]);
  }
  rows.push(['Tax Rate', money(0, currency)]);

  for (const [label, value] of rows) {
    ops.push(fill(C.muted));
    ops.push(text(totLabelX, totY, label, 9, '/F1'));
    ops.push(fill(C.ink));
    ops.push(textRight(totValueX, totY, value, 9, '/F1', 0.5));
    totY -= 16;
  }

  totY -= 4;
  ops.push(rect(totLabelX - 8, totY - 10, 188, 26, C.totalBar));
  ops.push(fill(C.ink));
  ops.push(text(totLabelX, totY, 'TOTAL', 11, '/F2'));
  ops.push(textRight(totValueX, totY, money(invoice.totalCents, currency), 11, '/F2', 0.55));

  // —— Contact + Payment (no authorised sign) ——
  y = Math.min(ty, totY) - 40;
  ops.push(fill(C.ink));
  ops.push(text(marginX, y, 'Contact', 10, '/F2'));
  ops.push(fill(C.muted));
  ops.push(text(marginX, y - 14, `Email: ${supportEmail}`, 9, '/F1'));
  ops.push(text(marginX, y - 28, `Phone: ${phoneDisplay}`, 9, '/F1'));
  let contactY = y - 42;
  for (const line of wrapText(`Address: ${companyAddress}`, 52).slice(0, 2)) {
    ops.push(text(marginX, contactY, line, 9, '/F1'));
    contactY -= 12;
  }

  y = contactY - 16;
  ops.push(fill(C.ink));
  ops.push(text(marginX, y, 'Payment Info:', 10, '/F2'));
  ops.push(fill(C.muted));
  ops.push(text(marginX, y - 14, `Invoice: ${invoice.number}`, 9, '/F1'));
  ops.push(text(marginX, y - 28, `Period: ${invoice.billingPeriod}`, 9, '/F1'));

  const payY = y - 44;
  if (invoice.payUrl && invoice.status !== 'paid' && invoice.status !== 'canceled') {
    ops.push(fill(C.link));
    ops.push(text(marginX, payY, 'Pay online >', 10, '/F2'));
    ops.push(hline(marginX, payY - 2, marginX + 78, C.link, 0.8));
    links.push({
      x1: marginX,
      y1: payY - 6,
      x2: marginX + 200,
      y2: payY + 14,
      uri: invoice.payUrl,
    });
    ops.push(fill(C.muted));
    ops.push(text(marginX, payY - 14, invoice.payUrl.slice(0, 62), 7, '/F1'));
    links.push({
      x1: marginX,
      y1: payY - 20,
      x2: marginX + contentW * 0.55,
      y2: payY - 6,
      uri: invoice.payUrl,
    });
  } else if (invoice.status === 'paid') {
    ops.push(fill(C.header));
    ops.push(text(marginX, payY, 'Paid in full - thank you', 10, '/F2'));
  }

  // —— Footer bar ——
  ops.push(rect(0, 0, pageWidth, 36, C.footer));
  ops.push(fill(C.white));
  const footerLeft = invoice.websiteUrl
    ? invoice.websiteUrl.replace(/^https?:\/\//, '')
    : 'tablevera.online';
  ops.push(text(marginX, 20, footerLeft, 8, '/F1'));
  if (invoice.websiteUrl) {
    links.push({
      x1: marginX,
      y1: 14,
      x2: marginX + 160,
      y2: 30,
      uri: invoice.websiteUrl,
    });
  }
  ops.push(text(marginX, 8, `${supportEmail}  |  ${phoneDisplay}`, 7, '/F1'));

  const stream = ops.join('\n');
  const logoBytes = TABLEVERA_LOGO_WHITE_JPEG;
  const annotStart = 10; // objects 1–8 fonts/page, 9 image, 10+ annots
  const annotsPart = links.length
    ? ` /Annots [${links.map((_, i) => `${annotStart + i} 0 R`).join(' ')}]`
    : '';

  const parts: Buffer[] = [Buffer.from('%PDF-1.4\n', 'utf8')];
  const off: number[] = [0];
  let size = 8; // '%PDF-1.4\n'

  const addObject = (content: Buffer) => {
    off.push(size);
    const header = Buffer.from(`${off.length - 1} 0 obj\n`, 'utf8');
    const footer = Buffer.from('\nendobj\n', 'utf8');
    parts.push(header, content, footer);
    size += header.length + content.length + footer.length;
  };

  addObject(Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'utf8'));
  addObject(Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', 'utf8'));
  addObject(
    Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> /XObject << /Im1 9 0 R >> >>${annotsPart} >>`,
      'utf8',
    ),
  );
  addObject(
    Buffer.from(
      `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`,
      'utf8',
    ),
  );
  addObject(Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', 'utf8'));
  addObject(Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>', 'utf8'));
  addObject(Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>', 'utf8'));
  addObject(Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>', 'utf8'));
  addObject(
    Buffer.concat([
      Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width ${TABLEVERA_LOGO_WHITE_WIDTH} /Height ${TABLEVERA_LOGO_WHITE_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoBytes.length} >>\nstream\n`,
        'utf8',
      ),
      logoBytes,
      Buffer.from('\nendstream', 'utf8'),
    ]),
  );
  for (const link of links) {
    addObject(
      Buffer.from(
        `<< /Type /Annot /Subtype /Link /Rect [${link.x1.toFixed(1)} ${link.y1.toFixed(1)} ${link.x2.toFixed(1)} ${link.y2.toFixed(1)}] /Border [0 0 0] /A << /S /URI /URI (${pdfEscape(link.uri)}) >> >>`,
        'utf8',
      ),
    );
  }

  const pdfBody = Buffer.concat(parts);
  const xrefOffset = pdfBody.length;
  let xref = `xref\n0 ${off.length}\n`;
  xref += '0000000000 65535 f \n';
  for (let i = 1; i < off.length; i++) {
    xref += `${String(off[i]).padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${off.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.concat([pdfBody, Buffer.from(xref, 'utf8')]).toString('base64');
}

export function brandedInvoiceExportPayload(invoice: InvoicePdfInput): ExportPayload {
  return {
    filename: `${invoice.number}.pdf`,
    content: renderBrandedInvoicePdf(invoice),
    rowCount: invoice.lines?.length ?? 0,
    mimeType: 'application/pdf',
    encoding: 'base64',
  };
}
