import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@apollo/client";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { ChevronLeftIcon, UserIcon } from "@/assets";
import {
  Button,
  Empty,
  Flex,
  IconButton,
  InlineAlert,
  Typography,
} from "@/components";
import { Skeleton } from "@/components/skeleton";
import { useAuth } from "@/graphql";
import { getGraphQLErrorMessage, getGraphQLFieldErrors } from "@/lib/graphql-errors";

import { UPDATE_MY_PROFILE } from "./api/update-profile.operations";
import { PasswordRequirements } from "./components/password-requirements.component";
import { SecretField } from "./components/secret-field.component";
import {
  buildChangePasswordSchema,
  toChangePasswordInput,
  type ChangePasswordFormValues,
} from "./helpers/change-password-schema.helpers";

const PASSWORD_FIELDS = ["currentPassword", "newPassword", "confirmPassword"] as const;

function isPasswordField(name: string): name is (typeof PASSWORD_FIELDS)[number] {
  return (PASSWORD_FIELDS as readonly string[]).includes(name);
}

function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { refreshMe } = useAuth();
  const [updateProfile] = useMutation(UPDATE_MY_PROFILE);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const schema = useMemo(() => buildChangePasswordSchema(hasPassword), [hasPassword]);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const watched = useWatch({ control });
  const newPasswordValue = watched.newPassword ?? "";
  const canSave = hasPassword
    ? Boolean(
        (watched.currentPassword ?? "").trim() &&
          (watched.newPassword ?? "").trim() &&
          (watched.confirmPassword ?? "").trim(),
      )
    : Boolean((watched.newPassword ?? "").trim() && (watched.confirmPassword ?? "").trim());

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSaving(true);
    try {
      await updateProfile({
        variables: { input: toChangePasswordInput(values, hasPassword) },
      });
      await refreshMe();
      toast.success(hasPassword ? "Password updated" : "Password added");
      router.back();
    } catch (err) {
      const fieldErrors = getGraphQLFieldErrors(err);
      let applied = false;
      for (const [name, message] of Object.entries(fieldErrors)) {
        if (!isPasswordField(name)) continue;
        setError(name, { type: "server", message });
        applied = true;
      }
      if (!applied) {
        setFormError(
          getGraphQLErrorMessage(
            err,
            hasPassword ? "Could not update your password" : "Could not add a password",
          ),
        );
      }
    } finally {
      setSaving(false);
    }
  });

  return (
    <View style={styles.formRoot}>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bottomOffset={theme.space(14)}
        showsVerticalScrollIndicator={false}
      >
        {formError ? (
          <InlineAlert
            tone="error"
            message={formError}
            onDismiss={() => setFormError(null)}
          />
        ) : null}

        <Flex gap={0.5}>
          <Typography size="text-lg" weight="semibold">
            {hasPassword ? "Choose a new password" : "Create a password"}
          </Typography>
          <Typography size="text-sm" color="secondary">
            {hasPassword
              ? "Enter your current password, then pick a new one."
              : "Add a password so you can also sign in with email."}
          </Typography>
        </Flex>

        <Flex gap={2}>
          {hasPassword ? (
            <Controller
              control={control}
              name="currentPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <SecretField
                  label="Current password"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                  error={errors.currentPassword?.message}
                />
              )}
            />
          ) : null}
          <Controller
            control={control}
            name="newPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <SecretField
                label={hasPassword ? "New password" : "Password"}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={hasPassword ? "Enter a new password" : "Enter a password"}
                autoComplete="new-password"
                error={errors.newPassword?.message}
              />
            )}
          />
          <PasswordRequirements value={newPasswordValue} />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <SecretField
                label="Confirm password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Re-enter password"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
              />
            )}
          />
        </Flex>
      </KeyboardAwareScrollView>

      <KeyboardStickyView>
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, theme.space(2)) },
          ]}
        >
          <Button
            fullWidth
            size="xl"
            loading={saving}
            disabled={!canSave || saving}
            onPress={() => void onSubmit()}
          >
            {hasPassword ? "Change password" : "Add password"}
          </Button>
        </View>
      </KeyboardStickyView>
    </View>
  );
}

export function ChangePasswordFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { user, loading } = useAuth();
  const hasPassword = user?.hasPassword !== false;
  const title = hasPassword ? "Change password" : "Add a password";

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Flex direction="row" alignItems="center" style={styles.topBar}>
        <IconButton
          icon={<ChevronLeftIcon />}
          variant="surface"
          size="sm"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          style={styles.chromeBtn}
        />
        <Typography weight="semibold" size="text-lg" style={styles.topTitle}>
          {loading ? "Password" : title}
        </Typography>
        <View style={styles.sideSlot} />
      </Flex>

      {loading ? (
        <Flex gap={2} style={styles.emptyContent}>
          <Skeleton width={160} height={22} />
          <Skeleton width="80%" height={16} />
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </Flex>
      ) : user ? (
        <ChangePasswordForm hasPassword={hasPassword} />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.emptyContent,
            { paddingBottom: Math.max(insets.bottom, theme.space(2)) + theme.space(2) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Empty
            title="Sign in to manage your password"
            description="Add or change the password you use to sign in."
            icon={<UserIcon size={48} color={theme.colors.textMuted} />}
          >
            <Button
              fullWidth
              onPress={() =>
                router.push({ pathname: "/sign-in", params: { next: "/change-password" } })
              }
            >
              Sign in
            </Button>
          </Empty>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius, shadows }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  formRoot: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
  },
  chromeBtn: {
    width: space(5),
    height: space(5),
    borderRadius: radius.full,
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
  },
  sideSlot: {
    width: space(5),
    height: space(5),
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space(2),
    paddingTop: space(1),
    paddingBottom: space(2),
    gap: space(3),
  },
  emptyContent: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
  },
  footer: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    ...shadows.stickyFooter,
  },
}));
