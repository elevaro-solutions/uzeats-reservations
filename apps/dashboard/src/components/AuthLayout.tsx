'use client';

import Link from 'next/link';
import { TableveraLogo, TableveraWordmark, colors, radii, typography, shadows } from '@reservations/ui';
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  MessageOutlined,
  TableOutlined,
} from '@ant-design/icons';

const PERKS = [
  { icon: <CalendarOutlined />, text: 'Manage reservations in real time' },
  { icon: <TableOutlined />, text: 'Visual floor plan & table management' },
  { icon: <MessageOutlined />, text: 'Guest messaging & campaigns' },
  { icon: <BarChartOutlined />, text: 'Revenue analytics & reports' },
] as const;

export function AuthLayout({
  children,
  heading,
  subheading,
  maxWidth = 440,
}: {
  children: React.ReactNode;
  heading: string;
  subheading?: string;
  maxWidth?: number;
}) {
  return (
    <div component="AuthLayout"
      style={{
        minHeight: '100dvh',
        display: 'flex',
      }}
    >
      {/* ---- Branded panel ---- */}
      <div
        style={{
          flex: '0 0 44%',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '64px 48px',
          background: `linear-gradient(160deg, ${colors.brand[900]} 0%, ${colors.heroMid} 48%, ${colors.brand[800]} 100%)`,
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
              'radial-gradient(circle, rgba(61, 143, 111, 0.3) 0%, transparent 70%)',
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
              'radial-gradient(circle, rgba(232, 163, 23, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
            maskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 80%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 80%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: 56 }}>
            <TableveraLogo height={40} />
            <span
              style={{
                display: 'block',
                marginTop: 8,
                color: 'rgba(255,255,255,0.45)',
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                textTransform: 'uppercase',
                letterSpacing: typography.letterSpacing.wide,
              }}
            >
              Partner Hub
            </span>
          </div>

          <h1
            style={{
              color: '#fff',
              fontSize: 'clamp(28px, 3.2vw, 38px)',
              lineHeight: 1.2,
              fontWeight: typography.fontWeight.bold,
              letterSpacing: typography.letterSpacing.tight,
              margin: '0 0 12px',
              maxWidth: 400,
            }}
          >
            Everything you need to run your restaurant
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: typography.fontSize.base,
              lineHeight: 1.6,
              margin: '0 0 40px',
              maxWidth: 380,
            }}
          >
            Reservations, guests, analytics, and operations — all in one place.
          </p>

          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {PERKS.map((perk) => (
              <li
                key={perk.text}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.medium,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: radii.sm,
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    color: colors.accent[400],
                    flexShrink: 0,
                  }}
                >
                  {perk.icon}
                </div>
                {perk.text}
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
        <div
          className="rt-auth-mobile-logo"
          style={{
            display: 'none',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 4,
            marginBottom: 32,
          }}
        >
          <TableveraWordmark iconSize={34} />
          <span
            style={{
              color: colors.textTertiary,
              fontSize: 10,
              fontWeight: typography.fontWeight.semibold,
              textTransform: 'uppercase',
              letterSpacing: typography.letterSpacing.wide,
            }}
          >
            Partner Hub
          </span>
        </div>

        <div
          className="rt-fade-up"
          style={{
            width: '100%',
            maxWidth,
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

        <p
          style={{
            marginTop: 20,
            color: colors.textTertiary,
            fontSize: typography.fontSize.sm,
            textAlign: 'center',
          }}
        >
          Not a partner?{' '}
          <Link
            href={process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'}
            style={{
              color: colors.brand[600],
              fontWeight: typography.fontWeight.semibold,
            }}
          >
            Book a table &rarr;
          </Link>
        </p>
      </div>
    </div>
  );
}
