import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, '../../../../');

export type QaReleaseChange = {
  section: string;
  text: string;
};

export type QaReleaseHistoryEntry = {
  version: string;
  date: string;
  changes: QaReleaseChange[];
};

const HEADER = /^## \[([^\]]+)\](?:\s+[—–-]\s+(.+))?$/;
const SECTION = /^###\s+(.+)$/;
const BULLET = /^-\s+(.+)$/;

/** Keep a Changelog sections, oldest last. Unreleased is included when it has bullets. */
export function parseQaReleaseHistory(markdown: string): QaReleaseHistoryEntry[] {
  const entries: QaReleaseHistoryEntry[] = [];
  let current: QaReleaseHistoryEntry | null = null;
  let section = 'Changed';

  for (const line of markdown.split('\n')) {
    const header = line.match(HEADER);
    if (header) {
      if (current && (current.version !== 'Unreleased' || current.changes.length > 0)) {
        entries.push(current);
      }
      const version = header[1]?.trim();
      if (!version) continue;
      current = {
        version,
        date: (header[2] ?? '').trim(),
        changes: [],
      };
      section = 'Changed';
      continue;
    }
    if (!current) continue;
    const sectionMatch = line.match(SECTION);
    const heading = sectionMatch?.[1]?.trim();
    if (heading) {
      section = heading;
      continue;
    }
    const text = line.match(BULLET)?.[1]?.trim();
    if (text) current.changes.push({ section, text });
  }

  if (current && (current.version !== 'Unreleased' || current.changes.length > 0)) {
    entries.push(current);
  }
  return entries;
}

export function readQaReleaseHistory(): QaReleaseHistoryEntry[] {
  try {
    const markdown = readFileSync(resolve(repoRoot, 'CHANGELOG.md'), 'utf-8');
    return parseQaReleaseHistory(markdown);
  } catch {
    return [];
  }
}

const PRODUCT_SECTIONS = new Set(['Added', 'Changed', 'Fixed', 'Removed']);

/** Deploy and typecheck notes are not product changes for partners or admins. */
const INTERNAL_NOTE = /\b(typescript build|dokku)\b/i;

/** Diner site, store listings, and home-page layout. Kept when the same line is also for Partner Hub or Admin. */
const DINER_NOTE =
  /\b(diner (site|web|app|ios|android)|home search|home restaurant|home no longer|phone restaurant|downloads page|google play|app store|iphone apps|ipad)\b/i;

const PARTNER_ADMIN_NOTE =
  /\b(partner hub|partner app|partners?\b|admins?\b|owners?\b|platform|dashboard|billing|qa checklist|\bqa\b)\b/i;

export function isPartnerAdminReleaseNote(section: string, text: string): boolean {
  if (!PRODUCT_SECTIONS.has(section)) return false;
  if (INTERNAL_NOTE.test(text)) return false;
  if (DINER_NOTE.test(text) && !PARTNER_ADMIN_NOTE.test(text)) return false;
  return true;
}

/** Newest partner and admin notes, plus the shipped version (skips Unreleased). */
export function partnerAdminReleaseNotes(
  entries: QaReleaseHistoryEntry[],
  limit?: number,
): { version: string; releases: QaReleaseHistoryEntry[] } {
  const matched = entries
    .map((entry) => ({
      ...entry,
      changes: entry.changes.filter((change) =>
        isPartnerAdminReleaseNote(change.section, change.text),
      ),
    }))
    .filter((entry) => entry.changes.length > 0);
  const releases = typeof limit === 'number' ? matched.slice(0, Math.max(0, limit)) : matched;

  const shipped = entries.find((entry) => entry.version !== 'Unreleased')?.version ?? '0.0.0';
  return { version: shipped, releases };
}
