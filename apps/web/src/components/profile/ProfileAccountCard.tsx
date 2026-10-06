'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Button, Form, Input, Modal, Typography, message } from 'antd';
import {
  CameraOutlined,
  CheckCircleFilled,
  CloseCircleOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import {
  AddressAutocomplete,
  PhoneInput,
  colors,
  usPhoneRules,
  type AddressSelection,
} from '@reservations/ui';
import { browserMediaUrl, passwordSchema } from '@reservations/shared';
import { uploadFile } from '@/lib/upload';
import type { AuthUser, DinerAddress } from '@/lib/auth';
import { getGraphQLErrorMessage, getGraphQLFieldErrors } from '@/lib/errors';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

const { Text } = Typography;

const UPDATE_MY_PROFILE = gql`
  mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      id
      firstName
      lastName
      avatarUrl
      email
      phone
      hasPassword
      hasGoogle
      emailVerified
      needsEmailVerification
      address { line1 line2 city state zip country }
    }
  }
`;

const LINK_GOOGLE = gql`
  mutation LinkGoogle($idToken: String!) {
    linkGoogle(idToken: $idToken) {
      id
      email
      hasPassword
      hasGoogle
      emailVerified
    }
  }
`;

type AccountFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const FIELD_NAMES = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'line1',
  'line2',
  'city',
  'state',
  'zip',
  'currentPassword',
  'newPassword',
  'confirmPassword',
] as const;

type AccountFieldName = (typeof FIELD_NAMES)[number];

function isAccountField(name: string): name is AccountFieldName {
  return (FIELD_NAMES as readonly string[]).includes(name);
}

export function formatDinerAddress(address: DinerAddress): string {
  const street = [address.line1, address.line2].filter(Boolean).join(', ');
  const cityLine = [address.city, address.state].filter(Boolean).join(', ');
  const locality = [cityLine, address.zip].filter(Boolean).join(' ');
  return [street, locality].filter(Boolean).join(', ');
}

function streetFromSelection(selection: AddressSelection): string {
  const street = selection.line1?.trim();
  if (street) return street;
  const first = selection.label.split(',')[0]?.trim();
  return first || selection.label;
}

function addressFieldErrors(values: AccountFormValues) {
  const started = [values.line1, values.line2, values.city, values.state, values.zip].some(
    (part) => part?.trim(),
  );
  if (!started) return [];
  const errors: { name: AccountFieldName; errors: string[] }[] = [];
  if (!values.line1?.trim()) errors.push({ name: 'line1', errors: ['Enter a street address'] });
  if (!values.city?.trim()) errors.push({ name: 'city', errors: ['Enter a city'] });
  if (!/^[a-z]{2}$/i.test(values.state?.trim() ?? '')) {
    errors.push({ name: 'state', errors: ['Use a 2-letter state code'] });
  }
  if (!/^\d{5}(-\d{4})?$/.test(values.zip?.trim() ?? '')) {
    errors.push({ name: 'zip', errors: ['Enter a 5-digit ZIP code'] });
  }
  return errors;
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function FormSection({
  title,
  first,
  collapsible,
  open = true,
  onOpenChange,
  summary,
  children,
}: {
  title: string;
  first?: boolean;
  collapsible?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  summary?: string;
  children: ReactNode;
}) {
  const expanded = collapsible ? open : true;

  const titleBlock = (
    <div style={{ minWidth: 0 }}>
      <Text
        strong
        style={{
          display: 'block',
          fontSize: 12,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: colors.textSecondary,
        }}
      >
        {title}
      </Text>
      <div
        role="separator"
        aria-hidden
        style={{
          height: 2,
          width: 40,
          marginTop: 6,
          background: colors.brand[600],
        }}
      />
    </div>
  );

  return (
    <section
      style={{
        marginTop: first ? 16 : 14,
        padding: '12px 14px 12px 16px',
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        borderLeft: '1px solid rgb(227, 223, 216)',
        background: colors.surface,
      }}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={() => onOpenChange?.(!expanded)}
          aria-expanded={expanded}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            width: '100%',
            padding: 0,
            margin: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
          }}
        >
          {titleBlock}
          {expanded ? (
            <DownOutlined style={{ color: colors.textTertiary, fontSize: 11 }} />
          ) : (
            <RightOutlined style={{ color: colors.textTertiary, fontSize: 11 }} />
          )}
        </button>
      ) : (
        <div style={{ marginBottom: 12 }}>{titleBlock}</div>
      )}

      {collapsible && !expanded && summary ? (
        <Text
          type="secondary"
          style={{
            display: 'block',
            marginTop: 8,
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {summary}
        </Text>
      ) : null}

      <div style={{ display: expanded ? 'block' : 'none', marginTop: collapsible ? 12 : 0 }}>
        {children}
      </div>
    </section>
  );
}

const PASSWORD_CHECKS = [
  { id: 'length', label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { id: 'lower', label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { id: 'upper', label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'number', label: 'One number', test: (value: string) => /\d/.test(value) },
] as const;

function PasswordRequirements({ value }: { value: string }) {
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: '6px 0 0',
        padding: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '4px 12px',
      }}
    >
      {PASSWORD_CHECKS.map((check) => {
        const ok = check.test(value);
        return (
          <li
            key={check.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              lineHeight: 1.3,
              color: ok ? colors.brand[700] : colors.textTertiary,
            }}
          >
            {ok ? (
              <CheckCircleFilled style={{ fontSize: 12, color: colors.brand[600] }} />
            ) : (
              <CloseCircleOutlined style={{ fontSize: 12 }} />
            )}
            {check.label}
          </li>
        );
      })}
    </ul>
  );
}

export function ProfileAccountModal({
  open,
  user,
  onClose,
  onSaved,
}: {
  open: boolean;
  user: AuthUser;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form] = Form.useForm<AccountFormValues>();
  const [updateProfile, { loading }] = useMutation(UPDATE_MY_PROFILE);
  const [linkGoogleMutation] = useMutation(LINK_GOOGLE);
  const [saving, setSaving] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [switchToEmail, setSwitchToEmail] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const googleLinked = Boolean(user.hasGoogle);
  const emailLocked = googleLinked && !switchToEmail;
  const emailValue = Form.useWatch('email', form);
  const newPasswordValue = Form.useWatch('newPassword', form) ?? '';
  const emailDirty =
    !emailLocked &&
    (emailValue ?? user.email ?? '').trim().toLowerCase() !== (user.email ?? '').toLowerCase();
  const showCurrentPassword =
    user.hasPassword !== false &&
    (emailDirty || (passwordOpen && Boolean(newPasswordValue.trim())));

  useEffect(() => {
    if (!open) return;
    setAvatarUrl(user.avatarUrl ?? '');
    setSwitchToEmail(false);
    setSignInOpen(false);
    setAddressOpen(false);
    form.setFieldsValue({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      line1: user.address?.line1 ?? '',
      line2: user.address?.line2 ?? '',
      city: user.address?.city ?? '',
      state: user.address?.state ?? '',
      zip: user.address?.zip ?? '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordOpen(false);
  }, [open, user, form]);

  const beginSwitchToEmail = () => {
    setSignInOpen(true);
    setSwitchToEmail(true);
    setPasswordOpen(true);
  };

  const handleLinkGoogle = async (idToken: string) => {
    setLinkingGoogle(true);
    try {
      await linkGoogleMutation({ variables: { idToken } });
      await onSaved();
      message.success('Google sign-in linked');
    } catch (err) {
      message.error(getGraphQLErrorMessage(err, 'Could not link Google'));
    } finally {
      setLinkingGoogle(false);
    }
  };

  const addressSummary = user.address?.line1
    ? formatDinerAddress(user.address)
    : 'No address saved';
  const signInSummary = [
    user.email,
    user.hasGoogle ? 'Google linked' : null,
    user.hasPassword === false ? 'No password' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      message.error('Choose an image file');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      message.error('Photo must be 5MB or smaller');
      return;
    }
    setUploadingPhoto(true);
    try {
      const { publicUrl } = await uploadFile(file, file.name);
      setAvatarUrl(publicUrl);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not upload photo');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onFinish = async (values: AccountFormValues) => {
    const localErrors = addressFieldErrors(values);
    const unlinkingGoogle = googleLinked && switchToEmail;
    const emailChanged =
      (!googleLinked || unlinkingGoogle) &&
      values.email.trim().toLowerCase() !== (user.email ?? '').toLowerCase();
    const passwordChanging = passwordOpen && Boolean(values.newPassword || values.confirmPassword);

    if (unlinkingGoogle && user.hasPassword === false && !values.newPassword) {
      localErrors.push({
        name: 'newPassword',
        errors: ['Add a password before switching to email sign-in'],
      });
      setPasswordOpen(true);
    }

    if (passwordChanging || (unlinkingGoogle && user.hasPassword === false)) {
      const parsed = passwordSchema.safeParse(values.newPassword);
      if (!parsed.success) {
        localErrors.push({
          name: 'newPassword',
          errors: [parsed.error.issues[0]?.message ?? 'Enter a valid password'],
        });
      }
      if (values.newPassword !== values.confirmPassword) {
        localErrors.push({ name: 'confirmPassword', errors: ['Passwords do not match'] });
      }
    }

    if (user.hasPassword !== false && (emailChanged || passwordChanging) && !values.currentPassword) {
      localErrors.push({ name: 'currentPassword', errors: ['Enter your current password'] });
    }

    if (localErrors.length > 0) {
      form.setFields(localErrors);
      return;
    }

    const nextPhone = values.phone?.trim() ?? '';
    const addressStarted = [values.line1, values.line2, values.city, values.state, values.zip].some(
      (part) => part?.trim(),
    );
    const input: Record<string, unknown> = {};
    if (values.firstName.trim() !== user.firstName) input.firstName = values.firstName.trim();
    if (values.lastName.trim() !== (user.lastName ?? '')) input.lastName = values.lastName.trim();
    if ((avatarUrl || '') !== (user.avatarUrl ?? '')) input.avatarUrl = avatarUrl;
    if (emailChanged) input.email = values.email.trim();
    if (nextPhone !== (user.phone ?? '')) input.phone = nextPhone;
    const addressUnchanged =
      addressStarted &&
      user.address?.line1 === values.line1.trim() &&
      (user.address.line2 ?? '') === values.line2.trim() &&
      user.address.city === values.city.trim() &&
      user.address.state.toUpperCase() === values.state.trim().toUpperCase() &&
      user.address.zip === values.zip.trim();
    if (addressStarted && !addressUnchanged) {
      input.address = {
        line1: values.line1.trim(),
        line2: values.line2.trim() || undefined,
        city: values.city.trim(),
        state: values.state.trim(),
        zip: values.zip.trim(),
        country: 'US',
      };
    } else if (!addressStarted && user.address?.line1) {
      input.clearAddress = true;
    }
    if (passwordOpen && values.newPassword) input.newPassword = values.newPassword;
    if (values.currentPassword && (emailChanged || (passwordOpen && values.newPassword))) {
      input.currentPassword = values.currentPassword;
    }
    if (unlinkingGoogle) input.unlinkGoogle = true;

    if (Object.keys(input).length === 0) {
      message.info('No changes to save');
      return;
    }

    setSaving(true);
    try {
      const result = await updateProfile({ variables: { input } });
      form.setFieldsValue({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSwitchToEmail(false);
      await onSaved();
      const needsVerification = Boolean(
        (result.data as { updateMyProfile?: { needsEmailVerification?: boolean } } | undefined)
          ?.updateMyProfile?.needsEmailVerification,
      );
      message.success(
        unlinkingGoogle
          ? 'Switched to email sign-in. You can change your email anytime.'
          : emailChanged && needsVerification
            ? 'Profile updated. Check your email for a verification code.'
            : 'Profile updated',
      );
      onClose();
    } catch (err) {
      const fieldErrors = getGraphQLFieldErrors(err);
      const applied = Object.entries(fieldErrors).flatMap(([name, error]) =>
        isAccountField(name) ? [{ name, errors: [error] }] : [],
      );
      if (applied.length > 0) form.setFields(applied);
      else message.error(getGraphQLErrorMessage(err, 'Could not update your profile'));
    } finally {
      setSaving(false);
    }
  };

  const photoSrc = avatarUrl ? browserMediaUrl(avatarUrl) : '';
  const busy = loading || saving || uploadingPhoto;
  const fieldStyle = { marginBottom: 12 };

  return (
    <Modal
      open={open}
      title="Edit profile"
      onCancel={onClose}
      destroyOnHidden
      centered
      width="min(520px, calc(100vw - 32px))"
      styles={{
        body: {
          maxHeight: 'min(68vh, 640px)',
          overflowY: 'auto',
          paddingTop: 4,
        },
      }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="primary" loading={busy} onClick={() => form.submit()}>
            Save changes
          </Button>
        </div>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => void pickPhoto(event.target.files?.[0])}
      />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 8 }}>
        <button
          type="button"
          aria-label={avatarUrl ? 'Change profile photo' : 'Add profile photo'}
          disabled={uploadingPhoto}
          onClick={() => fileInputRef.current?.click()}
          style={{
            position: 'relative',
            width: 96,
            height: 96,
            padding: 0,
            border: `1px solid ${colors.border}`,
            borderRadius: '50%',
            overflow: 'hidden',
            background: colors.brand[100],
            color: colors.brand[700],
            cursor: uploadingPhoto ? 'progress' : 'pointer',
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          {photoSrc ? (
            <img src={photoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            user.firstName?.[0]?.toUpperCase()
          )}
          <span
            style={{
              position: 'absolute',
              inset: 'auto 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              height: 28,
              background: 'rgba(26, 24, 22, 0.55)',
              color: colors.textInverse,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <CameraOutlined />
            {uploadingPhoto ? 'Uploading' : 'Edit'}
          </span>
        </button>
        <Text type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
          JPG, PNG, or WebP. Up to 5MB.
        </Text>
        {avatarUrl ? (
          <Button type="link" size="small" danger onClick={() => setAvatarUrl('')}>
            Remove photo
          </Button>
        ) : null}
      </div>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={onFinish}
        initialValues={{
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          email: user.email ?? '',
          phone: user.phone ?? '',
          line1: user.address?.line1 ?? '',
          line2: user.address?.line2 ?? '',
          city: user.address?.city ?? '',
          state: user.address?.state ?? '',
          zip: user.address?.zip ?? '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }}
      >
        <FormSection title="Contact" first>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
            <Form.Item
              name="firstName"
              label="First name"
              style={fieldStyle}
              rules={[{ required: true, message: 'Enter your first name' }]}
            >
              <Input autoComplete="given-name" />
            </Form.Item>
            <Form.Item
              name="lastName"
              label="Last name"
              style={fieldStyle}
              rules={[{ required: true, message: 'Enter your last name' }]}
            >
              <Input autoComplete="family-name" />
            </Form.Item>
          </div>
          <Form.Item name="phone" label="Phone" style={{ marginBottom: 0 }} rules={usPhoneRules()}>
            <PhoneInput />
          </Form.Item>
        </FormSection>

        <FormSection
          title="Sign-in"
          collapsible
          open={signInOpen}
          onOpenChange={setSignInOpen}
          summary={signInSummary}
        >

          {googleLinked && switchToEmail ? (
            <div
              style={{
                marginBottom: 14,
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${colors.brand[200]}`,
                background: colors.brand[50],
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ display: 'block', fontSize: 13, color: colors.brand[800] }}>
                    Switching to email sign-in
                  </Text>
                  <Text style={{ display: 'block', fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    {user.hasPassword === false
                      ? 'Create a password, then save to unlink Google.'
                      : 'Save to unlink Google. Your current password stays unless you change it below.'}
                  </Text>
                </div>
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, height: 'auto', flexShrink: 0 }}
                  onClick={() => {
                    setSwitchToEmail(false);
                    form.setFieldsValue({
                      email: user.email ?? '',
                      newPassword: '',
                      confirmPassword: '',
                      ...(!emailDirty ? { currentPassword: '' } : {}),
                    });
                    setPasswordOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          <Form.Item
            name="email"
            label="Email"
            style={fieldStyle}
            extra={
              googleLinked && !switchToEmail ? (
                <span>
                  Managed by Google.{' '}
                  <Button type="link" size="small" style={{ padding: 0, height: 'auto' }} onClick={beginSwitchToEmail}>
                    Switch to email sign-in
                  </Button>
                </span>
              ) : undefined
            }
            rules={
              emailLocked
                ? undefined
                : [
                    { required: true, message: 'Enter your email' },
                    { type: 'email', message: 'Enter a valid email' },
                  ]
            }
          >
            <Input autoComplete="email" placeholder="you@example.com" disabled={emailLocked} />
          </Form.Item>

          {!googleLinked ? (
            <div style={{ marginBottom: 14 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
                Link Google to sign in with either method. Use the same Google email as your profile.
              </Text>
              <GoogleSignInButton
                label="Link Google"
                loading={linkingGoogle}
                onSuccess={(idToken) => {
                  void handleLinkGoogle(idToken);
                }}
              />
            </div>
          ) : null}

          {!switchToEmail ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: passwordOpen || user.hasPassword === false ? 8 : 0,
                }}
              >
                <Text strong style={{ fontSize: 13 }}>
                  Password
                </Text>
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0 }}
                  onClick={() => {
                    setPasswordOpen((current) => {
                      if (current) {
                        form.setFieldsValue({
                          newPassword: '',
                          confirmPassword: '',
                          ...(!emailDirty ? { currentPassword: '' } : {}),
                        });
                      }
                      return !current;
                    });
                  }}
                >
                  {passwordOpen
                    ? 'Keep current password'
                    : user.hasPassword === false
                      ? 'Add a password'
                      : 'Change password'}
                </Button>
              </div>
              {user.hasPassword === false && !passwordOpen ? (
                <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
                  Add a password to also sign in with email.
                </Text>
              ) : null}
            </>
          ) : null}

          {showCurrentPassword ? (
            <Form.Item
              name="currentPassword"
              label="Current password"
              style={fieldStyle}
              extra={emailDirty ? 'Required to change your email.' : 'Required to change your password.'}
            >
              <Input.Password autoComplete="current-password" />
            </Form.Item>
          ) : null}
          {passwordOpen ? (
            <>
              <Form.Item
                name="newPassword"
                label={
                  user.hasPassword === false
                    ? 'Create password'
                    : switchToEmail
                      ? 'New password (optional)'
                      : 'New password'
                }
                style={fieldStyle}
                extra={<PasswordRequirements value={newPasswordValue} />}
              >
                <Input.Password
                  autoComplete="new-password"
                  placeholder={
                    user.hasPassword === false
                      ? 'Enter a password'
                      : switchToEmail
                        ? 'Leave blank to keep your password'
                        : 'Enter a new password'
                  }
                />
              </Form.Item>
              <Form.Item name="confirmPassword" label="Confirm password" style={{ marginBottom: 0 }}>
                <Input.Password autoComplete="new-password" placeholder="Re-enter password" />
              </Form.Item>
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
          <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
            Optional. Start typing a street address — pick a suggestion to fill city, state, and ZIP.
            Clear every field to remove it.
          </Text>
          <Form.Item
            name="line1"
            label="Street address"
            style={fieldStyle}
            extra="You can also type the street manually if you prefer."
          >
            <AddressAutocomplete
              placeholder="123 Main St"
              style={{ width: '100%' }}
              inputProps={{ size: 'middle', autoComplete: 'off', style: { width: '100%' } }}
              onSelect={(selection) => {
                form.setFieldsValue({
                  line1: streetFromSelection(selection),
                  ...(selection.city ? { city: selection.city } : {}),
                  ...(selection.state
                    ? { state: selection.state.toUpperCase().slice(0, 2) }
                    : {}),
                  ...(selection.zip ? { zip: selection.zip } : {}),
                });
              }}
            />
          </Form.Item>
          <Form.Item name="line2" label="Apt, suite" style={fieldStyle}>
            <Input autoComplete="address-line2" placeholder="Optional" />
          </Form.Item>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.4fr) 72px minmax(96px, 0.8fr)',
              gap: 12,
            }}
          >
            <Form.Item name="city" label="City" style={{ marginBottom: 0 }}>
              <Input autoComplete="address-level2" placeholder="Austin" />
            </Form.Item>
            <Form.Item name="state" label="State" style={{ marginBottom: 0 }}>
              <Input autoComplete="address-level1" placeholder="TX" maxLength={2} />
            </Form.Item>
            <Form.Item name="zip" label="ZIP" style={{ marginBottom: 0 }}>
              <Input autoComplete="postal-code" placeholder="78701" />
            </Form.Item>
          </div>
        </FormSection>
      </Form>
    </Modal>
  );
}
