import { useQuery } from "@apollo/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import {
  BottomSheet,
  Button,
  Chip,
  Flex,
  Input,
  PartySizeStepper,
  Typography,
} from "@/components";
import {
  formatPhoneDisplay,
  formatUsPhoneNational,
  toE164Us,
  US_PHONE_PLACEHOLDER,
} from "@/lib/helpers/phone.helpers";
import { useDebouncedValue } from "@/lib/use-debounced-value";

import { WAITLIST_GUEST_SEARCH } from "../api/waitlist.operations";
import {
  ADD_WALK_IN_DEFAULT_VALUES,
  addWalkInFormSchema,
  type AddWalkInFormValues,
  type AddWalkInPayload,
  parseQuotedWaitMinutes,
  QUOTED_WAIT_HELPER,
} from "../helpers/add-walk-in-schema.helpers";

type GuestSearchHit = {
  dinerId: string;
  guestName: string;
  guestPhone?: string | null;
  email?: string | null;
  totalVisits: number;
  vipStatus?: string | null;
  inGuestBook: boolean;
};

export type WalkInSheetInitialValues = {
  dinerId?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  partySize?: number;
  quotedWaitMinutes?: number | null;
};

export type AddWalkInSheetProps = {
  visible: boolean;
  restaurantId?: string | null;
  onClose: () => void;
  onSubmit: (values: AddWalkInPayload) => Promise<void> | void;
  loading?: boolean;
  /** When set, sheet is edit mode and form seeds from these values. */
  initialValues?: WalkInSheetInitialValues | null;
  mode?: "add" | "edit";
};

function toFormValues(
  initial?: WalkInSheetInitialValues | null,
): AddWalkInFormValues {
  if (!initial) return ADD_WALK_IN_DEFAULT_VALUES;
  return {
    dinerId: initial.dinerId ?? undefined,
    guestName: initial.guestName?.trim() || "",
    guestPhone: initial.guestPhone
      ? formatUsPhoneNational(initial.guestPhone)
      : "",
    partySize: initial.partySize && initial.partySize > 0 ? initial.partySize : 2,
    quotedWaitMinutes:
      initial.quotedWaitMinutes != null
        ? String(initial.quotedWaitMinutes)
        : "",
  };
}

export function AddWalkInSheet({
  visible,
  restaurantId,
  onClose,
  onSubmit,
  loading = false,
  initialValues = null,
  mode = "add",
}: AddWalkInSheetProps) {
  const { theme } = useUnistyles();
  const isEdit = mode === "edit";
  const [guestSearch, setGuestSearch] = useState("");
  const debouncedSearch = useDebouncedValue(guestSearch.trim(), 300);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddWalkInFormValues>({
    resolver: zodResolver(addWalkInFormSchema),
    defaultValues: ADD_WALK_IN_DEFAULT_VALUES,
  });

  const selectedDinerId = watch("dinerId");

  const { data: guestData, loading: guestLoading } = useQuery<{
    searchWaitlistGuests: GuestSearchHit[];
  }>(WAITLIST_GUEST_SEARCH, {
    skip: !visible || !restaurantId || debouncedSearch.length < 2,
    variables: {
      restaurantId,
      search: debouncedSearch,
      limit: 8,
    },
    fetchPolicy: "network-only",
  });

  const guestResults = guestData?.searchWaitlistGuests ?? [];

  useEffect(() => {
    if (!visible) {
      reset(ADD_WALK_IN_DEFAULT_VALUES);
      setGuestSearch("");
      return;
    }
    reset(toFormValues(initialValues));
    setGuestSearch("");
  }, [visible, initialValues, reset]);

  function handleClose() {
    reset(ADD_WALK_IN_DEFAULT_VALUES);
    setGuestSearch("");
    onClose();
  }

  function selectGuest(hit: GuestSearchHit) {
    const phone = hit.guestPhone ? formatUsPhoneNational(hit.guestPhone) : "";
    setValue("dinerId", hit.dinerId, { shouldValidate: true });
    setValue("guestName", hit.guestName, { shouldValidate: true });
    setValue("guestPhone", phone, { shouldValidate: true });
    setGuestSearch("");
  }

  function clearSelectedGuest() {
    setValue("dinerId", undefined);
  }

  const submit = handleSubmit(async (values) => {
    if (loading) return;
    const phone = toE164Us(values.guestPhone);
    await onSubmit({
      dinerId: values.dinerId || undefined,
      guestName: values.guestName.trim(),
      guestPhone: phone || undefined,
      partySize: values.partySize,
      quotedWaitMinutes: parseQuotedWaitMinutes(values.quotedWaitMinutes),
    });
  });

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={isEdit ? "Edit waitlist" : "Add walk-in"}
      showHandle
      headerBorder
      keyboardAvoiding
      scrollable
      footer={
        <Button
          fullWidth
          size="xl"
          loading={loading}
          disabled={loading}
          onPress={() => {
            void submit();
          }}
        >
          {isEdit ? "Save changes" : "Add to waitlist"}
        </Button>
      }
    >
      <Flex gap={2}>
        <Input
          label="Find existing guest"
          value={guestSearch}
          onChangeText={setGuestSearch}
          placeholder="Name, phone, or email"
          autoCapitalize="none"
          autoCorrect={false}
          disabled={loading || !restaurantId}
          helperText={
            guestLoading
              ? "Searching…"
              : debouncedSearch.length > 0 && debouncedSearch.length < 2
                ? "Type at least 2 characters"
                : "Optional — diner accounts and past visitors"
          }
        />

        {!guestLoading &&
        debouncedSearch.length >= 2 &&
        guestResults.length === 0 ? (
          <Typography size="text-xs" color="muted">
            No matching guests — enter name manually below
          </Typography>
        ) : null}

        {guestResults.length > 0 ? (
          <Flex gap={1}>
            {guestResults.map((hit) => {
              const phone = hit.guestPhone
                ? formatPhoneDisplay(hit.guestPhone)
                : null;
              const meta = [
                phone,
                hit.email,
                hit.inGuestBook && hit.totalVisits > 0
                  ? `${hit.totalVisits} visits`
                  : !hit.inGuestBook
                    ? "Account"
                    : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <Pressable
                  key={hit.dinerId}
                  onPress={() => selectGuest(hit)}
                  style={[
                    styles.guestRow,
                    {
                      borderColor: theme.colors.secondarySubtle,
                      backgroundColor: theme.colors.background,
                    },
                  ]}
                >
                  <Typography weight="semibold" size="text-sm" numberOfLines={1}>
                    {hit.guestName}
                    {hit.vipStatus && hit.vipStatus !== "none" ? " · VIP" : ""}
                  </Typography>
                  {meta ? (
                    <Typography size="text-xs" color="muted" numberOfLines={1}>
                      {meta}
                    </Typography>
                  ) : null}
                </Pressable>
              );
            })}
          </Flex>
        ) : null}

        {selectedDinerId ? (
          <View>
            <Chip onDismiss={clearSelectedGuest} size="sm">
              Linked to guest account
            </Chip>
          </View>
        ) : null}

        <Controller
          control={control}
          name="guestName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Guest name"
              required
              value={value}
              onBlur={onBlur}
              onChangeText={(text) => {
                if (selectedDinerId) clearSelectedGuest();
                onChange(text);
              }}
              placeholder="Name"
              autoCapitalize="words"
              disabled={loading}
              error={Boolean(errors.guestName)}
              helperText={errors.guestName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="guestPhone"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Phone"
              value={value}
              onBlur={onBlur}
              onChangeText={(text) => {
                if (selectedDinerId) clearSelectedGuest();
                onChange(formatUsPhoneNational(text));
              }}
              placeholder={US_PHONE_PLACEHOLDER}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              disabled={loading}
              error={Boolean(errors.guestPhone)}
              helperText={errors.guestPhone?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="partySize"
          render={({ field: { onChange, value } }) => (
            <PartySizeStepper
              value={value}
              onChange={(next) => {
                if (!loading) onChange(next);
              }}
              required
              error={Boolean(errors.partySize)}
              helperText={errors.partySize?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="quotedWaitMinutes"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Quoted wait"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="15"
              keyboardType="number-pad"
              disabled={loading}
              error={Boolean(errors.quotedWaitMinutes)}
              helperText={
                errors.quotedWaitMinutes?.message ?? QUOTED_WAIT_HELPER
              }
              suffix={
                <Typography size="text-sm" color="secondary">
                  min
                </Typography>
              }
            />
          )}
        />
      </Flex>
    </BottomSheet>
  );
}

const styles = StyleSheet.create(({ space, radius }) => ({
  guestRow: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space(1.5),
    paddingVertical: space(1.25),
    gap: space(0.25),
  },
}));
