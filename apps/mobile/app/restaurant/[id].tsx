import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@apollo/client';
import {
  AVAILABILITY,
  BOOK,
  RESTAURANT,
  REGISTER_PUSH,
  JOIN_WAITLIST,
} from '../../src/lib/graphql';
import { useAuth } from '../../src/lib/auth';
import * as Notifications from 'expo-notifications';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [date, setDate] = useState(tomorrow.toISOString().slice(0, 10));
  const [partySize, setPartySize] = useState(2);
  const [selected, setSelected] = useState<string | null>(null);
  const [waitlistTime, setWaitlistTime] = useState('');

  const { data, loading } = useQuery(RESTAURANT, { variables: { id } });
  const { data: avail } = useQuery(AVAILABILITY, {
    variables: { restaurantId: id, date, partySize },
  });
  const [book, { loading: booking }] = useMutation(BOOK);
  const [registerPush] = useMutation(REGISTER_PUSH);
  const [joinWaitlist, { loading: joining }] = useMutation(JOIN_WAITLIST);

  const restaurant = data?.restaurant;
  const slots = (avail?.availability ?? []).filter((s: any) => s.available);

  if (loading || !restaurant) {
    return <ActivityIndicator style={{ marginTop: 40 }} color="#da3743" />;
  }

  const handleBook = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!selected) {
      Alert.alert('Select a time');
      return;
    }
    try {
      await book({
        variables: {
          input: {
            restaurantId: id,
            partySize,
            slotStart: selected,
            occasion: 'none',
          },
        },
      });
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          const token = (await Notifications.getExpoPushTokenAsync()).data;
          await registerPush({ variables: { token, platform: 'ios' } });
        }
      } catch {
        // push optional on simulators
      }
      Alert.alert('Booked!', 'Your reservation is confirmed.');
      router.push('/reservations');
    } catch (err) {
      Alert.alert(
        'Booking failed',
        err instanceof Error ? err.message : 'Error',
      );
    }
  };

  const handleJoinWaitlist = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    try {
      await joinWaitlist({
        variables: {
          input: {
            restaurantId: id,
            partySize,
            preferredDate: date,
            preferredTimeStart: waitlistTime || undefined,
          },
        },
      });
      Alert.alert(
        'Added!',
        "You've been added to the waitlist. We'll notify you when a spot opens.",
      );
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to join waitlist',
      );
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {restaurant.photos?.[0] && (
        <Image source={{ uri: restaurant.photos[0] }} style={styles.hero} />
      )}
      <View style={styles.body}>
        <Text style={styles.name}>{restaurant.name}</Text>
        <Text style={styles.meta}>
          {restaurant.cuisine} · ★ {restaurant.averageRating?.toFixed?.(1)}
        </Text>
        <Text style={styles.desc}>{restaurant.description}</Text>

        <Text style={styles.section}>Find a table</Text>

        <View style={styles.controls}>
          <View style={styles.dateField}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={date}
              onChangeText={(v) => {
                setDate(v);
                setSelected(null);
              }}
            />
          </View>
          <View style={styles.partyField}>
            <Text style={styles.label}>Guests</Text>
            <View style={styles.stepper}>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => {
                  setPartySize((s) => Math.max(1, s - 1));
                  setSelected(null);
                }}
              >
                <Text style={styles.stepperText}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{partySize}</Text>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => {
                  setPartySize((s) => Math.min(20, s + 1));
                  setSelected(null);
                }}
              >
                <Text style={styles.stepperText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.slots}>
          {slots.map((s: any) => {
            const label = new Date(s.time).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            });
            const active = selected === s.time;
            return (
              <Pressable
                key={s.time}
                style={[styles.slot, active && styles.slotActive]}
                onPress={() => setSelected(s.time)}
              >
                <Text
                  style={[styles.slotText, active && styles.slotTextActive]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {slots.length > 0 ? (
          <Pressable
            style={styles.button}
            disabled={booking}
            onPress={handleBook}
          >
            <Text style={styles.buttonText}>
              {booking ? 'Booking…' : 'Complete reservation'}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.waitlistSection}>
            <Text style={styles.noSlots}>
              No times available for this date
            </Text>
            <Text style={styles.waitlistLabel}>Join the waitlist</Text>
            <TextInput
              style={styles.input}
              placeholder="Preferred time, e.g. 19:00 (optional)"
              value={waitlistTime}
              onChangeText={setWaitlistTime}
            />
            <Pressable
              style={styles.button}
              disabled={joining}
              onPress={handleJoinWaitlist}
            >
              <Text style={styles.buttonText}>
                {joining ? 'Joining…' : 'Join waitlist'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  hero: { width: '100%', height: 200 },
  body: { padding: 16 },
  name: { fontSize: 24, fontWeight: '700' },
  meta: { color: '#666', marginTop: 6 },
  desc: { marginTop: 12, lineHeight: 20 },
  section: { marginTop: 20, fontWeight: '700', fontSize: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4 },
  controls: { flexDirection: 'row', gap: 8, marginTop: 10 },
  dateField: { flex: 2 },
  partyField: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 8,
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepperBtn: { paddingHorizontal: 14, paddingVertical: 2 },
  stepperText: { fontSize: 20, color: '#da3743', fontWeight: '700' },
  stepperValue: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  slot: {
    borderWidth: 1,
    borderColor: '#da3743',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  slotActive: { backgroundColor: '#da3743' },
  slotText: { color: '#da3743', fontWeight: '600' },
  slotTextActive: { color: '#fff' },
  button: {
    marginTop: 16,
    backgroundColor: '#da3743',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  waitlistSection: { marginTop: 12 },
  noSlots: { color: '#666', marginBottom: 12 },
  waitlistLabel: { fontWeight: '700', fontSize: 15, marginBottom: 8 },
});
