import { describe, expect, it } from 'vitest';
import {
  FAIL_TO_PAY_DEFAULTS,
  failToPayNoticeKeyForDay,
  failToPayStageFromDaysPastDue,
  financeChargeAssessmentsDue,
  financeChargeCentsForTotal,
  invoiceStatusFromDaysPastDue,
  isFailToPayAllowedPartnerPath,
  isFailToPayPubliclyListed,
  partnerMayCreateNewCover,
  partnerMayHonorExisting,
  utcCalendarDaysBetween,
} from '../failToPay.js';

describe('failToPay', () => {
  it('counts UTC calendar days from due date', () => {
    const due = new Date('2026-10-01T00:00:00.000Z');
    expect(utcCalendarDaysBetween(due, new Date('2026-10-01T23:00:00.000Z'))).toBe(0);
    expect(utcCalendarDaysBetween(due, new Date('2026-10-08T00:00:00.000Z'))).toBe(7);
    expect(utcCalendarDaysBetween(due, new Date('2026-10-09T00:00:00.000Z'))).toBe(8);
    expect(utcCalendarDaysBetween(due, new Date('2026-09-30T00:00:00.000Z'))).toBe(-1);
  });

  it('maps days to stages', () => {
    expect(failToPayStageFromDaysPastDue(null)).toBe('current');
    expect(failToPayStageFromDaysPastDue(-1)).toBe('current');
    expect(failToPayStageFromDaysPastDue(0)).toBe('grace');
    expect(failToPayStageFromDaysPastDue(7)).toBe('grace');
    expect(failToPayStageFromDaysPastDue(8)).toBe('overdue');
    expect(failToPayStageFromDaysPastDue(13)).toBe('overdue');
    expect(failToPayStageFromDaysPastDue(14)).toBe('unlisted');
    expect(failToPayStageFromDaysPastDue(29)).toBe('unlisted');
    expect(failToPayStageFromDaysPastDue(30)).toBe('restricted');
    expect(failToPayStageFromDaysPastDue(59)).toBe('restricted');
    expect(failToPayStageFromDaysPastDue(60)).toBe('terminated');
  });

  it('lists only current/grace/overdue', () => {
    expect(isFailToPayPubliclyListed('overdue')).toBe(true);
    expect(isFailToPayPubliclyListed('unlisted')).toBe(false);
    expect(isFailToPayPubliclyListed('restricted')).toBe(false);
    expect(isFailToPayPubliclyListed('terminated')).toBe(false);
  });

  it('blocks new covers at restricted and honor at terminated', () => {
    expect(partnerMayCreateNewCover('unlisted')).toBe(true);
    expect(partnerMayCreateNewCover('restricted')).toBe(false);
    expect(partnerMayHonorExisting('restricted')).toBe(true);
    expect(partnerMayHonorExisting('terminated')).toBe(false);
  });

  it('locks Partner Hub paths by stage', () => {
    expect(isFailToPayAllowedPartnerPath('/floor-plan', 'overdue')).toBe(true);
    expect(isFailToPayAllowedPartnerPath('/reservations', 'restricted')).toBe(true);
    expect(isFailToPayAllowedPartnerPath('/billing/invoices/1', 'restricted')).toBe(true);
    expect(isFailToPayAllowedPartnerPath('/grow', 'restricted')).toBe(false);
    expect(isFailToPayAllowedPartnerPath('/reservations', 'terminated')).toBe(false);
    expect(isFailToPayAllowedPartnerPath('/billing', 'terminated')).toBe(true);
  });

  it('assesses 1.5% rounded and monthly after grace', () => {
    expect(financeChargeCentsForTotal(10_000, FAIL_TO_PAY_DEFAULTS.financeChargeBps)).toBe(150);
    expect(financeChargeAssessmentsDue(7)).toBe(0);
    expect(financeChargeAssessmentsDue(8)).toBe(1);
    expect(financeChargeAssessmentsDue(37)).toBe(1);
    expect(financeChargeAssessmentsDue(38)).toBe(2);
  });

  it('aligns invoice status with grace', () => {
    expect(invoiceStatusFromDaysPastDue(-1)).toBe('upcoming');
    expect(invoiceStatusFromDaysPastDue(0)).toBe('pending');
    expect(invoiceStatusFromDaysPastDue(7)).toBe('pending');
    expect(invoiceStatusFromDaysPastDue(8)).toBe('overdue');
  });

  it('returns notice keys only on cadence days', () => {
    expect(failToPayNoticeKeyForDay(2)).toBeNull();
    expect(failToPayNoticeKeyForDay(14)).toBe('day_14');
  });
});
