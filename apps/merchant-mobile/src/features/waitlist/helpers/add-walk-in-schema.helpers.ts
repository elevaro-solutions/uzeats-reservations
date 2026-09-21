import { z } from "zod";

import { isValidUsPhone } from "@/lib/helpers/phone.helpers";
import { MAX_BOOKABLE_PARTY_SIZE } from "@/lib/party-size";

export const QUOTED_WAIT_HELPER =
  "Minutes you told the guest. Sets a minimum for the estimated wait.";

export const addWalkInFormSchema = z.object({
  guestName: z
    .string()
    .trim()
    .min(1, "Enter a guest name")
    .max(120, "Name is too long"),
  guestPhone: z.string().refine((value) => !value.trim() || isValidUsPhone(value), {
    message: "Enter a valid US number, e.g. (212) 555-1234",
  }),
  partySize: z
    .number({ invalid_type_error: "Enter a party size" })
    .int("Enter a whole number")
    .min(1, "Party size must be at least 1")
    .max(
      MAX_BOOKABLE_PARTY_SIZE,
      `Party size can be at most ${MAX_BOOKABLE_PARTY_SIZE}`,
    ),
  quotedWaitMinutes: z
    .string()
    .trim()
    .refine(
      (value) => {
        if (!value) return true;
        if (!/^\d+$/.test(value)) return false;
        const minutes = Number.parseInt(value, 10);
        return minutes >= 0 && minutes <= 480;
      },
      { message: "Enter 0–480 minutes" },
    ),
});

export type AddWalkInFormValues = z.infer<typeof addWalkInFormSchema>;

export type AddWalkInPayload = {
  guestName: string;
  guestPhone?: string;
  partySize: number;
  quotedWaitMinutes?: number;
};

export const ADD_WALK_IN_DEFAULT_VALUES: AddWalkInFormValues = {
  guestName: "",
  guestPhone: "",
  partySize: 2,
  quotedWaitMinutes: "15",
};

export function parseQuotedWaitMinutes(
  value: string,
): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const minutes = Number.parseInt(trimmed, 10);
  return Number.isFinite(minutes) ? minutes : undefined;
}
