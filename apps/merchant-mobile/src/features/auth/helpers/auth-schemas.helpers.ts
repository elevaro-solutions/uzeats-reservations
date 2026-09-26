import { emailSchema, loginSchema } from "@reservations/shared";
import { z } from "zod";

export { loginSchema };

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type SignInFormValues = z.infer<typeof loginSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
