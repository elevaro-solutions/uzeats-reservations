import {
  DEFAULT_NOTIFICATION_CHANNEL_PREFERENCES,
  NOTIFICATION_EVENTS,
  type NotificationChannel,
  type NotificationEvent,
} from '@reservations/shared';

type ChannelPrefs = Record<NotificationChannel, boolean>;

function mapChannelPreferences(
  value?: Partial<ChannelPrefs> | boolean | null,
  legacyGlobal?: Partial<ChannelPrefs> | null,
): ChannelPrefs {
  const global = {
    sms: legacyGlobal?.sms ?? DEFAULT_NOTIFICATION_CHANNEL_PREFERENCES.sms,
    email: legacyGlobal?.email ?? DEFAULT_NOTIFICATION_CHANNEL_PREFERENCES.email,
    webPush: legacyGlobal?.webPush ?? DEFAULT_NOTIFICATION_CHANNEL_PREFERENCES.webPush,
    platform: legacyGlobal?.platform ?? DEFAULT_NOTIFICATION_CHANNEL_PREFERENCES.platform,
  };

  // Legacy: event was a single on/off boolean combined with global channels.
  if (typeof value === 'boolean') {
    return {
      sms: value && global.sms,
      email: value && global.email,
      webPush: value && global.webPush,
      platform: value && global.platform,
    };
  }

  if (value && typeof value === 'object') {
    return {
      sms: value.sms ?? global.sms,
      email: value.email ?? global.email,
      webPush: value.webPush ?? global.webPush,
      platform: value.platform ?? global.platform,
    };
  }

  return { ...global };
}

/** Normalizes stored prefs (including legacy flat shape) into a feature × channel matrix. */
export function mapNotificationPreferences(prefs?: any | null) {
  const legacyGlobal =
    prefs &&
    (typeof prefs.sms === 'boolean' ||
      typeof prefs.email === 'boolean' ||
      typeof prefs.webPush === 'boolean' ||
      typeof prefs.platform === 'boolean')
      ? {
          sms: prefs.sms,
          email: prefs.email,
          webPush: prefs.webPush,
          platform: prefs.platform,
        }
      : null;

  const legacyEvents = prefs?.events && typeof prefs.events === 'object' ? prefs.events : null;

  const result = {} as Record<NotificationEvent, ChannelPrefs>;
  for (const event of NOTIFICATION_EVENTS) {
    const raw = prefs?.[event] ?? legacyEvents?.[event];
    result[event] = mapChannelPreferences(raw, legacyGlobal);
  }
  return result;
}
