export type MyReservation = {
  id: string;
  status: string;
  slotStart: string;
  slotEnd?: string | null;
  partySize: number;
  restaurant: {
    id: string;
    name: string;
    photos: string[];
    timezone?: string | null;
    address?: {
      line1?: string | null;
      city?: string | null;
      state?: string | null;
      neighborhood?: string | null;
    } | null;
  };
};

export type MyReservationsData = {
  myReservations: MyReservation[];
};
