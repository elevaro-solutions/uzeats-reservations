import { describe, it, expect } from 'vitest';
import { previewBookingManualApproval } from '@reservations/shared';

const off = { enabled: false };

describe('previewBookingManualApproval', () => {
  it('is none when nothing opts in', () => {
    expect(
      previewBookingManualApproval({ restaurant: off, partySize: 2, candidateTableFlags: [false] }),
    ).toBe('none');
  });

  it('is required when the restaurant party-size rule matches', () => {
    expect(
      previewBookingManualApproval({
        restaurant: { enabled: true, partySizeOp: 'gte', partySize: 6 },
        partySize: 6,
      }),
    ).toBe('required');
    expect(
      previewBookingManualApproval({
        restaurant: { enabled: true, partySizeOp: 'gt', partySize: 6 },
        partySize: 6,
      }),
    ).toBe('none');
  });

  it('is required when a selected add-on opts in', () => {
    expect(
      previewBookingManualApproval({
        restaurant: off,
        partySize: 2,
        resourceRequiresApproval: [undefined, true],
      }),
    ).toBe('required');
  });

  it('follows the selected table and ignores other candidates', () => {
    expect(
      previewBookingManualApproval({
        restaurant: off,
        partySize: 2,
        selectedTableRequiresApproval: true,
        candidateTableFlags: [false],
      }),
    ).toBe('required');
    expect(
      previewBookingManualApproval({
        restaurant: off,
        partySize: 2,
        selectedTableRequiresApproval: false,
        candidateTableFlags: [true, true],
      }),
    ).toBe('none');
  });

  it('uses candidate tables when the server will auto-assign', () => {
    expect(
      previewBookingManualApproval({ restaurant: off, partySize: 2, candidateTableFlags: [true, true] }),
    ).toBe('required');
    expect(
      previewBookingManualApproval({ restaurant: off, partySize: 2, candidateTableFlags: [true, false] }),
    ).toBe('possible');
    expect(
      previewBookingManualApproval({ restaurant: off, partySize: 2, candidateTableFlags: [] }),
    ).toBe('none');
  });
});
