import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ENV_VAR_GROUPS,
  getEnvVarStatuses,
  getMissingRequiredEnvVars,
  type EnvVarGroup,
} from '@reservations/shared';
import { env } from '../config/env.js';

const moduleDir = dirname(fileURLToPath(import.meta.url));

function readAppVersion(): string {
  try {
    const changelog = readFileSync(resolve(moduleDir, '../../../../CHANGELOG.md'), 'utf-8');
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

export interface DeveloperInfo {
  version: string;
  nodeEnv: string;
  envVars: Array<{
    key: string;
    label: string;
    group: EnvVarGroup;
    groupLabel: string;
    requirement: string;
    description?: string;
    configured: boolean;
    applicable: boolean;
    missing: boolean;
  }>;
  missingCount: number;
  requiredMissingCount: number;
}

export function getDeveloperInfo(): DeveloperInfo {
  const source = process.env;
  const statuses = getEnvVarStatuses(source);
  const missingRequired = getMissingRequiredEnvVars(source);
  const nodeEnv = env.NODE_ENV;

  const envVars = statuses.map((row) => ({
    key: row.key,
    label: row.label,
    group: row.group,
    groupLabel: ENV_VAR_GROUPS[row.group],
    requirement: row.requirement,
    description: row.description,
    configured: row.configured,
    applicable: row.applicable,
    missing: row.missing,
  }));

  return {
    version: readAppVersion(),
    nodeEnv,
    envVars,
    missingCount: envVars.filter((v) => v.applicable && !v.configured).length,
    requiredMissingCount: missingRequired.length,
  };
}
