import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
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
  Input,
  PhoneField,
  Typography,
} from "@/components";
import { useAuth, type MobileUser } from "@/graphql";
import { uploadFile } from "@/graphql/upload";
import { getGraphQLErrorMessage, getGraphQLFieldErrors } from "@/lib/graphql-errors";

import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button.component";

import { LINK_GOOGLE } from "./api/link-google.operations";
import { UPDATE_MY_PROFILE } from "./api/update-profile.operations";
import { EditProfilePhoto } from "./components/edit-profile-photo.component";
import { EditProfileSection } from "./components/edit-profile-section.component";
import { EditProfileSkeleton } from "./components/edit-profile-skeleton.component";
import { PasswordRequirements } from "./components/password-requirements.component";
import { SecretField } from "./components/secret-field.component";
import {
  buildEditProfileSchema,
  toUpdateProfileInput,
  type EditProfileFormValues,
} from "./helpers/edit-profile-schema.helpers";

const PROFILE_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "line1",
  "line2",
  "city",
  "state",
  "zip",
  "currentPassword",
  "newPassword",
  "confirmPassword",
] as const;

function isProfileField(name: string): name is (typeof PROFILE_FIELDS)[number] {
  return (PROFILE_FIELDS as readonly string[]).includes(name);
}

function EditProfileForm({ user }: { user: MobileUser }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const [switchToEmail, setSwitchToEmail] = useState(false);
  const googleLinked = Boolean(user.hasGoogle);
  const emailLocked = googleLinked && !switchToEmail;
  const schema = useMemo(
    () => buildEditProfileSchema(user, { switchToEmail }),
    [user, switchToEmail],
  );
  const [updateProfile] = useMutation(UPDATE_MY_PROFILE);
  const [linkGoogleMutation] = useMutation(LINK_GOOGLE);
  const { refreshMe } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photos permission needed", "Allow photo access to update your profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploadingPhoto(true);
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      if (blob.size > 5 * 1024 * 1024) {
        Alert.alert("File too large", "Photo must be 5MB or smaller.");
        return;
      }
      const filename =
        asset.fileName?.trim() ||
        `avatar-${Date.now()}.${asset.mimeType?.split("/")[1] ?? "jpg"}`;
      const uploaded = await uploadFile(blob, filename, asset.mimeType ?? blob.type);
      setAvatarUrl(uploaded.publicUrl);
    } catch (error) {
      Alert.alert(
        "Could not upload photo",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<EditProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      line1: user.address?.line1 ?? "",
      line2: user.address?.line2 ?? "",
      city: user.address?.city ?? "",
      state: user.address?.state ?? "",
      zip: user.address?.zip ?? "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const watched = useWatch({ control });
  const formValues: EditProfileFormValues = {
    firstName: watched.firstName ?? "",
    lastName: watched.lastName ?? "",
    email: watched.email ?? "",
    phone: watched.phone ?? "",
    line1: watched.line1 ?? "",
    line2: watched.line2 ?? "",
    city: watched.city ?? "",
    state: watched.state ?? "",
    zip: watched.zip ?? "",
    currentPassword: watched.currentPassword ?? "",
    newPassword: watched.newPassword ?? "",
    confirmPassword: watched.confirmPassword ?? "",
  };
  const firstNameValue = formValues.firstName;
  const lastNameValue = formValues.lastName;
  const newPasswordValue = formValues.newPassword;
  const creatingPasswordForUnlink = switchToEmail && user.hasPassword === false;
  const emailDirty =
    (!googleLinked || switchToEmail) &&
    formValues.email.trim().toLowerCase() !== (user.email ?? "").toLowerCase();
  const needsCurrentPassword = user.hasPassword !== false && emailDirty;
  const canSave =
    Object.keys(toUpdateProfileInput(formValues, user, avatarUrl, { switchToEmail })).length > 0;

  const onSubmit = handleSubmit(async (values) => {
    const input = toUpdateProfileInput(values, user, avatarUrl, { switchToEmail });
    if (Object.keys(input).length === 0) return;

    setFormError(null);
    setSaving(true);
    try {
      const result = await updateProfile({ variables: { input } });
      await refreshMe();
      const needsVerification = Boolean(
        (
          result.data as
            | { updateMyProfile?: { needsEmailVerification?: boolean } }
            | undefined
        )?.updateMyProfile?.needsEmailVerification,
      );
      toast.success(
        input.unlinkGoogle
          ? "Switched to email sign-in. You can change your email anytime."
          : input.email && needsVerification
            ? "Profile updated. Check your email for a verification code."
            : "Profile updated",
      );
      router.back();
    } catch (err) {
      const fieldErrors = getGraphQLFieldErrors(err);
      let applied = false;
      for (const [name, message] of Object.entries(fieldErrors)) {
        if (!isProfileField(name)) continue;
        setError(name, { type: "server", message });
        applied = true;
      }
      if (!applied) {
        setFormError(getGraphQLErrorMessage(err, "Could not update your profile"));
      }
    } finally {
      setSaving(false);
    }
  });

  function cancelSwitchToEmail() {
    setSwitchToEmail(false);
    setValue("email", user.email ?? "");
    setValue("newPassword", "");
    setValue("confirmPassword", "");
    setValue("currentPassword", "");
  }

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

        <EditProfilePhoto
          firstName={firstNameValue}
          lastName={lastNameValue}
          avatarUrl={avatarUrl}
          uploading={uploadingPhoto}
          onChangePhoto={() => void pickPhoto()}
          onRemovePhoto={() => setAvatarUrl("")}
        />

        <EditProfileSection
          title="Your details"
          description="Name and phone restaurants will see."
        >
          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="First name"
                required
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                autoComplete="given-name"
                error={Boolean(errors.firstName)}
                helperText={errors.firstName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="lastName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Last name"
                required
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                autoComplete="family-name"
                error={Boolean(errors.lastName)}
                helperText={errors.lastName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <PhoneField
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={Boolean(errors.phone)}
                helperText={errors.phone?.message}
              />
            )}
          />
        </EditProfileSection>

        <EditProfileSection
          title="Sign-in"
          description="Email and how you log in."
        >
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                required
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                disabled={emailLocked}
                error={Boolean(errors.email)}
                helperText={
                  errors.email?.message ??
                  (googleLinked && !switchToEmail ? "Managed by Google sign-in." : undefined)
                }
              />
            )}
          />

          {googleLinked && !switchToEmail ? (
            <View style={styles.authCard}>
              <Flex gap={0.5}>
                <Typography size="text-sm" weight="semibold">
                  Google linked
                </Typography>
                <Typography size="text-sm" color="secondary">
                  You can sign in with Google or switch to email.
                </Typography>
              </Flex>
              <Pressable
                onPress={() => {
                  setSwitchToEmail(true);
                }}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Typography size="text-sm" color="primary">
                  Switch to email sign-in
                </Typography>
              </Pressable>
            </View>
          ) : null}

          {!googleLinked ? (
            <View style={styles.authCard}>
              <Typography size="text-sm" color="secondary">
                Link Google to sign in with either method. Use the same Google email as your
                profile.
              </Typography>
              <GoogleSignInButton
                label="Link Google"
                onError={(message) => setFormError(message)}
                onSuccess={async (idToken) => {
                  if (linkingGoogle) return;
                  setFormError(null);
                  setLinkingGoogle(true);
                  try {
                    await linkGoogleMutation({ variables: { idToken } });
                    await refreshMe();
                    toast.success("Google sign-in linked");
                  } catch (err) {
                    setFormError(getGraphQLErrorMessage(err, "Could not link Google"));
                  } finally {
                    setLinkingGoogle(false);
                  }
                }}
              />
            </View>
          ) : null}

          {googleLinked && switchToEmail ? (
            <InlineAlert
              tone="info"
              title="Switching to email sign-in"
              message={
                creatingPasswordForUnlink
                  ? "Create a password, then save to unlink Google."
                  : "Save to unlink Google. Your current password stays the same."
              }
              actionLabel="Cancel"
              onAction={cancelSwitchToEmail}
            />
          ) : null}

          {needsCurrentPassword ? (
            <Controller
              control={control}
              name="currentPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <SecretField
                  label="Current password"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Required to change your email"
                  autoComplete="current-password"
                  error={errors.currentPassword?.message}
                />
              )}
            />
          ) : null}

          {creatingPasswordForUnlink ? (
            <>
              <Controller
                control={control}
                name="newPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <SecretField
                    label="Create password"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="Enter a password"
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
            </>
          ) : null}
        </EditProfileSection>

        <EditProfileSection
          title="Address"
          description="Optional. Shown on your profile when set."
        >
          <Controller
            control={control}
            name="line1"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Street address"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="123 Main St"
                autoComplete="street-address"
                error={Boolean(errors.line1)}
                helperText={errors.line1?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="line2"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Apt, suite"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Optional"
                error={Boolean(errors.line2)}
                helperText={errors.line2?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="city"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="City"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Austin"
                error={Boolean(errors.city)}
                helperText={errors.city?.message}
              />
            )}
          />
          <Flex direction="row" gap={1.5}>
            <Flex flex={1}>
              <Controller
                control={control}
                name="state"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="State"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="TX"
                    autoCapitalize="characters"
                    maxLength={2}
                    error={Boolean(errors.state)}
                    helperText={errors.state?.message}
                  />
                )}
              />
            </Flex>
            <Flex flex={1}>
              <Controller
                control={control}
                name="zip"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="ZIP"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="78701"
                    keyboardType="number-pad"
                    error={Boolean(errors.zip)}
                    helperText={errors.zip?.message}
                  />
                )}
              />
            </Flex>
          </Flex>
        </EditProfileSection>
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
            Save changes
          </Button>
        </View>
      </KeyboardStickyView>
    </View>
  );
}

export function EditProfileFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { user, loading } = useAuth();

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
          Personal info
        </Typography>
        <View style={styles.sideSlot} />
      </Flex>

      {loading ? (
        <ScrollView
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, theme.space(2)) + theme.space(2),
          }}
          showsVerticalScrollIndicator={false}
        >
          <EditProfileSkeleton />
        </ScrollView>
      ) : user ? (
        <EditProfileForm user={user} />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.emptyContent,
            { paddingBottom: Math.max(insets.bottom, theme.space(2)) + theme.space(2) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Empty
            title="Sign in to edit your account"
            description="Update your email, phone, and address."
            icon={<UserIcon size={48} color={theme.colors.textMuted} />}
          >
            <Button
              fullWidth
              onPress={() =>
                router.push({ pathname: "/sign-in", params: { next: "/edit-profile" } })
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
    gap: space(4),
  },
  emptyContent: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
  },
  authCard: {
    gap: space(1.5),
    padding: space(2),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.background,
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
