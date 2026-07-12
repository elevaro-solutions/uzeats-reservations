export const typeDefs = `#graphql
  scalar DateTime

  enum UserRole { diner restaurant_owner staff admin }
  enum RestaurantStatus { pending approved rejected suspended }
  enum ReservationStatus { pending confirmed seated completed cancelled no_show }
  enum Occasion { none birthday anniversary business date celebration other }
  enum WaitlistStatus { waiting notified booked seated expired cancelled }
  enum ReservationSource { network website widget phone walkin }
  enum SubscriptionPlan { basic core pro enterprise }
  enum SubscriptionStatus { trialing active past_due cancelled paused }

  type AuthPayload {
    accessToken: String!
    refreshToken: String!
    user: User!
  }

  type MessagePayload {
    success: Boolean!
    message: String!
  }

  type User {
    id: ID!
    email: String
    phone: String
    firstName: String!
    lastName: String!
    role: UserRole!
    loyaltyPoints: Int!
    emailVerified: Boolean!
    phoneVerified: Boolean!
    telegramChatId: String
    restaurantIds: [ID!]!
    createdAt: DateTime!
  }

  type Address {
    line1: String!
    line2: String
    city: String!
    state: String!
    zip: String!
    country: String!
  }

  type GeoPoint {
    lng: Float!
    lat: Float!
  }

  type Restaurant {
    id: ID!
    name: String!
    slug: String!
    description: String
    cuisine: String!
    priceRange: Int!
    address: Address!
    location: GeoPoint!
    phone: String
    website: String
    photos: [String!]!
    status: RestaurantStatus!
    ownerId: ID!
    depositRequired: Boolean!
    depositAmountCents: Int!
    averageRating: Float!
    reviewCount: Int!
    featured: Boolean!
    featuredUntil: DateTime
    spendAlertThresholdCents: Int!
    useSmartAssign: Boolean!
    posEnabled: Boolean!
    widgetTheme: WidgetTheme!
    tables: [Table!]!
    shifts: [Shift!]!
    menu: Menu
    createdAt: DateTime!
  }

  type WidgetTheme {
    primaryColor: String!
    buttonText: String!
    showReviews: Boolean!
  }

  input WidgetThemeInput {
    primaryColor: String
    buttonText: String
    showReviews: Boolean
  }

  type Table {
    id: ID!
    restaurantId: ID!
    name: String!
    minCapacity: Int!
    maxCapacity: Int!
    floorArea: String!
    combinable: Boolean!
    active: Boolean!
    posX: Float!
    posY: Float!
    width: Float!
    height: Float!
    shape: String!
  }

  type Shift {
    id: ID!
    restaurantId: ID!
    name: String!
    daysOfWeek: [Int!]!
    startTime: String!
    endTime: String!
    slotIntervalMinutes: Int!
    turnTimeMinutes: Int!
    active: Boolean!
  }

  type Blackout {
    id: ID!
    restaurantId: ID!
    date: String!
    reason: String
    allDay: Boolean!
    startTime: String
    endTime: String
  }

  type AvailabilitySlot {
    time: DateTime!
    available: Boolean!
    remainingTables: Int!
  }

  type Reservation {
    id: ID!
    restaurantId: ID!
    restaurant: Restaurant
    dinerId: ID!
    diner: User
    tableIds: [ID!]!
    tables: [Table!]!
    partySize: Int!
    slotStart: DateTime!
    slotEnd: DateTime!
    status: ReservationStatus!
    occasion: Occasion!
    guestNotes: String
    depositAmountCents: Int!
    depositStatus: String!
    clientSecret: String
    loyaltyPointsEarned: Int!
    loyaltyPointsRedeemed: Int!
    source: ReservationSource!
    totalSpendCents: Int!
    createdAt: DateTime!
  }

  type CreateReservationPayload {
    reservation: Reservation!
    clientSecret: String
  }

  type WaitlistEntry {
    id: ID!
    restaurantId: ID!
    dinerId: ID
    diner: User
    guestName: String
    guestPhone: String
    source: String!
    quotedWaitMinutes: Int
    partySize: Int!
    preferredDate: String!
    preferredTimeStart: String
    preferredTimeEnd: String
    status: WaitlistStatus!
    notifiedSlot: DateTime
    createdAt: DateTime!
  }

  type Review {
    id: ID!
    restaurantId: ID!
    dinerId: ID!
    diner: User
    reservationId: ID!
    rating: Int!
    comment: String
    ownerReply: String
    ownerRepliedAt: DateTime
    hidden: Boolean!
    createdAt: DateTime!
  }

  type MenuItem {
    id: ID!
    name: String!
    description: String
    priceCents: Int!
    photoUrl: String
    dietary: [String!]!
    available: Boolean!
  }

  type MenuSection {
    id: ID!
    name: String!
    items: [MenuItem!]!
  }

  type Menu {
    id: ID!
    restaurantId: ID!
    sections: [MenuSection!]!
  }

  type LoyaltyTransaction {
    id: ID!
    type: String!
    points: Int!
    description: String!
    createdAt: DateTime!
  }

  type SubscriptionFeatures {
    floorPlans: Boolean!
    smartAssign: Boolean!
    waitlist: Boolean!
    premiumSms: Boolean!
    guestProfiles360: Boolean!
    emailCampaigns: Boolean!
    customWidget: Boolean!
    analytics: Boolean!
    dedicatedSupport: Boolean!
    accessRules: Boolean!
    posIntegration: Boolean!
    twoWayMessaging: Boolean!
    spendAlerts: Boolean!
    ticketedEvents: Boolean!
    preShift: Boolean!
    autoTags: Boolean!
    surveys: Boolean!
    revenueForecasting: Boolean!
    customReports: Boolean!
    multiLocationAnalytics: Boolean!
    promotions: Boolean!
    featuredPlacement: Boolean!
    boostCampaigns: Boolean!
    premiumSmsAddon: Boolean
  }

  type SubscriptionType {
    id: ID!
    restaurantId: ID!
    plan: SubscriptionPlan!
    status: SubscriptionStatus!
    stripeCustomerId: String
    stripeSubscriptionId: String
    currentPeriodStart: DateTime
    currentPeriodEnd: DateTime
    trialEndsAt: DateTime
    cancelledAt: DateTime
    monthlyPriceCents: Int!
    networkCoverFeeCents: Int!
    websiteCoverFeeCents: Int!
    features: SubscriptionFeatures!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type PlanInfo {
    key: String!
    name: String!
    monthlyPriceCents: Int!
    networkCoverFeeCents: Int!
    websiteCoverFeeCents: Int!
    trialDays: Int!
    features: SubscriptionFeatures!
  }

  type CoverFeeSummary {
    totalCovers: Int!
    totalFeeCents: Int!
    networkCovers: Int!
    websiteCovers: Int!
    widgetCovers: Int!
    phoneCovers: Int!
    walkinCovers: Int!
  }

  type UploadUrl {
    uploadUrl: String!
    publicUrl: String!
    key: String!
  }

  type RestaurantConnection {
    items: [Restaurant!]!
    total: Int!
    page: Int!
    limit: Int!
  }

  type PlatformStats {
    users: Int!
    restaurants: Int!
    reservations: Int!
    pendingRestaurants: Int!
  }

  type AuditLog {
    id: ID!
    actorId: ID!
    actor: User
    action: String!
    resource: String!
    resourceId: String
    details: String
    createdAt: DateTime!
  }

  enum ExperienceType { tasting class special_menu wine_pairing chef_table holiday other }
  enum ExperienceStatus { draft published sold_out completed cancelled }
  enum TicketStatus { pending confirmed cancelled refunded }
  enum PrivateDiningEventType { corporate wedding birthday holiday other }
  enum InquiryStatus { pending responded confirmed declined cancelled }

  type Experience {
    id: ID!
    restaurantId: ID!
    restaurant: Restaurant
    title: String!
    description: String!
    type: ExperienceType!
    photoUrl: String
    date: DateTime!
    startTime: String!
    endTime: String!
    maxGuests: Int!
    ticketPriceCents: Int!
    ticketsSold: Int!
    availableTickets: Int!
    status: ExperienceStatus!
    includes: [String!]!
    tags: [String!]!
    createdAt: DateTime!
  }

  type Ticket {
    id: ID!
    experienceId: ID!
    experience: Experience
    dinerId: ID!
    quantity: Int!
    totalPriceCents: Int!
    stripePaymentIntentId: String
    status: TicketStatus!
    confirmationCode: String
    clientSecret: String
    createdAt: DateTime!
  }

  type PrivateDiningSpace {
    id: ID!
    restaurantId: ID!
    restaurant: Restaurant
    name: String!
    description: String
    minGuests: Int!
    maxGuests: Int!
    rentalFeeCents: Int!
    minimumSpendCents: Int!
    photoUrl: String
    amenities: [String!]!
    active: Boolean!
    createdAt: DateTime!
  }

  type PrivateDiningInquiry {
    id: ID!
    restaurantId: ID!
    spaceId: ID
    space: PrivateDiningSpace
    dinerId: ID!
    diner: User
    eventDate: DateTime!
    guestCount: Int!
    eventType: PrivateDiningEventType!
    budget: String
    specialRequests: String
    contactPhone: String
    status: InquiryStatus!
    restaurantResponse: String
    createdAt: DateTime!
  }

  enum VipStatus { none vip regular blacklisted }
  enum CampaignStatus { draft scheduled sent cancelled }

  type GuestProfile {
    id: ID!
    restaurantId: ID!
    dinerId: ID!
    diner: User
    tags: [String!]!
    notes: String
    vipStatus: String!
    totalVisits: Int!
    totalSpendCents: Int!
    averagePartySize: Float!
    lastVisitDate: DateTime
    preferredTable: String
    dietaryRestrictions: [String!]!
    allergies: [String!]!
    occasions: [String!]!
    customFields: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Campaign {
    id: ID!
    restaurantId: ID!
    name: String!
    subject: String!
    body: String!
    status: CampaignStatus!
    targetTags: [String!]!
    targetVipStatus: String
    scheduledAt: DateTime
    sentAt: DateTime
    recipientCount: Int!
    openCount: Int!
    clickCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type SurveyResponse {
    id: ID!
    restaurantId: ID!
    reservationId: ID!
    dinerId: ID!
    diner: User
    overallRating: Int
    foodRating: Int
    serviceRating: Int
    ambienceRating: Int
    valueRating: Int
    wouldRecommend: Boolean
    feedback: String
    submittedAt: DateTime!
    createdAt: DateTime!
  }

  type SurveyConfig {
    id: ID!
    restaurantId: ID!
    enabled: Boolean!
    includeFood: Boolean!
    includeService: Boolean!
    includeAmbience: Boolean!
    includeValue: Boolean!
    includeRecommend: Boolean!
  }

  type SurveyStats {
    totalResponses: Int!
    avgOverall: Float!
    avgFood: Float!
    avgService: Float!
    avgAmbience: Float!
    avgValue: Float!
    recommendPercent: Float!
  }

  type RestaurantGroup {
    id: ID!
    name: String!
    ownerId: ID!
    restaurantIds: [ID!]!
    restaurants: [Restaurant!]!
    adminUserIds: [ID!]!
    settings: GroupSettings!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type GroupSettings {
    sharedGuestProfiles: Boolean!
    centralizedReporting: Boolean!
  }

  type GroupAnalytics {
    totalReservations: Int!
    totalCovers: Int!
    averageRating: Float!
    reservationsByRestaurant: [RestaurantStat!]!
    topPerformingRestaurant: Restaurant
  }

  type RestaurantStat {
    restaurant: Restaurant!
    reservationCount: Int!
    coverCount: Int!
    averageRating: Float!
  }

  input RegisterInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
    phone: String
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input PhoneOtpVerifyInput {
    phone: String!
    code: String!
    firstName: String
    lastName: String
  }

  input AddressInput {
    line1: String!
    line2: String
    city: String!
    state: String!
    zip: String!
    country: String
  }

  input LocationInput {
    lng: Float!
    lat: Float!
  }

  input RestaurantInput {
    name: String!
    description: String
    cuisine: String!
    priceRange: Int!
    address: AddressInput!
    location: LocationInput!
    phone: String
    website: String
    depositRequired: Boolean
    depositAmountCents: Int
    photos: [String!]
  }

  input TableInput {
    name: String!
    minCapacity: Int!
    maxCapacity: Int!
    floorArea: String
    combinable: Boolean
    active: Boolean
    posX: Float
    posY: Float
    width: Float
    height: Float
    shape: String
  }

  input TablePositionInput {
    id: ID!
    posX: Float!
    posY: Float!
    width: Float
    height: Float
    shape: String
  }

  input ShiftInput {
    name: String!
    daysOfWeek: [Int!]!
    startTime: String!
    endTime: String!
    slotIntervalMinutes: Int
    turnTimeMinutes: Int
    active: Boolean
  }

  input ReservationInput {
    restaurantId: ID!
    partySize: Int!
    slotStart: DateTime!
    occasion: Occasion
    guestNotes: String
    redeemPoints: Int
    source: ReservationSource
  }

  input WaitlistInput {
    restaurantId: ID!
    partySize: Int!
    preferredDate: String!
    preferredTimeStart: String
    preferredTimeEnd: String
  }

  input ReviewInput {
    reservationId: ID!
    rating: Int!
    comment: String
  }

  input SearchRestaurantsInput {
    query: String
    cuisine: String
    priceRange: Int
    city: String
    lat: Float
    lng: Float
    radiusKm: Float
    date: String
    time: String
    partySize: Int
    page: Int
    limit: Int
  }

  input MenuItemInput {
    name: String!
    description: String
    priceCents: Int!
    photoUrl: String
    dietary: [String!]
    available: Boolean
  }

  input MenuSectionInput {
    name: String!
    items: [MenuItemInput!]!
  }

  input MenuInput {
    sections: [MenuSectionInput!]!
  }

  input ExperienceInput {
    title: String!
    description: String!
    type: ExperienceType!
    photoUrl: String
    date: DateTime!
    startTime: String!
    endTime: String!
    maxGuests: Int!
    ticketPriceCents: Int!
    includes: [String!]
    tags: [String!]
  }

  input PrivateDiningSpaceInput {
    name: String!
    description: String
    minGuests: Int!
    maxGuests: Int!
    rentalFeeCents: Int
    minimumSpendCents: Int
    photoUrl: String
    amenities: [String!]
    active: Boolean
  }

  input PrivateDiningInquiryInput {
    restaurantId: ID!
    spaceId: ID
    eventDate: DateTime!
    guestCount: Int!
    eventType: PrivateDiningEventType!
    budget: String
    specialRequests: String
    contactPhone: String
  }

  input GuestProfileInput {
    tags: [String!]
    notes: String
    vipStatus: String
    preferredTable: String
    dietaryRestrictions: [String!]
    allergies: [String!]
    occasions: [String!]
    customFields: String
  }

  input CampaignInput {
    name: String!
    subject: String!
    body: String!
    targetTags: [String!]
    targetVipStatus: String
    scheduledAt: DateTime
  }

  input SurveyConfigInput {
    enabled: Boolean
    includeFood: Boolean
    includeService: Boolean
    includeAmbience: Boolean
    includeValue: Boolean
    includeRecommend: Boolean
  }

  input SurveySubmitInput {
    reservationId: ID!
    overallRating: Int!
    foodRating: Int
    serviceRating: Int
    ambienceRating: Int
    valueRating: Int
    wouldRecommend: Boolean
    feedback: String
  }

  type Message {
    id: ID!
    restaurantId: ID!
    dinerId: ID!
    reservationId: ID
    senderType: String!
    senderId: ID!
    body: String!
    readAt: DateTime
    createdAt: DateTime!
  }

  type Conversation {
    dinerId: ID!
    diner: User
    restaurantId: ID!
    restaurant: Restaurant
    lastMessage: Message
    unreadCount: Int!
  }

  type AccessRule {
    id: ID!
    restaurantId: ID!
    name: String!
    daysOfWeek: [Int!]!
    startDate: String
    endDate: String
    startTime: String
    endTime: String
    minPartySize: Int
    maxPartySize: Int
    maxCoversPerSlot: Int
    minAdvanceHours: Int
    maxAdvanceDays: Int
    active: Boolean!
    createdAt: DateTime!
  }

  input AccessRuleInput {
    name: String!
    daysOfWeek: [Int!]
    startDate: String
    endDate: String
    startTime: String
    endTime: String
    minPartySize: Int
    maxPartySize: Int
    maxCoversPerSlot: Int
    minAdvanceHours: Int
    maxAdvanceDays: Int
    active: Boolean
  }

  type Promotion {
    id: ID!
    restaurantId: ID!
    title: String!
    description: String
    discountPercent: Int
    code: String
    startDate: String
    endDate: String
    daysOfWeek: [Int!]!
    active: Boolean!
    redemptions: Int!
    createdAt: DateTime!
  }

  input PromotionInput {
    title: String!
    description: String
    discountPercent: Int
    code: String
    startDate: String
    endDate: String
    daysOfWeek: [Int!]
    active: Boolean
  }

  type BoostCampaign {
    id: ID!
    restaurantId: ID!
    name: String!
    costPerCoverCents: Int!
    budgetCents: Int!
    spentCents: Int!
    coversAttributed: Int!
    startDate: String!
    endDate: String
    status: String!
    createdAt: DateTime!
  }

  input BoostCampaignInput {
    name: String!
    costPerCoverCents: Int!
    budgetCents: Int!
    startDate: String!
    endDate: String
  }

  type Integration {
    id: ID!
    restaurantId: ID!
    provider: String!
    name: String!
    apiKey: String!
    enabled: Boolean!
    bookingsCount: Int!
    lastUsedAt: DateTime
    createdAt: DateTime!
  }

  type PreShiftEntry {
    reservationId: ID!
    slotStart: DateTime!
    partySize: Int!
    status: String!
    occasion: String!
    guestNotes: String!
    guestName: String!
    guestPhone: String
    vipStatus: String!
    tags: [String!]!
    totalVisits: Int!
    allergies: [String!]!
    dietaryRestrictions: [String!]!
    profileNotes: String!
  }

  type PreShiftReport {
    date: String!
    shiftName: String!
    totalReservations: Int!
    totalCovers: Int!
    vipCount: Int!
    occasionCount: Int!
    allergyCount: Int!
    entries: [PreShiftEntry!]!
  }

  type ForecastPoint {
    date: String!
    projectedCovers: Int!
    projectedRevenueCents: Int!
  }

  type RevenueForecast {
    points: [ForecastPoint!]!
    totalProjectedCovers: Int!
    totalProjectedRevenueCents: Int!
    basedOnReservations: Int!
  }

  type ReportValue {
    metric: String!
    value: Float!
  }

  type ReportRow {
    group: String!
    values: [ReportValue!]!
  }

  input CustomReportInput {
    restaurantId: ID!
    metrics: [String!]!
    groupBy: String!
    startDate: String!
    endDate: String!
  }

  type LocationStat {
    restaurant: Restaurant!
    reservations: Int!
    covers: Int!
    revenueCents: Int!
    noShows: Int!
    cancellations: Int!
    averageRating: Float!
  }

  type MultiLocationAnalytics {
    totalReservations: Int!
    totalCovers: Int!
    totalRevenueCents: Int!
    locations: [LocationStat!]!
  }

  input InHouseWaitlistInput {
    restaurantId: ID!
    guestName: String!
    guestPhone: String
    partySize: Int!
    quotedWaitMinutes: Int
  }

  type Query {
    me: User
    restaurant(id: ID, slug: String): Restaurant
    searchRestaurants(input: SearchRestaurantsInput!): RestaurantConnection!
    availability(restaurantId: ID!, date: String!, partySize: Int!): [AvailabilitySlot!]!
    myReservations: [Reservation!]!
    restaurantReservations(restaurantId: ID!, date: String): [Reservation!]!
    myWaitlist: [WaitlistEntry!]!
    restaurantWaitlist(restaurantId: ID!): [WaitlistEntry!]!
    restaurantReviews(restaurantId: ID!): [Review!]!
    myLoyalty: [LoyaltyTransaction!]!
    myRestaurants: [Restaurant!]!
    adminRestaurants(status: RestaurantStatus): [Restaurant!]!
    adminStats: PlatformStats!
    adminUsers: [User!]!
    auditLogs(limit: Int, offset: Int): [AuditLog!]!
    mySubscription(restaurantId: ID!): SubscriptionType
    plans: [PlanInfo!]!
    coverFeeSummary(restaurantId: ID!, period: String): CoverFeeSummary!

    myRestaurantGroups: [RestaurantGroup!]!
    groupAnalytics(groupId: ID!): GroupAnalytics!

    experiences(restaurantId: ID, upcoming: Boolean): [Experience!]!
    experience(id: ID!): Experience
    myTickets: [Ticket!]!

    privateDiningSpaces(restaurantId: ID!): [PrivateDiningSpace!]!
    privateDiningInquiries(restaurantId: ID!): [PrivateDiningInquiry!]!
    myInquiries: [PrivateDiningInquiry!]!

    restaurantGuests(restaurantId: ID!, tag: String, vipStatus: String, search: String, limit: Int, offset: Int): [GuestProfile!]!
    guestProfile(restaurantId: ID!, dinerId: ID!): GuestProfile

    campaigns(restaurantId: ID!): [Campaign!]!
    campaign(id: ID!): Campaign

    restaurantSurveys(restaurantId: ID!, limit: Int, offset: Int): [SurveyResponse!]!
    surveyStats(restaurantId: ID!): SurveyStats!
    surveyConfig(restaurantId: ID!): SurveyConfig

    conversations(restaurantId: ID!): [Conversation!]!
    messages(restaurantId: ID!, dinerId: ID!): [Message!]!
    myConversations: [Conversation!]!

    accessRules(restaurantId: ID!): [AccessRule!]!
    promotions(restaurantId: ID!, activeOnly: Boolean): [Promotion!]!
    boostCampaigns(restaurantId: ID!): [BoostCampaign!]!
    integrations(restaurantId: ID!): [Integration!]!

    preShiftReport(restaurantId: ID!, date: String!, shiftId: ID): PreShiftReport!
    revenueForecast(restaurantId: ID!, days: Int): RevenueForecast!
    customReport(input: CustomReportInput!): [ReportRow!]!
    multiLocationAnalytics(period: String): MultiLocationAnalytics!

    reservationForSurvey(reservationId: ID!): Reservation
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    loginWithGoogle(idToken: String!): AuthPayload!
    requestPhoneOtp(phone: String!): MessagePayload!
    verifyPhoneOtp(input: PhoneOtpVerifyInput!): AuthPayload!
    refreshToken(refreshToken: String!): AuthPayload!
    logout(refreshToken: String): Boolean!
    requestPasswordReset(email: String!): MessagePayload!
    resetPassword(token: String!, newPassword: String!): MessagePayload!

    createRestaurant(input: RestaurantInput!): Restaurant!
    updateRestaurant(id: ID!, input: RestaurantInput!): Restaurant!
    setRestaurantStatus(id: ID!, status: RestaurantStatus!): Restaurant!

    createTable(restaurantId: ID!, input: TableInput!): Table!
    updateTable(id: ID!, input: TableInput!): Table!
    deleteTable(id: ID!): Boolean!

    createShift(restaurantId: ID!, input: ShiftInput!): Shift!
    updateShift(id: ID!, input: ShiftInput!): Shift!
    deleteShift(id: ID!): Boolean!
    createBlackout(restaurantId: ID!, date: String!, reason: String, allDay: Boolean): Blackout!

    createReservation(input: ReservationInput!): CreateReservationPayload!
    confirmDepositPayment(paymentIntentId: String!): Reservation!
    updateReservationStatus(id: ID!, status: ReservationStatus!, reason: String): Reservation!
    joinWaitlist(input: WaitlistInput!): WaitlistEntry!
    cancelWaitlist(id: ID!): Boolean!

    createReview(input: ReviewInput!): Review!
    upsertMenu(restaurantId: ID!, input: MenuInput!): Menu!

    createUploadUrl(filename: String!, contentType: String!): UploadUrl!
    setUserRole(userId: ID!, role: UserRole!): User!
    createSubscription(restaurantId: ID!, plan: String!): SubscriptionType!
    cancelSubscription(restaurantId: ID!): SubscriptionType!
    changePlan(restaurantId: ID!, plan: String!): SubscriptionType!

    registerPushToken(token: String!, platform: String!): Boolean!
    linkTelegram(chatId: String!): Boolean!

    createRestaurantGroup(name: String!, restaurantIds: [ID!]!): RestaurantGroup!
    addRestaurantToGroup(groupId: ID!, restaurantId: ID!): RestaurantGroup!
    removeRestaurantFromGroup(groupId: ID!, restaurantId: ID!): RestaurantGroup!
    generatePosApiKey(restaurantId: ID!): String!

    createExperience(restaurantId: ID!, input: ExperienceInput!): Experience!
    updateExperience(id: ID!, input: ExperienceInput!): Experience!
    publishExperience(id: ID!): Experience!
    purchaseTicket(experienceId: ID!, quantity: Int!): Ticket!
    confirmTicketPayment(paymentIntentId: String!): Ticket!
    cancelTicket(id: ID!): Ticket!

    createPrivateDiningSpace(restaurantId: ID!, input: PrivateDiningSpaceInput!): PrivateDiningSpace!
    updatePrivateDiningSpace(id: ID!, input: PrivateDiningSpaceInput!): PrivateDiningSpace!
    submitPrivateDiningInquiry(input: PrivateDiningInquiryInput!): PrivateDiningInquiry!
    respondToInquiry(id: ID!, status: InquiryStatus!, response: String): PrivateDiningInquiry!

    updateGuestProfile(restaurantId: ID!, dinerId: ID!, input: GuestProfileInput!): GuestProfile!
    addGuestTag(restaurantId: ID!, dinerId: ID!, tag: String!): GuestProfile!
    removeGuestTag(restaurantId: ID!, dinerId: ID!, tag: String!): GuestProfile!

    createCampaign(restaurantId: ID!, input: CampaignInput!): Campaign!
    updateCampaign(id: ID!, input: CampaignInput!): Campaign!
    deleteCampaign(id: ID!): Boolean!
    sendCampaign(id: ID!): Campaign!

    updateSurveyConfig(restaurantId: ID!, input: SurveyConfigInput!): SurveyConfig!
    submitSurvey(input: SurveySubmitInput!): SurveyResponse!

    replyToReview(reviewId: ID!, reply: String!): Review!
    setReviewHidden(reviewId: ID!, hidden: Boolean!): Review!

    sendMessage(restaurantId: ID!, dinerId: ID, reservationId: ID, body: String!): Message!
    markConversationRead(restaurantId: ID!, dinerId: ID!): Boolean!

    createAccessRule(restaurantId: ID!, input: AccessRuleInput!): AccessRule!
    updateAccessRule(id: ID!, input: AccessRuleInput!): AccessRule!
    deleteAccessRule(id: ID!): Boolean!

    createPromotion(restaurantId: ID!, input: PromotionInput!): Promotion!
    updatePromotion(id: ID!, input: PromotionInput!): Promotion!
    deletePromotion(id: ID!): Boolean!

    createBoostCampaign(restaurantId: ID!, input: BoostCampaignInput!): BoostCampaign!
    setBoostCampaignStatus(id: ID!, status: String!): BoostCampaign!

    createIntegration(restaurantId: ID!, provider: String!, name: String!): Integration!
    setIntegrationEnabled(id: ID!, enabled: Boolean!): Integration!
    deleteIntegration(id: ID!): Boolean!

    setFeaturedPlacement(restaurantId: ID!, featured: Boolean!, days: Int): Restaurant!
    updateTablePositions(restaurantId: ID!, positions: [TablePositionInput!]!): [Table!]!
    updateRestaurantSettings(
      restaurantId: ID!
      spendAlertThresholdCents: Int
      useSmartAssign: Boolean
      posEnabled: Boolean
      widgetTheme: WidgetThemeInput
    ): Restaurant!

    addInHouseWaitlistEntry(input: InHouseWaitlistInput!): WaitlistEntry!
    updateWaitlistStatus(id: ID!, status: WaitlistStatus!): WaitlistEntry!

    setPremiumSmsAddon(restaurantId: ID!, enabled: Boolean!): SubscriptionType!
  }
`;
