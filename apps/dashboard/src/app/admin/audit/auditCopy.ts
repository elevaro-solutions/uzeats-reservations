export type AuditLogCopySource = {
  id: string;
  createdAt: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  ip?: string | null;
  actorId: string;
  details?: string | null;
  actor?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    role?: string | null;
  } | null;
};

export function parseAuditDetails(raw?: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function formatAuditDetails(raw?: string | null): string {
  const parsed = parseAuditDetails(raw);
  if (parsed == null) return '';
  if (typeof parsed === 'string') return parsed;
  return JSON.stringify(parsed, null, 2);
}

export function buildAuditCopyPayload(log: AuditLogCopySource) {
  return {
    id: log.id,
    createdAt: log.createdAt,
    action: log.action,
    resource: log.resource,
    resourceId: log.resourceId ?? null,
    ip: log.ip ?? null,
    actorId: log.actorId,
    actor: log.actor
      ? {
          id: log.actor.id,
          firstName: log.actor.firstName,
          lastName: log.actor.lastName,
          email: log.actor.email ?? null,
          ...(log.actor.role != null ? { role: log.actor.role } : {}),
        }
      : null,
    details: parseAuditDetails(log.details),
  };
}

export function auditCopyText(log: AuditLogCopySource) {
  return JSON.stringify(buildAuditCopyPayload(log), null, 2);
}
