export const typeDefs = `#graphql
  scalar DateTime

  enum UserRole { diner restaurant_owner staff admin }
  enum RestaurantStatus { pending approved rejected suspended }
  enum ReservationStatus { pending confirmed seated completed cancelled no_show }
  enum Occasion { none birthday anniversary business date celebration other }
  enum WaitlistStatus { waiting notified booked seated expired cancelled }
  enum ReservationSource { network website widget phone walkin }
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

  type NotificationChannelPreferences {
    sms: Boolean!
    email: Boolean!
    webPush: Boolean!
    platform: Boolean!
  }

  type NotificationPreferences {
    newMessage: NotificationChannelPreferences!
    newReservation: NotificationChannelPreferences!
    waitlistAvailable: NotificationChannelPreferences!
    guestSpendAlert: NotificationChannelPreferences!
    reservationUpdates: NotificationChannelPreferences!
    reviewReply: NotificationChannelPreferences!
    surveyInvitation: NotificationChannelPreferences!
    loyaltyUpdates: NotificationChannelPreferences!
  }

  input NotificationChannelPreferencesInput {
    sms: Boolean
    email: Boolean
    webPush: Boolean
    platform: Boolean
  }

  input NotificationPreferencesInput {
    newMessage: NotificationChannelPreferencesInput
    newReservation: NotificationChannelPreferencesInput
    waitlistAvailable: NotificationChannelPreferencesInput
    guestSpendAlert: NotificationChannelPreferencesInput
    reservationUpdates: NotificationChannelPreferencesInput
    reviewReply: NotificationChannelPreferencesInput
    surveyInvitation: NotificationChannelPreferencesInput
    loyaltyUpdates: NotificationChannelPreferencesInput
  }

  type User {
    id: ID!
    email: String
    phone: String
    firstName: String!
    lastName: String!
    role: UserRole!
    loyaltyPoints: Int!
    loyaltyCompletedVisits: Int!
    loyaltyTier: String!
    loyaltyTierName: String!
    loyaltyPointsExpireAt: DateTime
    referralCode: String
    emailVerified: Boolean!
    phoneVerified: Boolean!
    telegramChatId: String
    notificationPreferences: NotificationPreferences!
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
    loyaltyEnabled: Boolean!
    loyaltyPointsPerVisit: Int!
    loyaltyMinRedeemPoints: Int!
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
    restaurantLoyaltyPointsEarned: Int!
    restaurantLoyaltyPointsRedeemed: Int!
    promotionId: ID
    promoDiscountCents: Int!
    giftCardId: ID
    giftCardDiscountCents: Int!
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

  type RestaurantLoyaltyBalance {
    restaurantId: ID!
    restaurantName: String!
    restaurantSlug: String
    points: Int!
  }

  type RestaurantLoyaltyTransaction {
    id: ID!
    restaurantId: ID!
    restaurantName: String!
    type: String!
    points: Int!
    description: String!
    createdAt: DateTime!
  }

  type AppNotification {
    id: ID!
    type: String!
    title: String!
    body: String!
    data: String
    readAt: DateTime
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
    plan: String!
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

  enum PlanDiscountType {
    none
    percent_off
    amount_off
    first_month_free
    annual_months_free
  }

  type PlanInfo {
    key: String!
    name: String!
    description: String
    monthlyPriceCents: Int!
    originalMonthlyPriceCents: Int
    discountType: PlanDiscountType!
    discountPercent: Int
    discountAmountCents: Int
    annualFreeMonths: Int
    networkCoverFeeCents: Int!
    websiteCoverFeeCents: Int!
    trialDays: Int!
    visibleOnPricing: Boolean!
    isCustom: Boolean!
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

  type MyRestaurantLocationsMeta {
    total: Int!
    cities: [String!]!
  }

  type UserConnection {
    items: [User!]!
    total: Int!
  }

  type AuditLogConnection {
    items: [AuditLog!]!
    total: Int!
  }

  type ReservationConnection {
    items: [Reservation!]!
    total: Int!
  }

  type WaitlistConnection {
    items: [WaitlistEntry!]!
    total: Int!
  }

  type ReviewConnection {
    items: [Review!]!
    total: Int!
  }

  type ExperienceConnection {
    items: [Experience!]!
    total: Int!
  }

  type PrivateDiningInquiryConnection {
    items: [PrivateDiningInquiry!]!
    total: Int!
  }

  type GuestProfileConnection {
    items: [GuestProfile!]!
    total: Int!
  }

  type CampaignConnection {
    items: [Campaign!]!
    total: Int!
  }

  type SurveyResponseConnection {
    items: [SurveyResponse!]!
    total: Int!
  }

  type PromotionConnection {
    items: [Promotion!]!
    total: Int!
  }

  type BoostCampaignConnection {
    items: [BoostCampaign!]!
    total: Int!
  }

  type PlatformStats {
    users: Int!
    restaurants: Int!
    reservations: Int!
    pendingRestaurants: Int!
    mrrCents: Int!
    activeSubscriptions: Int!
    openInvoices: Int!
  }

  type LoyaltyPlatformStats {
    totalOutstandingPoints: Int!
    usersWithPoints: Int!
    tierBronze: Int!
    tierSilver: Int!
    tierGold: Int!
    referralsCount: Int!
    pointsEarned30d: Int!
    pointsRedeemed30d: Int!
  }

  type ReferralLeader {
    userId: ID!
    firstName: String!
    lastName: String!
    email: String
    referralCode: String
    refereesCount: Int!
  }

  type RestaurantLoyaltyStats {
    loyaltyEnabled: Boolean!
    totalOutstandingPoints: Int!
    guestsWithPoints: Int!
    pointsEarned30d: Int!
    pointsRedeemed30d: Int!
    totalVisitsAwarded: Int!
  }

  type InvoiceLine {
    description: String!
    quantity: Int!
    unitAmountCents: Int!
    amountCents: Int!
  }

  enum InvoiceStatus {
    upcoming
    pending
    paid
    canceled
    overdue
  }

  type Invoice {
    id: ID!
    number: String!
    restaurantId: ID!
    restaurantName: String
    subscriptionId: ID
    status: InvoiceStatus!
    billingPeriod: String!
    currency: String!
    subtotalCents: Int!
    totalCents: Int!
    lines: [InvoiceLine!]!
    dueDate: DateTime!
    paidAt: DateTime
    canceledAt: DateTime
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type InvoiceConnection {
    items: [Invoice!]!
    total: Int!
  }

  type GenerateInvoicesResult {
    created: Int!
    skipped: Int!
    period: String!
  }

  type BulkInvoiceStatusResult {
    updated: Int!
    items: [Invoice!]!
  }

  type PlanBreakdown {
    plan: String!
    count: Int!
    mrrCents: Int!
  }

  type InvoiceStatusBreakdown {
    status: String!
    count: Int!
    totalCents: Int!
  }

  type PlatformRevenueReport {
    period: String!
    mrrCents: Int!
    arrCents: Int!
    activeSubscriptions: Int!
    trialingSubscriptions: Int!
    pastDueSubscriptions: Int!
    cancelledSubscriptions: Int!
    billedCents: Int!
    paidCents: Int!
    outstandingCents: Int!
    invoiceCount: Int!
    coverFeeCents: Int!
    covers: Int!
    byPlan: [PlanBreakdown!]!
    byInvoiceStatus: [InvoiceStatusBreakdown!]!
  }

  type PlatformFeatureFlags {
    waitlist: Boolean!
    deposits: Boolean!
    partnerRegistration: Boolean!
    publicRegistration: Boolean!
    messaging: Boolean!
    reviews: Boolean!
    experiences: Boolean!
    campaigns: Boolean!
    widget: Boolean!
  }

  input PlatformFeatureFlagsInput {
    waitlist: Boolean
    deposits: Boolean
    partnerRegistration: Boolean
    publicRegistration: Boolean
    messaging: Boolean
    reviews: Boolean
    experiences: Boolean
    campaigns: Boolean
    widget: Boolean
  }

  enum AnnualBillingScope {
    all
    selected
  }

  enum AnnualBillingDiscountType {
    months_free
    percent_off
  }

  type AnnualBillingSettings {
    enabled: Boolean!
    scope: AnnualBillingScope!
    planKeys: [String!]!
    discountType: AnnualBillingDiscountType!
    freeMonths: Int!
    discountPercent: Int!
  }

  input AnnualBillingSettingsInput {
    enabled: Boolean
    scope: AnnualBillingScope
    planKeys: [String!]
    discountType: AnnualBillingDiscountType
    freeMonths: Int
    discountPercent: Int
  }

  type PlatformConfig {
    id: ID!
    supportEmail: String!
    supportPhone: String!
    defaultSignupRole: UserRole!
    defaultPartnerRole: UserRole!
    defaultStaffRole: UserRole!
    maintenanceMode: Boolean!
    allowPublicRegistration: Boolean!
    allowPartnerRegistration: Boolean!
    requireAdminDelete2FA: Boolean!
    invoicePrefix: String!
    currency: String!
    featureFlags: PlatformFeatureFlags!
    annualBilling: AnnualBillingSettings!
    updatedAt: DateTime!
  }

  input PlatformConfigInput {
    supportEmail: String
    supportPhone: String
    defaultSignupRole: UserRole
    defaultPartnerRole: UserRole
    defaultStaffRole: UserRole
    maintenanceMode: Boolean
    allowPublicRegistration: Boolean
    allowPartnerRegistration: Boolean
    requireAdminDelete2FA: Boolean
    invoicePrefix: String
    currency: String
    featureFlags: PlatformFeatureFlagsInput
    annualBilling: AnnualBillingSettingsInput
  }

  type AdminDeleteUserCodePayload {
    success: Boolean!
    requires2FA: Boolean!
    message: String!
    emailedTo: String
  }

  type AdminDeleteUserPayload {
    success: Boolean!
    message: String!
    deletedUserId: ID!
  }

  type ClearSeedDataPayload {
    success: Boolean!
    message: String!
    preservedAdminCount: Int!
  }

  input PlanPackageInput {
    key: String!
    name: String
    description: String
    monthlyPriceCents: Int
    originalMonthlyPriceCents: Int
    discountType: PlanDiscountType
    discountPercent: Int
    discountAmountCents: Int
    annualFreeMonths: Int
    networkCoverFeeCents: Int
    websiteCoverFeeCents: Int
    trialDays: Int
    visibleOnPricing: Boolean
    features: SubscriptionFeaturesInput
  }

  input CreatePlanPackageInput {
    name: String!
    description: String
    monthlyPriceCents: Int!
    originalMonthlyPriceCents: Int
    discountType: PlanDiscountType
    discountPercent: Int
    discountAmountCents: Int
    annualFreeMonths: Int
    networkCoverFeeCents: Int
    websiteCoverFeeCents: Int
    trialDays: Int
    visibleOnPricing: Boolean
    features: SubscriptionFeaturesInput
  }

  input SubscriptionFeaturesInput {
    floorPlans: Boolean
    smartAssign: Boolean
    waitlist: Boolean
    premiumSms: Boolean
    guestProfiles360: Boolean
    emailCampaigns: Boolean
    customWidget: Boolean
    analytics: Boolean
    dedicatedSupport: Boolean
    accessRules: Boolean
    posIntegration: Boolean
    twoWayMessaging: Boolean
    spendAlerts: Boolean
    ticketedEvents: Boolean
    preShift: Boolean
    autoTags: Boolean
    surveys: Boolean
    revenueForecasting: Boolean
    customReports: Boolean
    multiLocationAnalytics: Boolean
    promotions: Boolean
    featuredPlacement: Boolean
    boostCampaigns: Boolean
  }

  type PasswordResetLinkPayload {
    success: Boolean!
    message: String!
    resetUrl: String!
    emailed: Boolean!
    email: String!
  }

  input AdminUserInput {
    firstName: String
    lastName: String
    email: String
    phone: String
    loyaltyPoints: Int
    emailVerified: Boolean
    phoneVerified: Boolean
    role: UserRole
    restaurantIds: [ID!]
  }

  type SessionInfo {
    user: User
    impersonator: User
    isImpersonating: Boolean!
  }

  type ImpersonationPayload {
    accessToken: String!
    user: User!
    impersonator: User!
    expiresInSeconds: Int!
  }

  type StaffInviteResult {
    inviteUrl: String!
    user: User!
    email: String!
  }

  type SupportPerson {
    id: ID!
    firstName: String!
    lastName: String!
    email: String
    role: UserRole!
  }

  type SupportRestaurantRef {
    id: ID!
    name: String!
    status: RestaurantStatus!
  }

  type SupportNote {
    id: ID!
    body: String!
    authorId: ID!
    author: SupportPerson
    createdAt: DateTime!
    updatedAt: DateTime
  }

  type SupportAttachment {
    id: ID!
    url: String!
    key: String
    filename: String!
    contentType: String!
    size: Int
    uploadedById: ID!
    uploadedBy: SupportPerson
    createdAt: DateTime!
  }

  type SupportTicketEvent {
    id: ID!
    type: String!
    field: String
    from: String
    to: String
    message: String
    actorId: ID!
    actor: SupportPerson
    createdAt: DateTime!
  }

  type SupportTicket {
    id: ID!
    subject: String!
    subjectKey: String
    description: String!
    status: String!
    priority: String!
    category: String!
    requesterId: ID
    restaurantId: ID
    assigneeId: ID
    requester: SupportPerson
    restaurant: SupportRestaurantRef
    assignee: SupportPerson
    notes: [SupportNote!]!
    attachments: [SupportAttachment!]!
    events: [SupportTicketEvent!]!
    firstResponseAt: DateTime
    resolvedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type SupportTicketConnection {
    items: [SupportTicket!]!
    total: Int!
  }

  type EmailTemplate {
    id: ID!
    key: String!
    name: String!
    subject: String!
    bodyHtml: String!
    bodyText: String!
    description: String!
    updatedAt: DateTime!
  }

  type ChurnAlert {
    id: ID!
    alertType: String!
    restaurantId: ID!
    restaurantName: String
    plan: String!
    status: String!
    monthlyPriceCents: Int!
    trialEndsAt: DateTime
    cancelledAt: DateTime
    updatedAt: DateTime!
  }

  type SlaMetrics {
    pendingRestaurantApprovals: Int!
    oldestPendingApprovalHours: Float!
    avgApprovalHoursLast30d: Float!
    openSupportTickets: Int!
    avgFirstResponseHoursLast30d: Float!
    avgResolutionHoursLast30d: Float!
    flaggedReviews: Int!
    flaggedMessages: Int!
    overdueOrPendingInvoices: Int!
  }

  type FlaggedContentItem {
    id: ID!
    type: String!
    restaurantId: ID!
    restaurantName: String
    authorName: String
    body: String!
    rating: Int
    hidden: Boolean!
    flagReason: String
    flaggedAt: DateTime
    createdAt: DateTime!
  }

  type FlaggedContent {
    reviews: [FlaggedContentItem!]!
    messages: [FlaggedContentItem!]!
  }

  type CsvExport {
    filename: String!
    content: String!
    rowCount: Int!
  }

  type StripeSyncResult {
    synced: Int!
    message: String!
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
    loyaltyPoints: Int!
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
    referralCode: String
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
    loyaltyEnabled: Boolean
    loyaltyPointsPerVisit: Int
    loyaltyMinRedeemPoints: Int
    photos: [String!]
  }

  input PartnerAccountInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
    phone: String!
  }

  input PartnerRestaurantInput {
    name: String!
    description: String!
    cuisine: String!
    priceRange: Int!
    address: AddressInput!
    location: LocationInput!
    phone: String!
    website: String
    depositRequired: Boolean
    depositAmountCents: Int
    photos: [String!]
  }

  input RegisterRestaurantPartnerInput {
    account: PartnerAccountInput!
    restaurant: PartnerRestaurantInput!
    plan: String!
  }

  type PartnerRegisterPayload {
    accessToken: String!
    refreshToken: String!
    user: User!
    restaurant: Restaurant!
    subscription: SubscriptionType!
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
    redeemRestaurantPoints: Int
    promoCode: String
    giftCardCode: String
    source: ReservationSource
  }

  input OwnerGuestInput {
    firstName: String!
    lastName: String
    phone: String
    email: String
  }

  input OwnerReservationInput {
    restaurantId: ID!
    partySize: Int!
    slotStart: DateTime!
    occasion: Occasion
    guestNotes: String
    source: ReservationSource
    guest: OwnerGuestInput!
    tableId: ID
    seatImmediately: Boolean
  }

  input UpdateReservationInput {
    partySize: Int
    slotStart: DateTime
    occasion: Occasion
    guestNotes: String
    tableId: ID
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
    reservationId: ID!
    senderType: String!
    senderId: ID!
    body: String!
    readAt: DateTime
    createdAt: DateTime!
  }

  type Conversation {
    reservationId: ID!
    reservation: Reservation
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

  type PromotionValidation {
    valid: Boolean!
    message: String
    promotion: Promotion
    discountCents: Int!
    discountedDepositCents: Int!
    autoApplied: Boolean!
  }

  type PromotionRedemptionDay {
    date: String!
    count: Int!
    discountCents: Int!
  }

  type PromotionPerformance {
    promotionId: ID!
    title: String!
    code: String
    redemptions: Int!
    discountCents: Int!
    active: Boolean!
  }

  type PromotionStats {
    days: Int!
    totalRedemptions: Int!
    totalDiscountCents: Int!
    activePromotionCount: Int!
    redemptionsByDay: [PromotionRedemptionDay!]!
    promotions: [PromotionPerformance!]!
  }

  type GiftCard {
    id: ID!
    restaurantId: ID!
    code: String!
    initialBalanceCents: Int!
    balanceCents: Int!
    recipientName: String
    recipientEmail: String
    expiresAt: DateTime
    note: String
    active: Boolean!
    createdAt: DateTime!
  }

  type GiftCardConnection {
    total: Int!
    items: [GiftCard!]!
  }

  type GiftCardValidation {
    valid: Boolean!
    message: String
    giftCard: GiftCard
    discountCents: Int!
    discountedDepositCents: Int!
  }

  input IssueGiftCardInput {
    balanceCents: Int!
    recipientName: String
    recipientEmail: String
    expiresAt: DateTime
    note: String
  }

  type Promotion {
    id: ID!
    restaurantId: ID!
    title: String!
    description: String
    discountPercent: Int
    discountAmountCents: Int
    code: String
    startDate: String
    endDate: String
    daysOfWeek: [Int!]!
    maxRedemptions: Int
    active: Boolean!
    redemptions: Int!
    createdAt: DateTime!
  }

  input PromotionInput {
    title: String!
    description: String
    discountPercent: Int
    discountAmountCents: Int
    code: String
    startDate: String
    endDate: String
    daysOfWeek: [Int!]
    maxRedemptions: Int
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
    validatePromotion(
      restaurantId: ID!
      code: String!
      slotStart: DateTime!
      depositCents: Int!
    ): PromotionValidation!
    validateGiftCard(restaurantId: ID!, code: String!, depositCents: Int!): GiftCardValidation!
    searchRestaurants(input: SearchRestaurantsInput!): RestaurantConnection!
    availability(restaurantId: ID!, date: String!, partySize: Int!): [AvailabilitySlot!]!
    myReservations: [Reservation!]!
    restaurantReservations(restaurantId: ID!, date: String, limit: Int, offset: Int): ReservationConnection!
    myWaitlist: [WaitlistEntry!]!
    restaurantWaitlist(restaurantId: ID!, limit: Int, offset: Int): WaitlistConnection!
    restaurantReviews(restaurantId: ID!, limit: Int, offset: Int): ReviewConnection!
    myLoyalty: [LoyaltyTransaction!]!
    myRestaurantLoyalty: [RestaurantLoyaltyBalance!]!
    myRestaurantLoyaltyBalance(restaurantId: ID!): Int!
    myRestaurantLoyaltyHistory(restaurantId: ID, limit: Int): [RestaurantLoyaltyTransaction!]!
    myNotifications(limit: Int): [AppNotification!]!
    unreadNotificationCount: Int!
    myRestaurants(
      search: String
      status: RestaurantStatus
      city: String
    ): [Restaurant!]!
    myRestaurantLocationsMeta: MyRestaurantLocationsMeta!
    restaurantTeam(restaurantId: ID!): [User!]!
    adminRestaurants(
      status: RestaurantStatus
      search: String
      limit: Int
      offset: Int
    ): RestaurantConnection!
    adminStats: PlatformStats!
    adminLoyaltyStats: LoyaltyPlatformStats!
    adminReferralLeaders(limit: Int): [ReferralLeader!]!
    adminUsers(search: String, limit: Int, offset: Int): UserConnection!
    adminInvoices(status: InvoiceStatus, search: String, limit: Int, offset: Int): InvoiceConnection!
    adminRevenueReport(period: String): PlatformRevenueReport!
    platformConfig: PlatformConfig!
    session: SessionInfo!
    supportTickets(
      status: String
      assigneeId: ID
      restaurantId: ID
      search: String
      limit: Int
      offset: Int
    ): SupportTicketConnection!
    supportTicket(id: ID!): SupportTicket!
    emailTemplates: [EmailTemplate!]!
    churnAlerts: [ChurnAlert!]!
    slaMetrics: SlaMetrics!
    flaggedContent(limit: Int): FlaggedContent!
    auditLogs(limit: Int, offset: Int): AuditLogConnection!
    mySubscription(restaurantId: ID!): SubscriptionType
    plans: [PlanInfo!]!
    annualBillingSettings: AnnualBillingSettings!
    coverFeeSummary(restaurantId: ID!, period: String): CoverFeeSummary!

    myRestaurantGroups: [RestaurantGroup!]!
    groupAnalytics(groupId: ID!): GroupAnalytics!

    experiences(restaurantId: ID, upcoming: Boolean, limit: Int, offset: Int): ExperienceConnection!
    experience(id: ID!): Experience
    myTickets: [Ticket!]!

    privateDiningSpaces(restaurantId: ID!): [PrivateDiningSpace!]!
    privateDiningInquiries(restaurantId: ID!, limit: Int, offset: Int): PrivateDiningInquiryConnection!
    myInquiries: [PrivateDiningInquiry!]!

    restaurantGuests(restaurantId: ID!, tag: String, vipStatus: String, search: String, limit: Int, offset: Int): GuestProfileConnection!
    guestProfile(restaurantId: ID!, dinerId: ID!): GuestProfile
    restaurantLoyaltyStats(restaurantId: ID!): RestaurantLoyaltyStats!

    campaigns(restaurantId: ID!, limit: Int, offset: Int): CampaignConnection!
    campaign(id: ID!): Campaign

    restaurantSurveys(restaurantId: ID!, limit: Int, offset: Int): SurveyResponseConnection!
    surveyStats(restaurantId: ID!): SurveyStats!
    surveyConfig(restaurantId: ID!): SurveyConfig

    conversations(restaurantId: ID!): [Conversation!]!
    conversation(reservationId: ID!): Conversation
    messages(reservationId: ID!): [Message!]!
    myConversations: [Conversation!]!

    accessRules(restaurantId: ID!): [AccessRule!]!
    promotions(restaurantId: ID!, activeOnly: Boolean, limit: Int, offset: Int): PromotionConnection!
    promotionStats(restaurantId: ID!, days: Int): PromotionStats!
    bestPromotion(restaurantId: ID!, slotStart: DateTime!, depositCents: Int!): PromotionValidation!
    giftCards(restaurantId: ID!, limit: Int, offset: Int): GiftCardConnection!
    boostCampaigns(restaurantId: ID!, limit: Int, offset: Int): BoostCampaignConnection!
    integrations(restaurantId: ID!): [Integration!]!

    preShiftReport(restaurantId: ID!, date: String!, shiftId: ID): PreShiftReport!
    revenueForecast(restaurantId: ID!, days: Int): RevenueForecast!
    customReport(input: CustomReportInput!): [ReportRow!]!
    multiLocationAnalytics(period: String): MultiLocationAnalytics!

    reservationForSurvey(reservationId: ID!): Reservation
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    registerRestaurantPartner(input: RegisterRestaurantPartnerInput!): PartnerRegisterPayload!
    login(input: LoginInput!): AuthPayload!
    loginWithGoogle(idToken: String!): AuthPayload!
    requestPhoneOtp(phone: String!): MessagePayload!
    verifyPhoneOtp(input: PhoneOtpVerifyInput!): AuthPayload!
    refreshToken(refreshToken: String!): AuthPayload!
    logout(refreshToken: String): Boolean!
    requestPasswordReset(email: String!): MessagePayload!
    resetPassword(token: String!, newPassword: String!): MessagePayload!

    createRestaurant(input: RestaurantInput!, plan: String): Restaurant!
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
    createOwnerReservation(input: OwnerReservationInput!): Reservation!
    confirmDepositPayment(paymentIntentId: String!): Reservation!
    updateReservation(id: ID!, input: UpdateReservationInput!): Reservation!
    updateReservationStatus(id: ID!, status: ReservationStatus!, reason: String): Reservation!
    deleteReservation(id: ID!): Boolean!
    joinWaitlist(input: WaitlistInput!): WaitlistEntry!
    cancelWaitlist(id: ID!): Boolean!

    createReview(input: ReviewInput!): Review!
    upsertMenu(restaurantId: ID!, input: MenuInput!): Menu!

    createUploadUrl(filename: String!, contentType: String!): UploadUrl!
    setUserRole(userId: ID!, role: UserRole!): User!
    adminUpdateUser(userId: ID!, input: AdminUserInput!): User!
    requestAdminDeleteUserCode(userId: ID!): AdminDeleteUserCodePayload!
    adminDeleteUser(userId: ID!, code: String): AdminDeleteUserPayload!
    clearSeedData: ClearSeedDataPayload!
    adminUpdateRestaurant(id: ID!, input: RestaurantInput!, featured: Boolean, featuredUntil: DateTime, ownerId: ID): Restaurant!
    adminSendPasswordReset(userId: ID!, sendEmail: Boolean): PasswordResetLinkPayload!
    generateInvoices(period: String!): GenerateInvoicesResult!
    setInvoiceStatus(id: ID!, status: InvoiceStatus!): Invoice!
    setInvoiceStatuses(ids: [ID!]!, status: InvoiceStatus!): BulkInvoiceStatusResult!
    updatePlatformConfig(input: PlatformConfigInput!): PlatformConfig!
    updatePlanPackage(input: PlanPackageInput!): PlanInfo!
    createPlanPackage(input: CreatePlanPackageInput!): PlanInfo!
    deletePlanPackage(key: String!): Boolean!
    startImpersonation(userId: ID!): ImpersonationPayload!
    inviteStaff(
      email: String!
      firstName: String!
      lastName: String!
      restaurantIds: [ID!]!
      role: UserRole
    ): StaffInviteResult!
    assignUserRestaurants(userId: ID!, restaurantIds: [ID!]!, role: UserRole): User!
    removeUserRestaurant(userId: ID!, restaurantId: ID!): User!
    createSupportTicket(
      subject: String
      subjectKey: String
      description: String
      priority: String
      category: String
      requesterId: ID
      restaurantId: ID
      assigneeId: ID
      note: String
    ): SupportTicket!
    updateSupportTicket(
      id: ID!
      status: String
      priority: String
      category: String
      subject: String
      subjectKey: String
      description: String
      assigneeId: ID
      restaurantId: ID
      requesterId: ID
    ): SupportTicket!
    addSupportNote(ticketId: ID!, body: String!): SupportTicket!
    updateSupportNote(ticketId: ID!, noteId: ID!, body: String!): SupportTicket!
    deleteSupportNote(ticketId: ID!, noteId: ID!): SupportTicket!
    addSupportAttachment(
      ticketId: ID!
      url: String!
      key: String
      filename: String!
      contentType: String!
      size: Int
    ): SupportTicket!
    updateSupportAttachment(ticketId: ID!, attachmentId: ID!, filename: String!): SupportTicket!
    removeSupportAttachment(ticketId: ID!, attachmentId: ID!): SupportTicket!
    updateEmailTemplate(
      key: String!
      subject: String
      bodyHtml: String
      bodyText: String
      name: String
    ): EmailTemplate!
    flagReview(id: ID!, reason: String): FlaggedContentItem!
    unflagReview(id: ID!): FlaggedContentItem!
    setReviewHiddenAdmin(id: ID!, hidden: Boolean!): FlaggedContentItem!
    flagMessage(id: ID!, reason: String): FlaggedContentItem!
    unflagMessage(id: ID!): FlaggedContentItem!
    setMessageHidden(id: ID!, hidden: Boolean!): FlaggedContentItem!
    exportAdminCsv(type: String!, period: String): CsvExport!
    syncStripeInvoices(limit: Int): StripeSyncResult!
    createSubscription(restaurantId: ID!, plan: String!): SubscriptionType!
    cancelSubscription(restaurantId: ID!): SubscriptionType!
    changePlan(restaurantId: ID!, plan: String!): SubscriptionType!

    registerPushToken(token: String!, platform: String!): Boolean!
    linkTelegram(chatId: String!): Boolean!
    updateNotificationPreferences(
      userId: ID
      restaurantId: ID
      input: NotificationPreferencesInput!
    ): User!
    markNotificationsRead(ids: [ID!]): Boolean!
    markAllNotificationsRead: Boolean!

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

    sendMessage(reservationId: ID!, body: String!): Message!
    markConversationRead(reservationId: ID!): Boolean!

    createAccessRule(restaurantId: ID!, input: AccessRuleInput!): AccessRule!
    updateAccessRule(id: ID!, input: AccessRuleInput!): AccessRule!
    deleteAccessRule(id: ID!): Boolean!

    createPromotion(restaurantId: ID!, input: PromotionInput!): Promotion!
    updatePromotion(id: ID!, input: PromotionInput!): Promotion!
    deletePromotion(id: ID!): Boolean!

    issueGiftCard(restaurantId: ID!, input: IssueGiftCardInput!): GiftCard!
    setGiftCardActive(id: ID!, active: Boolean!): GiftCard!

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
