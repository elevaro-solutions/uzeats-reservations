import { gql } from "@apollo/client";

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
        address {
          city
          state
        }
      }
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
      address {
        line1
        city
        state
        zip
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

export const BOOK = gql`
  mutation Book($input: ReservationInput!) {
    createReservation(input: $input) {
      reservation {
        id
        status
        slotStart
        depositAmountCents
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
      restaurant {
        id
        name
        photos
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

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        firstName
        lastName
        role
        loyaltyPoints
        loyaltyCompletedVisits
        loyaltyTier
        loyaltyTierName
        referralCode
      }
    }
  }
`;

export const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        firstName
        lastName
        role
        loyaltyPoints
        loyaltyCompletedVisits
        loyaltyTier
        loyaltyTierName
        referralCode
      }
    }
  }
`;

export const LOGIN_WITH_GOOGLE = gql`
  mutation LoginWithGoogle($idToken: String!) {
    loginWithGoogle(idToken: $idToken) {
      accessToken
      refreshToken
      user {
        id
        email
        firstName
        lastName
        role
        loyaltyPoints
        loyaltyCompletedVisits
        loyaltyTier
        loyaltyTierName
        referralCode
      }
    }
  }
`;

export const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($email: String!, $app: String) {
    requestPasswordReset(email: $email, app: $app) {
      success
      message
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout($refreshToken: String) {
    logout(refreshToken: $refreshToken)
  }
`;

export const ME = gql`
  query Me {
    me {
      id
      email
      firstName
      lastName
      role
      loyaltyPoints
      loyaltyCompletedVisits
      loyaltyTier
      loyaltyTierName
      referralCode
    }
  }
`;
