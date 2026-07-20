import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
  SUPPORT_TICKET_SUBJECTS,
} from '@reservations/shared';

export const STATUS_COLORS: Record<string, string> = {
  open: 'red',
  in_progress: 'gold',
  waiting: 'blue',
  resolved: 'green',
  closed: 'default',
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'default',
  normal: 'blue',
  high: 'orange',
  urgent: 'red',
};

export const STATUS_OPTIONS = SUPPORT_TICKET_STATUSES.map((value) => ({
  value,
  label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
}));

export const PRIORITY_OPTIONS = SUPPORT_TICKET_PRIORITIES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

export const CATEGORY_OPTIONS = SUPPORT_TICKET_CATEGORIES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

export const SUBJECT_OPTIONS = SUPPORT_TICKET_SUBJECTS.map((s) => ({
  value: s.key,
  label: s.label,
  category: s.category,
}));

export function personLabel(p?: {
  firstName?: string;
  lastName?: string;
  email?: string | null;
} | null) {
  if (!p) return '—';
  const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
  return name || p.email || '—';
}

export function formatEventLabel(event: {
  type: string;
  field?: string | null;
  from?: string | null;
  to?: string | null;
  message?: string | null;
}) {
  switch (event.type) {
    case 'created':
      return event.message || 'Ticket created';
    case 'status_changed':
      return `Status: ${event.from ?? '—'} → ${event.to ?? '—'}`;
    case 'priority_changed':
      return `Priority: ${event.from ?? '—'} → ${event.to ?? '—'}`;
    case 'category_changed':
      return `Category: ${event.from ?? '—'} → ${event.to ?? '—'}`;
    case 'subject_changed':
      return `Subject: ${event.from ?? '—'} → ${event.to ?? '—'}`;
    case 'assignee_changed':
      return event.to ? 'Assignee updated' : 'Assignee cleared';
    case 'restaurant_changed':
      return event.to ? 'Restaurant updated' : 'Restaurant cleared';
    case 'requester_changed':
      return event.to ? 'Requester updated' : 'Requester cleared';
    case 'note_added':
      return event.message ? `Note: ${event.message}` : 'Internal note added';
    case 'note_updated':
      return event.message ? `Note edited: ${event.message}` : 'Note edited';
    case 'note_deleted':
      return event.message ? `Note deleted: ${event.message}` : 'Note deleted';
    case 'attachment_added':
      return event.message ? `Attachment added: ${event.message}` : 'Attachment added';
    case 'attachment_updated':
      return event.from && event.to
        ? `Attachment renamed: ${event.from} → ${event.to}`
        : event.message
          ? `Attachment updated: ${event.message}`
          : 'Attachment updated';
    case 'attachment_removed':
      return event.message ? `Attachment removed: ${event.message}` : 'Attachment removed';
    default:
      return event.message || event.type.replace(/_/g, ' ');
  }
}

export function canManageOwnedItem(opts: {
  currentUserId?: string | null;
  currentUserRole?: string | null;
  ownerId?: string | null;
}) {
  if (!opts.currentUserId) return false;
  if (opts.currentUserRole === 'admin') return true;
  return Boolean(opts.ownerId && opts.ownerId === opts.currentUserId);
}

export function formatBytes(size?: number | null) {
  if (size == null) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
