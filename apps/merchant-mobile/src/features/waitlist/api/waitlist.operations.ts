import { gql } from "@apollo/client";

export const RESTAURANT_WAITLIST_FULL = gql`
  query RestaurantWaitlistFull($restaurantId: ID!, $limit: Int, $offset: Int) {
    restaurantWaitlist(
      restaurantId: $restaurantId
      limit: $limit
      offset: $offset
    ) {
      total
      items {
        id
        partySize
        status
        guestName
        guestPhone
        quotedWaitMinutes
        position
        estimatedWaitMinutes
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
    }
  }
`;

export const UPDATE_WAITLIST_STATUS = gql`
  mutation UpdateWaitlistStatus($id: ID!, $status: WaitlistStatus!) {
    updateWaitlistStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;
