import { useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { Linking } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet } from "react-native-unistyles";

import { Button, Flex, InlineAlert, Input, Typography } from "@/components";
import { useAuth } from "@/graphql";
import { HELP_SUPPORT_EMAIL } from "@/features/help-center/helpers/help-center.content";

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
  const [submitted, setSubmitted] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [supportEmail, setSupportEmail] = useState(HELP_SUPPORT_EMAIL);
  const [lastEmail, setLastEmail] = useState("");

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const sendReset = async (email: string) => {
    setFormError(null);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      const result = await requestPasswordReset(email);
      setLastEmail(email);
      setAttemptsRemaining(result.attemptsRemaining);
      setMaxAttempts(result.maxAttempts);
      setSupportEmail(result.supportEmail || HELP_SUPPORT_EMAIL);
      setSuccessMessage(
        result.message ||
          "If that email exists, a reset link has been sent. Check your inbox to continue on the website.",
      );
      setSubmitted(true);
    } catch (err) {
      setFormError(getAuthErrorMessage(err, "Could not send reset email"));
      setAttemptsRemaining((prev) => Math.max(0, prev - 1));
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    await sendReset(values.email.trim());
  });

  const exhausted = submitted && attemptsRemaining <= 0;

  return (
    <AuthScreen
      title="Forgot password"
      subtitle={
        submitted
          ? exhausted
            ? "Contact support if you still need help resetting your password."
            : "Check your inbox for the reset link. You can resend a few times if needed."
          : "Enter your email and we'll send a reset link. You'll finish resetting on the Tablevera website."
      }
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

      {exhausted ? (
        <InlineAlert
          tone="warning"
          message={`You've used all ${maxAttempts} reset email attempts. Contact support at ${supportEmail} and we'll help you reset your password.`}
          actionLabel="Email support"
          onAction={() => void Linking.openURL(`mailto:${supportEmail}`)}
        />
      ) : successMessage ? (
        <InlineAlert tone="success" message={successMessage} />
      ) : null}

      {!submitted ? (
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
      ) : null}

      {!submitted ? (
        <Button fullWidth loading={submitting} onPress={() => void onSubmit()}>
          Send reset link
        </Button>
      ) : exhausted ? null : (
        <Button
          fullWidth
          loading={submitting}
          onPress={() =>
            void sendReset(lastEmail || getValues("email").trim())
          }
        >
          {`Resend email (${attemptsRemaining} left)`}
        </Button>
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create(({ colors }) => ({
  link: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
}));
