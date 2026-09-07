import { gql } from "@apollo/client";

export const BOOKING_AVAILABILITY = gql`
  query BookingAvailability(
    $restaurantId: ID!
    $date: String!
    $partySize: Int!
  ) {
    availability(restaurantId: $restaurantId, date: $date, partySize: $partySize) {
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
      photoUrl
    }
  }
`;

export const CREATE_RESERVATION = gql`
  mutation CreateReservation($input: ReservationInput!) {
    createReservation(input: $input) {
      clientSecret
      reservation {
        id
        status
        slotStart
        partySize
        depositAmountCents
        depositStatus
        restaurant {
          id
          name
          slug
          photos
          averageRating
          reviewCount
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
  }
`;

export const CONFIRM_DEPOSIT = gql`
  mutation ConfirmDepositPayment($paymentIntentId: String!) {
    confirmDepositPayment(paymentIntentId: $paymentIntentId) {
      id
      status
      depositStatus
    }
  }
`;

export const JOIN_WAITLIST = gql`
  mutation JoinWaitlist($input: WaitlistInput!) {
    joinWaitlist(input: $input) {
      id
      status
      preferredDate
      position
      estimatedWaitMinutes
    }
  }
`;

export const MY_WAITLIST = gql`
  query MyWaitlist {
    myWaitlist {
      id
      restaurantId
      preferredDate
      status
      position
      estimatedWaitMinutes
    }
  }
`;

export const MY_RESTAURANT_LOYALTY_BALANCE = gql`
  query MyRestaurantLoyaltyBalance($restaurantId: ID!) {
    myRestaurantLoyaltyBalance(restaurantId: $restaurantId)
  }
`;

export const VALIDATE_PROMOTION = gql`
  query ValidatePromotion(
    $restaurantId: ID!
    $code: String!
    $slotStart: DateTime!
    $depositCents: Int!
  ) {
    validatePromotion(
      restaurantId: $restaurantId
      code: $code
      slotStart: $slotStart
      depositCents: $depositCents
    ) {
      valid
      message
      discountCents
      discountedDepositCents
      autoApplied
      promotion {
        title
        discountPercent
      }
    }
  }
`;

export const BEST_PROMOTION = gql`
  query BestPromotion(
    $restaurantId: ID!
    $slotStart: DateTime!
    $depositCents: Int!
  ) {
    bestPromotion(
      restaurantId: $restaurantId
      slotStart: $slotStart
      depositCents: $depositCents
    ) {
      valid
      message
      discountCents
      discountedDepositCents
      autoApplied
      promotion {
        title
        discountPercent
      }
    }
  }
`;

export const VALIDATE_GIFT_CARD = gql`
  query ValidateGiftCard(
    $restaurantId: ID!
    $code: String!
    $depositCents: Int!
  ) {
    validateGiftCard(
      restaurantId: $restaurantId
      code: $code
      depositCents: $depositCents
    ) {
      valid
      message
      discountCents
      discountedDepositCents
      giftCard {
        code
        balanceCents
      }
    }
  }
`;

export const RESTAURANT_PACKAGES = gql`
  query RestaurantPackages($restaurantId: ID!, $activeOnly: Boolean) {
    restaurantPackages(restaurantId: $restaurantId, activeOnly: $activeOnly) {
      id
      title
      description
      priceCents
      pricePerGuest
      includes
      photoUrl
      occasions
      minPartySize
      maxPartySize
      active
    }
  }
`;

export const EXPERIENCES = gql`
  query Experiences(
    $restaurantId: ID
    $upcoming: Boolean
    $limit: Int
    $offset: Int
  ) {
    experiences(
      restaurantId: $restaurantId
      upcoming: $upcoming
      limit: $limit
      offset: $offset
    ) {
      total
      items {
        id
        restaurantId
        title
        description
        type
        photoUrl
        date
        endDate
        startTime
        endTime
        ticketPriceCents
        availableTickets
        status
        tags
      }
    }
  }
`;

export const PRIVATE_DINING_SPACES = gql`
  query PrivateDiningSpaces($restaurantId: ID!) {
    privateDiningSpaces(restaurantId: $restaurantId) {
      id
      name
      description
      minGuests
      maxGuests
      rentalFeeCents
      minimumSpendCents
      photoUrl
      amenities
      active
    }
  }
`;

export const BOOKING_RESTAURANT = gql`
  query BookingRestaurant($id: ID!) {
    restaurant(id: $id) {
      id
      name
      slug
      photos
      phone
      website
      cuisine
      averageRating
      reviewCount
      depositRequired
      depositAmountCents
      loyaltyEnabled
      loyaltyPointsPerVisit
      loyaltyMinRedeemPoints
      allowGuestTableSelection
      reservationsEnabled
      reservationsVisible
      shifts {
        id
        name
        daysOfWeek
        startTime
        endTime
        active
      }
      address {
        line1
        line2
        city
        state
        zip
        neighborhood
      }
      tables {
        maxCapacity
        active
      }
    }
  }
`;

export const MY_RESERVATION = gql`
  query MyReservation($id: ID!) {
    myReservation(id: $id) {
      id
      status
      slotStart
      slotEnd
      partySize
      occasion
      guestNotes
      depositAmountCents
      depositStatus
      clientSecret
      loyaltyPointsEarned
      hasReview
      packageTitle
      packagePriceCents
      restaurant {
        id
        name
        slug
        photos
        phone
        address {
          line1
          line2
          city
          state
          zip
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
        photoUrl
        floorArea
      }
    }
  }
`;
