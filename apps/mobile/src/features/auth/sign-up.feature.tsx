import { useState } from "react";
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
import { TermsToggle } from "./components/terms-toggle.component";
import { getAuthErrorMessage } from "./helpers/auth-error.helpers";
import { goAfterAuth } from "./helpers/auth-navigation.helpers";
import {
  signUpSchema,
  SignUpFormValues,
  toRegisterInput,
} from "./helpers/auth-schemas.helpers";

export function SignUpFeature() {
  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      agreedToTerms: false,
    },
  });

  const finish = () => goAfterAuth(router.replace, next);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSubmitting(true);
    try {
      await register(toRegisterInput(values));
      finish();
    } catch (err) {
      setFormError(getAuthErrorMessage(err, "Sign up failed"));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AuthScreen
      title="Create your account"
      subtitle="Provide your name, email, and password to get started with Tablevera."
      footer={
        <Typography align="center" size="text-sm" color="secondary">
          Already have an account?{" "}
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
          name="fullName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Full Name"
              required
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Alex Rivera"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              error={Boolean(errors.fullName)}
              helperText={errors.fullName?.message}
            />
          )}
        />

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

        <Controller
          control={control}
          name="agreedToTerms"
          render={({ field: { onChange, value } }) => (
            <TermsToggle
              value={value}
              onChange={onChange}
              error={errors.agreedToTerms?.message}
            />
          )}
        />
      </Flex>

      <Button fullWidth loading={submitting} onPress={() => void onSubmit()}>
        Sign Up
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
