import { uploadKeyPrefix } from '@reservations/shared';

/** Filename under the legacy flat `uploads/` prefix. Nested keys are not legacy. */
export function legacyUploadsFilename(key: string): string | null {
  if (!key.startsWith('uploads/') || key.includes('..')) return null;
  const name = key.slice('uploads/'.length);
  if (!name || name.includes('/') || name === '.' || name === '..') return null;
  return name;
}

/** Keep the original filename so a retried copy lands on the same destination key. */
export function migratedObjectKey(prefix: string, legacyKey: string): string {
  const name = legacyUploadsFilename(legacyKey);
  if (!name) throw new Error(`Not a legacy uploads object: ${legacyKey}`);
  if (!prefix.endsWith('/')) throw new Error('Folder prefix must end with /');
  return `${prefix}${name}`;
}

/**
 * One legacy object referenced from more than one folder is copied once to
 * `platform/imports/` and every reference is pointed at that copy.
 */
export function chooseMigrationPrefix(prefixes: Iterable<string>): string {
  const unique = [...new Set(prefixes)].filter(Boolean);
  if (unique.length === 1) return unique[0]!;
  return uploadKeyPrefix({ scope: 'platform', kind: 'imports' });
}

function isBsonValue(value: object): boolean {
  return typeof (value as { _bsontype?: unknown })._bsontype === 'string';
}

/**
 * Replace exact legacy URLs and object keys. Longer strings (blog HTML) are
 * updated when they contain a full legacy URL. Bare keys are not substituted
 * inside unrelated text.
 */
export function rewriteStoredValue(
  value: unknown,
  urlMap: ReadonlyMap<string, string>,
  keyMap: ReadonlyMap<string, string>,
): { value: unknown; changed: boolean } {
  if (typeof value === 'string') {
    const exactUrl = urlMap.get(value);
    if (exactUrl && exactUrl !== value) return { value: exactUrl, changed: true };
    const exactKey = keyMap.get(value);
    if (exactKey && exactKey !== value) return { value: exactKey, changed: true };
    if (!value.includes('://')) return { value, changed: false };
    let next = value;
    let changed = false;
    for (const [from, to] of urlMap) {
      if (from !== to && next.includes(from)) {
        next = next.split(from).join(to);
        changed = true;
      }
    }
    return { value: next, changed };
  }
  if (value instanceof Date) return { value, changed: false };
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const rewritten = rewriteStoredValue(item, urlMap, keyMap);
      if (rewritten.changed) changed = true;
      return rewritten.value;
    });
    return { value: changed ? next : value, changed };
  }
  if (value && typeof value === 'object') {
    if (isBsonValue(value)) return { value, changed: false };
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      const rewritten = rewriteStoredValue(item, urlMap, keyMap);
      next[key] = rewritten.value;
      if (rewritten.changed) changed = true;
    }
    return { value: changed ? next : value, changed };
  }
  return { value, changed: false };
}
