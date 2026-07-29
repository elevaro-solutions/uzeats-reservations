'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Modal, Space, Switch, Typography } from 'antd';
import { InfoCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { colors, radii, typography } from '@reservations/ui';
import {
  acceptAllCookies,
  hasCookieConsent,
  readCookieConsent,
  rejectNonEssentialCookies,
  writeCookieConsent,
  type CookieConsentPreferences,
} from '@/lib/cookieConsent';

const { Text, Paragraph } = Typography;

const COOKIE_CATEGORIES = [
  {
    key: 'essential' as const,
    title: 'Essential',
    description:
      'Required for sign-in, security, and core booking features. These cannot be disabled.',
    required: true,
  },
  {
    key: 'analytics' as const,
    title: 'Analytics',
    description:
      'Help us understand how the platform is used so we can improve search, booking flows, and performance.',
    required: false,
  },
  {
    key: 'marketing' as const,
    title: 'Marketing',
    description:
      'Allow us to measure campaign effectiveness and show relevant offers. We do not sell your data.',
    required: false,
  },
];

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [draft, setDraft] = useState<Pick<CookieConsentPreferences, 'analytics' | 'marketing'>>({
    analytics: false,
    marketing: false,
  });

  const syncFromStorage = useCallback(() => {
    const stored = readCookieConsent();
    if (stored) {
      setDraft({ analytics: stored.analytics, marketing: stored.marketing });
      setVisible(false);
      return;
    }
    setVisible(true);
  }, []);

  useEffect(() => {
    syncFromStorage();

    const onChange = () => syncFromStorage();
    const onOpenSettings = () => {
      const stored = readCookieConsent();
      if (stored) {
        setDraft({ analytics: stored.analytics, marketing: stored.marketing });
      }
      setPrefsOpen(true);
    };

    window.addEventListener('cookieconsentchange', onChange);
    window.addEventListener('opencookiesettings', onOpenSettings);
    return () => {
      window.removeEventListener('cookieconsentchange', onChange);
      window.removeEventListener('opencookiesettings', onOpenSettings);
    };
  }, [syncFromStorage]);

  const savePreferences = () => {
    writeCookieConsent(draft);
    setPrefsOpen(false);
    setVisible(false);
  };

  if (!visible && !prefsOpen) return null;

  return (
    <>
      {visible && (
        <div className="cookie-consent" role="dialog" aria-label="Cookie consent">
          <div className="cookie-consent__panel">
            <div className="cookie-consent__icon" aria-hidden>
              <InfoCircleOutlined />
            </div>
            <div className="cookie-consent__body">
              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: typography.fontSize.md }}>
                We value your privacy
              </Text>
              <Paragraph style={{ margin: 0, color: colors.textSecondary, fontSize: typography.fontSize.sm }}>
                We use essential cookies to keep you signed in and process reservations. With your
                permission, we also use optional cookies for analytics and marketing. Read our{' '}
                <Link href="/cookies">Cookie Policy</Link> and{' '}
                <Link href="/privacy">Privacy Policy</Link> for details.
              </Paragraph>
            </div>
            <Space wrap className="cookie-consent__actions">
              <Button
                type="primary"
                onClick={() => {
                  acceptAllCookies();
                  setVisible(false);
                }}
                style={{ background: colors.brand[600], fontWeight: 600 }}
              >
                Accept all
              </Button>
              <Button
                onClick={() => {
                  rejectNonEssentialCookies();
                  setVisible(false);
                }}
              >
                Reject non-essential
              </Button>
              <Button
                type="link"
                icon={<SettingOutlined />}
                onClick={() => setPrefsOpen(true)}
                style={{ paddingInline: 4 }}
              >
                Customize
              </Button>
            </Space>
          </div>
        </div>
      )}

      <Modal
        title="Cookie preferences"
        open={prefsOpen}
        onCancel={() => {
          setPrefsOpen(false);
          if (!hasCookieConsent()) setVisible(true);
        }}
        closable={hasCookieConsent()}
        maskClosable={hasCookieConsent()}
        footer={
          <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              onClick={() => {
                rejectNonEssentialCookies();
                setPrefsOpen(false);
                setVisible(false);
              }}
            >
              Reject non-essential
            </Button>
            <Button type="primary" onClick={savePreferences} style={{ background: colors.brand[600] }}>
              Save preferences
            </Button>
          </Space>
        }
        width={520}
        destroyOnHidden
      >
        <Paragraph type="secondary" style={{ marginBottom: 20 }}>
          Choose which optional cookies you allow. Essential cookies are always active because they
          are required for the service to work.
        </Paragraph>

        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          {COOKIE_CATEGORIES.map((category) => {
            const enabled =
              category.key === 'essential' ? true : draft[category.key as 'analytics' | 'marketing'];

            return (
              <div key={category.key} className="cookie-pref-row">
                <div>
                  <Text strong>{category.title}</Text>
                  <Paragraph style={{ margin: '4px 0 0', fontSize: typography.fontSize.sm }} type="secondary">
                    {category.description}
                  </Paragraph>
                </div>
                <Switch
                  checked={enabled}
                  disabled={category.required}
                  aria-label={`${category.title} cookies`}
                  onChange={(checked) => {
                    if (category.key === 'essential') return;
                    setDraft((prev) => ({ ...prev, [category.key]: checked }));
                  }}
                />
              </div>
            );
          })}
        </Space>

        <Paragraph style={{ marginTop: 20, marginBottom: 0, fontSize: typography.fontSize.sm }} type="secondary">
          Learn more in our <Link href="/cookies">Cookie Policy</Link>.
        </Paragraph>
      </Modal>
    </>
  );
}

export function openCookieSettings() {
  window.dispatchEvent(new Event('opencookiesettings'));
}
