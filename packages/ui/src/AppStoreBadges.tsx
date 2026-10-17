import type { CSSProperties } from 'react';
import { MOBILE_APPS, type MobileAppId } from '@reservations/shared';

type BadgeTone = 'light' | 'dark';
type BadgeSize = 'md' | 'sm';

const HEIGHT: Record<BadgeSize, number> = { md: 48, sm: 40 };

function playBadgeStyle(size: BadgeSize): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: size === 'sm' ? 8 : 10,
    height: HEIGHT[size],
    padding: size === 'sm' ? '0 12px 0 8px' : '0 14px 0 10px',
    borderRadius: 8,
    background: '#000',
    color: '#fff',
    border: '1px solid #000',
    textDecoration: 'none',
    lineHeight: 1.05,
    flexShrink: 0,
  };
}

function soonBadgeStyle(tone: BadgeTone, size: BadgeSize): CSSProperties {
  const onDark = tone === 'dark';
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: size === 'sm' ? 8 : 10,
    height: HEIGHT[size],
    padding: size === 'sm' ? '0 12px 0 8px' : '0 14px 0 10px',
    borderRadius: 8,
    background: onDark ? 'transparent' : '#fff',
    color: onDark ? 'rgba(255,255,255,0.88)' : '#0B3D2E',
    border: onDark ? '1px solid rgba(255,255,255,0.38)' : '1px solid rgba(11,61,46,0.28)',
    textDecoration: 'none',
    lineHeight: 1.05,
    cursor: 'default',
    flexShrink: 0,
  };
}

function kickerStyle(size: BadgeSize): CSSProperties {
  return {
    display: 'block',
    fontSize: size === 'sm' ? 8 : 9,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    opacity: 0.78,
  };
}

function titleStyle(size: BadgeSize): CSSProperties {
  return {
    display: 'block',
    fontSize: size === 'sm' ? 13 : 15,
    fontWeight: 600,
    letterSpacing: '-0.01em',
  };
}

function PlayMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#34A853" d="M1.2 1.4v15.2l9.1-7.6z" />
      <path fill="#FBBC04" d="M12.4 8.2 10.3 9 1.2 16.6l9.4-1.6c.7-.1 1.2-.5 1.8-1.1z" />
      <path fill="#EA4335" d="M1.2 1.4 10.3 9l2.1.8 1.6-1.1c.8-.6.8-1.6 0-2.2z" />
      <path fill="#4285F4" d="M1.2 1.4 10.6 2.9c.6.1 1.1.4 1.6.9L10.3 9z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden>
      <path
        fill="currentColor"
        d="M13.1 9.5c0-1.7 1.4-2.5 1.4-2.6-.8-1.1-2-1.3-2.4-1.3-1-.1-2 .6-2.5.6s-1.3-.6-2.2-.6c-1.1 0-2.1.7-2.7 1.7-1.1 2-.3 4.9.8 6.5.5.8 1.2 1.6 2 1.6.8 0 1.1-.5 2.1-.5s1.3.5 2.1.5 1.4-.8 2-1.6c.6-.9.9-1.7.9-1.8-.1 0-1.7-.6-1.5-2.5zM11.2 4.6c.4-.5.7-1.3.7-2.1-.6 0-1.4.4-1.9 1-.4.5-.8 1.3-.7 2 .7.1 1.4-.3 1.9-.9z"
      />
    </svg>
  );
}

export function AppStoreBadges({
  app,
  tone = 'light',
  size = 'md',
}: {
  app: MobileAppId;
  tone?: BadgeTone;
  size?: BadgeSize;
}) {
  const listing = MOBILE_APPS[app];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <a
        href={listing.androidUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Get ${listing.name} on Google Play`}
        style={playBadgeStyle(size)}
      >
        <PlayMark />
        <span>
          <span style={kickerStyle(size)}>Get it on</span>
          <span style={titleStyle(size)}>Google Play</span>
        </span>
      </a>
      <span
        role="img"
        aria-label={`${listing.name} for iPhone is coming soon`}
        style={soonBadgeStyle(tone, size)}
      >
        <AppleMark />
        <span>
          <span style={kickerStyle(size)}>Coming soon</span>
          <span style={titleStyle(size)}>App Store</span>
        </span>
      </span>
    </div>
  );
}
