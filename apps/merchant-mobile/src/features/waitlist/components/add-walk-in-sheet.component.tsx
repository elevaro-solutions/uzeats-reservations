import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { BottomSheet, Button, Flex, Input, PartySizeStepper, Typography } from "@/components";
import {
  formatUsPhoneNational,
  toE164Us,
  US_PHONE_PLACEHOLDER,
} from "@/lib/helpers/phone.helpers";

import {
  ADD_WALK_IN_DEFAULT_VALUES,
  addWalkInFormSchema,
  type AddWalkInFormValues,
  type AddWalkInPayload,
  parseQuotedWaitMinutes,
  QUOTED_WAIT_HELPER,
} from "../helpers/add-walk-in-schema.helpers";

export type AddWalkInSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: AddWalkInPayload) => Promise<void> | void;
  loading?: boolean;
};

export function AddWalkInSheet({
  visible,
  onClose,
  onSubmit,
  loading = false,
}: AddWalkInSheetProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddWalkInFormValues>({
    resolver: zodResolver(addWalkInFormSchema),
    defaultValues: ADD_WALK_IN_DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!visible) {
      reset(ADD_WALK_IN_DEFAULT_VALUES);
    }
  }, [visible, reset]);

  function handleClose() {
    reset(ADD_WALK_IN_DEFAULT_VALUES);
    onClose();
  }

  const submit = handleSubmit(async (values) => {
    if (loading) return;
    const phone = toE164Us(values.guestPhone);
    await onSubmit({
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
      title="Add walk-in"
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
          Add to waitlist
        </Button>
      }
    >
      <Flex gap={2}>
        <Controller
          control={control}
          name="guestName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Guest name"
              required
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
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
              onChangeText={(text) => onChange(formatUsPhoneNational(text))}
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
