import { canManageBilling, canManageTeam, isSuperAdmin } from '@/lib/roles';

export type OnboardingRestaurant = {
  id: string;
  slug?: string | null;
  name: string;
  status: string;
  description?: string | null;
  photos?: string[] | null;
  phone?: string | null;
  depositRequired?: boolean | null;
  tables?: unknown[] | null;
  shifts?: unknown[] | null;
  tableCount?: number;
  shiftCount?: number;
  hasMenuItems?: boolean;
  menu?: {
    sections?: { items?: unknown[] }[] | null;
  } | null;
};

/** Extra per-venue signals fetched by the setup guide (not on the shell query). */
export type PartnerSetupSignals = {
  accessRuleCount?: number;
  subscriptionStatus?: string | null;
  /** `false` when the venue's plan lacks access rules; `undefined` while loading. */
  accessRulesIncluded?: boolean;
  /** Platform deposits kill switch; `undefined` while loading. */
  depositsEnabled?: boolean;
  teamSeatsUsed?: number;
};

export type PlatformSetupSignals = {
  supportEmail?: string | null;
  supportPhone?: string | null;
  stripeMode?: string | null;
  stripeSandboxConfigured?: boolean;
  stripeProductionConfigured?: boolean;
  restaurants?: number;
  pendingRestaurants?: number;
  /** Platform admin accounts (admin, account manager, super admin), including the viewer. */
  adminCount?: number;
};

export type SetupTask = {
  key: string;
  title: string;
  description: string;
  href: string;
  /** Required tasks gate "ready to take reservations"; optional ones can be skipped. */
  required: boolean;
  complete: boolean;
  /** Waiting on someone else (e.g. platform review) — nothing for the user to do. */
  waiting?: boolean;
  /** Shown instead of the CTA when the task cannot be started yet. */
  blockedReason?: string;
  /** No data signal exists — the task completes once the user opens it from the guide. */
  completeOnVisit?: boolean;
  cta?: string;
};

export type SetupSection = {
  key: string;
  title: string;
  tasks: SetupTask[];
};

export type SetupGuide = {
  scope: string;
  title: string;
  /** Full-page checklist for this guide. */
  checklistHref: string;
  sections: SetupSection[];
};

/** Client-only progress the API does not track (skips and "review" visits). */
export type SetupGuideLocalState = {
  skipped: string[];
  visited: string[];
};

function hasMenuItems(restaurant: OnboardingRestaurant): boolean {
  if (typeof restaurant.hasMenuItems === 'boolean') return restaurant.hasMenuItems;
  const sections = restaurant.menu?.sections ?? [];
  return sections.some((section) => (section.items?.length ?? 0) > 0);
}

function approvalTask(restaurant: OnboardingRestaurant): SetupTask {
  const approved = restaurant.status === 'approved';
  const blocked = restaurant.status === 'rejected' || restaurant.status === 'suspended';
  return {
    key: 'approval',
    title: 'Get approved',
    description:
      restaurant.status === 'rejected'
        ? 'Your listing was not approved. Contact support and we will help you fix it.'
        : restaurant.status === 'suspended'
          ? 'Your listing is suspended. Contact support to restore access.'
          : 'We review new restaurants within 1–2 business days and email you when you are live.',
    href: blocked ? '/support' : '/onboarding',
    cta: blocked ? 'Contact support' : undefined,
    required: true,
    complete: approved,
    waiting: !approved && !blocked,
  };
}

function rulesTask(role: string, signals: PartnerSetupSignals): SetupTask[] {
  if (signals.accessRulesIncluded === false) {
    // Managers cannot change the plan, so the step would be a dead end for them.
    if (!canManageBilling(role)) return [];
    return [
      {
        key: 'rules',
        title: 'Configure booking rules',
        description:
          'Booking rules (party-size limits, lead times, covers per slot) are included on Core and Pro.',
        href: '/billing',
        required: false,
        complete: false,
        cta: 'Upgrade plan',
      },
    ];
  }
  return [
    {
      key: 'rules',
      title: 'Configure booking rules',
      description: 'Limit party sizes, lead times, and covers per slot for busy nights.',
      href: '/access-rules',
      required: false,
      complete: (signals.accessRuleCount ?? 0) > 0,
    },
  ];
}

export function buildPartnerSetupGuide(
  restaurant: OnboardingRestaurant,
  role: string,
  signals: PartnerSetupSignals = {},
): SetupGuide {
  const approved = restaurant.status === 'approved';
  const tableCount = restaurant.tableCount ?? restaurant.tables?.length ?? 0;
  const shiftCount = restaurant.shiftCount ?? restaurant.shifts?.length ?? 0;
  const subscriptionOk =
    signals.subscriptionStatus === 'active' || signals.subscriptionStatus === 'trialing';

  const sections: SetupSection[] = [
    {
      key: 'listing',
      title: 'Set up your listing',
      tasks: [
        {
          key: 'description',
          title: 'Describe your restaurant',
          description: 'A short description helps guests decide. Aim for a sentence or two.',
          href: '/restaurant-profile?section=listing',
          required: true,
          complete: (restaurant.description?.trim().length ?? 0) >= 10,
        },
        {
          key: 'photos',
          title: 'Upload photos',
          description: 'Listings with photos get far more bookings. Add a cover photo and your logo.',
          href: '/restaurant-profile?section=photos',
          required: true,
          complete: (restaurant.photos?.length ?? 0) > 0,
        },
        {
          key: 'phone',
          title: 'Add a contact phone',
          description: 'Guests and our team use this when a booking needs attention.',
          href: '/restaurant-profile?section=contact',
          required: true,
          complete: Boolean(restaurant.phone?.trim()),
        },
        {
          key: 'menu',
          title: 'Add your menu',
          description: 'Showcase dishes on your public page. You can import an existing menu.',
          href: '/menu',
          required: false,
          complete: hasMenuItems(restaurant),
        },
      ],
    },
    {
      key: 'service',
      title: 'Set up service',
      tasks: [
        {
          key: 'tables',
          title: 'Add your tables',
          description: 'Tell us what seating you have so we only offer tables that fit the party.',
          href: '/floor?tab=tables',
          required: true,
          complete: tableCount > 0,
        },
        {
          key: 'shifts',
          title: 'Set service hours',
          description: 'Create shifts for the hours you take reservations (e.g. Lunch, Dinner).',
          href: '/floor?tab=shifts',
          required: true,
          complete: shiftCount > 0,
        },
        ...rulesTask(role, signals),
        {
          key: 'policies',
          title: 'Review booking policies',
          description: 'Decide on manual approval for large parties and your cancellation terms.',
          href: '/restaurant-profile?section=policies',
          required: false,
          complete: false,
          completeOnVisit: true,
          cta: 'Review',
        },
      ],
    },
  ];

  if (canManageBilling(role)) {
    sections.push({
      key: 'payments',
      title: 'Set up payments',
      tasks: [
        {
          key: 'plan',
          title: 'Choose a plan & add a card',
          description:
            signals.subscriptionStatus === 'past_due'
              ? 'Your last payment failed. Update your card to avoid interruptions.'
              : 'Pick the package that fits your venue. You are only charged when your trial ends.',
          href: '/billing',
          required: false,
          complete: subscriptionOk,
        },
        ...(signals.depositsEnabled === false
          ? []
          : [
              {
                key: 'deposits',
                title: 'Collect deposits',
                description: 'Optional — require a card deposit to cut no-shows on busy nights.',
                href: '/restaurant-profile?section=contact',
                required: false,
                complete: Boolean(restaurant.depositRequired),
              },
            ]),
      ],
    });
  }

  if (canManageTeam(role)) {
    sections.push({
      key: 'team',
      title: 'Invite your team',
      tasks: [
        {
          key: 'invite',
          title: 'Invite a manager or host',
          description: 'Give your staff their own login so they can run the book on shift.',
          href: '/team',
          required: false,
          complete: (signals.teamSeatsUsed ?? 0) > 0,
        },
        {
          key: 'notifications',
          title: 'Choose how you get notified',
          description: 'Pick email, push, or Telegram alerts for new bookings and messages.',
          href: '/notifications',
          required: false,
          complete: false,
          completeOnVisit: true,
          cta: 'Review',
        },
      ],
    });
  }

  sections.push({
    key: 'golive',
    title: 'Go live',
    tasks: [
      approvalTask(restaurant),
      {
        key: 'share',
        title: 'Share your booking link',
        description: 'Add the booking button to your website, Instagram, and Google Business Profile.',
        href: '/booking-widget',
        required: false,
        complete: false,
        completeOnVisit: true,
        blockedReason: approved ? undefined : 'Available once your restaurant is approved',
      },
    ],
  });

  return {
    scope: `restaurant:${restaurant.id}`,
    title: 'Setup guide',
    checklistHref: '/onboarding',
    sections,
  };
}

export function buildPlatformSetupGuide(
  signals: PlatformSetupSignals,
  role: string,
): SetupGuide {
  const stripeLive = signals.stripeMode === 'live';
  const stripeConfigured = stripeLive
    ? Boolean(signals.stripeProductionConfigured)
    : Boolean(signals.stripeSandboxConfigured);
  const restaurantCount = signals.restaurants ?? 0;

  return {
    scope: 'platform',
    title: 'Platform setup',
    checklistHref: '/admin/setup',
    sections: [
      {
        key: 'platform',
        title: 'Configure the platform',
        tasks: [
          {
            key: 'support',
            title: 'Add support contacts',
            description: 'Shown to diners and owners whenever they need help.',
            href: '/admin/config?section=support',
            required: true,
            complete: Boolean(signals.supportEmail?.trim() && signals.supportPhone?.trim()),
          },
          {
            key: 'stripe',
            title: 'Connect Stripe',
            description:
              'Set the Stripe secret, publishable, and webhook keys in the API environment so owners can subscribe and diners can pay deposits.',
            href: '/admin/config?section=billing',
            required: true,
            complete: stripeConfigured,
          },
          {
            key: 'stripe-live',
            title: 'Switch Stripe to production',
            description: 'Start charging real cards once you have tested sign-up and deposits in sandbox.',
            href: '/admin/config?section=billing',
            required: false,
            complete: stripeLive && Boolean(signals.stripeProductionConfigured),
            blockedReason: isSuperAdmin(role)
              ? undefined
              : 'Only a super admin can switch Stripe to production',
          },
          {
            key: 'features',
            title: 'Review feature switches',
            description: 'Turn off modules (SMS, waitlist, campaigns) you are not ready to offer.',
            href: '/admin/config?section=features',
            required: false,
            complete: false,
            completeOnVisit: true,
            cta: 'Review',
          },
        ],
      },
      {
        key: 'catalog',
        title: 'Set up packages & emails',
        tasks: [
          {
            key: 'pricing',
            title: 'Review pricing packages',
            description: 'Confirm prices, cover fees, and manager seats for each package.',
            href: '/admin/pricing',
            required: true,
            complete: false,
            completeOnVisit: true,
            cta: 'Review',
          },
          {
            key: 'templates',
            title: 'Brand your email templates',
            description: 'Edit confirmation and reminder emails, then send yourself a test.',
            href: '/admin/templates',
            required: false,
            complete: false,
            completeOnVisit: true,
            cta: 'Review',
          },
        ],
      },
      {
        key: 'restaurants',
        title: 'Onboard restaurants',
        tasks: [
          {
            key: 'first-restaurant',
            title: 'Add your first restaurant',
            description: 'Create a venue yourself or invite an owner to register.',
            href: '/admin/restaurants',
            required: true,
            complete: restaurantCount > 0,
          },
          {
            key: 'approvals',
            title: 'Clear the approval queue',
            description:
              (signals.pendingRestaurants ?? 0) > 0
                ? `${signals.pendingRestaurants} restaurant(s) are waiting for review.`
                : 'Approve new restaurants so they appear to diners.',
            href: '/admin/restaurants?status=pending',
            required: false,
            complete: restaurantCount > 0 && (signals.pendingRestaurants ?? 0) === 0,
          },
          {
            key: 'admins',
            title: 'Invite your admin team',
            description: 'Add admins and account managers to share support and approvals.',
            href: '/admin/users',
            required: false,
            complete: (signals.adminCount ?? 0) > 1,
            cta: 'Invite',
          },
        ],
      },
    ],
  };
}

export function isTaskDone(task: SetupTask, local?: SetupGuideLocalState): boolean {
  if (task.complete) return true;
  if (!local) return false;
  if (task.completeOnVisit && !task.blockedReason && local.visited.includes(task.key)) return true;
  return !task.required && local.skipped.includes(task.key);
}

export function isTaskSkipped(task: SetupTask, local?: SetupGuideLocalState): boolean {
  return !task.complete && !task.required && Boolean(local?.skipped.includes(task.key));
}

export function getSetupProgress(guide: SetupGuide | null, local?: SetupGuideLocalState) {
  const tasks = guide?.sections.flatMap((section) => section.tasks) ?? [];
  const required = tasks.filter((task) => task.required);
  const completedRequired = required.filter((task) => task.complete).length;
  const completed = tasks.filter((task) => isTaskDone(task, local)).length;
  const allRequiredComplete = completedRequired === required.length;

  return {
    completed,
    total: tasks.length,
    percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 100,
    completedRequired,
    totalRequired: required.length,
    allRequiredComplete,
    allComplete: completed === tasks.length,
    /** Required work left that the user can act on (approval wait excluded). */
    hasActionableRequired: required.some((task) => !task.complete && !task.waiting),
  };
}

export function isSectionDone(section: SetupSection, local?: SetupGuideLocalState): boolean {
  return section.tasks.every((task) => isTaskDone(task, local));
}
