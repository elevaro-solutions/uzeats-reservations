import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { useRouter } from 'expo-router';
import { MY_WAITLIST, CANCEL_WAITLIST } from '../../src/lib/graphql';
import { useAuth } from '../../src/lib/auth';

export default function WaitlistScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { data, loading, refetch } = useQuery(MY_WAITLIST, { skip: !user });
  const [cancelWaitlist] = useMutation(CANCEL_WAITLIST);

  if (!user) {
    router.replace('/login');
    return null;
  }

  const handleCancel = (id: string) => {
    Alert.alert('Leave waitlist', 'Remove yourself from this waitlist?', [
      { text: 'Keep waiting', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelWaitlist({ variables: { id } });
            refetch();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color="#0b3d2e" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={data?.myWaitlist ?? []}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={styles.empty}>You're not on any waitlists</Text>
          }
          renderItem={({ item }: { item: any }) => (
            <View style={styles.card}>
              <Text style={styles.name}>
                {item.preferredDate} · {item.partySize} guests
              </Text>
              {item.preferredTimeStart ? (
                <Text style={styles.meta}>
                  Preferred time: {item.preferredTimeStart}
                  {item.preferredTimeEnd ? ` – ${item.preferredTimeEnd}` : ''}
                </Text>
              ) : null}
              {item.notifiedSlot ? (
                <Text style={styles.notified}>
                  Slot available:{' '}
                  {new Date(item.notifiedSlot).toLocaleString()}
                </Text>
              ) : null}
              <Text
                style={[
                  styles.status,
                  item.status === 'notified' && styles.statusNotified,
                ]}
              >
                {item.status}
              </Text>
              {item.status === 'waiting' && (
                <Pressable
                  style={styles.leaveBtn}
                  onPress={() => handleCancel(item.id)}
                >
                  <Text style={styles.leaveText}>Leave waitlist</Text>
                </Pressable>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7', padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  name: { fontWeight: '700', fontSize: 16 },
  meta: { color: '#666', marginTop: 4 },
  notified: { color: '#2d9c3c', marginTop: 4, fontWeight: '600' },
  empty: { color: '#666', marginTop: 24, textAlign: 'center' },
  status: {
    marginTop: 8,
    color: '#0b3d2e',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusNotified: { color: '#2d9c3c' },
  leaveBtn: {
    borderWidth: 1,
    borderColor: '#0b3d2e',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  leaveText: { color: '#0b3d2e', fontWeight: '600', fontSize: 13 },
});
