'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card, Space, Typography } from 'antd';
import { FileProtectOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { colors, radii, typography } from '@reservations/ui';
import { COMPANY_NAME, LEGAL_LAST_UPDATED, type LegalTocItem } from '@/lib/legal';

const { Title, Paragraph, Text } = Typography;

type LegalPageLayoutProps = {
  title: string;
  subtitle: string;
  badge: string;
  icon?: ReactNode;
  toc: LegalTocItem[];
  relatedLinks?: Array<{ href: string; label: string }>;
  children: ReactNode;
};

export function LegalPageLayout({
  title,
  subtitle,
  badge,
  icon,
  toc,
  relatedLinks = [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
    { href: '/cookies', label: 'Cookie Policy' },
    { href: '/contact', label: 'Contact us' },
  ],
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="legal-page">
      <Space orientation="vertical" size={32} style={{ width: '100%' }}>
        <Card
          className="rt-fade-up legal-hero"
          style={{
            background: `linear-gradient(135deg, ${colors.brand[600]} 0%, ${colors.heroMid} 55%, #051c14 100%)`,
            border: 'none',
            borderRadius: radii.xl,
            overflow: 'hidden',
          }}
          styles={{ body: { padding: '44px 32px', position: 'relative' } }}
        >
          <div className="legal-hero__orb legal-hero__orb--1 rt-hero-orb" aria-hidden />
          <div className="legal-hero__orb legal-hero__orb--2 rt-hero-orb" aria-hidden />

          <div className="legal-hero__content">
            <span className="legal-hero-badge">{badge}</span>
            <div className="legal-hero__title-row">
              <span className="legal-hero__icon" aria-hidden>
                {icon ?? <FileProtectOutlined />}
              </span>
              <div>
                <Title
                  level={1}
                  style={{
                    color: '#fff',
                    margin: 0,
                    fontSize: typography.fontSize.display,
                    lineHeight: typography.lineHeight.tight,
                    letterSpacing: typography.letterSpacing.tight,
                  }}
                >
                  {title}
                </Title>
                <Paragraph
                  style={{
                    color: 'rgba(255,255,255,0.86)',
                    margin: '10px 0 0',
                    fontSize: typography.fontSize.md,
                    maxWidth: 640,
                  }}
                >
                  {subtitle}
                </Paragraph>
              </div>
            </div>
            <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: typography.fontSize.sm }}>
              Last updated: {LEGAL_LAST_UPDATED}
            </Text>
          </div>
        </Card>

        <div className="legal-page__grid">
          <aside className="legal-toc" aria-label="Table of contents">
            <div className="legal-toc__inner">
              <Text strong className="legal-toc__heading">
                On this page
              </Text>
              <nav>
                <ul className="legal-toc__list">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`}>{item.label}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </aside>

          <article className="legal-content">
            <div className="legal-content__intro">
              <SafetyCertificateOutlined />
              <Text type="secondary">
                This document applies to your use of {COMPANY_NAME}&apos;s diner-facing website and
                reservation services. If you have questions,{' '}
                <Link href="/contact">contact our team</Link>.
              </Text>
            </div>

            {children}

            {relatedLinks.length > 0 && (
              <div className="legal-related">
                <Title level={4} style={{ marginTop: 0 }}>
                  Related documents
                </Title>
                <div className="legal-related__links">
                  {relatedLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>
        </div>
      </Space>
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="legal-section">
      <Title level={3} className="legal-section__title">
        {title}
      </Title>
      {children}
    </section>
  );
}
