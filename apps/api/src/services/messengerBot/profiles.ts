export type BotProfile = 'FOH' | 'HOST' | 'APPROVER';

export const BOT_PROFILE_LABELS: Record<BotProfile, string> = {
  FOH: 'Front of house',
  HOST: 'Host',
  APPROVER: 'Approver',
};

/** Map Tablevera user role → default bot profile. */
export function profileForRole(role: string | null | undefined): BotProfile | null {
  switch ((role ?? '').toLowerCase()) {
    case 'owner':
    case 'restaurant_owner':
    case 'manager':
      return 'FOH';
    case 'host':
      return 'HOST';
    default:
      return null;
  }
}

export type BotActionCode =
  | 'accept'
  | 'reject'
  | 'cancel'
  | 'seat'
  | 'complete'
  | 'no_show';

type ActionRule = {
  label: string;
  from: readonly string[];
  to?: string;
  profiles: readonly BotProfile[];
};

export const BOT_ACTIONS: Record<BotActionCode, ActionRule> = {
  accept: {
    label: '✅ Accept',
    from: ['pending'],
    to: 'confirmed',
    profiles: ['FOH', 'APPROVER'],
  },
  reject: {
    label: '❌ Reject',
    from: ['pending'],
    profiles: ['FOH', 'APPROVER'],
  },
  seat: {
    label: '🪑 Seat',
    from: ['confirmed'],
    to: 'seated',
    profiles: ['FOH', 'HOST'],
  },
  complete: {
    label: '🏁 Complete',
    from: ['confirmed', 'seated'],
    to: 'completed',
    profiles: ['FOH', 'HOST'],
  },
  no_show: {
    label: '👻 No-show',
    from: ['confirmed', 'seated'],
    to: 'no_show',
    profiles: ['FOH', 'HOST'],
  },
  cancel: {
    label: '✖️ Cancel',
    from: ['pending', 'confirmed'],
    profiles: ['FOH', 'APPROVER'],
  },
};

const ACTION_ORDER: BotActionCode[] = [
  'accept',
  'reject',
  'seat',
  'complete',
  'no_show',
  'cancel',
];

export const CANCEL_REASONS = [
  'Fully booked',
  'Party too large',
  'Guest request',
  'Cancelled by restaurant',
] as const;

export const CANCELLABLE_STATUSES = ['pending', 'confirmed'] as const;

export type BotReservationState = {
  status: string;
};

export type BotViewer = {
  profile: BotProfile;
  allowedActions?: readonly BotActionCode[] | null;
};

export const PROFILE_DEFAULT_ACTIONS: Record<BotProfile, BotActionCode[]> = {
  FOH: ['accept', 'reject', 'cancel', 'seat', 'complete', 'no_show'],
  HOST: ['seat', 'complete', 'no_show'],
  APPROVER: ['accept', 'reject', 'cancel'],
};

export type BotActionPresetId = 'FOH' | 'HOST' | 'APPROVER' | 'CUSTOM';

export const BOT_ACTION_PRESETS: Record<
  Exclude<BotActionPresetId, 'CUSTOM'>,
  { label: string; profile: BotProfile; actions: BotActionCode[]; hint: string }
> = {
  FOH: {
    label: 'Front of house (full)',
    profile: 'FOH',
    actions: PROFILE_DEFAULT_ACTIONS.FOH,
    hint: 'Approve, seat, complete, cancel, no-show',
  },
  HOST: {
    label: 'Host floor',
    profile: 'HOST',
    actions: PROFILE_DEFAULT_ACTIONS.HOST,
    hint: 'Seat, complete, and mark no-show',
  },
  APPROVER: {
    label: 'Approver',
    profile: 'APPROVER',
    actions: PROFILE_DEFAULT_ACTIONS.APPROVER,
    hint: 'New bookings only — accept, reject, cancel',
  },
};

export function normalizeAllowedActions(
  profile: BotProfile,
  actions: readonly string[] | null | undefined,
): BotActionCode[] | null {
  if (!actions?.length) return null;
  const allowed = new Set(PROFILE_DEFAULT_ACTIONS[profile]);
  const out = ACTION_ORDER.filter((a) => actions.includes(a) && allowed.has(a));
  return out.length ? out : null;
}

export function matchActionPreset(
  profile: BotProfile,
  actions: readonly BotActionCode[] | null | undefined,
): BotActionPresetId {
  const effective = actions?.length
    ? [...actions].sort().join(',')
    : PROFILE_DEFAULT_ACTIONS[profile].join(',');
  for (const [id, preset] of Object.entries(BOT_ACTION_PRESETS) as Array<
    [
      Exclude<BotActionPresetId, 'CUSTOM'>,
      (typeof BOT_ACTION_PRESETS)[Exclude<BotActionPresetId, 'CUSTOM'>],
    ]
  >) {
    if (preset.profile !== profile) continue;
    if ([...preset.actions].sort().join(',') === effective) return id;
  }
  return 'CUSTOM';
}

export function canPerformAction(
  action: BotActionCode,
  reservation: BotReservationState,
  viewer: BotViewer,
): boolean {
  if (viewer.allowedActions?.length && !viewer.allowedActions.includes(action)) return false;
  const rule = BOT_ACTIONS[action];
  if (!rule.profiles.includes(viewer.profile)) return false;
  if (!rule.from.includes(reservation.status)) return false;
  return true;
}

export function availableActions(
  reservation: BotReservationState,
  viewer: BotViewer,
): BotActionCode[] {
  return ACTION_ORDER.filter((a) => canPerformAction(a, reservation, viewer));
}

/** Whether a profile should receive a fresh card at this status. */
export function profileWantsNewCard(profile: BotProfile, status: string): boolean {
  switch (profile) {
    case 'FOH':
      return ['pending', 'confirmed', 'seated', 'cancelled', 'no_show'].includes(status);
    case 'HOST':
      return ['confirmed', 'seated'].includes(status);
    case 'APPROVER':
      return status === 'pending' || status === 'cancelled';
  }
}

export function profileActiveStatuses(profile: BotProfile): string[] {
  switch (profile) {
    case 'FOH':
      return ['pending', 'confirmed', 'seated'];
    case 'HOST':
      return ['confirmed', 'seated'];
    case 'APPROVER':
      return ['pending'];
  }
}

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  pending: '🆕 Pending approval',
  confirmed: '✅ Confirmed',
  seated: '🪑 Seated',
  completed: '🏁 Completed',
  cancelled: '❌ Cancelled',
  no_show: '👻 No-show',
};

export function reservationStatusLabel(status: string): string {
  return RESERVATION_STATUS_LABELS[status] ?? status;
}
