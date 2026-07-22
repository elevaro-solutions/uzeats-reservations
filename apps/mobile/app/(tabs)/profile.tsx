import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import { LOYALTY, loyaltyRedeemProgress, resolveLoyaltyTier } from '@reservations/shared';
import { useAuth } from '../../src/lib/auth';
import { MY_LOYALTY, MY_RESTAURANT_LOYALTY } from '../../src/lib/graphql';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { data } = useQuery(MY_LOYALTY, { skip: !user });
  const { data: restaurantData } = useQuery(MY_RESTAURANT_LOYALTY, { skip: !user });

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Not signed in</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.push('/login')}>
          <Text style={styles.primaryText}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  const progress = loyaltyRedeemProgress(user.loyaltyPoints ?? 0);
  const tier = resolveLoyaltyTier(user.loyaltyCompletedVisits ?? 0);
  const history = data?.myLoyalty ?? [];
  const restaurantBalances = restaurantData?.myRestaurantLoyalty ?? [];
  const restaurantHistory = restaurantData?.myRestaurantLoyaltyHistory ?? [];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.firstName[0]}
            {user.lastName[0]}
          </Text>
        </View>
        <Text style={styles.name}>
          {user.firstName} {user.lastName}
        </Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statValue}>{user.loyaltyPoints}</Text>
        <Text style={styles.statLabel}>Loyalty points</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress.percent}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {progress.canRedeem
            ? `Ready to redeem (${LOYALTY.MIN_REDEEM_POINTS}+ pts)`
            : `${progress.remaining} pts until you can redeem`}
        </Text>
        <Text style={styles.tierText}>
          {tier.name} tier
          {tier.visitsToNextTier != null
            ? ` · ${tier.visitsToNextTier} visits to ${tier.nextTier?.name}`
            : ' · top tier'}
        </Text>
        {user.referralCode ? (
          <Text style={styles.referralText}>Refer friends: {user.referralCode}</Text>
        ) : null}
      </View>

      {(restaurantBalances.length > 0 || restaurantHistory.length > 0) && (
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Restaurant rewards</Text>
          {restaurantBalances.map((item: {
            restaurantId: string;
            restaurantName: string;
            points: number;
          }) => (
            <Pressable
              key={item.restaurantId}
              style={styles.restaurantBalanceRow}
              onPress={() => router.push(`/restaurant/${item.restaurantId}`)}
            >
              <Text style={styles.restaurantBalanceName}>{item.restaurantName}</Text>
              <Text style={styles.restaurantBalancePts}>{item.points} pts</Text>
            </Pressable>
          ))}
          {restaurantHistory.length > 0 && (
            <>
              <Text style={[styles.historyTitle, { marginTop: 16, fontSize: 15 }]}>
                Restaurant activity
              </Text>
              {restaurantHistory.map((item: {
                id: string;
                points: number;
                restaurantName: string;
                description: string;
                createdAt: string;
              }) => (
                <View key={item.id} style={styles.historyRow}>
                  <Text
                    style={[
                      styles.historyPoints,
                      { color: item.points > 0 ? '#15803d' : '#111' },
                    ]}
                  >
                    {item.points > 0 ? '+' : ''}
                    {item.points} · {item.restaurantName}
                  </Text>
                  <Text style={styles.historyDate}>{item.description}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      <View style={styles.historyCard}>
        <Text style={styles.historyTitle}>Loyalty history</Text>
        {history.length === 0 ? (
          <Text style={styles.historyEmpty}>
            No loyalty activity yet — book a table to start earning points.
          </Text>
        ) : (
          history.map((item: {
            id: string;
            points: number;
            description: string;
            createdAt: string;
          }) => (
            <View key={item.id} style={styles.historyRow}>
              <Text
                style={[
                  styles.historyPoints,
                  { color: item.points > 0 ? '#15803d' : '#111' },
                ]}
              >
                {item.points > 0 ? '+' : ''}
                {item.points} · {item.description}
              </Text>
              <Text style={styles.historyDate}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </View>

      {(user.role === 'restaurant_owner' || user.role === 'staff') && (
        <Pressable style={styles.primaryBtn} onPress={() => router.push('/owner/floor-plan')}>
          <Text style={styles.primaryText}>Floor plan</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.logoutBtn}
        onPress={async () => {
          await logout();
          router.replace('/');
        }}
      >
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f7f7f7' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  centered: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { alignItems: 'center', marginBottom: 8 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0b3d2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700' },
  email: { color: '#666', marginTop: 4, fontSize: 15 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  statValue: { fontSize: 32, fontWeight: '700', color: '#0b3d2e' },
  statLabel: { color: '#666', marginTop: 4 },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#e8f5ef',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0b3d2e',
    borderRadius: 4,
  },
  progressText: { color: '#666', fontSize: 13, marginTop: 8, textAlign: 'center' },
  tierText: { color: '#0b3d2e', fontSize: 13, marginTop: 8, fontWeight: '600', textAlign: 'center' },
  referralText: { color: '#666', fontSize: 13, marginTop: 8, textAlign: 'center' },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    width: '100%',
  },
  historyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  restaurantBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  restaurantBalanceName: { fontSize: 15, fontWeight: '600' },
  restaurantBalancePts: { fontSize: 15, color: '#0b3d2e', fontWeight: '700' },
  historyEmpty: { color: '#666', lineHeight: 20 },
  historyRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyPoints: { fontWeight: '600', fontSize: 14 },
  historyDate: { color: '#888', fontSize: 12, marginTop: 4 },
  primaryBtn: {
    backgroundColor: '#0b3d2e',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  logoutBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#0b3d2e',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    width: '100%',
  },
  logoutText: { color: '#0b3d2e', fontWeight: '700' },
});
