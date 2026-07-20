import { SUPPORT_TICKET_SUBJECTS } from '@reservations/shared';
import { SupportTicket } from '../models/SupportTicket.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { Review } from '../models/Review.js';
import { Message } from '../models/Message.js';
import { Invoice } from '../models/Invoice.js';

type TimelineEventInput = {
  type: string;
  field?: string;
  from?: string | null;
  to?: string | null;
  message?: string;
  actorId: string;
};

function pushEvent(doc: any, event: TimelineEventInput) {
  doc.events.push({
    type: event.type,
    field: event.field,
    from: event.from ?? undefined,
    to: event.to ?? undefined,
    message: event.message,
    actorId: event.actorId,
    createdAt: new Date(),
  });
}

function resolveSubject(input: { subject?: string; subjectKey?: string }) {
  if (input.subjectKey) {
    const preset = SUPPORT_TICKET_SUBJECTS.find((s) => s.key === input.subjectKey);
    if (!preset) throw new Error('Invalid support subject');
    return {
      subjectKey: preset.key,
      subject: input.subject?.trim() || preset.label,
      category: preset.category,
    };
  }
  if (!input.subject?.trim()) throw new Error('Subject is required');
  return {
    subjectKey: undefined as string | undefined,
    subject: input.subject.trim(),
    category: undefined as string | undefined,
  };
}

function mapNote(n: any) {
  return {
    id: n._id?.toString?.() ?? String(n._id),
    body: n.body,
    authorId: n.authorId.toString(),
    createdAt: n.createdAt,
    updatedAt: n.updatedAt ?? null,
  };
}

function mapAttachment(a: any) {
  return {
    id: a._id?.toString?.() ?? String(a._id),
    url: a.url,
    key: a.key ?? null,
    filename: a.filename,
    contentType: a.contentType,
    size: a.size ?? null,
    uploadedById: a.uploadedById.toString(),
    createdAt: a.createdAt,
  };
}

function mapEvent(e: any) {
  return {
    id: e._id?.toString?.() ?? String(e._id),
    type: e.type,
    field: e.field ?? null,
    from: e.from ?? null,
    to: e.to ?? null,
    message: e.message ?? null,
    actorId: e.actorId.toString(),
    createdAt: e.createdAt,
  };
}

export function mapSupportTicket(doc: any) {
  return {
    id: doc._id.toString(),
    subject: doc.subject,
    subjectKey: doc.subjectKey ?? null,
    description: doc.description ?? '',
    status: doc.status,
    priority: doc.priority,
    category: doc.category,
    requesterId: doc.requesterId?.toString() ?? null,
    restaurantId: doc.restaurantId?.toString() ?? null,
    assigneeId: doc.assigneeId?.toString() ?? null,
    notes: (doc.notes ?? []).map(mapNote),
    attachments: (doc.attachments ?? []).map(mapAttachment),
    events: (doc.events ?? []).map(mapEvent),
    firstResponseAt: doc.firstResponseAt ?? null,
    resolvedAt: doc.resolvedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function enrichTickets(mapped: ReturnType<typeof mapSupportTicket>[]) {
  const userIds = new Set<string>();
  const restaurantIds = new Set<string>();
  for (const t of mapped) {
    if (t.requesterId) userIds.add(t.requesterId);
    if (t.assigneeId) userIds.add(t.assigneeId);
    if (t.restaurantId) restaurantIds.add(t.restaurantId);
    for (const n of t.notes) userIds.add(n.authorId);
    for (const a of t.attachments) userIds.add(a.uploadedById);
    for (const e of t.events) userIds.add(e.actorId);
  }

  const [users, restaurants] = await Promise.all([
    User.find({ _id: { $in: [...userIds] } }).select('firstName lastName email role'),
    Restaurant.find({ _id: { $in: [...restaurantIds] } }).select('name status'),
  ]);

  const userById = new Map(
    users.map((u) => [
      u._id.toString(),
      {
        id: u._id.toString(),
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email ?? null,
        role: u.role,
      },
    ]),
  );
  const restById = new Map(
    restaurants.map((r) => [
      r._id.toString(),
      {
        id: r._id.toString(),
        name: r.name,
        status: r.status,
      },
    ]),
  );

  return mapped.map((t) => ({
    ...t,
    requester: t.requesterId ? (userById.get(t.requesterId) ?? null) : null,
    assignee: t.assigneeId ? (userById.get(t.assigneeId) ?? null) : null,
    restaurant: t.restaurantId ? (restById.get(t.restaurantId) ?? null) : null,
    notes: t.notes.map((n: ReturnType<typeof mapNote>) => ({
      ...n,
      author: userById.get(n.authorId) ?? null,
    })),
    attachments: t.attachments.map((a: ReturnType<typeof mapAttachment>) => ({
      ...a,
      uploadedBy: userById.get(a.uploadedById) ?? null,
    })),
    events: t.events.map((e: ReturnType<typeof mapEvent>) => ({
      ...e,
      actor: userById.get(e.actorId) ?? null,
    })),
  }));
}

export async function listSupportTickets(input: {
  status?: string;
  assigneeId?: string;
  restaurantId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(input.limit ?? 50, 200);
  const offset = input.offset ?? 0;
  const filter: Record<string, unknown> = {};
  if (input.status) filter.status = input.status;
  if (input.assigneeId) filter.assigneeId = input.assigneeId;
  if (input.restaurantId) filter.restaurantId = input.restaurantId;
  if (input.search?.trim()) {
    filter.subject = { $regex: input.search.trim(), $options: 'i' };
  }
  const [items, total] = await Promise.all([
    SupportTicket.find(filter).sort({ updatedAt: -1 }).skip(offset).limit(limit),
    SupportTicket.countDocuments(filter),
  ]);
  const mapped = items.map(mapSupportTicket);
  return { total, items: await enrichTickets(mapped) };
}

export async function getSupportTicket(id: string) {
  const doc = await SupportTicket.findById(id);
  if (!doc) throw new Error('Ticket not found');
  const [enriched] = await enrichTickets([mapSupportTicket(doc)]);
  return enriched;
}

export async function createSupportTicket(input: {
  subject?: string;
  subjectKey?: string;
  description?: string;
  priority?: string;
  category?: string;
  requesterId?: string;
  restaurantId?: string;
  assigneeId?: string;
  note?: string;
  authorId: string;
}) {
  const resolved = resolveSubject({
    subject: input.subject,
    subjectKey: input.subjectKey,
  });
  const notes = input.note
    ? [{ body: input.note, authorId: input.authorId, createdAt: new Date() }]
    : [];
  const now = new Date();
  const doc = await SupportTicket.create({
    subject: resolved.subject,
    subjectKey: resolved.subjectKey,
    description: input.description?.trim() ?? '',
    priority: input.priority ?? 'normal',
    category: input.category ?? resolved.category ?? 'other',
    requesterId: input.requesterId,
    restaurantId: input.restaurantId,
    assigneeId: input.assigneeId,
    notes,
    attachments: [],
    events: [
      {
        type: 'created',
        message: `Ticket created: ${resolved.subject}`,
        actorId: input.authorId,
        createdAt: now,
      },
      ...(input.assigneeId
        ? [
            {
              type: 'assignee_changed',
              field: 'assigneeId',
              to: input.assigneeId,
              actorId: input.authorId,
              createdAt: now,
            },
          ]
        : []),
      ...(input.note
        ? [
            {
              type: 'note_added',
              message: 'Initial note added',
              actorId: input.authorId,
              createdAt: now,
            },
          ]
        : []),
    ],
    firstResponseAt: input.note ? now : undefined,
  });
  const [enriched] = await enrichTickets([mapSupportTicket(doc)]);
  return enriched;
}

export async function updateSupportTicket(
  id: string,
  input: {
    status?: string;
    priority?: string;
    category?: string;
    subject?: string;
    subjectKey?: string | null;
    description?: string;
    assigneeId?: string | null;
    restaurantId?: string | null;
    requesterId?: string | null;
  },
  actorId: string,
) {
  const doc = await SupportTicket.findById(id);
  if (!doc) throw new Error('Ticket not found');

  if (input.subjectKey !== undefined || input.subject !== undefined) {
    if (input.subjectKey === null) {
      if (input.subject !== undefined) {
        const from = doc.subject;
        doc.subjectKey = undefined as any;
        doc.subject = input.subject.trim();
        if (from !== doc.subject) {
          pushEvent(doc, {
            type: 'subject_changed',
            field: 'subject',
            from,
            to: doc.subject,
            actorId,
          });
        }
      }
    } else if (input.subjectKey || input.subject) {
      const resolved = resolveSubject({
        subject: input.subject ?? doc.subject,
        subjectKey: input.subjectKey ?? doc.subjectKey ?? undefined,
      });
      const from = doc.subject;
      const fromKey = doc.subjectKey ?? null;
      doc.subject = resolved.subject;
      doc.subjectKey = resolved.subjectKey as any;
      if (resolved.category && input.category === undefined) {
        doc.category = resolved.category as any;
      }
      if (from !== doc.subject || fromKey !== (doc.subjectKey ?? null)) {
        pushEvent(doc, {
          type: 'subject_changed',
          field: 'subject',
          from,
          to: doc.subject,
          actorId,
        });
      }
    }
  }

  if (input.description !== undefined) {
    doc.description = input.description.trim();
  }

  if (input.status !== undefined && input.status !== doc.status) {
    pushEvent(doc, {
      type: 'status_changed',
      field: 'status',
      from: doc.status,
      to: input.status,
      actorId,
    });
    doc.status = input.status as any;
    if (['resolved', 'closed'].includes(input.status) && !doc.resolvedAt) {
      doc.resolvedAt = new Date();
    }
  }

  if (input.priority !== undefined && input.priority !== doc.priority) {
    pushEvent(doc, {
      type: 'priority_changed',
      field: 'priority',
      from: doc.priority,
      to: input.priority,
      actorId,
    });
    doc.priority = input.priority as any;
  }

  if (input.category !== undefined && input.category !== doc.category) {
    pushEvent(doc, {
      type: 'category_changed',
      field: 'category',
      from: doc.category,
      to: input.category,
      actorId,
    });
    doc.category = input.category as any;
  }

  if (input.assigneeId !== undefined) {
    const next = input.assigneeId || null;
    const prev = doc.assigneeId?.toString() ?? null;
    if (next !== prev) {
      pushEvent(doc, {
        type: 'assignee_changed',
        field: 'assigneeId',
        from: prev,
        to: next,
        actorId,
      });
      doc.assigneeId = next ? (next as any) : undefined;
    }
  }

  if (input.restaurantId !== undefined) {
    const next = input.restaurantId || null;
    const prev = doc.restaurantId?.toString() ?? null;
    if (next !== prev) {
      pushEvent(doc, {
        type: 'restaurant_changed',
        field: 'restaurantId',
        from: prev,
        to: next,
        actorId,
      });
      doc.restaurantId = next ? (next as any) : undefined;
    }
  }

  if (input.requesterId !== undefined) {
    const next = input.requesterId || null;
    const prev = doc.requesterId?.toString() ?? null;
    if (next !== prev) {
      pushEvent(doc, {
        type: 'requester_changed',
        field: 'requesterId',
        from: prev,
        to: next,
        actorId,
      });
      doc.requesterId = next ? (next as any) : undefined;
    }
  }

  await doc.save();
  const [enriched] = await enrichTickets([mapSupportTicket(doc)]);
  return enriched;
}

export async function addSupportNote(ticketId: string, authorId: string, body: string) {
  const doc = await SupportTicket.findById(ticketId);
  if (!doc) throw new Error('Ticket not found');
  doc.notes.push({ body, authorId: authorId as any, createdAt: new Date() } as any);
  pushEvent(doc, {
    type: 'note_added',
    message: body.slice(0, 120),
    actorId: authorId,
  });
  if (!doc.firstResponseAt) doc.firstResponseAt = new Date();
  if (doc.status === 'open') {
    pushEvent(doc, {
      type: 'status_changed',
      field: 'status',
      from: 'open',
      to: 'in_progress',
      actorId: authorId,
    });
    doc.status = 'in_progress';
  }
  await doc.save();
  const [enriched] = await enrichTickets([mapSupportTicket(doc)]);
  return enriched;
}

function assertCanManageOwnedResource(opts: {
  actorId: string;
  actorRole: string;
  ownerId: string;
  resource: string;
}) {
  if (opts.actorRole === 'admin') return;
  if (opts.actorId === opts.ownerId) return;
  throw new Error(`Only an admin or the ${opts.resource} owner can perform this action`);
}

export async function updateSupportNote(
  ticketId: string,
  noteId: string,
  body: string,
  actor: { id: string; role: string },
) {
  const doc = await SupportTicket.findById(ticketId);
  if (!doc) throw new Error('Ticket not found');
  const note = (doc.notes as any[]).find((n) => n._id?.toString() === noteId);
  if (!note) throw new Error('Note not found');
  assertCanManageOwnedResource({
    actorId: actor.id,
    actorRole: actor.role,
    ownerId: note.authorId.toString(),
    resource: 'note',
  });
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Note body is required');
  const from = note.body;
  note.body = trimmed;
  note.updatedAt = new Date();
  pushEvent(doc, {
    type: 'note_updated',
    message: trimmed.slice(0, 120),
    from: from.slice(0, 120),
    to: trimmed.slice(0, 120),
    actorId: actor.id,
  });
  await doc.save();
  const [enriched] = await enrichTickets([mapSupportTicket(doc)]);
  return enriched;
}

export async function deleteSupportNote(
  ticketId: string,
  noteId: string,
  actor: { id: string; role: string },
) {
  const doc = await SupportTicket.findById(ticketId);
  if (!doc) throw new Error('Ticket not found');
  const note = (doc.notes as any[]).find((n) => n._id?.toString() === noteId);
  if (!note) throw new Error('Note not found');
  assertCanManageOwnedResource({
    actorId: actor.id,
    actorRole: actor.role,
    ownerId: note.authorId.toString(),
    resource: 'note',
  });
  const preview = String(note.body).slice(0, 120);
  doc.notes = (doc.notes as any[]).filter((n) => n._id?.toString() !== noteId) as any;
  pushEvent(doc, {
    type: 'note_deleted',
    message: preview,
    actorId: actor.id,
  });
  await doc.save();
  const [enriched] = await enrichTickets([mapSupportTicket(doc)]);
  return enriched;
}

export async function addSupportAttachment(
  ticketId: string,
  actorId: string,
  input: {
    url: string;
    key?: string;
    filename: string;
    contentType: string;
    size?: number;
  },
) {
  const doc = await SupportTicket.findById(ticketId);
  if (!doc) throw new Error('Ticket not found');
  doc.attachments.push({
    url: input.url,
    key: input.key,
    filename: input.filename,
    contentType: input.contentType,
    size: input.size,
    uploadedById: actorId as any,
    createdAt: new Date(),
  } as any);
  pushEvent(doc, {
    type: 'attachment_added',
    message: input.filename,
    to: input.url,
    actorId,
  });
  await doc.save();
  const [enriched] = await enrichTickets([mapSupportTicket(doc)]);
  return enriched;
}

export async function updateSupportAttachment(
  ticketId: string,
  attachmentId: string,
  input: { filename: string },
  actor: { id: string; role: string },
) {
  const doc = await SupportTicket.findById(ticketId);
  if (!doc) throw new Error('Ticket not found');
  const attachment = (doc.attachments as any[]).find(
    (a) => a._id?.toString() === attachmentId,
  );
  if (!attachment) throw new Error('Attachment not found');
  assertCanManageOwnedResource({
    actorId: actor.id,
    actorRole: actor.role,
    ownerId: attachment.uploadedById.toString(),
    resource: 'attachment',
  });
  const nextName = input.filename.trim();
  if (!nextName) throw new Error('Filename is required');
  const from = attachment.filename;
  attachment.filename = nextName;
  pushEvent(doc, {
    type: 'attachment_updated',
    field: 'filename',
    from,
    to: nextName,
    message: nextName,
    actorId: actor.id,
  });
  await doc.save();
  const [enriched] = await enrichTickets([mapSupportTicket(doc)]);
  return enriched;
}

export async function removeSupportAttachment(
  ticketId: string,
  attachmentId: string,
  actor: { id: string; role: string },
) {
  const doc = await SupportTicket.findById(ticketId);
  if (!doc) throw new Error('Ticket not found');
  const attachment = (doc.attachments as any[]).find(
    (a) => a._id?.toString() === attachmentId,
  );
  if (!attachment) throw new Error('Attachment not found');
  assertCanManageOwnedResource({
    actorId: actor.id,
    actorRole: actor.role,
    ownerId: attachment.uploadedById.toString(),
    resource: 'attachment',
  });
  const filename = attachment.filename;
  doc.attachments = (doc.attachments as any[]).filter(
    (a) => a._id?.toString() !== attachmentId,
  ) as any;
  pushEvent(doc, {
    type: 'attachment_removed',
    message: filename,
    actorId: actor.id,
  });
  await doc.save();
  const [enriched] = await enrichTickets([mapSupportTicket(doc)]);
  return enriched;
}

export async function getChurnAlerts() {
  const [pastDue, cancelled, trialsEnding] = await Promise.all([
    Subscription.find({ status: 'past_due' }).sort({ updatedAt: -1 }).limit(100),
    Subscription.find({
      status: 'cancelled',
      cancelledAt: { $gte: new Date(Date.now() - 30 * 86_400_000) },
    })
      .sort({ cancelledAt: -1 })
      .limit(100),
    Subscription.find({
      status: 'trialing',
      trialEndsAt: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 86_400_000),
      },
    })
      .sort({ trialEndsAt: 1 })
      .limit(100),
  ]);

  const restaurantIds = [
    ...pastDue,
    ...cancelled,
    ...trialsEnding,
  ].map((s) => s.restaurantId.toString());
  const restaurants = await Restaurant.find({ _id: { $in: restaurantIds } }).select('name');
  const nameById = new Map(restaurants.map((r) => [r._id.toString(), r.name]));

  const mapSub = (s: any, alertType: string) => ({
    id: s._id.toString(),
    alertType,
    restaurantId: s.restaurantId.toString(),
    restaurantName: nameById.get(s.restaurantId.toString()) ?? null,
    plan: s.plan,
    status: s.status,
    monthlyPriceCents: s.monthlyPriceCents,
    trialEndsAt: s.trialEndsAt ?? null,
    cancelledAt: s.cancelledAt ?? null,
    updatedAt: s.updatedAt,
  });

  return [
    ...pastDue.map((s) => mapSub(s, 'past_due')),
    ...cancelled.map((s) => mapSub(s, 'cancelled')),
    ...trialsEnding.map((s) => mapSub(s, 'trial_ending')),
  ];
}

export async function getSlaMetrics() {
  const now = new Date();
  const day30 = new Date(now.getTime() - 30 * 86_400_000);

  const [
    pendingRestaurants,
    approvedRecently,
    openTickets,
    ticketsResolved,
    ticketsWithResponse,
    flaggedReviews,
    flaggedMessages,
    overdueInvoices,
  ] = await Promise.all([
    Restaurant.find({ status: 'pending' }).select('createdAt name'),
    Restaurant.find({
      status: 'approved',
      updatedAt: { $gte: day30 },
    }).select('createdAt updatedAt'),
    SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress', 'waiting'] } }),
    SupportTicket.find({
      resolvedAt: { $gte: day30 },
    }).select('createdAt resolvedAt firstResponseAt'),
    SupportTicket.find({
      firstResponseAt: { $gte: day30 },
    }).select('createdAt firstResponseAt'),
    Review.countDocuments({ flagged: true, hidden: { $ne: true } }),
    Message.countDocuments({ flagged: true }),
    Invoice.countDocuments({ status: { $in: ['overdue', 'pending'] } }),
  ]);

  const approvalHours = approvedRecently
    .map((r) => {
      const created = (r as any).createdAt?.getTime?.() ?? 0;
      const updated = (r as any).updatedAt?.getTime?.() ?? 0;
      return created && updated ? (updated - created) / 3_600_000 : null;
    })
    .filter((h): h is number => h != null);

  const responseHours = ticketsWithResponse
    .map((t) => {
      const created = (t as any).createdAt?.getTime?.() ?? 0;
      const first = t.firstResponseAt?.getTime?.() ?? 0;
      return created && first ? (first - created) / 3_600_000 : null;
    })
    .filter((h): h is number => h != null);

  const resolveHours = ticketsResolved
    .map((t) => {
      const created = (t as any).createdAt?.getTime?.() ?? 0;
      const resolved = t.resolvedAt?.getTime?.() ?? 0;
      return created && resolved ? (resolved - created) / 3_600_000 : null;
    })
    .filter((h): h is number => h != null);

  const avg = (arr: number[]) =>
    arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

  const oldestPendingHours = pendingRestaurants.length
    ? Math.max(
        ...pendingRestaurants.map((r) => {
          const created = (r as any).createdAt?.getTime?.() ?? now.getTime();
          return (now.getTime() - created) / 3_600_000;
        }),
      )
    : 0;

  return {
    pendingRestaurantApprovals: pendingRestaurants.length,
    oldestPendingApprovalHours: Math.round(oldestPendingHours * 10) / 10,
    avgApprovalHoursLast30d: avg(approvalHours),
    openSupportTickets: openTickets,
    avgFirstResponseHoursLast30d: avg(responseHours),
    avgResolutionHoursLast30d: avg(resolveHours),
    flaggedReviews,
    flaggedMessages,
    overdueOrPendingInvoices: overdueInvoices,
  };
}

export async function listFlaggedContent(limit = 50) {
  const [reviews, messages] = await Promise.all([
    Review.find({ flagged: true }).sort({ flaggedAt: -1 }).limit(limit),
    Message.find({ flagged: true }).sort({ flaggedAt: -1 }).limit(limit),
  ]);

  const userIds = [
    ...reviews.map((r) => r.dinerId.toString()),
    ...messages.map((m) => m.senderId.toString()),
  ];
  const restaurantIds = [
    ...reviews.map((r) => r.restaurantId.toString()),
    ...messages.map((m) => m.restaurantId.toString()),
  ];
  const [users, restaurants] = await Promise.all([
    User.find({ _id: { $in: userIds } }).select('firstName lastName email'),
    Restaurant.find({ _id: { $in: restaurantIds } }).select('name'),
  ]);
  const userById = new Map(
    users.map((u) => [u._id.toString(), `${u.firstName} ${u.lastName}`]),
  );
  const restById = new Map(restaurants.map((r) => [r._id.toString(), r.name]));

  return {
    reviews: reviews.map((r) => ({
      id: r._id.toString(),
      type: 'review' as const,
      restaurantId: r.restaurantId.toString(),
      restaurantName: restById.get(r.restaurantId.toString()) ?? null,
      authorName: userById.get(r.dinerId.toString()) ?? null,
      body: r.comment || `(${r.rating}★)`,
      rating: r.rating,
      hidden: Boolean(r.hidden),
      flagReason: (r as any).flagReason ?? null,
      flaggedAt: (r as any).flaggedAt ?? null,
      createdAt: (r as any).createdAt,
    })),
    messages: messages.map((m) => ({
      id: m._id.toString(),
      type: 'message' as const,
      restaurantId: m.restaurantId.toString(),
      restaurantName: restById.get(m.restaurantId.toString()) ?? null,
      authorName: userById.get(m.senderId.toString()) ?? null,
      body: m.body,
      hidden: Boolean((m as any).hidden),
      flagReason: (m as any).flagReason ?? null,
      flaggedAt: (m as any).flaggedAt ?? null,
      createdAt: (m as any).createdAt,
    })),
  };
}
