import { gql } from "@apollo/client";

export const FLOOR_PLAN_OPS = gql`
  query FloorPlanOps($restaurantId: ID!, $date: String) {
    floorPlanOps(restaurantId: $restaurantId, date: $date) {
      date
      tables {
        status
        seatedMinutes
        turnMinutesRemaining
        table {
          id
          name
          minCapacity
          maxCapacity
          floorArea
        }
        reservation {
          id
          partySize
          slotStart
          slotEnd
          status
          seatedAt
          guestNotes
          diner {
            firstName
            lastName
          }
          tables {
            id
            name
          }
        }
      }
      unassigned {
        id
        partySize
        slotStart
        slotEnd
        status
        guestNotes
        diner {
          firstName
          lastName
        }
        tables {
          id
          name
        }
      }
    }
  }
`;

export const SEAT_RESERVATION_AT_TABLE = gql`
  mutation SeatReservationAtTable($reservationId: ID!, $tableId: ID!) {
    seatReservationAtTable(reservationId: $reservationId, tableId: $tableId) {
      id
      status
      seatedAt
      tableIds
      tables {
        id
        name
      }
    }
  }
`;

export { UPDATE_RESERVATION_STATUS } from "@/features/reservations/api/reservations.operations";
