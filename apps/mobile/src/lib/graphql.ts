import { gql } from '@apollo/client';

export const SEARCH = gql`
  query Search($input: SearchRestaurantsInput!) {
    searchRestaurants(input: $input) {
      items {
        id
        name
        cuisine
        priceRange
        averageRating
        photos
        address { city state }
      }
    }
  }
`;

export const AVAILABILITY = gql`
  query Availability($restaurantId: ID!, $date: String!, $partySize: Int!) {
    availability(restaurantId: $restaurantId, date: $date, partySize: $partySize) {
      time
      available
    }
  }
`;

export const RESTAURANT = gql`
  query Restaurant($id: ID!) {
    restaurant(id: $id) {
      id
      name
      description
      cuisine
      photos
      depositRequired
      depositAmountCents
      averageRating
      address { line1 city state zip }
    }
  }
`;

export const BOOK = gql`
  mutation Book($input: ReservationInput!) {
    createReservation(input: $input) {
      reservation {
        id
        status
        slotStart
      }
      clientSecret
    }
  }
`;

export const MY_RESERVATIONS = gql`
  query MyReservations {
    myReservations {
      id
      status
      slotStart
      partySize
      restaurant { id name photos }
    }
  }
`;

export const REGISTER_PUSH = gql`
  mutation RegisterPush($token: String!, $platform: String!) {
    registerPushToken(token: $token, platform: $platform)
  }
`;

export const UPDATE_RESERVATION_STATUS = gql`
  mutation UpdateReservationStatus($id: ID!, $status: ReservationStatus!, $reason: String) {
    updateReservationStatus(id: $id, status: $status, reason: $reason) {
      id
      status
    }
  }
`;

export const CREATE_REVIEW = gql`
  mutation CreateReview($input: ReviewInput!) {
    createReview(input: $input) {
      id
      rating
      comment
    }
  }
`;

export const JOIN_WAITLIST = gql`
  mutation JoinWaitlist($input: WaitlistInput!) {
    joinWaitlist(input: $input) {
      id
      status
      preferredDate
    }
  }
`;

export const MY_WAITLIST = gql`
  query MyWaitlist {
    myWaitlist {
      id
      restaurantId
      partySize
      preferredDate
      preferredTimeStart
      preferredTimeEnd
      status
      notifiedSlot
      createdAt
    }
  }
`;

export const CANCEL_WAITLIST = gql`
  mutation CancelWaitlist($id: ID!) {
    cancelWaitlist(id: $id)
  }
`;

export const MY_RESTAURANTS_FLOOR_PLAN = gql`
  query MyRestaurantsFloorPlan {
    myRestaurants {
      id
      name
      tables {
        id
        name
        minCapacity
        maxCapacity
        floorArea
        active
        posX
        posY
        width
        height
        shape
      }
    }
  }
`;

export const FLOOR_PLAN_RESERVATIONS = gql`
  query FloorPlanReservations($restaurantId: ID!, $date: String) {
    restaurantReservations(restaurantId: $restaurantId, date: $date) {
      id
      status
      tableIds
    }
  }
`;
