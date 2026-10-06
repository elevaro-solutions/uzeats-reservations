import { emailSchema, passwordSchema } from "@reservations/shared";
import { z } from "zod";

import { isValidUsPhone, toE164Us } from "@/lib/helpers/phone.helpers";

export type EditProfileAccount = {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  hasPassword?: boolean;
  hasGoogle?: boolean;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
};

export type EditProfileOptions = {
  /** When true, unlink Google on save (requires password). */
  switchToEmail?: boolean;
};

export const editProfileSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(80),
  lastName: z.string().trim().min(1, "Enter your last name").max(80),
  email: emailSchema,
  phone: z.string().trim(),
  line1: z.string().trim().max(120),
  line2: z.string().trim().max(120),
  city: z.string().trim().max(80),
  state: z.string().trim().max(2),
  zip: z.string().trim().max(10),
  currentPassword: z.string(),
  newPassword: z.string(),
  confirmPassword: z.string(),
});

export type EditProfileFormValues = z.infer<typeof editProfileSchema>;

export function buildEditProfileSchema(
  account: EditProfileAccount,
  options: EditProfileOptions = {},
) {
  const switchToEmail = Boolean(options.switchToEmail && account.hasGoogle);
  return editProfileSchema.superRefine((values, ctx) => {
    if (values.phone.trim() && !isValidUsPhone(values.phone)) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Enter a valid US number, e.g. (212) 555-1234",
      });
    }

    const started = [
      values.line1,
      values.line2,
      values.city,
      values.state,
      values.zip,
    ].some((part) => part.trim().length > 0);

    if (started) {
      if (!values.line1.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["line1"],
          message: "Enter a street address",
        });
      }
      if (!values.city.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["city"],
          message: "Enter a city",
        });
      }
      if (!/^[a-z]{2}$/i.test(values.state.trim())) {
        ctx.addIssue({
          code: "custom",
          path: ["state"],
          message: "Use a 2-letter state code",
        });
      }
      if (!/^\d{5}(-\d{4})?$/.test(values.zip.trim())) {
        ctx.addIssue({
          code: "custom",
          path: ["zip"],
          message: "Enter a 5-digit ZIP code",
        });
      }
    }

    const changingPassword =
      values.newPassword.length > 0 || values.confirmPassword.length > 0;
    if (changingPassword) {
      const parsed = passwordSchema.safeParse(values.newPassword);
      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          path: ["newPassword"],
          message: parsed.error.issues[0]?.message ?? "Enter a valid password",
        });
      }
      if (values.newPassword !== values.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["confirmPassword"],
          message: "Passwords do not match",
        });
      }
    }

    const emailChanged =
      (!account.hasGoogle || switchToEmail) &&
      values.email.trim().toLowerCase() !== (account.email ?? "").toLowerCase();
    if (
      account.hasGoogle &&
      !switchToEmail &&
      values.email.trim().toLowerCase() !== (account.email ?? "").toLowerCase()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Email cannot be changed while Google sign-in is linked",
      });
    }
    if (switchToEmail && account.hasPassword === false && !values.newPassword.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Add a password before switching to email sign-in",
      });
    }
    if (
      account.hasPassword !== false &&
      (emailChanged || changingPassword) &&
      !values.currentPassword.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["currentPassword"],
        message: "Enter your current password",
      });
    }
  });
}

export function toUpdateProfileInput(
  values: EditProfileFormValues,
  account: EditProfileAccount,
  avatarUrl = account.avatarUrl ?? "",
  options: EditProfileOptions = {},
) {
  const switchToEmail = Boolean(options.switchToEmail && account.hasGoogle);
  const input: Record<string, unknown> = {};
  if (values.firstName.trim() !== (account.firstName ?? "")) {
    input.firstName = values.firstName.trim();
  }
  if (values.lastName.trim() !== (account.lastName ?? "")) {
    input.lastName = values.lastName.trim();
  }
  if ((avatarUrl || "") !== (account.avatarUrl ?? "")) input.avatarUrl = avatarUrl;
  if (!account.hasGoogle || switchToEmail) {
    const email = values.email.trim().toLowerCase();
    if (email !== (account.email ?? "").toLowerCase()) input.email = email;
  }

  const phone = values.phone.trim() ? toE164Us(values.phone) : "";
  if (phone !== (account.phone ?? "")) input.phone = phone;

  const started = [
    values.line1,
    values.line2,
    values.city,
    values.state,
    values.zip,
  ].some((part) => part.trim().length > 0);
  const addressUnchanged =
    started &&
    (account.address?.line1 ?? "") === values.line1.trim() &&
    (account.address?.line2 ?? "") === values.line2.trim() &&
    (account.address?.city ?? "") === values.city.trim() &&
    (account.address?.state ?? "").toUpperCase() ===
      values.state.trim().toUpperCase() &&
    (account.address?.zip ?? "") === values.zip.trim();
  if (started && !addressUnchanged) {
    input.address = {
      line1: values.line1.trim(),
      line2: values.line2.trim() || undefined,
      city: values.city.trim(),
      state: values.state.trim(),
      zip: values.zip.trim(),
      country: "US",
    };
  } else if (!started && account.address?.line1) {
    input.clearAddress = true;
  }

  if (values.newPassword) input.newPassword = values.newPassword;
  if (values.currentPassword.trim() && (input.email || input.newPassword)) {
    input.currentPassword = values.currentPassword;
  }
  if (switchToEmail) input.unlinkGoogle = true;

  return input;
}
