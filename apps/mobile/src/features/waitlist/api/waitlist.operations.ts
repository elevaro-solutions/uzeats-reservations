import { gql } from "@apollo/client";

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
      estimatedWaitMinutes
      createdAt
      restaurant {
        id
        name
        timezone
      }
    }
  }
`;

export const CANCEL_WAITLIST = gql`
  mutation CancelWaitlist($id: ID!) {
    cancelWaitlist(id: $id)
  }
`;
