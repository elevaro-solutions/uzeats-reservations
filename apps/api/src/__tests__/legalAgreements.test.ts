import { afterEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { deflateSync } from 'node:zlib';
import { LegalAgreement } from '../models/LegalAgreement.js';
import { LegalAgreementVersion } from '../models/LegalAgreementVersion.js';
import { UserAgreementAcceptance } from '../models/UserAgreementAcceptance.js';
import {
  exportLegalAgreementPdf,
  exportSignedLegalAgreementPdf,
  getAgreementCompliance,
  recordAgreementAcceptance,
  signCurrentAgreement,
  updateLegalAgreement,
} from '../services/legalAgreements.js';
import { A4_PAGE_HEIGHT, A4_PAGE_WIDTH } from '../services/legalAgreementPdf.js';
import { signatureDataUrlToPdfImage } from '../services/signatureImage.js';

const ownerId = new mongoose.Types.ObjectId().toString();
const adminId = new mongoose.Types.ObjectId().toString();
const typed = { method: 'typed' as const, fullName: 'Jane Owner' };

describe('legal agreement re-sign window', () => {
  afterEach(async () => {
    await LegalAgreement.deleteMany({});
    await LegalAgreementVersion.deleteMany({});
    await UserAgreementAcceptance.deleteMany({});
  });

  it('treats version 1 as baseline, then grace for 7 days, then blocked until signed', async () => {
    expect((await getAgreementCompliance(ownerId, 'partner_agreement')).status).toBe('current');

    await recordAgreementAcceptance({
      userId: ownerId,
      agreementKey: 'partner_agreement',
      version: 1,
      signature: typed,
      ip: '203.0.113.7',
      userAgent: 'vitest',
    });

    await updateLegalAgreement('partner_agreement', { bodyHtml: '<p>Version two</p>' }, adminId);

    const grace = await getAgreementCompliance(ownerId, 'partner_agreement');
    expect(grace.status).toBe('grace');
    expect(grace.currentVersion).toBe(2);
    expect(grace.daysRemaining).toBe(7);

    await LegalAgreement.updateOne(
      { key: 'partner_agreement' },
      { $set: { versionPublishedAt: new Date(Date.now() - 8 * 86_400_000) } },
    );
    expect((await getAgreementCompliance(ownerId, 'partner_agreement')).status).toBe('blocked');

    const signed = await signCurrentAgreement({
      userId: ownerId,
      role: 'restaurant_owner',
      agreementKey: 'partner_agreement',
      signature: { method: 'drawn', fullName: '', signatureDataUrl: `data:image/png;base64,${'A'.repeat(200)}` },
      ip: '203.0.113.7',
      userAgent: 'vitest',
    });
    expect(signed.status).toBe('current');

    const row = await UserAgreementAcceptance.findOne({ userId: ownerId, version: 2 }).lean();
    expect(row?.signatureMethod).toBe('drawn');
    expect(row?.ip).toBe('203.0.113.7');
    expect(row?.userAgent).toBe('vitest');
  });

  it('exports an A4 PDF', async () => {
    const pdf = await exportLegalAgreementPdf('terms_of_use');
    const raw = Buffer.from(pdf.content, 'base64').toString('latin1');
    expect(raw.startsWith('%PDF-1.4')).toBe(true);
    expect(raw).toContain(`/MediaBox [0 0 ${A4_PAGE_WIDTH.toFixed(2)} ${A4_PAGE_HEIGHT.toFixed(2)}]`);
    expect(pdf.filename).toBe('tablevera-terms-of-use-v1.pdf');
  });

  it('signed copy shows the typed signature and keeps the text of the signed version', async () => {
    await updateLegalAgreement('partner_agreement', { bodyHtml: '<p>Alpha clause text</p>' }, adminId);
    await signCurrentAgreement({
      userId: ownerId,
      role: 'restaurant_owner',
      agreementKey: 'partner_agreement',
      signature: typed,
      ip: '198.51.100.4',
      userAgent: 'vitest-agent',
    });
    await updateLegalAgreement('partner_agreement', { bodyHtml: '<p>Beta clause text</p>' }, adminId);

    const pdf = await exportSignedLegalAgreementPdf(ownerId, 'partner_agreement');
    const raw = Buffer.from(pdf.content, 'base64').toString('latin1');
    expect(pdf.filename).toBe('tablevera-partner-agreement-v2-signed.pdf');
    expect(raw).toContain('(Jane Owner) Tj');
    expect(raw).toContain('Alpha clause text');
    expect(raw).not.toContain('Beta clause text');
    expect(raw).toContain('198.51.100.4');
    expect(raw).toContain('/Times-Italic');
    expect(raw).not.toContain('/Im2');
  });

  it('signed copy embeds a drawn PNG signature as an image', async () => {
    const pngDataUrl = tinyRgbaPngDataUrl(4, 2);
    expect(signatureDataUrlToPdfImage(pngDataUrl)).toMatchObject({ width: 4, height: 2 });

    await recordAgreementAcceptance({
      userId: ownerId,
      agreementKey: 'partner_agreement',
      version: 1,
      signature: { method: 'drawn', fullName: '', signatureDataUrl: pngDataUrl },
    });
    const pdf = await exportSignedLegalAgreementPdf(ownerId, 'partner_agreement');
    const raw = Buffer.from(pdf.content, 'base64').toString('latin1');
    expect(raw).toContain('/Im2 Do');
    expect(raw).toContain('/Width 4 /Height 2 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode');
  });
});

/** 8-bit RGBA PNG (CRCs left as zero; the decoder does not check them). */
function tinyRgbaPngDataUrl(width: number, height: number) {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    return Buffer.concat([len, Buffer.from(type, 'ascii'), data, Buffer.alloc(4)]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    for (let x = 0; x < width; x++) row.writeUInt32BE(0x1a1816ff, 1 + x * 4);
    rows.push(row);
  }
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString('base64')}`;
}
