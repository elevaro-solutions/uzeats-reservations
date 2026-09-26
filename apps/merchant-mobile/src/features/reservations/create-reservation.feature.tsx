import { useMutation } from "@apollo/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { ChevronLeftIcon } from "@/assets";
import { Button, Flex, IconButton, Typography } from "@/components";
import { useActiveRestaurant } from "@/features/restaurants";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";
import { todayIsoDate, toE164Us } from "@/lib/helpers";

import { CREATE_OWNER_RESERVATION } from "./api/reservations.operations";
import { CreateReservationForm } from "./components/create-reservation-form.component";
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
        <CreateReservationForm
          control={control}
          errors={errors}
          isWalkIn={isWalkIn}
        />
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
  footer: {
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
    backgroundColor: colors.background,
    ...shadows.stickyFooter,
  },
}));
