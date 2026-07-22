import { gql } from '@apollo/client';

export const MY_RESTAURANTS = gql`
  query MyRestaurants(
    $search: String
    $status: RestaurantStatus
    $city: String
  ) {
    myRestaurants(search: $search, status: $status, city: $city) {
      id
      slug
      name
      status
      cuisine
      description
      priceRange
      photos
      phone
      website
      address {
        line1
        city
        state
        zip
        country
      }
      location {
        lat
        lng
      }
      depositRequired
      depositAmountCents
      loyaltyEnabled
      loyaltyPointsPerVisit
      loyaltyMinRedeemPoints
      tables {
        id name minCapacity maxCapacity floorArea active combinable
      }
      shifts {
        id name daysOfWeek startTime endTime slotIntervalMinutes turnTimeMinutes active
      }
      menu {
        id
        sections {
          id name
          items { id name description priceCents dietary available photoUrl }
        }
      }
    }
  }
`;

export const MY_RESTAURANT_LOCATIONS_META = gql`
  query MyRestaurantLocationsMeta {
    myRestaurantLocationsMeta {
      total
      cities
    }
  }
`;

export const RESTAURANT_RESERVATIONS = gql`
  query RestaurantReservations($restaurantId: ID!, $date: String, $limit: Int, $offset: Int) {
    restaurantReservations(restaurantId: $restaurantId, date: $date, limit: $limit, offset: $offset) {
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
        diner { id firstName lastName phone email }
        tables { id name floorArea }
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

export const CREATE_OWNER_RESERVATION = gql`
  mutation CreateOwnerReservation($input: OwnerReservationInput!) {
    createOwnerReservation(input: $input) {
      id status slotStart partySize
    }
  }
`;

export const UPDATE_RESERVATION = gql`
  mutation UpdateReservation($id: ID!, $input: UpdateReservationInput!) {
    updateReservation(id: $id, input: $input) {
      id status slotStart partySize occasion guestNotes
      tables { id name }
    }
  }
`;

export const DELETE_RESERVATION = gql`
  mutation DeleteReservation($id: ID!) {
    deleteReservation(id: $id)
  }
`;

export const UPDATE_RESERVATION_STATUS = gql`
  mutation UpdateReservationStatus($id: ID!, $status: ReservationStatus!, $reason: String) {
    updateReservationStatus(id: $id, status: $status, reason: $reason) {
      id status
    }
  }
`;

export const RESTAURANT_WAITLIST = gql`
  query RestaurantWaitlist($restaurantId: ID!, $limit: Int, $offset: Int) {
    restaurantWaitlist(restaurantId: $restaurantId, limit: $limit, offset: $offset) {
      total
      items {
        id partySize preferredDate preferredTimeStart status createdAt
        dinerId
      }
    }
  }
`;

export const CREATE_TABLE = gql`
  mutation CreateTable($restaurantId: ID!, $input: TableInput!) {
    createTable(restaurantId: $restaurantId, input: $input) {
      id name
    }
  }
`;

export const DELETE_TABLE = gql`
  mutation DeleteTable($id: ID!) {
    deleteTable(id: $id)
  }
`;

export const CREATE_SHIFT = gql`
  mutation CreateShift($restaurantId: ID!, $input: ShiftInput!) {
    createShift(restaurantId: $restaurantId, input: $input) {
      id name
    }
  }
`;

export const DELETE_SHIFT = gql`
  mutation DeleteShift($id: ID!) {
    deleteShift(id: $id)
  }
`;

export const UPSERT_MENU = gql`
  mutation UpsertMenu($restaurantId: ID!, $input: MenuInput!) {
    upsertMenu(restaurantId: $restaurantId, input: $input) {
      id
    }
  }
`;

export const CREATE_RESTAURANT = gql`
  mutation CreateRestaurant($input: RestaurantInput!, $plan: String!) {
    createRestaurant(input: $input, plan: $plan) {
      id name status
    }
  }
`;

export const CREATE_UPLOAD_URL = gql`
  mutation CreateUploadUrl($filename: String!, $contentType: String!) {
    createUploadUrl(filename: $filename, contentType: $contentType) {
      uploadUrl publicUrl key
    }
  }
`;

export const ADMIN_STATS = gql`
  query AdminStats {
    adminStats {
      users
      restaurants
      reservations
      pendingRestaurants
      mrrCents
      activeSubscriptions
      openInvoices
    }
  }
`;

export const ADMIN_LOYALTY_STATS = gql`
  query AdminLoyaltyStats {
    adminLoyaltyStats {
      totalOutstandingPoints
      usersWithPoints
      tierBronze
      tierSilver
      tierGold
      referralsCount
      pointsEarned30d
      pointsRedeemed30d
    }
    adminReferralLeaders(limit: 15) {
      userId
      firstName
      lastName
      email
      referralCode
      refereesCount
    }
  }
`;

export const RESTAURANT_LOYALTY_STATS = gql`
  query RestaurantLoyaltyStats($restaurantId: ID!) {
    restaurantLoyaltyStats(restaurantId: $restaurantId) {
      loyaltyEnabled
      totalOutstandingPoints
      guestsWithPoints
      pointsEarned30d
      pointsRedeemed30d
      totalVisitsAwarded
    }
  }
`;

export const ADMIN_RESTAURANTS = gql`
  query AdminRestaurants(
    $status: RestaurantStatus
    $search: String
    $limit: Int
    $offset: Int
  ) {
    adminRestaurants(status: $status, search: $search, limit: $limit, offset: $offset) {
      total
      items {
        id
        name
        status
        cuisine
        description
        priceRange
        phone
        website
        photos
        ownerId
        featured
        featuredUntil
        depositRequired
        depositAmountCents
        address { line1 line2 city state zip country }
        location { lat lng }
        createdAt
      }
    }
  }
`;

export const ADMIN_UPDATE_RESTAURANT = gql`
  mutation AdminUpdateRestaurant(
    $id: ID!
    $input: RestaurantInput!
    $featured: Boolean
    $featuredUntil: DateTime
    $ownerId: ID
  ) {
    adminUpdateRestaurant(
      id: $id
      input: $input
      featured: $featured
      featuredUntil: $featuredUntil
      ownerId: $ownerId
    ) {
      id
      name
      status
      cuisine
      description
      priceRange
      phone
      website
      photos
      ownerId
      featured
      featuredUntil
      depositRequired
      depositAmountCents
      address { line1 line2 city state zip country }
      location { lat lng }
    }
  }
`;

export const ADMIN_UPDATE_USER = gql`
  mutation AdminUpdateUser($userId: ID!, $input: AdminUserInput!) {
    adminUpdateUser(userId: $userId, input: $input) {
      id
      email
      phone
      firstName
      lastName
      role
      loyaltyPoints
      emailVerified
      phoneVerified
      restaurantIds
    }
  }
`;

export const SET_RESTAURANT_STATUS = gql`
  mutation SetRestaurantStatus($id: ID!, $status: RestaurantStatus!) {
    setRestaurantStatus(id: $id, status: $status) {
      id status
    }
  }
`;

export const ADMIN_USERS = gql`
  query AdminUsers($search: String, $limit: Int, $offset: Int) {
    adminUsers(search: $search, limit: $limit, offset: $offset) {
      total
      items { id email phone firstName lastName role loyaltyPoints emailVerified phoneVerified restaurantIds createdAt }
    }
  }
`;

export const SET_USER_ROLE = gql`
  mutation SetUserRole($userId: ID!, $role: UserRole!) {
    setUserRole(userId: $userId, role: $role) {
      id role restaurantIds
    }
  }
`;

export const START_IMPERSONATION = gql`
  mutation StartImpersonation($userId: ID!) {
    startImpersonation(userId: $userId) {
      accessToken
      expiresInSeconds
      user { id email firstName lastName role restaurantIds }
      impersonator { id firstName lastName email }
    }
  }
`;

export const INVITE_STAFF = gql`
  mutation InviteStaff(
    $email: String!
    $firstName: String!
    $lastName: String!
    $restaurantIds: [ID!]!
    $role: UserRole
  ) {
    inviteStaff(
      email: $email
      firstName: $firstName
      lastName: $lastName
      restaurantIds: $restaurantIds
      role: $role
    ) {
      inviteUrl
      email
      user { id email role restaurantIds }
    }
  }
`;

export const ASSIGN_USER_RESTAURANTS = gql`
  mutation AssignUserRestaurants($userId: ID!, $restaurantIds: [ID!]!, $role: UserRole) {
    assignUserRestaurants(userId: $userId, restaurantIds: $restaurantIds, role: $role) {
      id role restaurantIds
    }
  }
`;

export const REMOVE_USER_RESTAURANT = gql`
  mutation RemoveUserRestaurant($userId: ID!, $restaurantId: ID!) {
    removeUserRestaurant(userId: $userId, restaurantId: $restaurantId) {
      id restaurantIds
    }
  }
`;

export const SUPPORT_TICKETS = gql`
  query SupportTickets(
    $status: String
    $assigneeId: ID
    $restaurantId: ID
    $search: String
    $limit: Int
    $offset: Int
  ) {
    supportTickets(
      status: $status
      assigneeId: $assigneeId
      restaurantId: $restaurantId
      search: $search
      limit: $limit
      offset: $offset
    ) {
      total
      items {
        id
        subject
        subjectKey
        description
        status
        priority
        category
        requesterId
        restaurantId
        assigneeId
        firstResponseAt
        resolvedAt
        createdAt
        updatedAt
        requester { id firstName lastName email role }
        assignee { id firstName lastName email role }
        restaurant { id name status }
        notes { id body authorId createdAt }
        attachments { id filename }
      }
    }
  }
`;

export const SUPPORT_TICKET = gql`
  query SupportTicket($id: ID!) {
    supportTicket(id: $id) {
      id
      subject
      subjectKey
      description
      status
      priority
      category
      requesterId
      restaurantId
      assigneeId
      firstResponseAt
      resolvedAt
      createdAt
      updatedAt
      requester { id firstName lastName email role }
      assignee { id firstName lastName email role }
      restaurant { id name status }
      notes {
        id
        body
        authorId
        createdAt
        updatedAt
        author { id firstName lastName email role }
      }
      attachments {
        id
        url
        key
        filename
        contentType
        size
        uploadedById
        createdAt
        uploadedBy { id firstName lastName email role }
      }
      events {
        id
        type
        field
        from
        to
        message
        actorId
        createdAt
        actor { id firstName lastName email role }
      }
    }
  }
`;

export const CREATE_SUPPORT_TICKET = gql`
  mutation CreateSupportTicket(
    $subject: String
    $subjectKey: String
    $description: String
    $priority: String
    $category: String
    $requesterId: ID
    $restaurantId: ID
    $assigneeId: ID
    $note: String
  ) {
    createSupportTicket(
      subject: $subject
      subjectKey: $subjectKey
      description: $description
      priority: $priority
      category: $category
      requesterId: $requesterId
      restaurantId: $restaurantId
      assigneeId: $assigneeId
      note: $note
    ) {
      id
      subject
      status
    }
  }
`;

export const UPDATE_SUPPORT_TICKET = gql`
  mutation UpdateSupportTicket(
    $id: ID!
    $status: String
    $priority: String
    $category: String
    $subject: String
    $subjectKey: String
    $description: String
    $assigneeId: ID
    $restaurantId: ID
    $requesterId: ID
  ) {
    updateSupportTicket(
      id: $id
      status: $status
      priority: $priority
      category: $category
      subject: $subject
      subjectKey: $subjectKey
      description: $description
      assigneeId: $assigneeId
      restaurantId: $restaurantId
      requesterId: $requesterId
    ) {
      id
      subject
      subjectKey
      description
      status
      priority
      category
      assigneeId
      restaurantId
      requesterId
      assignee { id firstName lastName email role }
      restaurant { id name status }
      requester { id firstName lastName email role }
      events {
        id
        type
        field
        from
        to
        message
        actorId
        createdAt
        actor { id firstName lastName email role }
      }
      updatedAt
    }
  }
`;

export const ADD_SUPPORT_NOTE = gql`
  mutation AddSupportNote($ticketId: ID!, $body: String!) {
    addSupportNote(ticketId: $ticketId, body: $body) {
      id
      status
      notes {
        id
        body
        authorId
        createdAt
        updatedAt
        author { id firstName lastName email role }
      }
      events {
        id
        type
        field
        from
        to
        message
        actorId
        createdAt
        actor { id firstName lastName email role }
      }
    }
  }
`;

export const UPDATE_SUPPORT_NOTE = gql`
  mutation UpdateSupportNote($ticketId: ID!, $noteId: ID!, $body: String!) {
    updateSupportNote(ticketId: $ticketId, noteId: $noteId, body: $body) {
      id
      notes {
        id
        body
        authorId
        createdAt
        updatedAt
        author { id firstName lastName email role }
      }
      events {
        id
        type
        field
        from
        to
        message
        actorId
        createdAt
        actor { id firstName lastName email role }
      }
    }
  }
`;

export const DELETE_SUPPORT_NOTE = gql`
  mutation DeleteSupportNote($ticketId: ID!, $noteId: ID!) {
    deleteSupportNote(ticketId: $ticketId, noteId: $noteId) {
      id
      notes {
        id
        body
        authorId
        createdAt
        updatedAt
        author { id firstName lastName email role }
      }
      events {
        id
        type
        field
        from
        to
        message
        actorId
        createdAt
        actor { id firstName lastName email role }
      }
    }
  }
`;

export const ADD_SUPPORT_ATTACHMENT = gql`
  mutation AddSupportAttachment(
    $ticketId: ID!
    $url: String!
    $key: String
    $filename: String!
    $contentType: String!
    $size: Int
  ) {
    addSupportAttachment(
      ticketId: $ticketId
      url: $url
      key: $key
      filename: $filename
      contentType: $contentType
      size: $size
    ) {
      id
      attachments {
        id
        url
        key
        filename
        contentType
        size
        uploadedById
        createdAt
        uploadedBy { id firstName lastName email role }
      }
      events {
        id
        type
        field
        from
        to
        message
        actorId
        createdAt
        actor { id firstName lastName email role }
      }
    }
  }
`;

export const UPDATE_SUPPORT_ATTACHMENT = gql`
  mutation UpdateSupportAttachment($ticketId: ID!, $attachmentId: ID!, $filename: String!) {
    updateSupportAttachment(
      ticketId: $ticketId
      attachmentId: $attachmentId
      filename: $filename
    ) {
      id
      attachments {
        id
        url
        key
        filename
        contentType
        size
        uploadedById
        createdAt
        uploadedBy { id firstName lastName email role }
      }
      events {
        id
        type
        field
        from
        to
        message
        actorId
        createdAt
        actor { id firstName lastName email role }
      }
    }
  }
`;

export const REMOVE_SUPPORT_ATTACHMENT = gql`
  mutation RemoveSupportAttachment($ticketId: ID!, $attachmentId: ID!) {
    removeSupportAttachment(ticketId: $ticketId, attachmentId: $attachmentId) {
      id
      attachments {
        id
        url
        key
        filename
        contentType
        size
        uploadedById
        createdAt
        uploadedBy { id firstName lastName email role }
      }
      events {
        id
        type
        field
        from
        to
        message
        actorId
        createdAt
        actor { id firstName lastName email role }
      }
    }
  }
`;

export const EMAIL_TEMPLATES = gql`
  query EmailTemplates {
    emailTemplates {
      id key name subject bodyHtml bodyText description updatedAt
    }
  }
`;

export const UPDATE_EMAIL_TEMPLATE = gql`
  mutation UpdateEmailTemplate(
    $key: String!
    $subject: String
    $bodyHtml: String
    $bodyText: String
    $name: String
  ) {
    updateEmailTemplate(
      key: $key
      subject: $subject
      bodyHtml: $bodyHtml
      bodyText: $bodyText
      name: $name
    ) {
      id key subject bodyHtml bodyText name updatedAt
    }
  }
`;

export const CHURN_ALERTS = gql`
  query ChurnAlerts {
    churnAlerts {
      id alertType restaurantId restaurantName plan status monthlyPriceCents
      trialEndsAt cancelledAt updatedAt
    }
  }
`;

export const SLA_METRICS = gql`
  query SlaMetrics {
    slaMetrics {
      pendingRestaurantApprovals
      oldestPendingApprovalHours
      avgApprovalHoursLast30d
      openSupportTickets
      avgFirstResponseHoursLast30d
      avgResolutionHoursLast30d
      flaggedReviews
      flaggedMessages
      overdueOrPendingInvoices
    }
  }
`;

export const FLAGGED_CONTENT = gql`
  query FlaggedContent($limit: Int) {
    flaggedContent(limit: $limit) {
      reviews {
        id type restaurantId restaurantName authorName body rating hidden
        flagReason flaggedAt createdAt
      }
      messages {
        id type restaurantId restaurantName authorName body hidden
        flagReason flaggedAt createdAt
      }
    }
  }
`;

export const UNFLAG_REVIEW = gql`
  mutation UnflagReview($id: ID!) {
    unflagReview(id: $id) { id flaggedAt }
  }
`;

export const SET_REVIEW_HIDDEN_ADMIN = gql`
  mutation SetReviewHiddenAdmin($id: ID!, $hidden: Boolean!) {
    setReviewHiddenAdmin(id: $id, hidden: $hidden) { id hidden }
  }
`;

export const UNFLAG_MESSAGE = gql`
  mutation UnflagMessage($id: ID!) {
    unflagMessage(id: $id) { id flaggedAt }
  }
`;

export const SET_MESSAGE_HIDDEN = gql`
  mutation SetMessageHidden($id: ID!, $hidden: Boolean!) {
    setMessageHidden(id: $id, hidden: $hidden) { id hidden }
  }
`;

export const EXPORT_ADMIN_CSV = gql`
  mutation ExportAdminCsv($type: String!, $period: String) {
    exportAdminCsv(type: $type, period: $period) {
      filename content rowCount
    }
  }
`;

export const SYNC_STRIPE_INVOICES = gql`
  mutation SyncStripeInvoices($limit: Int) {
    syncStripeInvoices(limit: $limit) {
      synced message
    }
  }
`;

export const SESSION_INFO = gql`
  query SessionInfo {
    session {
      isImpersonating
      user { id email firstName lastName role restaurantIds }
      impersonator { id firstName lastName email }
    }
  }
`;

export const ADMIN_SEND_PASSWORD_RESET = gql`
  mutation AdminSendPasswordReset($userId: ID!, $sendEmail: Boolean) {
    adminSendPasswordReset(userId: $userId, sendEmail: $sendEmail) {
      success
      message
      resetUrl
      emailed
      email
    }
  }
`;

export const ADMIN_INVOICES = gql`
  query AdminInvoices($status: InvoiceStatus, $search: String, $limit: Int, $offset: Int) {
    adminInvoices(status: $status, search: $search, limit: $limit, offset: $offset) {
      total
      items {
        id
        number
        restaurantId
        restaurantName
        status
        billingPeriod
        currency
        subtotalCents
        totalCents
        dueDate
        paidAt
        canceledAt
        lines {
          description
          quantity
          unitAmountCents
          amountCents
        }
        createdAt
      }
    }
  }
`;

export const GENERATE_INVOICES = gql`
  mutation GenerateInvoices($period: String!) {
    generateInvoices(period: $period) {
      created
      skipped
      period
    }
  }
`;

export const SET_INVOICE_STATUS = gql`
  mutation SetInvoiceStatus($id: ID!, $status: InvoiceStatus!) {
    setInvoiceStatus(id: $id, status: $status) {
      id
      status
      paidAt
      canceledAt
    }
  }
`;

export const SET_INVOICE_STATUSES = gql`
  mutation SetInvoiceStatuses($ids: [ID!]!, $status: InvoiceStatus!) {
    setInvoiceStatuses(ids: $ids, status: $status) {
      updated
      items {
        id
        status
        paidAt
        canceledAt
      }
    }
  }
`;

export const ADMIN_REVENUE_REPORT = gql`
  query AdminRevenueReport($period: String) {
    adminRevenueReport(period: $period) {
      period
      mrrCents
      arrCents
      activeSubscriptions
      trialingSubscriptions
      pastDueSubscriptions
      cancelledSubscriptions
      billedCents
      paidCents
      outstandingCents
      invoiceCount
      coverFeeCents
      covers
      byPlan {
        plan
        count
        mrrCents
      }
      byInvoiceStatus {
        status
        count
        totalCents
      }
    }
  }
`;

export const PLATFORM_CONFIG = gql`
  query PlatformConfig {
    platformConfig {
      id
      supportEmail
      supportPhone
      defaultSignupRole
      defaultPartnerRole
      defaultStaffRole
      maintenanceMode
      allowPublicRegistration
      allowPartnerRegistration
      requireAdminDelete2FA
      invoicePrefix
      currency
      featureFlags {
        waitlist deposits partnerRegistration publicRegistration
        messaging reviews experiences campaigns widget
      }
      annualBilling {
        enabled
        scope
        planKeys
        discountType
        freeMonths
        discountPercent
      }
      updatedAt
    }
  }
`;

export const UPDATE_PLATFORM_CONFIG = gql`
  mutation UpdatePlatformConfig($input: PlatformConfigInput!) {
    updatePlatformConfig(input: $input) {
      id
      supportEmail
      supportPhone
      defaultSignupRole
      defaultPartnerRole
      defaultStaffRole
      maintenanceMode
      allowPublicRegistration
      allowPartnerRegistration
      requireAdminDelete2FA
      invoicePrefix
      currency
      featureFlags {
        waitlist deposits partnerRegistration publicRegistration
        messaging reviews experiences campaigns widget
      }
      annualBilling {
        enabled
        scope
        planKeys
        discountType
        freeMonths
        discountPercent
      }
      updatedAt
    }
  }
`;

export const REQUEST_ADMIN_DELETE_USER_CODE = gql`
  mutation RequestAdminDeleteUserCode($userId: ID!) {
    requestAdminDeleteUserCode(userId: $userId) {
      success
      requires2FA
      message
      emailedTo
    }
  }
`;

export const ADMIN_DELETE_USER = gql`
  mutation AdminDeleteUser($userId: ID!, $code: String) {
    adminDeleteUser(userId: $userId, code: $code) {
      success
      message
      deletedUserId
    }
  }
`;

export const CLEAR_SEED_DATA = gql`
  mutation ClearSeedData {
    clearSeedData {
      success
      message
      preservedAdminCount
    }
  }
`;

const PLAN_PRICING_FIELDS = `
  monthlyPriceCents
  originalMonthlyPriceCents
  discountType
  discountPercent
  discountAmountCents
  annualFreeMonths
`;

export const ADMIN_PLANS = gql`
  query AdminPlans {
    plans {
      key
      name
      description
      ${PLAN_PRICING_FIELDS}
      networkCoverFeeCents
      websiteCoverFeeCents
      trialDays
      visibleOnPricing
      isCustom
      features {
        floorPlans
        smartAssign
        waitlist
        premiumSms
        guestProfiles360
        emailCampaigns
        customWidget
        analytics
        dedicatedSupport
        accessRules
        posIntegration
        twoWayMessaging
        spendAlerts
        ticketedEvents
        preShift
        autoTags
        surveys
        revenueForecasting
        customReports
        multiLocationAnalytics
        promotions
        featuredPlacement
        boostCampaigns
      }
    }
  }
`;

export const UPDATE_PLAN_PACKAGE = gql`
  mutation UpdatePlanPackage($input: PlanPackageInput!) {
    updatePlanPackage(input: $input) {
      key
      name
      description
      ${PLAN_PRICING_FIELDS}
      networkCoverFeeCents
      websiteCoverFeeCents
      trialDays
      visibleOnPricing
      isCustom
    }
  }
`;

export const CREATE_PLAN_PACKAGE = gql`
  mutation CreatePlanPackage($input: CreatePlanPackageInput!) {
    createPlanPackage(input: $input) {
      key
      name
      description
      ${PLAN_PRICING_FIELDS}
      networkCoverFeeCents
      websiteCoverFeeCents
      trialDays
      visibleOnPricing
      isCustom
    }
  }
`;

export const DELETE_PLAN_PACKAGE = gql`
  mutation DeletePlanPackage($key: String!) {
    deletePlanPackage(key: $key)
  }
`;

export const UPDATE_RESTAURANT = gql`
  mutation UpdateRestaurant($id: ID!, $input: RestaurantInput!) {
    updateRestaurant(id: $id, input: $input) {
      id
      name
      status
      cuisine
      description
      priceRange
      photos
      phone
      website
      address {
        line1
        city
        state
        zip
        country
      }
      location {
        lat
        lng
      }
      depositRequired
      depositAmountCents
      loyaltyEnabled
      loyaltyPointsPerVisit
      loyaltyMinRedeemPoints
    }
  }
`;

export const CREATE_BLACKOUT = gql`
  mutation CreateBlackout($restaurantId: ID!, $date: String!, $reason: String, $allDay: Boolean) {
    createBlackout(restaurantId: $restaurantId, date: $date, reason: $reason, allDay: $allDay) {
      id date reason allDay
    }
  }
`;

export const UPDATE_TABLE = gql`
  mutation UpdateTable($id: ID!, $input: TableInput!) {
    updateTable(id: $id, input: $input) {
      id name minCapacity maxCapacity floorArea active combinable
    }
  }
`;

export const UPDATE_SHIFT = gql`
  mutation UpdateShift($id: ID!, $input: ShiftInput!) {
    updateShift(id: $id, input: $input) {
      id name
    }
  }
`;

export const MY_SUBSCRIPTION = gql`
  query MySubscription($restaurantId: ID!) {
    mySubscription(restaurantId: $restaurantId) {
      id
      plan
      status
      currentPeriodStart
      currentPeriodEnd
      trialEndsAt
      cancelledAt
      monthlyPriceCents
      networkCoverFeeCents
      websiteCoverFeeCents
      features {
        floorPlans smartAssign waitlist premiumSms
        guestProfiles360 emailCampaigns customWidget analytics dedicatedSupport
      }
      createdAt
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
      features {
        floorPlans smartAssign waitlist premiumSms
        guestProfiles360 emailCampaigns customWidget analytics dedicatedSupport
      }
    }
  }
`;

export const COVER_FEE_SUMMARY = gql`
  query CoverFeeSummary($restaurantId: ID!, $period: String) {
    coverFeeSummary(restaurantId: $restaurantId, period: $period) {
      totalCovers totalFeeCents networkCovers websiteCovers widgetCovers phoneCovers walkinCovers
    }
  }
`;

export const CREATE_SUBSCRIPTION = gql`
  mutation CreateSubscription($restaurantId: ID!, $plan: String!) {
    createSubscription(restaurantId: $restaurantId, plan: $plan) {
      id plan status monthlyPriceCents
    }
  }
`;

export const REGISTER_RESTAURANT_PARTNER = gql`
  mutation RegisterRestaurantPartner($input: RegisterRestaurantPartnerInput!) {
    registerRestaurantPartner(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        firstName
        lastName
        role
        restaurantIds
      }
      restaurant {
        id
        name
        status
      }
      subscription {
        id
        plan
        status
        trialEndsAt
      }
    }
  }
`;

export const CANCEL_SUBSCRIPTION = gql`
  mutation CancelSubscription($restaurantId: ID!) {
    cancelSubscription(restaurantId: $restaurantId) {
      id status cancelledAt
    }
  }
`;

export const CHANGE_PLAN = gql`
  mutation ChangePlan($restaurantId: ID!, $plan: String!) {
    changePlan(restaurantId: $restaurantId, plan: $plan) {
      id plan status monthlyPriceCents networkCoverFeeCents websiteCoverFeeCents
    }
  }
`;

export const AUDIT_LOGS = gql`
  query AuditLogs($limit: Int, $offset: Int) {
    auditLogs(limit: $limit, offset: $offset) {
      total
      items {
        id actorId action resource resourceId details createdAt
        actor { id firstName lastName email }
      }
    }
  }
`;

// ---- Guest CRM ----

export const RESTAURANT_GUESTS = gql`
  query RestaurantGuests($restaurantId: ID!, $tag: String, $vipStatus: String, $search: String, $limit: Int, $offset: Int) {
    restaurantGuests(restaurantId: $restaurantId, tag: $tag, vipStatus: $vipStatus, search: $search, limit: $limit, offset: $offset) {
      total
      items {
        id dinerId tags notes vipStatus totalVisits loyaltyPoints totalSpendCents averagePartySize
        lastVisitDate preferredTable dietaryRestrictions allergies occasions
        diner { id firstName lastName email phone }
      }
    }
  }
`;

export const UPDATE_GUEST_PROFILE = gql`
  mutation UpdateGuestProfile($restaurantId: ID!, $dinerId: ID!, $input: GuestProfileInput!) {
    updateGuestProfile(restaurantId: $restaurantId, dinerId: $dinerId, input: $input) {
      id tags notes vipStatus preferredTable dietaryRestrictions allergies
    }
  }
`;

export const ADD_GUEST_TAG = gql`
  mutation AddGuestTag($restaurantId: ID!, $dinerId: ID!, $tag: String!) {
    addGuestTag(restaurantId: $restaurantId, dinerId: $dinerId, tag: $tag) {
      id tags
    }
  }
`;

export const REMOVE_GUEST_TAG = gql`
  mutation RemoveGuestTag($restaurantId: ID!, $dinerId: ID!, $tag: String!) {
    removeGuestTag(restaurantId: $restaurantId, dinerId: $dinerId, tag: $tag) {
      id tags
    }
  }
`;

// ---- Messaging ----

export const CONVERSATIONS = gql`
  query Conversations($restaurantId: ID!) {
    conversations(restaurantId: $restaurantId) {
      reservationId
      dinerId
      unreadCount
      diner { id firstName lastName email }
      reservation { id slotStart partySize status }
      lastMessage { id body senderType createdAt }
    }
  }
`;

export const CONVERSATION = gql`
  query Conversation($reservationId: ID!) {
    conversation(reservationId: $reservationId) {
      reservationId
      dinerId
      restaurantId
      unreadCount
      diner { id firstName lastName email }
      reservation { id slotStart partySize status }
      lastMessage { id body senderType createdAt }
    }
  }
`;

export const MESSAGES = gql`
  query Messages($reservationId: ID!) {
    messages(reservationId: $reservationId) {
      id body senderType senderId readAt createdAt reservationId
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($reservationId: ID!, $body: String!) {
    sendMessage(reservationId: $reservationId, body: $body) {
      id body senderType createdAt
    }
  }
`;

export const MARK_CONVERSATION_READ = gql`
  mutation MarkConversationRead($reservationId: ID!) {
    markConversationRead(reservationId: $reservationId)
  }
`;

// ---- Reviews ----

export const RESTAURANT_REVIEWS = gql`
  query DashboardRestaurantReviews($restaurantId: ID!, $limit: Int, $offset: Int) {
    restaurantReviews(restaurantId: $restaurantId, limit: $limit, offset: $offset) {
      total
      items {
        id rating comment ownerReply ownerRepliedAt hidden createdAt dinerId
        diner { id firstName lastName }
      }
    }
  }
`;

export const REPLY_TO_REVIEW = gql`
  mutation ReplyToReview($reviewId: ID!, $reply: String!) {
    replyToReview(reviewId: $reviewId, reply: $reply) {
      id ownerReply ownerRepliedAt
    }
  }
`;

export const SET_REVIEW_HIDDEN = gql`
  mutation SetReviewHidden($reviewId: ID!, $hidden: Boolean!) {
    setReviewHidden(reviewId: $reviewId, hidden: $hidden) {
      id hidden
    }
  }
`;

// ---- Campaigns ----

export const CAMPAIGNS = gql`
  query Campaigns($restaurantId: ID!, $limit: Int, $offset: Int) {
    campaigns(restaurantId: $restaurantId, limit: $limit, offset: $offset) {
      total
      items {
        id name subject body status targetTags targetVipStatus scheduledAt sentAt recipientCount createdAt
      }
    }
  }
`;

export const CREATE_CAMPAIGN = gql`
  mutation CreateCampaign($restaurantId: ID!, $input: CampaignInput!) {
    createCampaign(restaurantId: $restaurantId, input: $input) {
      id name status
    }
  }
`;

export const UPDATE_CAMPAIGN = gql`
  mutation UpdateCampaign($id: ID!, $input: CampaignInput!) {
    updateCampaign(id: $id, input: $input) {
      id name status
    }
  }
`;

export const DELETE_CAMPAIGN = gql`
  mutation DeleteCampaign($id: ID!) {
    deleteCampaign(id: $id)
  }
`;

export const SEND_CAMPAIGN = gql`
  mutation SendCampaign($id: ID!) {
    sendCampaign(id: $id) {
      id status sentAt recipientCount
    }
  }
`;

// ---- Surveys ----

export const SURVEY_CONFIG = gql`
  query SurveyConfig($restaurantId: ID!) {
    surveyConfig(restaurantId: $restaurantId) {
      id enabled includeFood includeService includeAmbience includeValue includeRecommend
    }
  }
`;

export const SURVEY_STATS = gql`
  query SurveyStats($restaurantId: ID!) {
    surveyStats(restaurantId: $restaurantId) {
      totalResponses avgOverall avgFood avgService avgAmbience avgValue recommendPercent
    }
  }
`;

export const RESTAURANT_SURVEYS = gql`
  query RestaurantSurveys($restaurantId: ID!, $limit: Int, $offset: Int) {
    restaurantSurveys(restaurantId: $restaurantId, limit: $limit, offset: $offset) {
      total
      items {
        id overallRating foodRating serviceRating ambienceRating valueRating
        wouldRecommend feedback submittedAt
        diner { firstName lastName }
      }
    }
  }
`;

export const UPDATE_SURVEY_CONFIG = gql`
  mutation UpdateSurveyConfig($restaurantId: ID!, $input: SurveyConfigInput!) {
    updateSurveyConfig(restaurantId: $restaurantId, input: $input) {
      id enabled includeFood includeService includeAmbience includeValue includeRecommend
    }
  }
`;

// ---- Access rules ----

export const ACCESS_RULES = gql`
  query AccessRules($restaurantId: ID!) {
    accessRules(restaurantId: $restaurantId) {
      id name daysOfWeek startDate endDate startTime endTime
      minPartySize maxPartySize maxCoversPerSlot minAdvanceHours maxAdvanceDays active createdAt
    }
  }
`;

export const CREATE_ACCESS_RULE = gql`
  mutation CreateAccessRule($restaurantId: ID!, $input: AccessRuleInput!) {
    createAccessRule(restaurantId: $restaurantId, input: $input) {
      id name
    }
  }
`;

export const UPDATE_ACCESS_RULE = gql`
  mutation UpdateAccessRule($id: ID!, $input: AccessRuleInput!) {
    updateAccessRule(id: $id, input: $input) {
      id name active
    }
  }
`;

export const DELETE_ACCESS_RULE = gql`
  mutation DeleteAccessRule($id: ID!) {
    deleteAccessRule(id: $id)
  }
`;

// ---- Marketing ----

export const PROMOTIONS = gql`
  query Promotions($restaurantId: ID!, $limit: Int, $offset: Int) {
    promotions(restaurantId: $restaurantId, limit: $limit, offset: $offset) {
      total
      items {
        id title description discountPercent discountAmountCents code startDate endDate daysOfWeek maxRedemptions active redemptions createdAt
      }
    }
  }
`;

export const CREATE_PROMOTION = gql`
  mutation CreatePromotion($restaurantId: ID!, $input: PromotionInput!) {
    createPromotion(restaurantId: $restaurantId, input: $input) {
      id title
    }
  }
`;

export const UPDATE_PROMOTION = gql`
  mutation UpdatePromotion($id: ID!, $input: PromotionInput!) {
    updatePromotion(id: $id, input: $input) {
      id title active
    }
  }
`;

export const DELETE_PROMOTION = gql`
  mutation DeletePromotion($id: ID!) {
    deletePromotion(id: $id)
  }
`;

export const PROMOTION_STATS = gql`
  query PromotionStats($restaurantId: ID!, $days: Int) {
    promotionStats(restaurantId: $restaurantId, days: $days) {
      days
      totalRedemptions
      totalDiscountCents
      activePromotionCount
      redemptionsByDay {
        date
        count
        discountCents
      }
      promotions {
        promotionId
        title
        code
        redemptions
        discountCents
        active
      }
    }
  }
`;

export const GIFT_CARDS = gql`
  query GiftCards($restaurantId: ID!, $limit: Int, $offset: Int) {
    giftCards(restaurantId: $restaurantId, limit: $limit, offset: $offset) {
      total
      items {
        id
        code
        initialBalanceCents
        balanceCents
        recipientName
        recipientEmail
        expiresAt
        note
        active
        createdAt
      }
    }
  }
`;

export const ISSUE_GIFT_CARD = gql`
  mutation IssueGiftCard($restaurantId: ID!, $input: IssueGiftCardInput!) {
    issueGiftCard(restaurantId: $restaurantId, input: $input) {
      id
      code
      balanceCents
    }
  }
`;

export const SET_GIFT_CARD_ACTIVE = gql`
  mutation SetGiftCardActive($id: ID!, $active: Boolean!) {
    setGiftCardActive(id: $id, active: $active) {
      id
      active
    }
  }
`;

export const BOOST_CAMPAIGNS = gql`
  query BoostCampaigns($restaurantId: ID!, $limit: Int, $offset: Int) {
    boostCampaigns(restaurantId: $restaurantId, limit: $limit, offset: $offset) {
      total
      items {
        id name costPerCoverCents budgetCents spentCents coversAttributed startDate endDate status createdAt
      }
    }
  }
`;

export const CREATE_BOOST_CAMPAIGN = gql`
  mutation CreateBoostCampaign($restaurantId: ID!, $input: BoostCampaignInput!) {
    createBoostCampaign(restaurantId: $restaurantId, input: $input) {
      id name status
    }
  }
`;

export const SET_BOOST_CAMPAIGN_STATUS = gql`
  mutation SetBoostCampaignStatus($id: ID!, $status: String!) {
    setBoostCampaignStatus(id: $id, status: $status) {
      id status
    }
  }
`;

export const SET_FEATURED_PLACEMENT = gql`
  mutation SetFeaturedPlacement($restaurantId: ID!, $featured: Boolean!, $days: Int) {
    setFeaturedPlacement(restaurantId: $restaurantId, featured: $featured, days: $days) {
      id featured featuredUntil
    }
  }
`;

// ---- Reports ----

export const PRE_SHIFT_REPORT = gql`
  query PreShiftReport($restaurantId: ID!, $date: String!, $shiftId: ID) {
    preShiftReport(restaurantId: $restaurantId, date: $date, shiftId: $shiftId) {
      date shiftName totalReservations totalCovers vipCount occasionCount allergyCount
      entries {
        reservationId slotStart partySize status occasion guestNotes
        guestName guestPhone vipStatus tags totalVisits allergies dietaryRestrictions profileNotes
      }
    }
  }
`;

export const REVENUE_FORECAST = gql`
  query RevenueForecast($restaurantId: ID!, $days: Int) {
    revenueForecast(restaurantId: $restaurantId, days: $days) {
      totalProjectedCovers totalProjectedRevenueCents basedOnReservations
      points { date projectedCovers projectedRevenueCents }
    }
  }
`;

export const CUSTOM_REPORT = gql`
  query CustomReport($input: CustomReportInput!) {
    customReport(input: $input) {
      group
      values { metric value }
    }
  }
`;

export const MULTI_LOCATION_ANALYTICS = gql`
  query MultiLocationAnalytics($period: String) {
    multiLocationAnalytics(period: $period) {
      totalReservations totalCovers totalRevenueCents
      locations {
        reservations covers revenueCents noShows cancellations averageRating
        restaurant { id name address { city state } }
      }
    }
  }
`;

// ---- Notifications & settings ----

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

export const RESTAURANT_TEAM = gql`
  query RestaurantTeam($restaurantId: ID!) {
    restaurantTeam(restaurantId: $restaurantId) {
      id
      email
      phone
      firstName
      lastName
      role
      notificationPreferences {
        newMessage { sms email webPush platform }
        newReservation { sms email webPush platform }
        waitlistAvailable { sms email webPush platform }
        guestSpendAlert { sms email webPush platform }
        reservationUpdates { sms email webPush platform }
        reviewReply { sms email webPush platform }
        surveyInvitation { sms email webPush platform }
        loyaltyUpdates { sms email webPush platform }
      }
    }
  }
`;

export const UPDATE_NOTIFICATION_PREFERENCES = gql`
  mutation UpdateNotificationPreferences(
    $userId: ID
    $restaurantId: ID
    $input: NotificationPreferencesInput!
  ) {
    updateNotificationPreferences(userId: $userId, restaurantId: $restaurantId, input: $input) {
      id
      notificationPreferences {
        newMessage { sms email webPush platform }
        newReservation { sms email webPush platform }
        waitlistAvailable { sms email webPush platform }
        guestSpendAlert { sms email webPush platform }
        reservationUpdates { sms email webPush platform }
        reviewReply { sms email webPush platform }
        surveyInvitation { sms email webPush platform }
        loyaltyUpdates { sms email webPush platform }
      }
    }
  }
`;

// ---- Integrations & settings ----

export const INTEGRATIONS = gql`
  query Integrations($restaurantId: ID!) {
    integrations(restaurantId: $restaurantId) {
      id provider name apiKey enabled bookingsCount lastUsedAt createdAt
    }
  }
`;

export const CREATE_INTEGRATION = gql`
  mutation CreateIntegration($restaurantId: ID!, $provider: String!, $name: String!) {
    createIntegration(restaurantId: $restaurantId, provider: $provider, name: $name) {
      id apiKey
    }
  }
`;

export const SET_INTEGRATION_ENABLED = gql`
  mutation SetIntegrationEnabled($id: ID!, $enabled: Boolean!) {
    setIntegrationEnabled(id: $id, enabled: $enabled) {
      id enabled
    }
  }
`;

export const DELETE_INTEGRATION = gql`
  mutation DeleteIntegration($id: ID!) {
    deleteIntegration(id: $id)
  }
`;

export const GENERATE_POS_API_KEY = gql`
  mutation GeneratePosApiKey($restaurantId: ID!) {
    generatePosApiKey(restaurantId: $restaurantId)
  }
`;

export const RESTAURANT_SETTINGS = gql`
  query RestaurantSettings($id: ID) {
    restaurant(id: $id) {
      id name featured featuredUntil spendAlertThresholdCents useSmartAssign posEnabled
      widgetTheme { primaryColor buttonText showReviews }
    }
  }
`;

export const UPDATE_RESTAURANT_SETTINGS = gql`
  mutation UpdateRestaurantSettings(
    $restaurantId: ID!
    $spendAlertThresholdCents: Int
    $useSmartAssign: Boolean
    $posEnabled: Boolean
    $widgetTheme: WidgetThemeInput
  ) {
    updateRestaurantSettings(
      restaurantId: $restaurantId
      spendAlertThresholdCents: $spendAlertThresholdCents
      useSmartAssign: $useSmartAssign
      posEnabled: $posEnabled
      widgetTheme: $widgetTheme
    ) {
      id spendAlertThresholdCents useSmartAssign posEnabled
      widgetTheme { primaryColor buttonText showReviews }
    }
  }
`;

// ---- Floor plan ----

export const UPDATE_TABLE_POSITIONS = gql`
  mutation UpdateTablePositions($restaurantId: ID!, $positions: [TablePositionInput!]!) {
    updateTablePositions(restaurantId: $restaurantId, positions: $positions) {
      id posX posY width height shape
    }
  }
`;

export const FLOOR_PLAN_TABLES = gql`
  query FloorPlanTables($id: ID) {
    restaurant(id: $id) {
      id name
      tables { id name minCapacity maxCapacity floorArea active posX posY width height shape }
    }
  }
`;

// ---- Waitlist (in-house) ----

export const ADD_IN_HOUSE_WAITLIST = gql`
  mutation AddInHouseWaitlistEntry($input: InHouseWaitlistInput!) {
    addInHouseWaitlistEntry(input: $input) {
      id guestName status
    }
  }
`;

export const UPDATE_WAITLIST_STATUS = gql`
  mutation UpdateWaitlistStatus($id: ID!, $status: WaitlistStatus!) {
    updateWaitlistStatus(id: $id, status: $status) {
      id status
    }
  }
`;

export const RESTAURANT_WAITLIST_FULL = gql`
  query RestaurantWaitlistFull($restaurantId: ID!, $limit: Int, $offset: Int) {
    restaurantWaitlist(restaurantId: $restaurantId, limit: $limit, offset: $offset) {
      total
      items {
        id partySize preferredDate preferredTimeStart status createdAt
        dinerId guestName guestPhone source quotedWaitMinutes
        diner { firstName lastName phone }
      }
    }
  }
`;

// ---- Groups ----

export const MY_RESTAURANT_GROUPS = gql`
  query MyRestaurantGroups {
    myRestaurantGroups {
      id name restaurantIds
      restaurants { id name }
    }
  }
`;

export const CREATE_RESTAURANT_GROUP = gql`
  mutation CreateRestaurantGroup($name: String!, $restaurantIds: [ID!]!) {
    createRestaurantGroup(name: $name, restaurantIds: $restaurantIds) {
      id name
    }
  }
`;

export const ADD_RESTAURANT_TO_GROUP = gql`
  mutation AddRestaurantToGroup($groupId: ID!, $restaurantId: ID!) {
    addRestaurantToGroup(groupId: $groupId, restaurantId: $restaurantId) {
      id name restaurantIds
    }
  }
`;

export const REMOVE_RESTAURANT_FROM_GROUP = gql`
  mutation RemoveRestaurantFromGroup($groupId: ID!, $restaurantId: ID!) {
    removeRestaurantFromGroup(groupId: $groupId, restaurantId: $restaurantId) {
      id name restaurantIds
    }
  }
`;

export const GROUP_ANALYTICS = gql`
  query GroupAnalytics($groupId: ID!) {
    groupAnalytics(groupId: $groupId) {
      totalReservations totalCovers averageRating
      reservationsByRestaurant {
        restaurant { id name }
        reservationCount coverCount averageRating
      }
      topPerformingRestaurant { id name }
    }
  }
`;

// ---- Premium SMS add-on ----

export const SET_PREMIUM_SMS_ADDON = gql`
  mutation SetPremiumSmsAddon($restaurantId: ID!, $enabled: Boolean!) {
    setPremiumSmsAddon(restaurantId: $restaurantId, enabled: $enabled) {
      id plan
      features { premiumSms premiumSmsAddon }
    }
  }
`;
