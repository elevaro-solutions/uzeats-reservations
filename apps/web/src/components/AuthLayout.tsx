'use client';

import Link from 'next/link';
import { colors, radii, typography, shadows } from '@reservations/ui';
import { FireFilled, CheckCircleFilled } from '@ant-design/icons';

const PERKS = [
  'Instant table confirmations',
  'No booking fees, ever',
  'Earn loyalty points on every visit',
  'Manage reservations on the go',
] as const;

export function AuthLayout({
  children,
  heading,
  subheading,
}: {
  children: React.ReactNode;
  heading: string;
  subheading?: string;
}) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        margin: '-32px calc(50% - 50vw) 0',
      }}
    >
      {/* ---- Branded panel (hidden on mobile) ---- */}
      <div
        style={{
          flex: '0 0 44%',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '64px 48px',
          background: `linear-gradient(160deg, ${colors.neutral[900]} 0%, #2e181b 50%, ${colors.brand[900]} 100%)`,
        }}
        className="rt-auth-panel"
      >
        {/* decorative glows */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -120,
            right: '-12%',
            width: 440,
            height: 440,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(230, 69, 83, 0.35) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: -180,
            left: '-10%',
            width: 380,
            height: 380,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(247, 163, 170, 0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
            maskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent 80%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent 80%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
              marginBottom: 56,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: radii.md,
                background: colors.brand[600],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 18,
              }}
            >
              <FireFilled />
            </div>
            <span
              style={{
                color: '#fff',
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.bold,
                letterSpacing: typography.letterSpacing.tight,
              }}
            >
              ReserveTable
            </span>
          </Link>

          <h1
            style={{
              color: '#fff',
              fontSize: 'clamp(30px, 3.5vw, 42px)',
              lineHeight: 1.15,
              fontWeight: typography.fontWeight.bold,
              letterSpacing: typography.letterSpacing.tight,
              margin: '0 0 16px',
              maxWidth: 420,
            }}
          >
            Your next favorite table,{' '}
            <span
              style={{
                background: `linear-gradient(90deg, ${colors.brand[400]}, ${colors.brand[300]})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              one tap away
            </span>
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: typography.fontSize.md,
              lineHeight: 1.6,
              margin: '0 0 40px',
              maxWidth: 400,
            }}
          >
            Discover and instantly book the best restaurants across the USA.
          </p>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PERKS.map((perk) => (
              <li
                key={perk}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: 'rgba(255,255,255,0.82)',
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.medium,
                }}
              >
                <CheckCircleFilled style={{ color: colors.brand[400], fontSize: 16, flexShrink: 0 }} />
                {perk}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ---- Form panel ---- */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px 24px',
          background: colors.neutral[25],
          overflowY: 'auto',
        }}
      >
        {/* Mobile-only logo */}
        <Link
          href="/"
          className="rt-auth-mobile-logo"
          style={{
            display: 'none',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: radii.md,
              background: colors.brand[600],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 16,
            }}
          >
            <FireFilled />
          </div>
          <span
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.bold,
              letterSpacing: typography.letterSpacing.tight,
            }}
          >
            ReserveTable
          </span>
        </Link>

        <div
          className="rt-fade-up"
          style={{
            width: '100%',
            maxWidth: 440,
            background: '#fff',
            borderRadius: radii.xl,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.md,
            padding: '40px 36px 36px',
          }}
        >
          <h2
            style={{
              margin: '0 0 4px',
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              letterSpacing: typography.letterSpacing.tight,
              color: colors.textPrimary,
            }}
          >
            {heading}
          </h2>
          {subheading && (
            <p
              style={{
                margin: '0 0 28px',
                color: colors.textSecondary,
                fontSize: typography.fontSize.base,
                lineHeight: 1.5,
              }}
            >
              {subheading}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
