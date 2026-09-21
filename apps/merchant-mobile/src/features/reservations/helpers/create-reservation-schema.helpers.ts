import { z } from "zod";

import { MAX_BOOKABLE_PARTY_SIZE } from "@/lib/party-size";
import { isValidUsPhone } from "@/lib/helpers/phone.helpers";

export const createReservationFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Enter a first name")
    .max(80, "First name is too long"),
  lastName: z.string().max(80, "Last name is too long"),
  phone: z
    .string()
    .refine((value) => !value.trim() || isValidUsPhone(value), {
      message: "Enter a valid US number, e.g. (212) 555-1234",
    }),
  partySize: z
    .number({ invalid_type_error: "Enter a party size" })
    .int("Enter a whole number")
    .min(1, "Party size must be at least 1")
    .max(MAX_BOOKABLE_PARTY_SIZE, `Party size can be at most ${MAX_BOOKABLE_PARTY_SIZE}`),
  date: z.string().min(1, "Pick a date"),
  time: z.string().min(1, "Pick a time"),
  source: z.enum(["phone", "walkin"]),
  seatImmediately: z.boolean(),
});

export type CreateReservationFormValues = z.infer<
  typeof createReservationFormSchema
>;
