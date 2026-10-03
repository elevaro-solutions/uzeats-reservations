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
        timezone
        address {
          city
          state
        }
        location {
          lat
          lng
        }
        photos
        averageRating
        reviewCount
        availableSlotTimes
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
        line2
        city
        state
        zip
        neighborhood
      }
      location {
        lat
        lng
      }
      phone
      website
      menuUrl
      diningStyles
      discoveryOccasions
      categoryIds
      landmarkIds
      dietaryTags
      amenities
      meals
      wheelchairAccessible
      featured
      faq {
        question
        answer
      }
      featuredIn {
        title
        description
        url
        logoUrl
      }
      termsAndConditions
      photos
      logoUrl
      averageRating
      reviewCount
      isSaved
      isFavorite
      depositRequired
      depositAmountCents
      loyaltyEnabled
      loyaltyPointsPerVisit
      loyaltyMinRedeemPoints
      allowGuestTableSelection
      reservationsEnabled
      reservationsVisible
      manualApprovalEnabled
      manualApprovalPartySizeOp
      manualApprovalPartySize
      shifts {
        daysOfWeek
        startTime
        endTime
        active
      }
      timezone
      bookingWindow {
        maxAdvanceDays
        minAdvanceHours
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
            popular
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

export const BOOKABLE_TABLES = gql`
  query BookableTables($restaurantId: ID!, $slotStart: DateTime!, $partySize: Int!) {
    bookableTables(restaurantId: $restaurantId, slotStart: $slotStart, partySize: $partySize) {
      id
      name
      minCapacity
      maxCapacity
      floorArea
      photoUrl
      requiresManualApproval
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
        requiresManualApproval
        slotStart
        partySize
        depositAmountCents
        depositStatus
        restaurant {
          name
          photos
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

export const STRIPE_CLIENT_CONFIG = gql`
  query StripeClientConfig {
    stripeClientConfig {
      mode
      publishableKey
      sandboxConfigured
      productionConfigured
    }
  }
`;

export const MY_RESERVATIONS = gql`
  query MyReservations {
    myReservations {
      id
      createdAt
      status
      requiresManualApproval
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
      packagePriceCents
      restaurant {
        id
        name
        slug
        photos
        isSaved
        timezone
        address {
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

export const MY_RESERVATION = gql`
  query MyReservation($id: ID!) {
    myReservation(id: $id) {
      id
      status
      requiresManualApproval
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
        isSaved
        timezone
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

export const MY_SAVED_RESTAURANTS = gql`
  query MySavedRestaurants($kind: RestaurantBookmarkKind!) {
    mySavedRestaurants(kind: $kind) {
      id
      name
      slug
      cuisine
      priceRange
      photos
      averageRating
      reviewCount
      address {
        city
        state
        neighborhood
      }
    }
  }
`;

export const SAVE_RESTAURANT = gql`
  mutation SaveRestaurant($restaurantId: ID!) {
    saveRestaurant(restaurantId: $restaurantId)
  }
`;

export const UNSAVE_RESTAURANT = gql`
  mutation UnsaveRestaurant($restaurantId: ID!) {
    unsaveRestaurant(restaurantId: $restaurantId)
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

export const MY_RESTAURANT_LOYALTY_BALANCE = gql`
  query MyRestaurantLoyaltyBalance($restaurantId: ID!) {
    myRestaurantLoyaltyBalance(restaurantId: $restaurantId)
  }
`;

export const LOYALTY_PROGRAM = gql`
  query LoyaltyProgram {
    loyaltyProgram {
      pointsPerCompletedVisit
      pointsPerDollarDeposit
      redeemPointsPerDollar
      minRedeemPoints
      firstBookingBonusPoints
      pointsPerReview
      referralBonusPoints
      pointsExpiryMonths
      tiers {
        id
        name
        minVisits
        earnMultiplier
      }
    }
  }
`;

export const VALIDATE_PROMOTION = gql`
  query ValidatePromotion($restaurantId: ID!, $code: String!, $slotStart: DateTime!, $depositCents: Int!) {
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
  query BestPromotion($restaurantId: ID!, $slotStart: DateTime!, $depositCents: Int!) {
    bestPromotion(restaurantId: $restaurantId, slotStart: $slotStart, depositCents: $depositCents) {
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
  query ValidateGiftCard($restaurantId: ID!, $code: String!, $depositCents: Int!) {
    validateGiftCard(restaurantId: $restaurantId, code: $code, depositCents: $depositCents) {
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

export const CREATE_REVIEW = gql`
  mutation CreateReview($input: ReviewInput!) {
    createReview(input: $input) {
      id
      rating
      foodRating
      serviceRating
      atmosphereRating
      comment
      photos
    }
  }
`;

export const UPDATE_REVIEW = gql`
  mutation UpdateReview($reviewId: ID!, $input: UpdateReviewInput!) {
    updateReview(reviewId: $reviewId, input: $input) {
      id
      rating
      foodRating
      serviceRating
      atmosphereRating
      comment
      photos
    }
  }
`;

export const REACT_TO_REVIEW = gql`
  mutation ReactToReview($reviewId: ID!, $reaction: ReviewReactionType!) {
    reactToReview(reviewId: $reviewId, reaction: $reaction) {
      id
      myReaction
      reactionCounts {
        love
        helpful
        amazing
        yum
        omg
        total
      }
    }
  }
`;

export const DELETE_REVIEW = gql`
  mutation DeleteReview($reviewId: ID!) {
    deleteReview(reviewId: $reviewId)
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

export const RESTAURANT_REVIEWS = gql`
  query RestaurantReviews(
    $restaurantId: ID!
    $limit: Int
    $offset: Int
    $sort: ReviewSort
  ) {
    restaurantReviews(
      restaurantId: $restaurantId
      limit: $limit
      offset: $offset
      sort: $sort
    ) {
      total
      items {
        id
        dinerId
        rating
        foodRating
        serviceRating
        atmosphereRating
        comment
        photos
        createdAt
        ownerReply
        myReaction
        reactionCounts {
          love
          helpful
          amazing
          yum
          omg
          total
        }
        diner {
          firstName
          lastName
        }
      }
    }
  }
`;

export const MY_REVIEWS = gql`
  query MyReviews($limit: Int, $offset: Int) {
    myReviews(limit: $limit, offset: $offset) {
      total
      items {
        id
        rating
        foodRating
        serviceRating
        atmosphereRating
        comment
        photos
        ownerReply
        ownerRepliedAt
        hidden
        createdAt
        reservationId
        restaurant {
          id
          name
          slug
          logoUrl
          cuisine
          address {
            city
            state
          }
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

export const UPDATE_RESERVATION = gql`
  mutation UpdateReservation($id: ID!, $input: UpdateReservationInput!) {
    updateReservation(id: $id, input: $input) {
      id
      status
      slotStart
      slotEnd
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

export const UPDATE_NOTIFICATION_PREFERENCES = gql`
  mutation UpdateNotificationPreferences($input: NotificationPreferencesInput!) {
    updateNotificationPreferences(input: $input) {
      id
      notificationPreferences {
        reservationUpdates { sms email webPush platform }
        waitlistAvailable { sms email webPush platform }
        availabilityAlerts { sms email webPush platform }
      }
    }
  }
`;

export const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($email: String!, $app: String) {
    requestPasswordReset(email: $email, app: $app) {
      success
      message
      attemptsUsed
      attemptsRemaining
      maxAttempts
      supportEmail
    }
  }
`;

export const VERIFY_EMAIL = gql`
  mutation VerifyEmail($code: String!) {
    verifyEmail(code: $code) {
      success
      message
    }
  }
`;

export const RESEND_VERIFICATION_EMAIL = gql`
  mutation ResendVerificationEmail {
    resendVerificationEmail {
      success
      message
      emailed
      devCode
    }
  }
`;

export const SUBMIT_CONTACT_FORM = gql`
  mutation SubmitContactForm($input: ContactFormInput!) {
    submitContactForm(input: $input) {
      success
      message
    }
  }
`;

export const SEND_RESTAURANT_INQUIRY = gql`
  mutation SendRestaurantInquiry($input: RestaurantInquiryInput!) {
    sendRestaurantInquiry(input: $input) {
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
      position
      partiesAhead
      estimatedWaitMinutes
      estimatedReadyAt
      createdAt
      restaurant {
        id
        name
      }
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
        timezone
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

export const REPORT_RUNNING_LATE = gql`
  mutation ReportRunningLate($reservationId: ID!, $etaMinutes: Int) {
    reportRunningLate(reservationId: $reservationId, etaMinutes: $etaMinutes) {
      id
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
        discountAmountCents
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
        endDate
        startTime
        endTime
        minGuests
        maxGuests
        ticketPriceCents
        availableTickets
        includes
        status
        tags
        requiresManualApproval
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
      requiresManualApproval
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
      requiresManualApproval
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
      originalMonthlyPriceCents
      discountType
      discountPercent
      discountAmountCents
      annualFreeMonths
      networkCoverFeeCents
      websiteCoverFeeCents
      trialDays
      visibleOnPricing
      isCustom
      highlights
    }
    annualBillingSettings {
      enabled
      scope
      planKeys
      discountType
      freeMonths
      discountPercent
    }
  }
`;

export const MY_NOTIFICATIONS = gql`
  query MyNotifications($limit: Int, $offset: Int) {
    myNotifications(limit: $limit, offset: $offset) {
      items {
        id
        type
        title
        body
        data
        readAt
        createdAt
      }
      total
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

export const INVOICE_BY_PAY_TOKEN = gql`
  query InvoiceByPayToken($token: String!) {
    invoiceByPayToken(token: $token) {
      id
      number
      restaurantName
      status
      billingPeriod
      currency
      totalCents
      originalTotalCents
      isDiscounted
      dueDate
      packageDurationMonths
      planKey
      billingCycle
      lines {
        description
        quantity
        amountCents
        originalAmountCents
      }
      paidAt
    }
  }
`;

export const START_INVOICE_PAYMENT = gql`
  mutation StartInvoicePayment($token: String!) {
    startInvoicePayment(token: $token) {
      clientSecret
      paymentIntentId
      alreadyPaid
      isStub
      invoice {
        id
        number
        status
        totalCents
        currency
      }
    }
  }
`;

export const CONFIRM_INVOICE_PAYMENT = gql`
  mutation ConfirmInvoicePayment($token: String!, $paymentIntentId: String!) {
    confirmInvoicePayment(token: $token, paymentIntentId: $paymentIntentId) {
      id
      number
      status
      paidAt
      totalCents
    }
  }
`;

export const EXPORT_INVOICE_PDF_BY_TOKEN = gql`
  query ExportInvoicePdfByToken($token: String!) {
    exportInvoicePdfByToken(token: $token) {
      filename
      content
      mimeType
      encoding
    }
  }
`;
