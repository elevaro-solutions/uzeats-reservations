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
  MY_RESTAURANT_LOYALTY_BALANCE,
  BEST_PROMOTION,
} from '../../src/lib/graphql';
import { useAuth } from '../../src/lib/auth';
import {
  LOYALTY,
  RESTAURANT_LOYALTY,
  depositPointsFromCents,
  loyaltyRedeemProgress,
  pointsToDiscountCents,
  restaurantPointsToDiscountCents,
} from '@reservations/shared';
import * as Notifications from 'expo-notifications';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, refreshMe } = useAuth();
  const router = useRouter();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [date, setDate] = useState(tomorrow.toISOString().slice(0, 10));
  const [partySize, setPartySize] = useState(2);
  const [selected, setSelected] = useState<string | null>(null);
  const [waitlistTime, setWaitlistTime] = useState('');
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [redeemRestaurantPoints, setRedeemRestaurantPoints] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');

  const { data, loading } = useQuery(RESTAURANT, { variables: { id } });
  const { data: loyaltyData } = useQuery(MY_RESTAURANT_LOYALTY_BALANCE, {
    variables: { restaurantId: id },
    skip: !user,
  });
  const { data: avail } = useQuery(AVAILABILITY, {
    variables: { restaurantId: id, date, partySize },
  });
  const [book, { loading: booking }] = useMutation(BOOK);
  const [registerPush] = useMutation(REGISTER_PUSH);
  const [joinWaitlist, { loading: joining }] = useMutation(JOIN_WAITLIST);

  const restaurant = data?.restaurant;
  const slots = (avail?.availability ?? []).filter((s: any) => s.available);
  const grossDepositCents =
    restaurant?.depositRequired && restaurant.depositAmountCents > 0
      ? restaurant.depositAmountCents * partySize
      : 0;
  const redeemProgress = loyaltyRedeemProgress(user?.loyaltyPoints ?? 0);
  const restaurantLoyaltyBalance = loyaltyData?.myRestaurantLoyaltyBalance ?? 0;
  const restaurantMinRedeem =
    restaurant?.loyaltyMinRedeemPoints ?? RESTAURANT_LOYALTY.DEFAULT_MIN_REDEEM_POINTS;
  const canRedeem =
    !!user &&
    redeemProgress.canRedeem &&
    grossDepositCents > 0;
  const canRedeemRestaurant =
    !!user &&
    !!restaurant?.loyaltyEnabled &&
    restaurantLoyaltyBalance >= restaurantMinRedeem &&
    grossDepositCents > 0;
  const depositBeforePromo = Math.max(
    0,
    grossDepositCents -
      (redeemPoints >= LOYALTY.MIN_REDEEM_POINTS ? pointsToDiscountCents(redeemPoints) : 0) -
      (canRedeemRestaurant && redeemRestaurantPoints >= restaurantMinRedeem
        ? restaurantPointsToDiscountCents(redeemRestaurantPoints)
        : 0),
  );
  const { data: bestPromoData } = useQuery(BEST_PROMOTION, {
    variables: {
      restaurantId: id,
      slotStart: selected!,
      depositCents: depositBeforePromo,
    },
    skip: !selected || !!promoCode.trim() || depositBeforePromo <= 0,
  });
  const bestPromotion = bestPromoData?.bestPromotion;

  if (loading || !restaurant) {
    return <ActivityIndicator style={{ marginTop: 40 }} color="#0b3d2e" />;
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
            ...(redeemPoints >= LOYALTY.MIN_REDEEM_POINTS ? { redeemPoints } : {}),
            ...(canRedeemRestaurant && redeemRestaurantPoints >= restaurantMinRedeem
              ? { redeemRestaurantPoints }
              : {}),
            ...(promoCode.trim() ? { promoCode: promoCode.trim().toUpperCase() } : {}),
            ...(giftCardCode.trim() ? { giftCardCode: giftCardCode.trim().toUpperCase() } : {}),
          },
        },
      });
      await refreshMe();
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

        {user && (
          <Text style={styles.earnHint}>
            Earn {LOYALTY.POINTS_PER_COMPLETED_VISIT} pts when you complete your visit
            {grossDepositCents > 0
              ? ` and ${depositPointsFromCents(grossDepositCents)} pts when your deposit is paid`
              : ''}
            .
          </Text>
        )}

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

        {canRedeem && (
          <View style={styles.redeemCard}>
            <Text style={styles.redeemTitle}>Redeem loyalty points</Text>
            <Text style={styles.redeemBalance}>
              Your balance: {user!.loyaltyPoints} pts
            </Text>
            <View style={styles.stepper}>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => setRedeemPoints((v) => Math.max(0, v - 100))}
              >
                <Text style={styles.stepperText}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{redeemPoints} pts</Text>
              <Pressable
                style={styles.stepperBtn}
                onPress={() =>
                  setRedeemPoints((v) => Math.min(user!.loyaltyPoints, v + 100))
                }
              >
                <Text style={styles.stepperText}>+</Text>
              </Pressable>
            </View>
            {redeemPoints >= LOYALTY.MIN_REDEEM_POINTS ? (
              <Text style={styles.redeemDiscount}>
                {redeemPoints} pts = $
                {(pointsToDiscountCents(redeemPoints) / 100).toFixed(2)} off deposit
              </Text>
            ) : redeemPoints > 0 ? (
              <Text style={styles.redeemWarning}>
                Minimum {LOYALTY.MIN_REDEEM_POINTS} points required to redeem
              </Text>
            ) : null}
          </View>
        )}

        {canRedeemRestaurant && (
          <View style={styles.redeemCard}>
            <Text style={styles.redeemTitle}>Redeem {restaurant.name} points</Text>
            <Text style={styles.redeemBalance}>
              Your balance: {restaurantLoyaltyBalance} pts
            </Text>
            <View style={styles.stepper}>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => setRedeemRestaurantPoints((v) => Math.max(0, v - 50))}
              >
                <Text style={styles.stepperText}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{redeemRestaurantPoints} pts</Text>
              <Pressable
                style={styles.stepperBtn}
                onPress={() =>
                  setRedeemRestaurantPoints((v) =>
                    Math.min(restaurantLoyaltyBalance, v + 50),
                  )
                }
              >
                <Text style={styles.stepperText}>+</Text>
              </Pressable>
            </View>
            {redeemRestaurantPoints >= restaurantMinRedeem ? (
              <Text style={styles.redeemDiscount}>
                {redeemRestaurantPoints} pts = $
                {(restaurantPointsToDiscountCents(redeemRestaurantPoints) / 100).toFixed(2)} off
                deposit
              </Text>
            ) : redeemRestaurantPoints > 0 ? (
              <Text style={styles.redeemWarning}>
                Minimum {restaurantMinRedeem} restaurant points required to redeem
              </Text>
            ) : null}
          </View>
        )}

        {grossDepositCents > 0 && (
          <View style={styles.redeemCard}>
            <Text style={styles.redeemTitle}>Promotion code</Text>
            <TextInput
              style={styles.promoInput}
              placeholder="SUMMER20"
              autoCapitalize="characters"
              value={promoCode}
              onChangeText={(v) => setPromoCode(v.toUpperCase())}
            />
            {!promoCode.trim() && bestPromotion?.valid ? (
              <Text style={styles.autoPromo}>
                Auto-applied: {bestPromotion.promotion?.title} — $
                {(bestPromotion.discountCents / 100).toFixed(2)} off
              </Text>
            ) : null}
          </View>
        )}

        {grossDepositCents > 0 && (
          <View style={styles.redeemCard}>
            <Text style={styles.redeemTitle}>Gift card</Text>
            <TextInput
              style={styles.promoInput}
              placeholder="GV-XXXX-XXXX"
              autoCapitalize="characters"
              value={giftCardCode}
              onChangeText={(v) => setGiftCardCode(v.toUpperCase())}
            />
          </View>
        )}

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
  earnHint: { color: '#666', marginTop: 8, lineHeight: 20, fontSize: 14 },
  redeemCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#e8f5ef',
    borderWidth: 1,
    borderColor: '#b7e0cc',
  },
  redeemTitle: { fontWeight: '700', fontSize: 15, marginBottom: 6 },
  promoInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  autoPromo: { color: '#1d4ed8', marginTop: 8, fontWeight: '600' },
  redeemBalance: { color: '#333', marginBottom: 10 },
  redeemDiscount: { color: '#15803d', marginTop: 8, fontWeight: '600' },
  redeemWarning: { color: '#b45309', marginTop: 8 },
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
  stepperText: { fontSize: 20, color: '#0b3d2e', fontWeight: '700' },
  stepperValue: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  slot: {
    borderWidth: 1,
    borderColor: '#0b3d2e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  slotActive: { backgroundColor: '#0b3d2e' },
  slotText: { color: '#0b3d2e', fontWeight: '600' },
  slotTextActive: { color: '#fff' },
  button: {
    marginTop: 16,
    backgroundColor: '#0b3d2e',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  waitlistSection: { marginTop: 12 },
  noSlots: { color: '#666', marginBottom: 12 },
  waitlistLabel: { fontWeight: '700', fontSize: 15, marginBottom: 8 },
});
