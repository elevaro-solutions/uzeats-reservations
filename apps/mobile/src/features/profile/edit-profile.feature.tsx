import { useMemo, useState, type ReactNode } from "react";
import { Alert, Image, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@apollo/client";
import { Controller, useForm, useWatch } from "react-hook-form";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  UserIcon,
} from "@/assets";
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
import { browserMediaUrl } from "@reservations/shared";

import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button.component";

import { LINK_GOOGLE } from "./api/link-google.operations";
import { UPDATE_MY_PROFILE } from "./api/update-profile.operations";
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

const PASSWORD_CHECKS = [
  { id: "length", label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { id: "lower", label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { id: "upper", label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { id: "number", label: "One number", test: (value: string) => /\d/.test(value) },
] as const;

function PasswordRequirements({ value }: { value: string }) {
  return (
    <View style={{ gap: 4, marginTop: 4 }}>
      {PASSWORD_CHECKS.map((check) => {
        const ok = check.test(value);
        return (
          <Typography key={check.id} size="text-xs" color={ok ? "success" : "muted"}>
            {ok ? "✓" : "○"} {check.label}
          </Typography>
        );
      })}
    </View>
  );
}

function FormSection({
  title,
  collapsible,
  open = true,
  onOpenChange,
  summary,
  children,
}: {
  title: string;
  collapsible?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  summary?: string;
  children: ReactNode;
}) {
  const { theme } = useUnistyles();
  const expanded = collapsible ? open : true;

  const titleBlock = (
    <View style={styles.sectionHeaderText}>
      <Typography size="text-xs" weight="semibold" color="muted" style={{ letterSpacing: 0.8 }}>
        {title.toUpperCase()}
      </Typography>
      <View style={styles.sectionRule} />
    </View>
  );

  return (
    <View style={styles.formSection}>
      {collapsible ? (
        <Pressable
          onPress={() => onOpenChange?.(!expanded)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          style={styles.sectionHeaderBtn}
        >
          {titleBlock}
          {expanded ? (
            <ChevronDownIcon size={18} color={theme.colors.textMuted} />
          ) : (
            <ChevronRightIcon size={18} color={theme.colors.textMuted} />
          )}
        </Pressable>
      ) : (
        titleBlock
      )}
      {collapsible && !expanded && summary ? (
        <Typography size="text-sm" color="secondary" numberOfLines={1}>
          {summary}
        </Typography>
      ) : null}
      <View style={{ display: expanded ? "flex" : "none", gap: theme.space(2) }}>{children}</View>
    </View>
  );
}

function SecretField({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  helperText,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
  error?: string;
  helperText?: string;
  placeholder: string;
  autoComplete: "current-password" | "new-password" | "password";
}) {
  const [visible, setVisible] = useState(false);
  const { theme } = useUnistyles();

  return (
    <Input
      label={label}
      value={value}
      onBlur={onBlur}
      onChangeText={onChangeText}
      placeholder={placeholder}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoComplete={autoComplete}
      textContentType="password"
      error={Boolean(error)}
      helperText={error ?? helperText}
      suffix={
        <Pressable
          hitSlop={8}
          onPress={() => setVisible((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <EyeOffIcon size={20} color={theme.colors.textMuted} />
          ) : (
            <EyeIcon size={20} color={theme.colors.textMuted} />
          )}
        </Pressable>
      }
    />
  );
}

function EditProfileForm({ user }: { user: MobileUser }) {
  const router = useRouter();
  const { theme } = useUnistyles();
  const [switchToEmail, setSwitchToEmail] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const googleLinked = Boolean(user.hasGoogle);
  const emailLocked = googleLinked && !switchToEmail;
  const signInSummary = [user.email, user.hasGoogle ? "Google linked" : null]
    .filter(Boolean)
    .join(" · ");
  const addressSummary = user.address?.line1
    ? [user.address.line1, user.address.city, user.address.state].filter(Boolean).join(", ")
    : "No address saved";
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
  const newPasswordValue = useWatch({ control, name: "newPassword" }) ?? "";

  const onSubmit = handleSubmit(async (values) => {
    const input = toUpdateProfileInput(values, user, avatarUrl, { switchToEmail });
    if (Object.keys(input).length === 0) {
      toast("No changes to save");
      return;
    }

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

  return (
    <Flex gap={2}>
      {formError ? (
        <InlineAlert
          tone="error"
          message={formError}
          onDismiss={() => setFormError(null)}
        />
      ) : null}

      <Flex direction="row" alignItems="center" gap={1.5}>
        <View style={styles.photo}>
          {avatarUrl ? (
            <Image source={{ uri: browserMediaUrl(avatarUrl) }} style={styles.photoImage} />
          ) : (
            <Typography weight="semibold" color="inverse" size="text-lg">
              {user.firstName?.[0]?.toUpperCase()}
            </Typography>
          )}
        </View>
        <Flex gap={1} style={styles.flexGrow}>
          <Button
            size="sm"
            color="secondary"
            variant="outlined"
            loading={uploadingPhoto}
            onPress={() => void pickPhoto()}
          >
            {avatarUrl ? "Change photo" : "Add photo"}
          </Button>
          {avatarUrl ? (
            <Button size="sm" color="secondary" variant="outlined" onPress={() => setAvatarUrl("")}>
              Remove photo
            </Button>
          ) : null}
        </Flex>
      </Flex>

      <FormSection title="Contact">
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
      </FormSection>

      <FormSection
        title="Sign-in"
        collapsible
        open={signInOpen}
        onOpenChange={setSignInOpen}
        summary={signInSummary}
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
        <Pressable
          onPress={() => {
            setSignInOpen(true);
            setSwitchToEmail(true);
            setPasswordOpen(true);
          }}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Typography size="text-sm" color="primary">
            Switch to email sign-in
          </Typography>
        </Pressable>
      ) : null}

      {!googleLinked ? (
        <Flex gap={1}>
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
        </Flex>
      ) : null}

      {googleLinked && switchToEmail ? (
        <Flex
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          gap={1.5}
          style={styles.switchBanner}
        >
          <Flex flex={1} gap={0.5}>
            <Typography size="text-sm" weight="semibold">
              Switching to email sign-in
            </Typography>
            <Typography size="text-xs" color="secondary">
              {user.hasPassword === false
                ? "Create a password, then save to unlink Google."
                : "Save to unlink Google. Your current password stays unless you change it below."}
            </Typography>
          </Flex>
          <Pressable
            onPress={() => {
              setSwitchToEmail(false);
              setValue("email", user.email ?? "");
              setValue("newPassword", "");
              setValue("confirmPassword", "");
              setValue("currentPassword", "");
              setPasswordOpen(false);
            }}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Typography size="text-sm" color="primary">
              Cancel
            </Typography>
          </Pressable>
        </Flex>
      ) : null}

      {!switchToEmail ? (
        <Flex direction="row" alignItems="center" justifyContent="space-between" gap={1.5}>
          <Typography size="text-sm" weight="medium">
            Password
          </Typography>
          <Pressable
            onPress={() => {
              setPasswordOpen((current) => {
                if (current) {
                  setValue("newPassword", "");
                  setValue("confirmPassword", "");
                  setValue("currentPassword", "");
                }
                return !current;
              });
            }}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Typography size="text-sm" color="primary">
              {passwordOpen
                ? "Keep current password"
                : user.hasPassword === false
                  ? "Add a password"
                  : "Change password"}
            </Typography>
          </Pressable>
        </Flex>
      ) : null}
      {user.hasPassword === false && !passwordOpen && !switchToEmail ? (
        <Typography size="text-sm" color="secondary">
          Add a password to also sign in with email.
        </Typography>
      ) : null}
      {passwordOpen && user.hasPassword !== false && Boolean(newPasswordValue.trim()) ? (
        <Controller
          control={control}
          name="currentPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <SecretField
              label="Current password"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Required to change your password"
              autoComplete="current-password"
              error={errors.currentPassword?.message}
            />
          )}
        />
      ) : null}
      {passwordOpen ? (
        <>
          <Controller
            control={control}
            name="newPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <SecretField
                label={
                  user.hasPassword === false
                    ? "Create password"
                    : switchToEmail
                      ? "New password (optional)"
                      : "New password"
                }
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={
                  user.hasPassword === false
                    ? "Enter a password"
                    : switchToEmail
                      ? "Leave blank to keep your password"
                      : "Enter a new password"
                }
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
      </FormSection>

      <FormSection
        title="Address"
        collapsible
        open={addressOpen}
        onOpenChange={setAddressOpen}
        summary={addressSummary}
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
      </FormSection>

      <Button fullWidth loading={saving} onPress={() => void onSubmit()}>
        Save account
      </Button>
    </Flex>
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
          Profile photo and info
        </Typography>
        <View style={styles.sideSlot} />
      </Flex>

      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, theme.space(2)) + theme.space(2) },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={theme.space(4)}
      >
        {loading ? null : user ? (
          <EditProfileForm user={user} />
        ) : (
          <Empty
            title="Sign in to edit your account"
            description="Update your email, phone, address, and password."
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
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: space(2),
    paddingBottom: space(1),
    minHeight: space(6),
  },
  chromeBtn: {
    zIndex: 1,
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
  },
  sideSlot: {
    width: space(5),
  },
  photo: {
    width: space(9),
    height: space(9),
    borderRadius: space(9),
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  flexGrow: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space(2),
    paddingTop: space(1),
    gap: space(2),
  },
  switchBanner: {
    paddingHorizontal: space(1.5),
    paddingVertical: space(1.25),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary3,
    backgroundColor: colors.primary1,
  },
  formSection: {
    gap: space(1.25),
    paddingVertical: space(1.5),
    paddingHorizontal: space(1.5),
    paddingLeft: space(1.75),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 1,
    borderLeftColor: "rgb(227, 223, 216)",
    backgroundColor: colors.background,
  },
  sectionHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space(1.5),
  },
  sectionHeaderText: {
    flex: 1,
    gap: space(0.75),
  },
  sectionRule: {
    height: 2,
    width: 40,
    backgroundColor: colors.primary,
  },
}));
