import { useState } from "react";
import { Pressable } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet } from "react-native-unistyles";

import { Button, Flex, InlineAlert, Input, Typography } from "@/components";
import { useAuth } from "@/graphql";

import { AuthScreen } from "./components/auth-screen.component";
import { GoogleSignInButton } from "./components/google-sign-in-button.component";
import { OrDivider } from "./components/or-divider.component";
import { PasswordField } from "./components/password-field.component";
import { getAuthErrorMessage } from "./helpers/auth-error.helpers";
import { goAfterAuth } from "./helpers/auth-navigation.helpers";
import {
  loginSchema,
  SignInFormValues,
} from "./helpers/auth-schemas.helpers";

export function SignInFeature() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
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

  const finish = () => goAfterAuth(router.replace, next);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      finish();
    } catch (err) {
      setFormError(getAuthErrorMessage(err, "Sign in failed"));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in with your email and password to manage reservations and loyalty."
      footer={
        <Typography align="center" size="text-sm" color="secondary">
          Don&apos;t have an account?{" "}
          <Link
            href={{
              pathname: "/sign-up",
              params: next ? { next } : undefined,
            }}
            style={styles.link}
          >
            Sign Up
          </Link>
        </Typography>
      }
    >
      <GoogleSignInButton
        onError={setFormError}
        onSuccess={async (idToken) => {
          setFormError(null);
          await loginWithGoogle(idToken);
          finish();
        }}
      />

      <OrDivider />

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

        <PasswordField
          control={control}
          name="password"
          error={errors.password?.message}
        />

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/forgot-password",
              params: next ? { next } : undefined,
            })
          }
          hitSlop={8}
          style={styles.forgot}
        >
          <Typography size="text-sm" weight="medium" color="primary">
            Forgot Password?
          </Typography>
        </Pressable>
      </Flex>

      <Button fullWidth loading={submitting} onPress={() => void onSubmit()}>
        Sign In
      </Button>
    </AuthScreen>
  );
}

const styles = StyleSheet.create(({ colors }) => ({
  link: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  forgot: {
    alignSelf: "flex-end",
  },
}));
