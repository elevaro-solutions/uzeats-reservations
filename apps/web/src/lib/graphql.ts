import { gql } from '@apollo/client';

export const SEARCH_RESTAURANTS = gql`
  query SearchRestaurants($input: SearchRestaurantsInput!) {
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
        address {
          city
          state
        }
        photos
        averageRating
        reviewCount
      }
    }
  }
`;

export const RESTAURANT_DETAIL = gql`
  query RestaurantDetail($id: ID, $slug: String) {
    restaurant(id: $id, slug: $slug) {
      id
      name
      slug
      description
      cuisine
      priceRange
      address {
        line1
        city
        state
        zip
      }
      photos
      averageRating
      reviewCount
      depositRequired
      depositAmountCents
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
          }
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
      remainingTables
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
          name
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

export const MY_RESERVATIONS = gql`
  query MyReservations {
    myReservations {
      id
      status
      slotStart
      partySize
      occasion
      guestNotes
      loyaltyPointsEarned
      restaurant {
        id
        name
        photos
        address {
          city
          state
        }
      }
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

export const RESTAURANT_REVIEWS = gql`
  query RestaurantReviews($restaurantId: ID!, $limit: Int, $offset: Int) {
    restaurantReviews(restaurantId: $restaurantId, limit: $limit, offset: $offset) {
      total
      items {
        id
        rating
        comment
        createdAt
        diner {
          firstName
          lastName
        }
      }
    }
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

export const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email) {
      success
      message
    }
  }
`;

export const RESET_PASSWORD = gql`
  mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword) {
      success
      message
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

export const RESERVATION_FOR_SURVEY = gql`
  query ReservationForSurvey($reservationId: ID!) {
    reservationForSurvey(reservationId: $reservationId) {
      id
      status
      slotStart
      partySize
      restaurantId
      restaurant {
        id
        name
      }
    }
  }
`;

export const SURVEY_CONFIG = gql`
  query SurveyConfig($restaurantId: ID!) {
    surveyConfig(restaurantId: $restaurantId) {
      id
      restaurantId
      enabled
      includeFood
      includeService
      includeAmbience
      includeValue
      includeRecommend
    }
  }
`;

export const SUBMIT_SURVEY = gql`
  mutation SubmitSurvey($input: SurveySubmitInput!) {
    submitSurvey(input: $input) {
      id
      overallRating
      submittedAt
    }
  }
`;

export const MESSAGES = gql`
  query Messages($reservationId: ID!) {
    messages(reservationId: $reservationId) {
      id
      restaurantId
      dinerId
      reservationId
      senderType
      senderId
      body
      readAt
      createdAt
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($reservationId: ID!, $body: String!) {
    sendMessage(reservationId: $reservationId, body: $body) {
      id
      senderType
      body
      createdAt
    }
  }
`;

export const PROMOTIONS = gql`
  query Promotions($restaurantId: ID!, $activeOnly: Boolean, $limit: Int, $offset: Int) {
    promotions(restaurantId: $restaurantId, activeOnly: $activeOnly, limit: $limit, offset: $offset) {
      total
      items {
        id
        title
        description
        discountPercent
        code
        startDate
        endDate
        daysOfWeek
        active
      }
    }
  }
`;

export const EXPERIENCES = gql`
  query Experiences($restaurantId: ID, $upcoming: Boolean, $limit: Int, $offset: Int) {
    experiences(restaurantId: $restaurantId, upcoming: $upcoming, limit: $limit, offset: $offset) {
      total
      items {
        id
        restaurantId
        title
        description
        type
        photoUrl
        date
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

export const PLANS = gql`
  query Plans {
    plans {
      key
      name
      description
      monthlyPriceCents
      networkCoverFeeCents
      websiteCoverFeeCents
      trialDays
      visibleOnPricing
      isCustom
    }
  }
`;

export const MY_NOTIFICATIONS = gql`
  query MyNotifications($limit: Int) {
    myNotifications(limit: $limit) {
      id
      type
      title
      body
      data
      readAt
      createdAt
    }
    unreadNotificationCount
  }
`;

export const MARK_NOTIFICATIONS_READ = gql`
  mutation MarkNotificationsRead($ids: [ID!]) {
    markNotificationsRead(ids: $ids)
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;
