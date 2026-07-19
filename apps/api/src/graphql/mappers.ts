import { mapNotificationPreferences } from '../lib/notificationPreferences.js';

function id(doc: { _id: { toString(): string } }) {
  return doc._id.toString();
}

export function mapUser(u: any) {
  return {
    id: id(u),
    email: u.email ?? null,
    phone: u.phone ?? null,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    loyaltyPoints: u.loyaltyPoints ?? 0,
    emailVerified: u.emailVerified ?? false,
    phoneVerified: u.phoneVerified ?? false,
    telegramChatId: u.telegramChatId ?? null,
    notificationPreferences: mapNotificationPreferences(u.notificationPreferences),
    restaurantIds: (u.restaurantIds ?? []).map((x: { toString(): string }) => x.toString()),
    createdAt: u.createdAt,
  };
}

export function mapRestaurant(r: any) {
  return {
    id: id(r),
    name: r.name,
    slug: r.slug,
    description: r.description,
    cuisine: r.cuisine,
    priceRange: r.priceRange,
    address: r.address,
    location: {
      lng: r.location.coordinates[0],
      lat: r.location.coordinates[1],
    },
    phone: r.phone,
    website: r.website,
    photos: r.photos ?? [],
    status: r.status,
    ownerId: r.ownerId.toString(),
    depositRequired: r.depositRequired,
    depositAmountCents: r.depositAmountCents,
    averageRating: r.averageRating ?? 0,
    reviewCount: r.reviewCount ?? 0,
    featured: r.featured ?? false,
    featuredUntil: r.featuredUntil ?? null,
    spendAlertThresholdCents: r.spendAlertThresholdCents ?? 0,
    useSmartAssign: r.useSmartAssign !== false,
    posEnabled: r.posEnabled ?? false,
    widgetTheme: {
      primaryColor: r.widgetTheme?.primaryColor ?? '#c4472f',
      buttonText: r.widgetTheme?.buttonText ?? 'Reserve a table',
      showReviews: r.widgetTheme?.showReviews ?? true,
    },
    createdAt: r.createdAt,
  };
}

export function mapTable(t: any) {
  return {
    id: id(t),
    restaurantId: t.restaurantId.toString(),
    name: t.name,
    minCapacity: t.minCapacity,
    maxCapacity: t.maxCapacity,
    floorArea: t.floorArea,
    combinable: t.combinable,
    active: t.active,
    posX: t.posX ?? 0,
    posY: t.posY ?? 0,
    width: t.width ?? 2,
    height: t.height ?? 2,
    shape: t.shape ?? 'rect',
  };
}

export function mapShift(s: any) {
  return {
    id: id(s),
    restaurantId: s.restaurantId.toString(),
    name: s.name,
    daysOfWeek: s.daysOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    slotIntervalMinutes: s.slotIntervalMinutes,
    turnTimeMinutes: s.turnTimeMinutes,
    active: s.active,
  };
}

export function mapReservation(r: any, clientSecret?: string | null) {
  return {
    id: id(r),
    restaurantId: r.restaurantId.toString(),
    dinerId: r.dinerId.toString(),
    tableIds: r.tableIds.map((x: { toString(): string }) => x.toString()),
    partySize: r.partySize,
    slotStart: r.slotStart,
    slotEnd: r.slotEnd,
    status: r.status,
    occasion: r.occasion,
    guestNotes: r.guestNotes,
    depositAmountCents: r.depositAmountCents,
    depositStatus: r.depositStatus,
    clientSecret: clientSecret ?? null,
    loyaltyPointsEarned: r.loyaltyPointsEarned,
    loyaltyPointsRedeemed: r.loyaltyPointsRedeemed,
    source: r.source ?? 'network',
    totalSpendCents: r.totalSpendCents ?? 0,
    createdAt: r.createdAt,
  };
}

export function mapReview(r: any) {
  return {
    id: r._id.toString(),
    restaurantId: r.restaurantId.toString(),
    dinerId: r.dinerId.toString(),
    reservationId: r.reservationId.toString(),
    rating: r.rating,
    comment: r.comment,
    ownerReply: r.ownerReply ?? null,
    ownerRepliedAt: r.ownerRepliedAt ?? null,
    hidden: r.hidden ?? false,
    createdAt: r.createdAt,
  };
}

export function mapWaitlistEntry(w: any) {
  return {
    id: w._id.toString(),
    restaurantId: w.restaurantId.toString(),
    dinerId: w.dinerId?.toString() ?? null,
    guestName: w.guestName ?? null,
    guestPhone: w.guestPhone ?? null,
    source: w.source ?? 'online',
    quotedWaitMinutes: w.quotedWaitMinutes ?? null,
    partySize: w.partySize,
    preferredDate: w.preferredDate,
    preferredTimeStart: w.preferredTimeStart,
    preferredTimeEnd: w.preferredTimeEnd,
    status: w.status,
    notifiedSlot: w.notifiedSlot,
    createdAt: w.createdAt,
  };
}

export function mapMessage(m: any) {
  return {
    id: m._id.toString(),
    restaurantId: m.restaurantId.toString(),
    dinerId: m.dinerId.toString(),
    reservationId: m.reservationId?.toString() ?? '',
    senderType: m.senderType,
    senderId: m.senderId.toString(),
    body: m.body,
    readAt: m.readAt ?? null,
    createdAt: m.createdAt,
  };
}

export function mapAccessRule(r: any) {
  return {
    id: r._id.toString(),
    restaurantId: r.restaurantId.toString(),
    name: r.name,
    daysOfWeek: r.daysOfWeek ?? [],
    startDate: r.startDate ?? null,
    endDate: r.endDate ?? null,
    startTime: r.startTime ?? null,
    endTime: r.endTime ?? null,
    minPartySize: r.minPartySize ?? null,
    maxPartySize: r.maxPartySize ?? null,
    maxCoversPerSlot: r.maxCoversPerSlot ?? null,
    minAdvanceHours: r.minAdvanceHours ?? null,
    maxAdvanceDays: r.maxAdvanceDays ?? null,
    active: r.active,
    createdAt: r.createdAt,
  };
}

export function mapPromotion(p: any) {
  return {
    id: p._id.toString(),
    restaurantId: p.restaurantId.toString(),
    title: p.title,
    description: p.description ?? null,
    discountPercent: p.discountPercent ?? null,
    code: p.code ?? null,
    startDate: p.startDate ?? null,
    endDate: p.endDate ?? null,
    daysOfWeek: p.daysOfWeek ?? [],
    active: p.active,
    redemptions: p.redemptions ?? 0,
    createdAt: p.createdAt,
  };
}

export function mapBoostCampaign(b: any) {
  return {
    id: b._id.toString(),
    restaurantId: b.restaurantId.toString(),
    name: b.name,
    costPerCoverCents: b.costPerCoverCents,
    budgetCents: b.budgetCents,
    spentCents: b.spentCents ?? 0,
    coversAttributed: b.coversAttributed ?? 0,
    startDate: b.startDate,
    endDate: b.endDate ?? null,
    status: b.status,
    createdAt: b.createdAt,
  };
}

export function mapIntegration(i: any) {
  return {
    id: i._id.toString(),
    restaurantId: i.restaurantId.toString(),
    provider: i.provider,
    name: i.name,
    apiKey: i.apiKey,
    enabled: i.enabled,
    bookingsCount: i.bookingsCount ?? 0,
    lastUsedAt: i.lastUsedAt ?? null,
    createdAt: i.createdAt,
  };
}

export function mapExperience(e: any) {
  return {
    id: e._id.toString(),
    restaurantId: e.restaurantId.toString(),
    title: e.title,
    description: e.description,
    type: e.type,
    photoUrl: e.photoUrl ?? null,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    maxGuests: e.maxGuests,
    ticketPriceCents: e.ticketPriceCents,
    ticketsSold: e.ticketsSold ?? 0,
    availableTickets: e.maxGuests - (e.ticketsSold ?? 0),
    status: e.status,
    includes: e.includes ?? [],
    tags: e.tags ?? [],
    createdAt: e.createdAt,
  };
}

export function mapTicket(t: any, clientSecret?: string | null) {
  return {
    id: t._id.toString(),
    experienceId: t.experienceId.toString(),
    dinerId: t.dinerId.toString(),
    quantity: t.quantity,
    totalPriceCents: t.totalPriceCents,
    stripePaymentIntentId: t.stripePaymentIntentId ?? null,
    status: t.status,
    confirmationCode: t.confirmationCode ?? null,
    clientSecret: clientSecret ?? null,
    createdAt: t.createdAt,
  };
}

export function mapPrivateDiningSpace(s: any) {
  return {
    id: s._id.toString(),
    restaurantId: s.restaurantId.toString(),
    name: s.name,
    description: s.description ?? null,
    minGuests: s.minGuests,
    maxGuests: s.maxGuests,
    rentalFeeCents: s.rentalFeeCents ?? 0,
    minimumSpendCents: s.minimumSpendCents ?? 0,
    photoUrl: s.photoUrl ?? null,
    amenities: s.amenities ?? [],
    active: s.active,
    createdAt: s.createdAt,
  };
}

export function mapPrivateDiningInquiry(i: any) {
  return {
    id: i._id.toString(),
    restaurantId: i.restaurantId.toString(),
    spaceId: i.spaceId?.toString() ?? null,
    dinerId: i.dinerId.toString(),
    eventDate: i.eventDate,
    guestCount: i.guestCount,
    eventType: i.eventType,
    budget: i.budget ?? null,
    specialRequests: i.specialRequests ?? null,
    contactPhone: i.contactPhone ?? null,
    status: i.status,
    restaurantResponse: i.restaurantResponse ?? null,
    createdAt: i.createdAt,
  };
}

export function mapGuestProfile(g: any) {
  return {
    id: g._id.toString(),
    restaurantId: g.restaurantId.toString(),
    dinerId: g.dinerId.toString(),
    tags: g.tags ?? [],
    notes: g.notes ?? '',
    vipStatus: g.vipStatus ?? 'none',
    totalVisits: g.totalVisits ?? 0,
    totalSpendCents: g.totalSpendCents ?? 0,
    averagePartySize: g.averagePartySize ?? 0,
    lastVisitDate: g.lastVisitDate ?? null,
    preferredTable: g.preferredTable ?? null,
    dietaryRestrictions: g.dietaryRestrictions ?? [],
    allergies: g.allergies ?? [],
    occasions: g.occasions ?? [],
    customFields: g.customFields ? JSON.stringify(g.customFields) : null,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

export function mapCampaign(c: any) {
  return {
    id: c._id.toString(),
    restaurantId: c.restaurantId.toString(),
    name: c.name,
    subject: c.subject,
    body: c.body,
    status: c.status,
    targetTags: c.targetTags ?? [],
    targetVipStatus: c.targetVipStatus ?? null,
    scheduledAt: c.scheduledAt ?? null,
    sentAt: c.sentAt ?? null,
    recipientCount: c.recipientCount ?? 0,
    openCount: c.openCount ?? 0,
    clickCount: c.clickCount ?? 0,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export function mapSurveyResponse(s: any) {
  return {
    id: s._id.toString(),
    restaurantId: s.restaurantId.toString(),
    reservationId: s.reservationId.toString(),
    dinerId: s.dinerId.toString(),
    overallRating: s.overallRating ?? null,
    foodRating: s.foodRating ?? null,
    serviceRating: s.serviceRating ?? null,
    ambienceRating: s.ambienceRating ?? null,
    valueRating: s.valueRating ?? null,
    wouldRecommend: s.wouldRecommend ?? null,
    feedback: s.feedback ?? null,
    submittedAt: s.submittedAt,
    createdAt: s.createdAt,
  };
}

export function slugify(name: string) {
  return `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`;
}
