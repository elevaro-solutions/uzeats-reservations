import { gql } from "@apollo/client";

export const RESTAURANT_WAITLIST_FULL = gql`
  query RestaurantWaitlistFull(
    $restaurantId: ID!
    $limit: Int
    $offset: Int
    $statuses: [WaitlistStatus!]
    $preferredDate: String
    $source: String
  ) {
    restaurantWaitlist(
      restaurantId: $restaurantId
      limit: $limit
      offset: $offset
      statuses: $statuses
      preferredDate: $preferredDate
      source: $source
    ) {
      total
      items {
        id
        partySize
        preferredDate
        preferredTimeStart
        preferredTimeEnd
        status
        guestName
        guestPhone
        source
        quotedWaitMinutes
        position
        estimatedWaitMinutes
        waitingMinutes
        promisedWaitMinutes
        isOverdue
        createdAt
        reservationId
        dinerId
        diner {
          firstName
          lastName
          phone
        }
      }
    }
  }
`;

export const ADD_IN_HOUSE_WAITLIST = gql`
  mutation AddInHouseWaitlistEntry($input: InHouseWaitlistInput!) {
    addInHouseWaitlistEntry(input: $input) {
      id
      guestName
      status
      dinerId
    }
  }
`;

export const WAITLIST_GUEST_SEARCH = gql`
  query WaitlistGuestSearch($restaurantId: ID!, $search: String!, $limit: Int) {
    searchWaitlistGuests(restaurantId: $restaurantId, search: $search, limit: $limit) {
      dinerId
      guestName
      guestPhone
      email
      totalVisits
      vipStatus
      inGuestBook
    }
  }
`;

export const UPDATE_WAITLIST_ENTRY = gql`
  mutation UpdateWaitlistEntry($input: UpdateWaitlistEntryInput!) {
    updateWaitlistEntry(input: $input) {
      id
      guestName
      guestPhone
      partySize
      quotedWaitMinutes
      dinerId
      status
    }
  }
`;

export const UPDATE_WAITLIST_STATUS = gql`
  mutation UpdateWaitlistStatus($id: ID!, $status: WaitlistStatus!, $tableId: ID) {
    updateWaitlistStatus(id: $id, status: $status, tableId: $tableId) {
      id
      status
      reservationId
    }
  }
`;
