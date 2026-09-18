import { useMutation } from "@apollo/client";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { ChevronLeftIcon } from "@/assets";
import {
  Button,
  Chip,
  Flex,
  IconButton,
  Input,
  Typography,
} from "@/components";
import { DateTimeField } from "@/components/date-time-field";
import { useActiveRestaurant } from "@/features/restaurants";
import { todayIsoDate } from "@/lib/dates.helpers";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

import { CREATE_OWNER_RESERVATION } from "./api/reservations.operations";

type Source = "phone" | "walkin";

export function CreateReservationFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { activeRestaurantId } = useActiveRestaurant();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [date, setDate] = useState(todayIsoDate());
  const [time, setTime] = useState("19:00");
  const [source, setSource] = useState<Source>("phone");
  const [seatImmediately, setSeatImmediately] = useState(false);

  const [createReservation, { loading }] = useMutation(CREATE_OWNER_RESERVATION);

  async function onSubmit() {
    if (!activeRestaurantId) {
      toast.error("Select a restaurant first");
      return;
    }
    const size = Number.parseInt(partySize, 10);
    if (!firstName.trim() || !Number.isFinite(size) || size < 1) {
      toast.error("Enter guest name and party size");
      return;
    }
    if (!date || !time) {
      toast.error("Pick a date and time");
      return;
    }

    const slotStart = new Date(`${date}T${time}:00`).toISOString();

    try {
      await createReservation({
        variables: {
          input: {
            restaurantId: activeRestaurantId,
            partySize: size,
            slotStart,
            source,
            seatImmediately,
            guest: {
              firstName: firstName.trim(),
              lastName: lastName.trim() || undefined,
              phone: phone.trim() || undefined,
            },
          },
        },
      });
      toast.success("Reservation created");
      router.replace("/(tabs)/reservations");
    } catch (err) {
      toast.error("Couldn't create reservation", {
        description: getGraphQLErrorMessage(err, "Please try again"),
      });
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Flex direction="row" alignItems="center" style={styles.topBar}>
        <IconButton
          icon={<ChevronLeftIcon />}
          variant="surface"
          size="sm"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          style={styles.chromeBtn}
        />
        <Typography weight="semibold" size="text-lg" style={styles.topTitle}>
          New reservation
        </Typography>
        <View style={styles.chromeBtn} />
      </Flex>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + theme.space(3) },
        ]}
      >
        <Flex gap={2}>
          <Input
            label="First name"
            required
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Guest first name"
            autoCapitalize="words"
          />
          <Input
            label="Last name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Guest last name"
            autoCapitalize="words"
          />
          <Input
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="Optional"
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          <Input
            label="Party size"
            required
            value={partySize}
            onChangeText={setPartySize}
            keyboardType="number-pad"
          />
          <DateTimeField
            label="Date"
            mode="date"
            value={date}
            onChange={(value) => setDate(value ?? todayIsoDate())}
          />
          <DateTimeField
            label="Time"
            mode="time"
            value={time}
            onChange={(value) => setTime(value ?? "19:00")}
          />

          <Typography weight="medium" size="text-sm">
            Source
          </Typography>
          <Flex direction="row" gap={1}>
            <Chip
              selected={source === "phone"}
              onPress={() => setSource("phone")}
              size="lg"
            >
              Phone
            </Chip>
            <Chip
              selected={source === "walkin"}
              onPress={() => setSource("walkin")}
              size="lg"
            >
              Walk-in
            </Chip>
          </Flex>

          <Chip
            selected={seatImmediately}
            onPress={() => setSeatImmediately((v) => !v)}
            size="lg"
          >
            Seat immediately
          </Chip>
        </Flex>

        <Button
          fullWidth
          size="xl"
          loading={loading}
          onPress={() => {
            void onSubmit();
          }}
          style={styles.submit}
        >
          Create reservation
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
  },
  chromeBtn: {
    width: space(5),
    height: space(5),
    borderRadius: radius.full,
  },
  content: {
    padding: space(2),
  },
  submit: {
    marginTop: space(3),
  },
}));
