import { gql } from "@apollo/client";

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
