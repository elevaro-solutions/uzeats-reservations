import { mapNotificationPreferences } from '../lib/notificationPreferences.js';
import { resolveReservationConfirmationNumber } from '../lib/reservationConfirmationNumber.js';
import {
  isActiveWaitlistWaitStatus,
  isWaitlistWaitOverdue,
  resolveLoyaltyTier,
  waitlistPromisedMinutes,
  waitlistWaitingMinutes,
} from '@reservations/shared';
import { peekLoyaltyProgram } from '../services/loyaltyProgram.js';

function id(doc: { _id: { toString(): string } }) {
  return doc._id.toString();
}

/** ObjectId or populated doc → hex string (populate breaks bare `.toString()`). */
export function refId(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const obj = value as {
      _id?: { toString(): string };
      toHexString?: () => string;
    };
    if (obj._id != null) return obj._id.toString();
    if (typeof obj.toHexString === 'function') return obj.toHexString();
  }
  const asString = String(value);
  return asString === '[object Object]' ? '' : asString;
}

function mapDinerAddress(address: {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  neighborhood?: string | null;
} | null | undefined) {
  if (!address?.line1 || !address.city || !address.state || !address.zip) return null;
  return {
    line1: address.line1,
    line2: address.line2 ?? null,
    city: address.city,
    state: address.state,
    zip: address.zip,
    country: address.country || 'US',
    neighborhood: address.neighborhood ?? null,
  };
}

export function mapUser(u: any) {
  const visits = u.loyaltyCompletedVisits ?? 0;
  const tier = resolveLoyaltyTier(visits, peekLoyaltyProgram().tiers);
  return {
    id: id(u),
    email: u.email ?? null,
    phone: u.phone ?? null,
    avatarUrl: u.avatarUrl ?? null,
    address: mapDinerAddress(u.address),
    hasPassword: Boolean(u.hasPassword ?? u.passwordHash),
    hasGoogle: Boolean(u.hasGoogle ?? u.googleId),
    firstName: u.firstName,
    lastName: u.lastName ?? '',
    role: u.role,
    loyaltyPoints: u.loyaltyPoints ?? 0,
    loyaltyCompletedVisits: visits,
    loyaltyTier: tier.id,
    loyaltyTierName: tier.name,
    loyaltyPointsExpireAt: u.loyaltyPointsExpireAt ?? null,
    referralCode: u.referralCode ?? null,
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
    menuUrl: r.menuUrl ?? null,
    logoUrl: r.logoUrl ?? null,
    photos: r.photos ?? [],
    status: r.status,
    ownerId: r.ownerId.toString(),
    depositRequired: r.depositRequired,
    depositAmountCents: r.depositAmountCents,
    depositPolicy: r.depositPolicy ?? 'card_guarantee',
    cancellationPeriodHours:
      typeof r.cancellationPeriodHours === 'number' && r.cancellationPeriodHours >= 1
        ? Math.round(r.cancellationPeriodHours)
        : null,
    averageRating: r.averageRating ?? 0,
    reviewCount: r.reviewCount ?? 0,
    featured: r.featured ?? false,
    featuredUntil: r.featuredUntil ?? null,
    spendAlertThresholdCents: r.spendAlertThresholdCents ?? 0,
    useSmartAssign: r.useSmartAssign !== false,
    allowGuestTableSelection: r.allowGuestTableSelection ?? false,
    virtualRoomSelectionFeeEnabled: r.virtualRoomSelectionFeeEnabled !== false,
    virtualRoomSelectionFeeMode:
      r.virtualRoomSelectionFeeMode === 'per_table' || r.virtualRoomSelectionFeeMode === 'per_guest'
        ? r.virtualRoomSelectionFeeMode
        : null,
    virtualRoomSelectionFeeCents:
      typeof r.virtualRoomSelectionFeeCents === 'number' ? r.virtualRoomSelectionFeeCents : null,
    virtualRoomSelectionFeeApplyTo:
      r.virtualRoomSelectionFeeApplyTo === 'selected' ? 'selected' : 'all',
    reservationsEnabled: r.reservationsEnabled !== false,
    reservationsVisible: r.reservationsVisible !== false,
    manualApprovalEnabled: r.manualApprovalEnabled === true,
    manualApprovalPartySizeOp: r.manualApprovalPartySizeOp === 'gt' ? 'gt' : 'gte',
    manualApprovalPartySize: r.manualApprovalPartySize ?? null,
    posEnabled: r.posEnabled ?? false,
    loyaltyEnabled: r.loyaltyEnabled ?? false,
    loyaltyPointsPerVisit: r.loyaltyPointsPerVisit ?? 50,
    loyaltyMinRedeemPoints: r.loyaltyMinRedeemPoints ?? 200,
    widgetTheme: {
      primaryColor: r.widgetTheme?.primaryColor ?? '#0b3d2e',
      buttonText: r.widgetTheme?.buttonText ?? 'Reserve a table',
      showReviews: r.widgetTheme?.showReviews ?? true,
    },
    categoryIds: r.categoryIds ?? [],
    landmarkIds: r.landmarkIds ?? [],
    diningStyles: r.diningStyles ?? [],
    discoveryOccasions: r.discoveryOccasions ?? [],
    meals: r.meals ?? [],
    dietaryTags: r.dietaryTags ?? [],
    amenities: r.amenities ?? [],
    wheelchairAccessible: r.wheelchairAccessible ?? false,
    faq: (r.faq ?? []).map((item: { question: string; answer: string }) => ({
      question: item.question,
      answer: item.answer,
    })),
    featuredIn: (r.featuredIn ?? []).map(
      (item: { title: string; description?: string; url?: string; logoUrl?: string }) => ({
        title: item.title,
        description: item.description ?? null,
        url: item.url ?? null,
        logoUrl: item.logoUrl ?? null,
      }),
    ),
    termsAndConditions: r.termsAndConditions?.trim() || null,
    floorPlanBackgroundUrl: r.floorPlanBackgroundUrl ?? null,
    floorPlanBackgroundColor: r.floorPlanBackgroundColor ?? null,
    floorPlanAreaAppearances: mapFloorPlanAreaAppearances(r.floorPlanAreaAppearances),
    floorFixtures: (r.floorFixtures ?? []).map(mapFloorFixture),
    floorRooms: (r.floorRooms ?? []).map(mapFloorRoom),
    floorPlanScale: mapFloorPlanScale(r.floorPlanScale),
    floorPlanDraft: r.floorPlanDraft?.updatedAt
      ? {
          updatedAt: r.floorPlanDraft.updatedAt,
          backgroundUrl: r.floorPlanDraft.backgroundUrl ?? null,
          backgroundColor: r.floorPlanDraft.backgroundColor ?? null,
          areaAppearances: mapFloorPlanAreaAppearances(r.floorPlanDraft.areaAppearances),
          fixtures: Array.isArray(r.floorPlanDraft.fixtures)
            ? r.floorPlanDraft.fixtures.map(mapFloorFixture)
            : [],
          positions: Array.isArray(r.floorPlanDraft.positions)
            ? r.floorPlanDraft.positions.map((p: any) => ({
                id: String(p.id),
                posX: Number(p.posX) || 0,
                posY: Number(p.posY) || 0,
                width: p.width != null ? Number(p.width) : null,
                height: p.height != null ? Number(p.height) : null,
                shape: p.shape ?? null,
                rotation: p.rotation != null ? Number(p.rotation) : null,
                combineGroupId: p.combineGroupId ?? null,
              }))
            : [],
          rooms: Array.isArray(r.floorPlanDraft.rooms)
            ? r.floorPlanDraft.rooms.map(mapFloorRoom)
            : [],
          scale: mapFloorPlanScale(r.floorPlanDraft.scale) ?? mapFloorPlanScale(r.floorPlanScale),
        }
      : null,
    floorPlanPublishedAt: r.floorPlanPublishedAt ?? null,
    createdAt: r.createdAt,
  };
}

export function mapFloorPlanAreaAppearances(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a: any) => a && typeof a.floorArea === 'string' && a.floorArea.trim())
    .map((a: any) => ({
      floorArea: String(a.floorArea).trim() || 'Main',
      backgroundColor: a.backgroundColor ?? null,
      backgroundUrl: a.backgroundUrl ?? null,
    }));
}

export function mapFloorFixture(f: any) {
  return {
    id: String(f.id),
    name: f.name,
    kind: f.kind,
    floorArea: f.floorArea || 'Main',
    posX: f.posX ?? 0,
    posY: f.posY ?? 0,
    width: f.width ?? 2,
    height: f.height ?? 1,
    rotation: f.rotation ?? 0,
  };
}

export function mapFloorRoom(room: any) {
  return {
    id: String(room.id),
    name: room.name || 'Room',
    floorArea: room.floorArea || 'Main',
    points: Array.isArray(room.points)
      ? room.points.map((p: any) => ({
          x: Number(p.x) || 0,
          y: Number(p.y) || 0,
        }))
      : [],
  };
}

export function mapFloorPlanScale(scale: any) {
  if (!scale || scale.unitsPerCell == null) return null;
  return {
    unit: scale.unit === 'm' ? 'm' : 'ft',
    unitsPerCell: Number(scale.unitsPerCell) || 2,
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
    rotation: t.rotation ?? 0,
    combineGroupId: t.combineGroupId ?? null,
    photoUrl: t.photoUrl ?? null,
    requiresManualApproval: t.requiresManualApproval === true,
    depositRequired: t.depositRequired === true,
    depositAmountCents: t.depositAmountCents ?? 0,
    cancellationPeriodHours:
      typeof t.cancellationPeriodHours === 'number' && t.cancellationPeriodHours >= 1
        ? Math.round(t.cancellationPeriodHours)
        : null,
    virtualRoomSelectable: t.virtualRoomSelectable !== false,
    virtualRoomSelectionFeeEnabled: t.virtualRoomSelectionFeeEnabled === true,
    virtualRoomSelectionFeeCents:
      typeof t.virtualRoomSelectionFeeCents === 'number' ? t.virtualRoomSelectionFeeCents : null,
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
  const reservationId = id(r);
  return {
    id: reservationId,
    confirmationNumber: resolveReservationConfirmationNumber(
      r.confirmationNumber,
      reservationId,
    ),
    restaurantId: refId(r.restaurantId),
    dinerId: refId(r.dinerId),
    tableIds: (r.tableIds ?? []).map((x: unknown) => refId(x)),
    partySize: r.partySize,
    slotStart: r.slotStart,
    slotEnd: r.slotEnd,
    status: r.status,
    requiresManualApproval: r.requiresManualApproval === true,
    occasion: r.occasion,
    guestNotes: r.guestNotes,
    depositAmountCents: r.depositAmountCents,
    depositRefundedCents: r.depositRefundedCents ?? 0,
    depositRefundableCents: Math.max(
      0,
      (r.depositAmountCents ?? 0) - (r.depositRefundedCents ?? 0),
    ),
    depositStatus: r.depositStatus,
    noShowFeeCents: r.noShowFeeCents ?? 0,
    cancellationPeriodHours:
      typeof r.cancellationPeriodHours === 'number' && r.cancellationPeriodHours >= 1
        ? Math.round(r.cancellationPeriodHours)
        : 24,
    cardGuaranteeStatus: r.cardGuaranteeStatus ?? 'none',
    noShowFeeReason: r.noShowFeeReason ?? null,
    noShowFeeChargedAt: r.noShowFeeChargedAt ?? null,
    noShowFeeError: r.noShowFeeError ?? null,
    clientSecret: clientSecret ?? null,
    loyaltyPointsEarned: r.loyaltyPointsEarned,
    loyaltyPointsRedeemed: r.loyaltyPointsRedeemed,
    restaurantLoyaltyPointsEarned: r.restaurantLoyaltyPointsEarned ?? 0,
    restaurantLoyaltyPointsRedeemed: r.restaurantLoyaltyPointsRedeemed ?? 0,
    promotionId: r.promotionId ? refId(r.promotionId) : null,
    promoDiscountCents: r.promoDiscountCents ?? 0,
    giftCardId: r.giftCardId ? refId(r.giftCardId) : null,
    giftCardDiscountCents: r.giftCardDiscountCents ?? 0,
    source: r.source ?? 'network',
    tableSelectionSource: r.tableSelectionSource ?? null,
    utmSource: r.utmSource ?? null,
    utmMedium: r.utmMedium ?? null,
    utmCampaign: r.utmCampaign ?? null,
    utmContent: r.utmContent ?? null,
    utmTerm: r.utmTerm ?? null,
    landingPath: r.landingPath ?? null,
    originUrl: r.originUrl ?? null,
    referrer: r.referrer ?? null,
    totalSpendCents: r.totalSpendCents ?? 0,
    seatedAt: r.seatedAt ?? null,
    packageId: r.packageId ? refId(r.packageId) : null,
    packageTitle: r.packageTitle ?? null,
    packagePriceCents: r.packagePriceCents ?? 0,
    privateDiningSpaceId: r.privateDiningSpaceId
      ? refId(r.privateDiningSpaceId)
      : null,
    privateDiningSpaceName: r.privateDiningSpaceName ?? null,
    privateDiningPriceCents: r.privateDiningPriceCents ?? 0,
    experienceId: r.experienceId ? refId(r.experienceId) : null,
    experienceTitle: r.experienceTitle ?? null,
    experiencePriceCents: r.experiencePriceCents ?? 0,
    experienceTicketQty: r.experienceTicketQty ?? 0,
    createdAt: r.createdAt,
  };
}

export function mapReviewReportResponses(
  raw: unknown,
  flaggedById?: string | null,
) {
  if (!Array.isArray(raw)) return [];
  const reporterId = flaggedById ? String(flaggedById) : null;
  return raw.map((item) => {
    const authorId = item.authorId?.toString?.() ?? item.authorId ?? null;
    const storedFromReporter =
      typeof item.fromReporter === 'boolean' ? item.fromReporter : null;
    return {
      id: item._id.toString(),
      body: item.body ?? '',
      createdAt: item.createdAt ?? null,
      authorId,
      fromReporter:
        storedFromReporter ??
        Boolean(reporterId && authorId && authorId === reporterId),
      attachments: (Array.isArray(item.attachments) ? item.attachments : []).map(
        (attachment: {
          _id: { toString(): string };
          url: string;
          filename: string;
          contentType: string;
          size?: number | null;
        }) => ({
          id: attachment._id.toString(),
          url: attachment.url,
          filename: attachment.filename,
          contentType: attachment.contentType,
          size: attachment.size ?? null,
        }),
      ),
    };
  });
}

export function mapReview(r: any) {
  const flaggedById = r.flaggedById ? r.flaggedById.toString() : null;
  return {
    id: r._id.toString(),
    restaurantId: r.restaurantId.toString(),
    dinerId: r.dinerId.toString(),
    reservationId: r.reservationId.toString(),
    rating: r.rating,
    foodRating: r.foodRating ?? null,
    serviceRating: r.serviceRating ?? null,
    atmosphereRating: r.atmosphereRating ?? null,
    comment: r.comment,
    photos: Array.isArray(r.photos) ? r.photos.filter(Boolean) : [],
    ownerReply: r.ownerReply ?? null,
    ownerRepliedAt: r.ownerRepliedAt ?? null,
    hidden: r.hidden ?? false,
    flagged: Boolean(r.flagged),
    flagReason: r.flagReason ?? null,
    flagReasonCode: r.flagReasonCode ?? null,
    flagDetails: r.flagDetails ?? null,
    flaggedAt: r.flaggedAt ?? null,
    flaggedById,
    reportResponses: mapReviewReportResponses(r.reportResponses, flaggedById),
    createdAt: r.createdAt,
  };
}

export function mapWaitlistEntry(w: any) {
  const estimatedWaitMinutes = w._eta?.estimatedWaitMinutes ?? null;
  const active = isActiveWaitlistWaitStatus(w.status);
  const waitingMinutes = active ? waitlistWaitingMinutes(w.createdAt) : null;
  const promisedWaitMinutes = active
    ? waitlistPromisedMinutes({
        quotedWaitMinutes: w.quotedWaitMinutes,
        estimatedWaitMinutes,
      })
    : null;
  const isOverdue =
    waitingMinutes != null &&
    isWaitlistWaitOverdue({
      status: w.status,
      waitingMinutes,
      quotedWaitMinutes: w.quotedWaitMinutes,
      estimatedWaitMinutes,
    });

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
    notifiedAt: w.notifiedAt ?? null,
    notifiedSlot: w.notifiedSlot,
    reservationId: w.reservationId?.toString() ?? null,
    createdAt: w.createdAt,
    position: w._eta?.position ?? null,
    partiesAhead: w._eta?.partiesAhead ?? null,
    estimatedWaitMinutes,
    estimatedReadyAt: w._eta?.estimatedReadyAt ?? null,
    waitingMinutes,
    promisedWaitMinutes,
    isOverdue,
  };
}

export function mapRestaurantInquiry(i: any) {
  return {
    id: i._id.toString(),
    restaurantId: i.restaurantId.toString(),
    senderName: i.senderName,
    senderEmail: i.senderEmail,
    userId: i.userId?.toString() ?? null,
    message: i.message,
    readAt: i.readAt ?? null,
    createdAt: i.createdAt,
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

export function mapGiftCard(card: any) {
  return {
    id: card._id.toString(),
    restaurantId: card.restaurantId.toString(),
    code: card.code,
    initialBalanceCents: card.initialBalanceCents,
    balanceCents: card.balanceCents,
    recipientName: card.recipientName ?? null,
    recipientEmail: card.recipientEmail ?? null,
    expiresAt: card.expiresAt ?? null,
    note: card.note ?? '',
    active: card.active,
    createdAt: card.createdAt,
  };
}

export function mapPromotion(p: any) {
  return {
    id: p._id.toString(),
    restaurantId: p.restaurantId.toString(),
    title: p.title,
    description: p.description ?? null,
    discountPercent: p.discountPercent ?? null,
    discountAmountCents: p.discountAmountCents ?? null,
    code: p.code ?? null,
    startDate: p.startDate ?? null,
    endDate: p.endDate ?? null,
    daysOfWeek: p.daysOfWeek ?? [],
    maxRedemptions: p.maxRedemptions ?? null,
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

export function mapIntegration(i: any, opts?: { revealApiKey?: string }) {
  const prefix = i.apiKeyPrefix as string | undefined;
  const legacyKey = i.apiKey as string | undefined;
  const redacted =
    opts?.revealApiKey ??
    (prefix
      ? `${prefix}…`
      : legacyKey
        ? `${legacyKey.slice(0, 8)}…${legacyKey.slice(-4)}`
        : '');
  return {
    id: i._id.toString(),
    restaurantId: i.restaurantId.toString(),
    provider: i.provider,
    name: i.name,
    apiKey: redacted,
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
    endDate: e.endDate ?? e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    minGuests: e.minGuests ?? 1,
    maxGuests: e.maxGuests,
    ticketPriceCents: e.ticketPriceCents,
    ticketsSold: e.ticketsSold ?? 0,
    availableTickets: e.maxGuests - (e.ticketsSold ?? 0),
    status: e.status,
    includes: e.includes ?? [],
    tags: e.tags ?? [],
    requiresManualApproval: e.requiresManualApproval === true,
    cancellationPeriodHours:
      typeof e.cancellationPeriodHours === 'number' && e.cancellationPeriodHours >= 1
        ? Math.round(e.cancellationPeriodHours)
        : null,
    createdAt: e.createdAt,
  };
}

export function mapRestaurantPackage(p: any) {
  return {
    id: p._id.toString(),
    restaurantId: p.restaurantId.toString(),
    title: p.title,
    description: p.description ?? '',
    priceCents: p.priceCents ?? 0,
    pricePerGuest: !!p.pricePerGuest,
    includes: p.includes ?? [],
    photoUrl: p.photoUrl ?? null,
    occasions: p.occasions ?? [],
    minPartySize: p.minPartySize ?? null,
    maxPartySize: p.maxPartySize ?? null,
    active: p.active !== false,
    requiresManualApproval: p.requiresManualApproval === true,
    createdAt: p.createdAt,
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
    requiresManualApproval: s.requiresManualApproval === true,
    cancellationPeriodHours:
      typeof s.cancellationPeriodHours === 'number' && s.cancellationPeriodHours >= 1
        ? Math.round(s.cancellationPeriodHours)
        : null,
    tableIds: (s.tableIds ?? []).map((id: { toString(): string }) => id.toString()),
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
    loyaltyPoints: g.loyaltyPoints ?? 0,
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

export function mapAuditLog(l: any) {
  return {
    id: l._id.toString(),
    actorId: l.actorId.toString(),
    action: l.action,
    resource: l.resource,
    resourceId: l.resourceId ?? null,
    details: l.details != null ? JSON.stringify(l.details) : null,
    ip: l.ip ?? null,
    createdAt: l.createdAt,
  };
}

export function mapMenuItem(i: any) {
  return {
    id: i._id.toString(),
    name: i.name,
    description: i.description,
    priceCents: i.priceCents,
    photoUrl: i.photoUrl,
    dietary: i.dietary ?? [],
    available: i.available ?? true,
    popular: i.popular ?? false,
  };
}

export function mapMenu(menu: any, restaurantId: string) {
  return {
    id: menu._id.toString(),
    restaurantId,
    sections: menu.sections.map((s: any) => ({
      id: s._id.toString(),
      name: s.name,
      items: s.items.map(mapMenuItem),
    })),
  };
}

export function slugify(name: string) {
  return `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`;
}
