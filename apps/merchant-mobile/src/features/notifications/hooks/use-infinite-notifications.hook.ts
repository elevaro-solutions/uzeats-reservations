import { useQuery } from "@apollo/client";
import { useCallback, useEffect, useRef, useState } from "react";

import { MY_NOTIFICATIONS } from "../api/notifications.operations";
import type {
  AppNotification,
  MyNotificationsQuery,
} from "../helpers/notification.types";

type Options = {
  pageSize?: number;
  skip?: boolean;
};

export function useInfiniteNotifications(options: Options = {}) {
  const pageSize = options.pageSize ?? 20;
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const itemIdsRef = useRef<Set<string>>(new Set());
  const itemsRef = useRef<AppNotification[]>([]);
  const offset = (page - 1) * pageSize;

  itemsRef.current = items;

  const { data, loading, error, refetch } = useQuery<MyNotificationsQuery>(
    MY_NOTIFICATIONS,
    {
      variables: { limit: pageSize, offset },
      skip: options.skip,
      notifyOnNetworkStatusChange: true,
      fetchPolicy: "cache-and-network",
    },
  );

  useEffect(() => {
    const connection = data?.myNotifications;
    if (!connection) return;
    // Avoid applying the previous page's cached result while the next offset loads.
    if (loading && page > 1) return;

    const pageItems = connection.items ?? [];
    setTotal(connection.total);
    if (typeof data?.unreadNotificationCount === "number") {
      setUnreadCount(data.unreadNotificationCount);
    }

    if (page === 1) {
      itemIdsRef.current = new Set(pageItems.map((n) => n.id));
      setItems(pageItems);
      setExhausted(pageItems.length === 0 || pageItems.length < pageSize);
      return;
    }

    const next = pageItems.filter((n) => !itemIdsRef.current.has(n.id));
    if (
      pageItems.length === 0 ||
      next.length === 0 ||
      pageItems.length < pageSize
    ) {
      setExhausted(true);
    }
    if (next.length === 0) return;

    for (const n of next) itemIdsRef.current.add(n.id);
    setItems((prev) => [...prev, ...next]);
  }, [data, page, pageSize, loading]);

  const hasMore = !exhausted && items.length < total;
  const loadingMore = loading && page > 1;
  const initialLoading = loading && page === 1 && items.length === 0;

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    setPage((p) => p + 1);
  }, [loading, hasMore]);

  const refresh = useCallback(async () => {
    setPage(1);
    setExhausted(false);
    itemIdsRef.current = new Set();
    const result = await refetch({ limit: pageSize, offset: 0 });
    const connection = result.data?.myNotifications;
    if (connection) {
      const pageItems = connection.items ?? [];
      itemIdsRef.current = new Set(pageItems.map((n) => n.id));
      setItems(pageItems);
      setTotal(connection.total);
      setExhausted(pageItems.length === 0 || pageItems.length < pageSize);
    }
    if (typeof result.data?.unreadNotificationCount === "number") {
      setUnreadCount(result.data.unreadNotificationCount);
    }
  }, [pageSize, refetch]);

  const markItemsRead = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const newlyRead = itemsRef.current.filter(
      (item) => idSet.has(item.id) && !item.readAt,
    ).length;
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((item) =>
        idSet.has(item.id) && !item.readAt ? { ...item, readAt: now } : item,
      ),
    );
    if (newlyRead > 0) {
      setUnreadCount((count) => Math.max(0, count - newlyRead));
    }
  }, []);

  const markAllItemsRead = useCallback(() => {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((item) => (item.readAt ? item : { ...item, readAt: now })),
    );
    setUnreadCount(0);
  }, []);

  return {
    items,
    total,
    unreadCount,
    loading: initialLoading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    markItemsRead,
    markAllItemsRead,
  };
}
