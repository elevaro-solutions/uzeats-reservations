export interface WidgetTheme {
  primaryColor: string;
  buttonText: string;
  showReviews: boolean;
}

export interface WidgetConfig {
  restaurantId: string;
  apiUrl: string;
  appUrl: string;
  mode: 'inline' | 'button';
  /** Embed-level theme overrides (take precedence over the server theme). */
  themeOverrides: Partial<WidgetTheme>;
}

export interface Address {
  line1: string;
  city: string;
  state: string;
}

export interface RestaurantInfo {
  id: string;
  name: string;
  slug: string;
  cuisine: string;
  address: Address;
  photos: string[];
  averageRating: number;
  reviewCount: number;
  depositRequired: boolean;
  depositAmountCents: number;
  loyaltyEnabled: boolean;
  loyaltyPointsPerVisit: number;
  widgetTheme: WidgetTheme;
}

export interface AvailabilitySlot {
  time: string;
  available: boolean;
  remainingTables: number;
}

async function gql<T>(
  apiUrl: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status}`);
  }

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };

  if (json.errors?.length) {
    throw new Error(json.errors[0]!.message);
  }

  return json.data as T;
}

const RESTAURANT_FIELDS = `
  id
  name
  slug
  cuisine
  address { line1 city state }
  photos
  averageRating
  reviewCount
  depositRequired
  depositAmountCents
  loyaltyEnabled
  loyaltyPointsPerVisit
  widgetTheme { primaryColor buttonText showReviews }
`;

const RESTAURANT_QUERY = `
  query WidgetRestaurant($id: ID!) {
    restaurant(id: $id) {
      ${RESTAURANT_FIELDS}
    }
  }
`;

const AVAILABILITY_QUERY = `
  query WidgetAvailability($restaurantId: ID!, $date: String!, $partySize: Int!) {
    availability(restaurantId: $restaurantId, date: $date, partySize: $partySize) {
      time
      available
      remainingTables
    }
  }
`;

/** One round-trip for first paint: restaurant shell + today's slots. */
const BOOTSTRAP_QUERY = `
  query WidgetBootstrap($id: ID!, $date: String!, $partySize: Int!) {
    restaurant(id: $id) {
      ${RESTAURANT_FIELDS}
    }
    availability(restaurantId: $id, date: $date, partySize: $partySize) {
      time
      available
      remainingTables
    }
  }
`;

export async function fetchRestaurant(
  apiUrl: string,
  restaurantId: string,
): Promise<RestaurantInfo> {
  const data = await gql<{ restaurant: RestaurantInfo }>(apiUrl, RESTAURANT_QUERY, {
    id: restaurantId,
  });
  if (!data.restaurant) throw new Error('Restaurant not found');
  return data.restaurant;
}

export async function fetchAvailability(
  apiUrl: string,
  restaurantId: string,
  date: string,
  partySize: number,
): Promise<AvailabilitySlot[]> {
  const data = await gql<{ availability: AvailabilitySlot[] }>(apiUrl, AVAILABILITY_QUERY, {
    restaurantId,
    date,
    partySize,
  });
  return data.availability.filter((s) => s.available);
}

export async function fetchWidgetBootstrap(
  apiUrl: string,
  restaurantId: string,
  date: string,
  partySize: number,
): Promise<{ restaurant: RestaurantInfo; slots: AvailabilitySlot[] }> {
  const data = await gql<{
    restaurant: RestaurantInfo | null;
    availability: AvailabilitySlot[];
  }>(apiUrl, BOOTSTRAP_QUERY, {
    id: restaurantId,
    date,
    partySize,
  });
  if (!data.restaurant) throw new Error('Restaurant not found');
  return {
    restaurant: data.restaurant,
    slots: (data.availability ?? []).filter((s) => s.available),
  };
}
