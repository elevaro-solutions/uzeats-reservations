import { passwordSchema } from "@reservations/shared";
import { z } from "zod";

export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string(),
  confirmPassword: z.string(),
});

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export function buildChangePasswordSchema(hasPassword: boolean) {
  return changePasswordSchema.superRefine((values, ctx) => {
    if (hasPassword && !values.currentPassword.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["currentPassword"],
        message: "Enter your current password",
      });
    }

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
  });
}

export function toChangePasswordInput(
  values: ChangePasswordFormValues,
  hasPassword: boolean,
) {
  const input: { newPassword: string; currentPassword?: string } = {
    newPassword: values.newPassword,
  };
  if (hasPassword) input.currentPassword = values.currentPassword;
  return input;
}
