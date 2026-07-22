export type OnboardingRestaurant = {
  id: string;
  slug?: string | null;
  name: string;
  status: string;
  description?: string | null;
  photos?: string[] | null;
  phone?: string | null;
  tables?: unknown[] | null;
  shifts?: unknown[] | null;
  menu?: {
    sections?: { items?: unknown[] }[] | null;
  } | null;
};

export type OnboardingStep = {
  key: string;
  title: string;
  description: string;
  href: string;
  required: boolean;
  complete: boolean;
  waiting?: boolean;
};

function hasMenuItems(restaurant: OnboardingRestaurant): boolean {
  const sections = restaurant.menu?.sections ?? [];
  return sections.some((section) => (section.items?.length ?? 0) > 0);
}

export function getOnboardingSteps(restaurant: OnboardingRestaurant): OnboardingStep[] {
  const profileComplete =
    (restaurant.photos?.length ?? 0) > 0 &&
    Boolean(restaurant.phone?.trim()) &&
    (restaurant.description?.trim().length ?? 0) >= 10;

  const serviceReady =
    (restaurant.tables?.length ?? 0) > 0 && (restaurant.shifts?.length ?? 0) > 0;

  const approved = restaurant.status === 'approved';

  return [
    {
      key: 'profile',
      title: 'Complete your profile',
      description: 'Add photos, a phone number, and a short description so guests know what to expect.',
      href: '/settings',
      required: true,
      complete: profileComplete,
    },
    {
      key: 'service',
      title: 'Set up tables & shifts',
      description: 'Define seating and service hours — reservations cannot be offered until this is done.',
      href: '/floor',
      required: true,
      complete: serviceReady,
    },
    {
      key: 'rules',
      title: 'Configure booking rules',
      description: 'Set party-size limits, lead times, and blackouts for when you are closed.',
      href: '/access-rules',
      required: false,
      complete: false,
    },
    {
      key: 'menu',
      title: 'Add your menu',
      description: 'Optional — showcase dishes on your public restaurant page.',
      href: '/menu',
      required: false,
      complete: hasMenuItems(restaurant),
    },
    {
      key: 'approval',
      title: 'Await platform approval',
      description:
        restaurant.status === 'rejected'
          ? 'Your listing was not approved. Contact support if you need help.'
          : restaurant.status === 'suspended'
            ? 'Your listing is suspended. Contact support to restore access.'
            : 'We review new restaurants within 1–2 business days. You will be notified by email.',
      href: '/onboarding',
      required: true,
      complete: approved,
      waiting: !approved && restaurant.status === 'pending',
    },
    {
      key: 'golive',
      title: 'Share your booking link',
      description: 'Copy your public booking page and embed the widget on your website.',
      href: '/settings',
      required: false,
      complete: approved,
    },
  ];
}

export function getOnboardingProgress(steps: OnboardingStep[]) {
  const required = steps.filter((step) => step.required);
  const completedRequired = required.filter((step) => step.complete).length;
  const allRequiredComplete = completedRequired === required.length;
  const percent = required.length
    ? Math.round((completedRequired / required.length) * 100)
    : 100;

  return {
    completedRequired,
    totalRequired: required.length,
    percent,
    allRequiredComplete,
    hasIncompleteUserSteps: steps.some(
      (step) => step.required && !step.complete && !step.waiting,
    ),
    showOnboarding: !allRequiredComplete,
  };
}
