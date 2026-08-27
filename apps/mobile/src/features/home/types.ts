export type MyReservation = {
  id: string;
  status: string;
  slotStart: string;
  partySize: number;
  restaurant: {
    id: string;
    name: string;
    photos: string[];
  };
};

export type MyReservationsData = {
  myReservations: MyReservation[];
};
