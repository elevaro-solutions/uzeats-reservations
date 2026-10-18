import { describe, expect, it } from 'vitest';
import {
  isPartnerAdminReleaseNote,
  parseQaReleaseHistory,
  partnerAdminReleaseNotes,
  readQaReleaseHistory,
} from '../services/qaReleaseHistory.js';

describe('parseQaReleaseHistory', () => {
  it('keeps version, date, and changelog sections in order', () => {
    const entries = parseQaReleaseHistory(`
## [Unreleased]

### Fixed

- Super admins can create QA accounts

## [0.86.1] — 2026-10-17

### Fixed

- Developer version stays on the deployed release

## [0.86.0] — 2026-10-17

### Added

- Downloads page

### Changed

- Home search card stays rounded
`);

    expect(entries.map((entry) => entry.version)).toEqual(['Unreleased', '0.86.1', '0.86.0']);
    expect(entries[1]?.date).toBe('2026-10-17');
    expect(entries[2]?.changes).toEqual([
      { section: 'Added', text: 'Downloads page' },
      { section: 'Changed', text: 'Home search card stays rounded' },
    ]);
  });

  it('keeps partner and admin notes and drops diner-only and deploy notes', () => {
    expect(isPartnerAdminReleaseNote('Fixed', 'Partner Hub sidebar opens as a full menu')).toBe(
      true,
    );
    expect(isPartnerAdminReleaseNote('Fixed', 'Admin Invoices amount column typing')).toBe(true);
    expect(
      isPartnerAdminReleaseNote('Changed', 'Home search card on smaller screens keeps its card'),
    ).toBe(false);
    expect(isPartnerAdminReleaseNote('Docs', 'Diner web notes for Play links')).toBe(false);
    expect(
      isPartnerAdminReleaseNote(
        'Fixed',
        'API TypeScript build: invoice PDF export (unblocks Dokku deploy)',
      ),
    ).toBe(false);
    expect(
      isPartnerAdminReleaseNote(
        'Added',
        'Diner site and Partner Hub link to the Android apps',
      ),
    ).toBe(true);

    const notes = partnerAdminReleaseNotes(
      parseQaReleaseHistory(`
## [Unreleased]

### Fixed

- Viewing as QA opens the checklist

## [0.86.1] — 2026-10-17

### Fixed

- Home search card stays rounded
`),
    );
    expect(notes.version).toBe('0.86.1');
    expect(notes.releases.map((entry) => entry.version)).toEqual(['Unreleased']);
  });

  it('reads the repo changelog and includes the latest release', () => {
    const entries = readQaReleaseHistory();
    expect(entries.some((entry) => entry.version === '0.87.0')).toBe(true);
    expect(entries[0]?.version).toBe('0.87.1');
  });
});
