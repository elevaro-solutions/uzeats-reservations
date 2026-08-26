import { emailSchema, loginSchema, passwordSchema } from "@reservations/shared";
import { z } from "zod";

import { splitFullName } from "./split-full-name.helpers";

export { loginSchema };

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Enter your full name")
    .max(160, "Name is too long")
    .refine((value) => value.trim().split(/\s+/).filter(Boolean).length >= 2, {
      message: "Enter your first and last name",
    }),
  email: emailSchema,
  password: passwordSchema,
  agreedToTerms: z
    .boolean()
    .refine((value) => value, {
      message: "Please agree to the Terms & Privacy Policy",
    }),
});

export type SignInFormValues = z.infer<typeof loginSchema>;
export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function toRegisterInput(values: SignUpFormValues) {
  const { firstName, lastName } = splitFullName(values.fullName);
  return {
    email: values.email,
    password: values.password,
    firstName,
    lastName,
  };
}
