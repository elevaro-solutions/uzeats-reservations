import { gql } from "@apollo/client";

export const RESTAURANT_RESERVATIONS = gql`
  query RestaurantReservations(
    $restaurantId: ID!
    $date: String
    $limit: Int
    $offset: Int
  ) {
    restaurantReservations(
      restaurantId: $restaurantId
      date: $date
      limit: $limit
      offset: $offset
    ) {
      total
      items {
        id
        partySize
        slotStart
        slotEnd
        status
        occasion
        guestNotes
        source
        tableIds
        diner {
          id
          firstName
          lastName
          phone
          email
        }
        tables {
          id
          name
          floorArea
        }
      }
    }
  }
`;

export const CREATE_OWNER_RESERVATION = gql`
  mutation CreateOwnerReservation($input: OwnerReservationInput!) {
    createOwnerReservation(input: $input) {
      id
      status
      slotStart
      partySize
    }
  }
`;

export const UPDATE_RESERVATION = gql`
  mutation UpdateReservation($id: ID!, $input: UpdateReservationInput!) {
    updateReservation(id: $id, input: $input) {
      id
      status
      slotStart
      partySize
      occasion
      guestNotes
      tables {
        id
        name
      }
    }
  }
`;

export const UPDATE_RESERVATION_STATUS = gql`
  mutation UpdateReservationStatus(
    $id: ID!
    $status: ReservationStatus!
    $reason: String
  ) {
    updateReservationStatus(id: $id, status: $status, reason: $reason) {
      id
      status
    }
  }
`;

export const AVAILABILITY = gql`
  query Availability($restaurantId: ID!, $date: String!, $partySize: Int!) {
    availability(
      restaurantId: $restaurantId
      date: $date
      partySize: $partySize
    ) {
      time
      available
      remainingTables
    }
  }
`;

export const BOOKABLE_TABLES = gql`
  query BookableTables(
    $restaurantId: ID!
    $slotStart: DateTime!
    $partySize: Int!
  ) {
    bookableTables(
      restaurantId: $restaurantId
      slotStart: $slotStart
      partySize: $partySize
    ) {
      id
      name
      minCapacity
      maxCapacity
      floorArea
    }
  }
`;
