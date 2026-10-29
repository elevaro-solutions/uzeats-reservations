'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { TableveraWordmark } from './brand';
import { colors, radii, typography } from './tokens';

export type SessionPreparingVariant = 'diner' | 'partner';

const COPY: Record<
  SessionPreparingVariant,
  { title: string; hint: string; messages: readonly string[] }
> = {
  diner: {
    title: 'Preparing your table',
    hint: 'This only takes a moment.',
    messages: [
      'You’re signed in — setting things up…',
      'Loading your reservations…',
      'Getting tonight’s tables ready…',
    ],
  },
  partner: {
    title: 'Preparing your restaurant',
    hint: 'This only takes a moment.',
    messages: [
      'You’re signed in — opening Partner Hub…',
      'Loading today’s service…',
      'Setting up your dashboard…',
    ],
  },
};

const MIN_VISIBLE_MS = 1200;
const MAX_VISIBLE_MS = 4500;
const MESSAGE_INTERVAL_MS = 1400;
let overflowLockCount = 0;

const PREP_CSS = `
@keyframes rt-prep-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}
@keyframes rt-prep-steam {
  0% { opacity: 0.15; transform: translateY(8px) scaleX(1); }
  50% { opacity: 0.7; }
  100% { opacity: 0; transform: translateY(-18px) scaleX(1.15); }
}
@keyframes rt-prep-glow {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
}
@keyframes rt-prep-seat {
  0%, 100% { opacity: 0.35; }
  40% { opacity: 1; }
}
@keyframes rt-prep-check {
  0%, 55% { stroke-dashoffset: 18; opacity: 0; }
  70% { opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 1; }
}
@keyframes rt-prep-progress {
  0% { transform: translateX(-20%); }
  100% { transform: translateX(120%); }
}
@keyframes rt-prep-msg {
  from { opacity: 0.55; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes rt-prep-dot {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
  40% { opacity: 1; transform: scale(1); }
}
.rt-session-prep__art { animation: rt-prep-float 3.6s ease-in-out infinite; }
.rt-session-prep__steam { animation: rt-prep-steam 2.4s ease-in-out infinite; }
.rt-session-prep__steam--2 { animation-delay: 0.45s; }
.rt-session-prep__steam--3 { animation-delay: 0.9s; }
.rt-session-prep__glow { animation: rt-prep-glow 2.2s ease-in-out infinite; }
.rt-session-prep__seat { animation: rt-prep-seat 2.8s ease-in-out infinite; }
.rt-session-prep__seat--2 { animation-delay: 0.35s; }
.rt-session-prep__seat--3 { animation-delay: 0.7s; }
.rt-session-prep__seat--4 { animation-delay: 1.05s; }
.rt-session-prep__check { stroke-dasharray: 18; animation: rt-prep-check 2.8s ease-in-out infinite; }
.rt-session-prep__bar-fill { animation: rt-prep-progress 1.8s ease-in-out infinite; }
.rt-session-prep__msg { animation: rt-prep-msg 0.4s ease both; }
.rt-session-prep__dot { animation: rt-prep-dot 1.2s ease-in-out infinite; }
.rt-session-prep__dot:nth-child(2) { animation-delay: 0.15s; }
.rt-session-prep__dot:nth-child(3) { animation-delay: 0.3s; }
@media (prefers-reduced-motion: reduce) {
  .rt-session-prep__art,
  .rt-session-prep__steam,
  .rt-session-prep__glow,
  .rt-session-prep__seat,
  .rt-session-prep__check,
  .rt-session-prep__bar-fill,
  .rt-session-prep__msg,
  .rt-session-prep__dot { animation: none !important; }
}
`;

/**
 * Dismiss a post-login preparing overlay after the route changes, with a
 * minimum display so the screen does not flash, and a max so it cannot stick.
 */
export function useSessionHandoffSettle(
  active: boolean,
  pathname: string,
  onSettled: () => void,
) {
  const startPathRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!active) {
      startPathRef.current = null;
      startedAtRef.current = 0;
      return;
    }
    startPathRef.current = pathname;
    startedAtRef.current = Date.now();
    // Snapshot the login path only when the handoff starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const startedAt = startedAtRef.current;
    const startPath = startPathRef.current;
    const remainingMin = () => Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));
    const remainingMax = () => Math.max(0, MAX_VISIBLE_MS - (Date.now() - startedAt));
    const pathChanged = startPath != null && pathname !== startPath;
    const delay = pathChanged ? remainingMin() : remainingMax();
    const t = window.setTimeout(onSettled, delay);
    return () => window.clearTimeout(t);
  }, [active, pathname, onSettled]);
}

function DinerTableIllustration() {
  const brand = colors.brand[600];
  const brandSoft = colors.brand[200];
  const gold = colors.accent[400];
  const goldSoft = colors.accent[200];
  const wood = colors.neutral[200];
  const ink = colors.neutral[800];

  return (
    <svg
      viewBox="0 0 280 210"
      width="280"
      height="210"
      aria-hidden
      className="rt-session-prep__art"
    >
      <ellipse cx="140" cy="178" rx="92" ry="12" fill={colors.neutral[100]} />
      <ellipse cx="140" cy="128" rx="108" ry="38" fill={wood} />
      <ellipse cx="140" cy="122" rx="100" ry="32" fill={colors.neutral[50]} />
      <ellipse cx="140" cy="122" rx="100" ry="32" fill="none" stroke={colors.neutral[300]} strokeWidth="2" />

      <g className="rt-session-prep__steam">
        <path d="M118 78c0-10 6-12 6-20" fill="none" stroke={brandSoft} strokeWidth="3" strokeLinecap="round" />
      </g>
      <g className="rt-session-prep__steam rt-session-prep__steam--2">
        <path d="M140 72c2-11 8-12 6-22" fill="none" stroke={brandSoft} strokeWidth="3" strokeLinecap="round" />
      </g>
      <g className="rt-session-prep__steam rt-session-prep__steam--3">
        <path d="M160 78c-1-10 5-13 4-20" fill="none" stroke={brandSoft} strokeWidth="3" strokeLinecap="round" />
      </g>

      <circle cx="140" cy="118" r="28" fill="#fff" stroke={gold} strokeWidth="3" />
      <circle cx="140" cy="118" r="18" fill={colors.brand[50]} />
      <circle cx="140" cy="118" r="8" fill={brand} className="rt-session-prep__glow" />

      <rect x="86" y="108" width="6" height="28" rx="2" fill={ink} transform="rotate(-18 89 122)" />
      <rect x="188" y="108" width="6" height="28" rx="2" fill={ink} transform="rotate(18 191 122)" />

      <path
        d="M198 96c8 0 14 8 12 16-2 6-8 8-12 8"
        fill="none"
        stroke={goldSoft}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <ellipse cx="198" cy="88" rx="7" ry="9" fill="none" stroke={gold} strokeWidth="2.5" />
      <ellipse cx="198" cy="88" rx="3" ry="4" fill={colors.accent[100]} className="rt-session-prep__glow" />

      <g transform="translate(64 86)">
        <rect x="0" y="0" width="44" height="32" rx="6" fill="#fff" stroke={brand} strokeWidth="1.75" />
        <rect x="8" y="7" width="28" height="3" rx="1.5" fill={brandSoft} />
        <rect x="8" y="14" width="20" height="3" rx="1.5" fill={colors.neutral[200]} />
        <circle cx="34" cy="22" r="7" fill={colors.successBg} />
        <path
          className="rt-session-prep__check"
          d="M30.5 22.2l2.4 2.4 5-5"
          fill="none"
          stroke={colors.success}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

function PartnerFloorIllustration() {
  const brand = colors.brand[600];
  const gold = colors.accent[400];
  const panel = colors.neutral[800];

  return (
    <svg
      viewBox="0 0 280 210"
      width="280"
      height="210"
      aria-hidden
      className="rt-session-prep__art"
    >
      <ellipse cx="140" cy="178" rx="96" ry="12" fill={colors.neutral[100]} />
      <rect x="48" y="58" width="184" height="118" rx="18" fill={panel} />
      <rect x="58" y="70" width="164" height="94" rx="12" fill={colors.neutral[900]} />

      <rect x="70" y="82" width="88" height="70" rx="8" fill={colors.brand[800]} />
      <circle className="rt-session-prep__seat" cx="86" cy="98" r="8" fill={colors.brand[400]} />
      <circle className="rt-session-prep__seat rt-session-prep__seat--2" cx="114" cy="98" r="8" fill={gold} />
      <circle className="rt-session-prep__seat rt-session-prep__seat--3" cx="86" cy="126" r="8" fill={gold} />
      <circle className="rt-session-prep__seat rt-session-prep__seat--4" cx="114" cy="126" r="8" fill={colors.brand[300]} />
      <rect x="138" y="90" width="12" height="46" rx="3" fill={colors.brand[700]} />

      <g transform="translate(168 86)">
        <rect x="0" y="0" width="42" height="56" rx="6" fill="#fff" />
        <rect x="6" y="8" width="30" height="5" rx="2.5" fill={colors.brand[100]} />
        <rect x="6" y="18" width="22" height="5" rx="2.5" fill={colors.neutral[200]} />
        <rect x="6" y="28" width="18" height="18" rx="3" fill={colors.brand[50]} />
        <rect x="10" y="38" width="4" height="6" rx="1" fill={brand} className="rt-session-prep__glow" />
        <rect x="16" y="34" width="4" height="10" rx="1" fill={gold} className="rt-session-prep__glow" />
        <rect x="22" y="36" width="4" height="8" rx="1" fill={colors.brand[300]} />
      </g>

      <circle cx="214" cy="74" r="16" fill={colors.successBg} stroke={colors.success} strokeWidth="2" />
      <path
        className="rt-session-prep__check"
        d="M207 74l6 6 12-12"
        fill="none"
        stroke={colors.success}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SessionPreparing({
  variant,
  title,
  hint,
}: {
  variant: SessionPreparingVariant;
  title?: string;
  hint?: string;
}) {
  const copy = COPY[variant];
  const styleId = useId();
  const [messageIndex, setMessageIndex] = useState(0);
  const message = copy.messages[messageIndex] ?? copy.messages[0];

  useEffect(() => {
    overflowLockCount += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      overflowLockCount -= 1;
      if (overflowLockCount === 0) document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setMessageIndex((i) => (i + 1) % copy.messages.length);
    }, MESSAGE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [copy.messages.length]);

  return (
    <div
      component="SessionPreparing"
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: colors.neutral[25],
      }}
    >
      <style id={styleId}>{PREP_CSS}</style>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(circle at 18% 20%, ${colors.brand[50]} 0%, transparent 42%), radial-gradient(circle at 82% 78%, ${colors.accent[50]} 0%, transparent 40%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 440,
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <TableveraWordmark iconSize={32} />
        </div>
        {variant === 'diner' ? <DinerTableIllustration /> : <PartnerFloorIllustration />}
        <h1
          style={{
            margin: '8px 0 8px',
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            letterSpacing: typography.letterSpacing.tight,
            color: colors.textPrimary,
          }}
        >
          {title ?? copy.title}
        </h1>
        <p
          key={message}
          className="rt-session-prep__msg"
          style={{
            margin: '0 0 22px',
            minHeight: 44,
            color: colors.textPrimary,
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.medium,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
        <div
          style={{
            width: '100%',
            maxWidth: 220,
            height: 6,
            margin: '0 auto 14px',
            overflow: 'hidden',
            borderRadius: radii.pill,
            background: colors.brand[100],
          }}
        >
          <div
            className="rt-session-prep__bar-fill"
            style={{
              width: '55%',
              height: '100%',
              borderRadius: 999,
              background: `linear-gradient(90deg, ${colors.brand[500]}, ${colors.accent[400]})`,
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 6,
            marginBottom: 16,
          }}
        >
          <span
            className="rt-session-prep__dot"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: colors.brand[500],
            }}
          />
          <span
            className="rt-session-prep__dot"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: colors.brand[500],
            }}
          />
          <span
            className="rt-session-prep__dot"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: colors.brand[500],
            }}
          />
        </div>
        <p
          style={{
            margin: 0,
            color: colors.textTertiary,
            fontSize: typography.fontSize.sm,
          }}
        >
          {hint ?? copy.hint}
        </p>
      </div>
    </div>
  );
}
