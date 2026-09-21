import { gql } from "@apollo/client";

export const CONVERSATIONS = gql`
  query Conversations($restaurantId: ID!) {
    conversations(restaurantId: $restaurantId) {
      reservationId
      dinerId
      unreadCount
      diner {
        id
        firstName
        lastName
        email
      }
      reservation {
        id
        slotStart
        partySize
        status
      }
      lastMessage {
        id
        body
        senderType
        createdAt
      }
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
      diner {
        id
        firstName
        lastName
        email
      }
      reservation {
        id
        slotStart
        partySize
        status
      }
      lastMessage {
        id
        body
        senderType
        createdAt
      }
    }
  }
`;

export const MESSAGES = gql`
  query Messages($reservationId: ID!) {
    messages(reservationId: $reservationId) {
      id
      body
      senderType
      senderId
      readAt
      createdAt
      reservationId
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($reservationId: ID!, $body: String!) {
    sendMessage(reservationId: $reservationId, body: $body) {
      id
      body
      senderType
      createdAt
    }
  }
`;

export const MARK_CONVERSATION_READ = gql`
  mutation MarkConversationRead($reservationId: ID!) {
    markConversationRead(reservationId: $reservationId)
  }
`;

export const RESTAURANT_INQUIRIES = gql`
  query RestaurantInquiries($restaurantId: ID!) {
    restaurantInquiries(restaurantId: $restaurantId) {
      id
      restaurantId
      senderName
      senderEmail
      userId
      message
      readAt
      createdAt
    }
  }
`;

export const MARK_RESTAURANT_INQUIRY_READ = gql`
  mutation MarkRestaurantInquiryRead($id: ID!) {
    markRestaurantInquiryRead(id: $id) {
      id
      readAt
    }
  }
`;
