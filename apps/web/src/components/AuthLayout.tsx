'use client';

import Link from 'next/link';
import { TableveraLogo, TableveraWordmark, colors, radii, typography, shadows } from '@reservations/ui';
import { CheckCircleFilled } from '@ant-design/icons';

const PERKS = [
  'Instant table confirmations',
  'No booking fees, ever',
  'Earn loyalty points on every visit',
  'Manage reservations in one place',
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
    <div component="AuthLayout"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        background: colors.neutral[25],
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
          background: `linear-gradient(160deg, ${colors.brand[900]} 0%, ${colors.heroMid} 50%, ${colors.brand[800]} 100%)`,
        }}
        className="rt-auth-panel"
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -120,
            right: '-12%',
            width: 440,
            height: 440,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(61, 143, 111, 0.35) 0%, transparent 70%)`,
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
            background: `radial-gradient(circle, rgba(197, 160, 89, 0.18) 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent 80%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent 80%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              textDecoration: 'none',
              marginBottom: 56,
            }}
          >
            <TableveraLogo height={40} />
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
            Dining made{' '}
            <span
              style={{
                background: `linear-gradient(90deg, ${colors.accent[300]}, ${colors.accent[400]})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              beautifully simple
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
            Find a table, book it in seconds, and earn rewards — free for diners.
          </p>

          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {PERKS.map((perk) => (
              <li
                key={perk}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.medium,
                }}
              >
                <CheckCircleFilled
                  style={{ color: colors.accent[400], fontSize: 16, flexShrink: 0 }}
                />
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
          background: colors.neutral[50],
          overflowY: 'auto',
        }}
      >
        <Link
          href="/"
          className="rt-auth-mobile-logo"
          style={{
            display: 'none',
            textDecoration: 'none',
            marginBottom: 32,
          }}
        >
          <TableveraWordmark iconSize={36} />
        </Link>

        <div
          className="rt-fade-up"
          style={{
            width: '100%',
            maxWidth: 440,
            background: colors.surface,
            borderRadius: radii.xl,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.lg,
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
          {!subheading && <div style={{ height: 24 }} />}
          {children}
        </div>
      </div>
    </div>
  );
}
