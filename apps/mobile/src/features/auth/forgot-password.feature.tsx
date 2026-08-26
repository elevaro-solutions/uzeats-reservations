import { useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
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
  const { next } = useLocalSearchParams<{ next?: string }>();
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
          "If that email exists, a reset link has been sent. Check your inbox to continue on the website.",
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
      subtitle="Enter your email and we'll send a reset link. You'll finish resetting on the Tablevera website."
      footer={
        <Typography align="center" size="text-sm" color="secondary">
          Remember your password?{" "}
          <Link
            href={{
              pathname: "/sign-in",
              params: next ? { next } : undefined,
            }}
            style={styles.link}
          >
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
              placeholder="you@example.com"
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

      <Button fullWidth loading={submitting} onPress={() => void onSubmit()}>
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
