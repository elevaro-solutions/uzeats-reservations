export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export type MyNotificationsQuery = {
  myNotifications: {
    items: AppNotification[];
    total: number;
  };
  unreadNotificationCount: number;
};
