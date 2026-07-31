import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildDeveloperEnvRows,
  ENV_APP_LABELS,
  ENV_VAR_DEFINITIONS,
  getGroupLabel,
  getMissingRequiredEnvVars,
  parseEnvFile,
  type EnvApp,
  type EnvVarGroup,
} from '@reservations/shared';
import { env } from '../config/env.js';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, '../../../../');

function readAppVersion(): string {
  try {
    const changelog = readFileSync(resolve(repoRoot, 'CHANGELOG.md'), 'utf-8');
    const match = changelog.match(/## \[([\d.]+)\]/);
    if (match?.[1]) return match[1];
  } catch {
    // fall through
  }

  try {
    const pkg = JSON.parse(
      readFileSync(resolve(moduleDir, '../../package.json'), 'utf-8'),
    ) as { version?: string };
    if (pkg.version && pkg.version !== '0.0.0') return pkg.version;
  } catch {
    // fall through
  }

  return 'unknown';
}

function readEnvFiles(paths: string[]): Record<string, string> {
  const merged: Record<string, string> = {};

  for (const path of paths) {
    try {
      Object.assign(merged, parseEnvFile(readFileSync(path, 'utf-8')));
    } catch {
      // missing file
    }
  }

  return merged;
}

function buildApiSource(fileEnv: Record<string, string>): Record<string, string | undefined> {
  const source: Record<string, string | undefined> = { ...fileEnv };

  for (const def of ENV_VAR_DEFINITIONS) {
    if (def.apps.includes('api') && process.env[def.key] !== undefined) {
      source[def.key] = process.env[def.key];
    }
  }

  for (const key of Object.keys(fileEnv)) {
    if (process.env[key] !== undefined) source[key] = process.env[key];
  }

  return source;
}

function readAppSources(): Record<EnvApp, Record<string, string | undefined>> {
  const apiFile = readEnvFiles([resolve(repoRoot, 'apps/api/.env')]);

  return {
    api: buildApiSource(apiFile),
    web: readEnvFiles([
      resolve(repoRoot, 'apps/web/.env.local'),
      resolve(repoRoot, 'apps/web/.env'),
    ]),
    dashboard: readEnvFiles([
      resolve(repoRoot, 'apps/dashboard/.env.local'),
      resolve(repoRoot, 'apps/dashboard/.env'),
    ]),
  };
}

export interface DeveloperInfo {
  version: string;
  nodeEnv: string;
  envVars: Array<{
    key: string;
    app: EnvApp;
    appLabel: string;
    label: string;
    group: EnvVarGroup | 'other';
    groupLabel: string;
    requirement: string;
    description?: string;
    value?: string | null;
    configured: boolean;
    applicable: boolean;
    missing: boolean;
  }>;
  missingCount: number;
  requiredMissingCount: number;
}

export function getDeveloperInfo(): DeveloperInfo {
  const sources = readAppSources();
  const nodeEnv = env.NODE_ENV;
  const rows = buildDeveloperEnvRows(sources, nodeEnv);
  const apiMissingRequired = getMissingRequiredEnvVars(sources.api);

  const envVars = rows.map((row) => ({
    key: row.key,
    app: row.app,
    appLabel: ENV_APP_LABELS[row.app],
    label: row.label,
    group: row.group,
    groupLabel: getGroupLabel(row.group),
    requirement: row.requirement,
    description: row.description,
    value: row.value,
    configured: row.configured,
    applicable: row.applicable,
    missing: row.missing,
  }));

  const apiRows = envVars.filter((row) => row.app === 'api');

  return {
    version: readAppVersion(),
    nodeEnv,
    envVars,
    missingCount: apiRows.filter((row) => row.applicable && !row.configured).length,
    requiredMissingCount: apiMissingRequired.length,
  };
}
