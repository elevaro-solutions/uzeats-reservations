import { useState } from "react";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet } from "react-native-unistyles";

import { Button, Flex, InlineAlert, Input, Typography } from "@/components";
import { useAuth } from "@/graphql";

import { AuthScreen } from "./components/auth-screen.component";
import { PasswordField } from "./components/password-field.component";
import { getAuthErrorMessage } from "./helpers/auth-error.helpers";
import {
  loginSchema,
  SignInFormValues,
} from "./helpers/auth-schemas.helpers";

export function SignInFeature() {
  const { login } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      router.replace("/(tabs)");
    } catch (err) {
      setFormError(getAuthErrorMessage(err, "Sign in failed"));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AuthScreen
      title="Partner sign in"
      subtitle="Sign in with your Tablevera Partner Hub email and password to manage the floor."
      showBack={false}
      footer={
        <Typography align="center" size="text-sm" color="secondary">
          Need an account? Ask your restaurant owner or visit Partner Hub on the
          web.
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

        <PasswordField
          control={control}
          name="password"
          error={errors.password?.message}
        />

        <Pressable
          onPress={() => router.push("/(auth)/forgot-password")}
          hitSlop={12}
          style={styles.forgot}
        >
          <Typography size="text-sm" weight="medium" color="primary">
            Forgot Password?
          </Typography>
        </Pressable>
      </Flex>

      <Button fullWidth size="xl" loading={submitting} onPress={() => void onSubmit()}>
        Sign In
      </Button>
    </AuthScreen>
  );
}

const styles = StyleSheet.create(() => ({
  forgot: {
    alignSelf: "flex-end",
  },
}));
