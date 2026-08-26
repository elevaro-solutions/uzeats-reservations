export type MockRestaurant = {
  id: string;
  name: string;
  cuisine: string;
  neighborhood: string;
  priceRange: string;
  rating: number;
  partyHint: string;
};

export const MOCK_RESTAURANTS: MockRestaurant[] = [
  {
    id: "1",
    name: "Olive & Ember",
    cuisine: "Mediterranean",
    neighborhood: "West Village",
    priceRange: "$$$",
    rating: 4.8,
    partyHint: "Tables for 2–8",
  },
  {
    id: "2",
    name: "Cedar Room",
    cuisine: "New American",
    neighborhood: "SoHo",
    priceRange: "$$$$",
    rating: 4.6,
    partyHint: "Chef's counter available",
  },
  {
    id: "3",
    name: "Saffron House",
    cuisine: "Indian",
    neighborhood: "East Village",
    priceRange: "$$",
    rating: 4.7,
    partyHint: "Great for groups",
  },
  {
    id: "4",
    name: "Harbor Light",
    cuisine: "Seafood",
    neighborhood: "Battery Park",
    priceRange: "$$$",
    rating: 4.5,
    partyHint: "Waterfront seating",
  },
];
