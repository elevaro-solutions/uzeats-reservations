import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { StyleSheet } from "react-native-unistyles";

import { FootprintsIcon, PhoneIcon } from "@/assets";
import {
  Chip,
  Flex,
  Input,
  PartySizeStepper,
  Switch,
  Typography,
} from "@/components";
import { DateTimeField } from "@/components/date-time-field";
import { todayIsoDate } from "@/lib/helpers";
import {
  formatUsPhoneNational,
  US_PHONE_PLACEHOLDER,
} from "@/lib/helpers/phone.helpers";

import type { CreateReservationFormValues } from "../helpers/create-reservation-schema.helpers";

export type CreateReservationFormProps = {
  control: Control<CreateReservationFormValues>;
  errors: FieldErrors<CreateReservationFormValues>;
  isWalkIn: boolean;
  timeZone: string;
};

export function CreateReservationForm({
  control,
  errors,
  isWalkIn,
  timeZone,
}: CreateReservationFormProps) {
  return (
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
              onChange={(next) => onChange(next ?? todayIsoDate(timeZone))}
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
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
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
}));
