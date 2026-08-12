import { buildCancellationPolicy } from '@/lib/restaurantTerms';

export type RestaurantFaqSource = {
  name: string;
  cuisine: string;
  phone?: string | null;
  website?: string | null;
  depositRequired?: boolean;
  depositAmountCents?: number;
  dietaryTags?: string[];
  openingHoursLines?: string[];
  address: {
    line1: string;
    city: string;
    state: string;
    zip: string;
    neighborhood?: string | null;
  };
  faq?: Array<{ question: string; answer: string }> | null;
};

export function buildRestaurantFaq(
  restaurant: RestaurantFaqSource,
): Array<{ question: string; answer: string }> {
  if ((restaurant.faq?.length ?? 0) > 0) return restaurant.faq!;

  return [
    {
      question: `How do I book a table at ${restaurant.name}?`,
      answer: `Choose your date, party size, and an available time slot on this page. Confirmation is instant through Tablevera.`,
    },
    {
      question: `What cuisine does ${restaurant.name} serve?`,
      answer: `${restaurant.name} serves ${restaurant.cuisine} cuisine in ${restaurant.address.city}, ${restaurant.address.state}.`,
    },
    {
      question: `Where is ${restaurant.name} located?`,
      answer: `${restaurant.name} is located at ${restaurant.address.line1}, ${restaurant.address.city}, ${restaurant.address.state} ${restaurant.address.zip}.${
        restaurant.address.neighborhood
          ? ` The restaurant is in the ${restaurant.address.neighborhood} neighborhood.`
          : ''
      }`,
    },
    ...(restaurant.openingHoursLines?.length
      ? [
          {
            question: `What are the hours at ${restaurant.name}?`,
            answer: `${restaurant.name} accepts reservations during: ${restaurant.openingHoursLines.join('; ')}. Check live availability on this page for your date — holiday hours may differ.`,
          },
        ]
      : []),
    ...(restaurant.depositRequired
      ? [
          {
            question: `Is a deposit required at ${restaurant.name}?`,
            answer: `Yes, a deposit of $${((restaurant.depositAmountCents ?? 0) / 100).toFixed(2)} per guest is required when booking. The deposit is applied toward your final bill.`,
          },
        ]
      : []),
    {
      question: `What is the cancellation policy at ${restaurant.name}?`,
      answer: buildCancellationPolicy({
        depositRequired: restaurant.depositRequired,
        depositAmountCents: restaurant.depositAmountCents,
      }),
    },
    ...(restaurant.dietaryTags?.length
      ? [
          {
            question: `Does ${restaurant.name} accommodate dietary restrictions?`,
            answer: `${restaurant.name} offers ${restaurant.dietaryTags.join(', ')} options. Mention any allergies or dietary needs in your special requests when booking.`,
          },
        ]
      : []),
    ...(restaurant.phone
      ? [
          {
            question: `How can I contact ${restaurant.name}?`,
            answer: `You can reach ${restaurant.name} at ${restaurant.phone}${
              restaurant.website ? ` or visit their website at ${restaurant.website}` : ''
            }.`,
          },
        ]
      : []),
  ];
}
