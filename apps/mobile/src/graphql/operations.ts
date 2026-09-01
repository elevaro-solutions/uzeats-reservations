import { gql } from "@apollo/client";

export const SEARCH = gql`
  query Search($input: SearchRestaurantsInput!) {
    searchRestaurants(input: $input) {
      total
      page
      limit
      items {
        id
        name
        slug
        cuisine
        priceRange
        photos
        averageRating
        reviewCount
        featured
        isFavorite
        address {
          line1
          city
          state
          neighborhood
        }
        shifts {
          daysOfWeek
          startTime
          endTime
          active
        }
      }
    }
  }
`;

export const DISCOVERY_INDEX = gql`
  query DiscoveryIndex {
    discoveryIndex {
      cities {
        slug
        label
        count
        city
        state
      }
      neighborhoods {
        slug
        label
        count
        city
        state
        neighborhood
      }
      cuisines {
        slug
        label
        count
      }
      occasions {
        slug
        label
        count
      }
    }
  }
`;

export const RESTAURANT = gql`
  query Restaurant($id: ID!) {
    restaurant(id: $id) {
      id
      name
      slug
      description
      cuisine
      priceRange
      photos
      phone
      website
      menuUrl
      depositRequired
      depositAmountCents
      averageRating
      reviewCount
      featured
      isFavorite
      wheelchairAccessible
      amenities
      meals
      diningStyles
      dietaryTags
      termsAndConditions
      allowGuestTableSelection
      reservationsEnabled
      reservationsVisible
      loyaltyEnabled
      loyaltyMinRedeemPoints
      location {
        lat
        lng
      }
      faq {
        question
        answer
      }
      address {
        line1
        line2
        city
        state
        zip
        neighborhood
      }
      shifts {
        daysOfWeek
        startTime
        endTime
        active
      }
      menu {
        sections {
          id
          name
          items {
            id
            name
            description
            priceCents
            dietary
            photoUrl
          }
        }
      }
    }
  }
`;

export const RESTAURANT_REVIEWS = gql`
  query RestaurantReviews($restaurantId: ID!, $limit: Int, $offset: Int) {
    restaurantReviews(
      restaurantId: $restaurantId
      limit: $limit
      offset: $offset
    ) {
      total
      items {
        id
        rating
        comment
        createdAt
        ownerReply
        diner {
          firstName
          lastName
        }
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
      createdAt
      status
      slotStart
      slotEnd
      partySize
      occasion
      guestNotes
      depositAmountCents
      depositStatus
      loyaltyPointsEarned
      hasReview
      packageTitle
      restaurant {
        id
        name
        slug
        photos
        address {
          line1
          city
          state
        }
      }
      tables {
        id
        name
        photoUrl
        floorArea
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

export const FAVORITE_RESTAURANT = gql`
  mutation FavoriteRestaurant($restaurantId: ID!) {
    favoriteRestaurant(restaurantId: $restaurantId)
  }
`;

export const UNFAVORITE_RESTAURANT = gql`
  mutation UnfavoriteRestaurant($restaurantId: ID!) {
    unfavoriteRestaurant(restaurantId: $restaurantId)
  }
`;

export const CREATE_REVIEW = gql`
  mutation CreateReview($input: ReviewInput!) {
    createReview(input: $input) {
      id
      rating
      comment
      createdAt
    }
  }
`;
