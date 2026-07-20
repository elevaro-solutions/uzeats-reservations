import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import {
  MY_RESTAURANTS_FLOOR_PLAN,
  FLOOR_PLAN_RESERVATIONS,
  UPDATE_RESERVATION_STATUS,
} from '../../src/lib/graphql';
import { useAuth } from '../../src/lib/auth';

type FloorTable = {
  id: string;
  name: string;
  minCapacity: number;
  maxCapacity: number;
  floorArea: string;
  active: boolean;
  posX: number;
  posY: number;
  width: number;
  height: number;
  shape: string;
};

type FloorReservation = {
  id: string;
  partySize: number;
  slotStart: string;
  status: string;
  occasion?: string;
  guestNotes?: string;
  tableIds?: string[];
  diner?: { firstName?: string; lastName?: string };
  tables?: { name: string }[];
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatOccasion(occasion?: string) {
  if (!occasion || occasion === 'none') return null;
  return occasion.charAt(0).toUpperCase() + occasion.slice(1);
}

function guestName(r: FloorReservation) {
  const name = `${r.diner?.firstName ?? ''} ${r.diner?.lastName ?? ''}`.trim();
  return name || 'Guest';
}

const GRID_COLUMNS = 24;
const CANVAS_PADDING = 16;

export default function FloorPlanScreen() {
  const { user } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: restaurantsData,
    loading: restaurantsLoading,
    refetch: refetchRestaurants,
  } = useQuery(MY_RESTAURANTS_FLOOR_PLAN, { skip: !user });

  const restaurants = restaurantsData?.myRestaurants ?? [];
  const activeRestaurantId = restaurantId ?? restaurants[0]?.id ?? null;
  const restaurant = restaurants.find((r: { id: string }) => r.id === activeRestaurantId);

  const { data: reservationsData, refetch: refetchReservations } = useQuery(
    FLOOR_PLAN_RESERVATIONS,
    {
      variables: { restaurantId: activeRestaurantId, date: todayISO() },
      skip: !activeRestaurantId,
    },
  );
  const [updateStatus] = useMutation(UPDATE_RESERVATION_STATUS);

  const reservations: FloorReservation[] =
    reservationsData?.restaurantReservations?.items ?? [];

  const occupiedTableIds = useMemo(() => {
    const ids = new Set<string>();
    for (const res of reservations) {
      if (res.status !== 'seated') continue;
      for (const tableId of res.tableIds ?? []) ids.add(tableId);
    }
    return ids;
  }, [reservations]);

  const tables: FloorTable[] = (restaurant?.tables ?? []).filter(
    (t: FloorTable) => t.active,
  );
  const areas = useMemo(
    () => Array.from(new Set(tables.map((t) => t.floorArea))),
    [tables],
  );
  const visibleTables = area ? tables.filter((t) => t.floorArea === area) : tables;

  const cell = (screenWidth - CANVAS_PADDING * 2) / GRID_COLUMNS;
  const canvasHeight =
    visibleTables.reduce((max, t) => Math.max(max, t.posY + t.height), 0) * cell +
    CANVAS_PADDING * 2;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchRestaurants(), refetchReservations()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchRestaurants, refetchReservations]);

  const runStatusUpdate = async (
    id: string,
    status: string,
    reason?: string,
  ) => {
    try {
      await updateStatus({ variables: { id, status, reason } });
      await refetchReservations();
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to update reservation',
      );
    }
  };

  const openMoreActions = (r: FloorReservation) => {
    const buttons: {
      text: string;
      style?: 'cancel' | 'destructive' | 'default';
      onPress?: () => void;
    }[] = [];

    if (r.status === 'confirmed') {
      buttons.push({
        text: 'Seat',
        onPress: () => runStatusUpdate(r.id, 'seated'),
      });
      buttons.push({
        text: 'No-show',
        onPress: () => runStatusUpdate(r.id, 'no_show'),
      });
    }

    if (r.status === 'seated') {
      buttons.push({
        text: 'Complete',
        onPress: () => runStatusUpdate(r.id, 'completed'),
      });
    }

    if (['pending', 'confirmed'].includes(r.status)) {
      buttons.push({
        text: 'Cancel',
        style: 'destructive',
        onPress: () =>
          runStatusUpdate(r.id, 'cancelled', 'Cancelled by restaurant'),
      });
    }

    if (buttons.length === 0) {
      Alert.alert('Actions', 'No actions available for this reservation.');
      return;
    }

    buttons.push({ text: 'Close', style: 'cancel' });
    Alert.alert(`${guestName(r)} · ${r.status}`, 'Choose an action', buttons);
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Sign in to view your floor plan.</Text>
      </View>
    );
  }

  if (restaurantsLoading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color="#da3743" />;
  }

  if (restaurants.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>You don't manage any restaurants.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#da3743"
        />
      }
    >
      {restaurants.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {restaurants.map((r: { id: string; name: string }) => {
            const isActive = r.id === activeRestaurantId;
            return (
              <Pressable
                key={r.id}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => {
                  setRestaurantId(r.id);
                  setArea(null);
                }}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {r.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {areas.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {[null, ...areas].map((a) => {
            const isActive = area === a;
            return (
              <Pressable
                key={a ?? 'all'}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setArea(a)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {a ?? 'All areas'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: '#2e9e5b' }]} />
        <Text style={styles.legendText}>Free</Text>
        <View style={[styles.legendDot, { backgroundColor: '#da3743' }]} />
        <Text style={styles.legendText}>Seated</Text>
      </View>

      {visibleTables.length === 0 ? (
        <Text style={[styles.emptyText, { padding: CANVAS_PADDING }]}>
          No tables in this area yet.
        </Text>
      ) : (
        <View style={[styles.canvas, { height: canvasHeight }]}>
          {visibleTables.map((t) => {
            const occupied = occupiedTableIds.has(t.id);
            const size = {
              left: CANVAS_PADDING + t.posX * cell,
              top: CANVAS_PADDING + t.posY * cell,
              width: t.width * cell,
              height: t.height * cell,
            };
            return (
              <View
                key={t.id}
                style={[
                  styles.table,
                  size,
                  t.shape === 'round' && { borderRadius: 999 },
                  occupied ? styles.tableOccupied : styles.tableFree,
                ]}
              >
                <Text
                  style={[styles.tableName, occupied && styles.tableTextOccupied]}
                  numberOfLines={1}
                >
                  {t.name}
                </Text>
                <Text
                  style={[styles.tableCapacity, occupied && styles.tableTextOccupied]}
                  numberOfLines={1}
                >
                  {t.minCapacity}–{t.maxCapacity}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.listSection}>
        <Text style={styles.listTitle}>Today's reservations</Text>
        {reservations.length === 0 ? (
          <Text style={styles.emptyText}>No reservations today.</Text>
        ) : (
          reservations.map((r) => {
            const occasion = formatOccasion(r.occasion);
            const notes = r.guestNotes?.trim();
            const tableLabel =
              (r.tables ?? []).map((t) => t.name).join(', ') || 'Unassigned';
            return (
              <View key={r.id} style={styles.resCard}>
                <View style={styles.resHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resName}>{guestName(r)}</Text>
                    <Text style={styles.resMeta}>
                      {new Date(r.slotStart).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}{' '}
                      · {r.partySize} guests · {tableLabel}
                    </Text>
                  </View>
                  <Pressable style={styles.moreBtn} onPress={() => openMoreActions(r)}>
                    <Text style={styles.moreBtnText}>More</Text>
                  </Pressable>
                </View>
                <Text style={styles.resStatus}>{r.status}</Text>
                {occasion ? (
                  <Text style={styles.resDetail}>
                    Occasion: <Text style={styles.resDetailValue}>{occasion}</Text>
                  </Text>
                ) : null}
                {notes ? (
                  <Text style={styles.resDetail}>
                    Special request:{' '}
                    <Text style={styles.resDetailValue}>{notes}</Text>
                  </Text>
                ) : null}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  centered: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: { color: '#666', fontSize: 15 },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: CANVAS_PADDING,
    paddingTop: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#da3743',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#da3743' },
  chipText: { color: '#da3743', fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: CANVAS_PADDING,
    paddingTop: 12,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  legendText: { color: '#666', fontSize: 13 },
  canvas: {
    marginTop: 8,
    marginHorizontal: 0,
    backgroundColor: '#fff',
  },
  table: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  tableFree: { backgroundColor: '#e9f7ef', borderColor: '#2e9e5b' },
  tableOccupied: { backgroundColor: '#da3743', borderColor: '#b02531' },
  tableName: { fontWeight: '700', fontSize: 12, color: '#1c1917' },
  tableCapacity: { fontSize: 10, color: '#666' },
  tableTextOccupied: { color: '#fff' },
  listSection: {
    paddingHorizontal: CANVAS_PADDING,
    paddingTop: 20,
  },
  listTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 12,
  },
  resCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  resHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  resName: { fontWeight: '700', fontSize: 16, color: '#1c1917' },
  resMeta: { color: '#666', marginTop: 4, fontSize: 13 },
  moreBtn: {
    borderWidth: 1,
    borderColor: '#da3743',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  moreBtnText: { color: '#da3743', fontWeight: '600', fontSize: 13 },
  resStatus: {
    marginTop: 8,
    color: '#da3743',
    fontWeight: '600',
    textTransform: 'capitalize',
    fontSize: 13,
  },
  resDetail: {
    marginTop: 6,
    color: '#666',
    fontSize: 13,
  },
  resDetailValue: {
    color: '#1c1917',
    fontWeight: '500',
  },
});
