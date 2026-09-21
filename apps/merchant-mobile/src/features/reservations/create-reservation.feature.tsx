import { useMutation } from "@apollo/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { ChevronLeftIcon, FootprintsIcon, PhoneIcon } from "@/assets";
import {
  Button,
  Chip,
  Flex,
  IconButton,
  Input,
  Switch,
  Typography,
} from "@/components";
import { DateTimeField } from "@/components/date-time-field";
import { useActiveRestaurant } from "@/features/restaurants";
import { todayIsoDate } from "@/lib/dates.helpers";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";
import {
  formatUsPhoneNational,
  toE164Us,
  US_PHONE_PLACEHOLDER,
} from "@/lib/helpers/phone.helpers";

import { CREATE_OWNER_RESERVATION } from "./api/reservations.operations";
import { PartySizeStepper } from "./components/party-size-stepper.component";
import {
  createReservationFormSchema,
  type CreateReservationFormValues,
} from "./helpers/create-reservation-schema.helpers";

export function CreateReservationFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { activeRestaurantId } = useActiveRestaurant();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateReservationFormValues>({
    resolver: zodResolver(createReservationFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      partySize: 2,
      date: todayIsoDate(),
      time: "19:00",
      source: "phone",
      seatImmediately: false,
    },
  });

  const source = watch("source");
  const isWalkIn = source === "walkin";

  useEffect(() => {
    if (isWalkIn) {
      setValue("seatImmediately", true);
    }
  }, [isWalkIn, setValue]);

  const [createReservation, { loading }] = useMutation(CREATE_OWNER_RESERVATION);

  const onSubmit = handleSubmit(async (values) => {
    if (!activeRestaurantId) {
      toast.error("Select a restaurant first");
      return;
    }

    const slotStart = new Date(`${values.date}T${values.time}:00`).toISOString();
    const phoneE164 = toE164Us(values.phone);

    try {
      await createReservation({
        variables: {
          input: {
            restaurantId: activeRestaurantId,
            partySize: values.partySize,
            slotStart,
            source: values.source,
            seatImmediately: values.seatImmediately,
            guest: {
              firstName: values.firstName.trim(),
              lastName: values.lastName.trim(),
              phone: phoneE164 || undefined,
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
  });

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
        contentContainerStyle={styles.content}
        style={styles.scroll}
      >
        <Flex gap={2.5}>
          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="First name"
                required
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Guest first name"
                autoCapitalize="words"
                error={Boolean(errors.firstName)}
                helperText={errors.firstName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="lastName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Last name"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Guest last name"
                autoCapitalize="words"
                error={Boolean(errors.lastName)}
                helperText={errors.lastName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Phone"
                value={value}
                onBlur={onBlur}
                onChangeText={(text) => onChange(formatUsPhoneNational(text))}
                placeholder={US_PHONE_PLACEHOLDER}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                error={Boolean(errors.phone)}
                helperText={errors.phone?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="partySize"
            render={({ field: { onChange, value } }) => (
              <PartySizeStepper
                value={value}
                onChange={onChange}
                required
                error={Boolean(errors.partySize)}
                helperText={errors.partySize?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="date"
            render={({ field: { onChange, value } }) => (
              <Flex gap={0.5}>
                <DateTimeField
                  label="Date"
                  mode="date"
                  value={value}
                  onChange={(next) => onChange(next ?? todayIsoDate())}
                />
                {errors.date?.message ? (
                  <Typography size="text-xs" color="error">
                    {errors.date.message}
                  </Typography>
                ) : null}
              </Flex>
            )}
          />

          <Controller
            control={control}
            name="time"
            render={({ field: { onChange, value } }) => (
              <Flex gap={0.5}>
                <DateTimeField
                  label="Time"
                  mode="time"
                  value={value}
                  onChange={(next) => onChange(next ?? "19:00")}
                />
                {errors.time?.message ? (
                  <Typography size="text-xs" color="error">
                    {errors.time.message}
                  </Typography>
                ) : null}
              </Flex>
            )}
          />

          <Flex gap={1}>
            <Typography size="text-sm" weight="medium">
              Source
            </Typography>
            <Controller
              control={control}
              name="source"
              render={({ field: { onChange, value } }) => (
                <Flex direction="row" gap={1}>
                  <Chip
                    selected={value === "phone"}
                    onPress={() => onChange("phone")}
                    size="md"
                    icon={<PhoneIcon />}
                    style={styles.sourceChip}
                  >
                    Phone
                  </Chip>
                  <Chip
                    selected={value === "walkin"}
                    onPress={() => onChange("walkin")}
                    size="md"
                    icon={<FootprintsIcon />}
                    style={styles.sourceChip}
                  >
                    Walk-in
                  </Chip>
                </Flex>
              )}
            />
            {isWalkIn ? (
              <Typography size="text-xs" color="secondary">
                Walk-ins are marked seated automatically
              </Typography>
            ) : null}
          </Flex>

          <Controller
            control={control}
            name="seatImmediately"
            render={({ field: { onChange, value } }) => (
              <Flex
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                gap={2}
                style={styles.seatRow}
              >
                <Flex gap={0.25} style={styles.seatCopy}>
                  <Typography size="text-md" weight="medium">
                    Seat immediately
                  </Typography>
                  <Typography size="text-xs" color="secondary">
                    Skip confirmed and mark the party seated now
                  </Typography>
                </Flex>
                <Switch
                  value={value}
                  onValueChange={onChange}
                  disabled={isWalkIn}
                  accessibilityLabel="Seat immediately"
                />
              </Flex>
            )}
          />
        </Flex>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, theme.space(2)) },
        ]}
      >
        <Button
          fullWidth
          size="xl"
          loading={loading}
          onPress={() => {
            void onSubmit();
          }}
        >
          Create reservation
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create(({ space, colors, radius, shadows }) => ({
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: space(2),
    paddingBottom: space(3),
  },
  sourceChip: {
    flex: 1,
    justifyContent: "center",
  },
  seatRow: {
    paddingVertical: space(1.5),
    paddingHorizontal: space(2),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.slate1,
  },
  seatCopy: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
    backgroundColor: colors.background,
    ...shadows.stickyFooter,
  },
}));
