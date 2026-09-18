import { useState } from "react";
import { Link } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet } from "react-native-unistyles";

import { Button, Flex, InlineAlert, Input, Typography } from "@/components";
import { useAuth } from "@/graphql";

import { AuthScreen } from "./components/auth-screen.component";
import { getAuthErrorMessage } from "./helpers/auth-error.helpers";
import {
  forgotPasswordSchema,
  ForgotPasswordFormValues,
} from "./helpers/auth-schemas.helpers";

export function ForgotPasswordFeature() {
  const { requestPasswordReset } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      const result = await requestPasswordReset(values.email);
      setSuccessMessage(
        result.message ||
          "If that email exists, a reset link has been sent. Finish resetting on Partner Hub / the dashboard website.",
      );
    } catch (err) {
      setFormError(getAuthErrorMessage(err, "Could not send reset email"));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AuthScreen
      title="Forgot password"
      subtitle="Enter your partner email and we'll send a reset link. You'll finish resetting on Partner Hub / the dashboard."
      footer={
        <Typography align="center" size="text-sm" color="secondary">
          Remember your password?{" "}
          <Link href="/(auth)/sign-in" style={styles.link}>
            Sign In
          </Link>
        </Typography>
      }
    >
      {formError ? (
        <InlineAlert
          tone="error"
          message={formError}
          onDismiss={() => setFormError(null)}
        />
      ) : null}

      {successMessage ? (
        <InlineAlert tone="success" message={successMessage} />
      ) : null}

      <Flex gap={2}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email Address"
              required
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="you@restaurant.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
            />
          )}
        />
      </Flex>

      <Button fullWidth size="xl" loading={submitting} onPress={() => void onSubmit()}>
        Send reset link
      </Button>
    </AuthScreen>
  );
}

const styles = StyleSheet.create(({ colors }) => ({
  link: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
}));
