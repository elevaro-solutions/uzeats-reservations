import { AuditLog } from '../models/AuditLog.js';

export async function logAudit(input: {
  actorId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
}) {
  return AuditLog.create(input);
}
