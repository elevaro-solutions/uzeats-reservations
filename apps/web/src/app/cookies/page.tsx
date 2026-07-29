'use client';

import Link from 'next/link';
import { Table, Typography } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { LegalPageLayout, LegalSection } from '@/components/LegalPageLayout';
import { COMPANY_NAME, LEGAL_CONTACT } from '@/lib/legal';
import { openCookieSettings } from '@/components/CookieConsent';

const { Paragraph, Text } = Typography;

const TOC = [
  { id: 'what', label: 'What are cookies?' },
  { id: 'how', label: 'How we use them' },
  { id: 'categories', label: 'Cookie categories' },
  { id: 'list', label: 'Cookies we use' },
  { id: 'manage', label: 'Managing preferences' },
  { id: 'contact', label: 'Contact' },
];

const COOKIE_TABLE = [
  {
    key: '1',
    name: 'accessToken / refreshToken',
    type: 'localStorage',
    category: 'Essential',
    purpose: 'Keeps you signed in and refreshes your session securely.',
    duration: 'Session / 30 days',
  },
  {
    key: '2',
    name: 'tablevera_cookie_consent',
    type: 'localStorage',
    category: 'Essential',
    purpose: 'Stores your cookie consent choices.',
    duration: '12 months',
  },
  {
    key: '3',
    name: 'Apollo Client cache',
    type: 'Memory / storage',
    category: 'Essential',
    purpose: 'Loads reservation and profile data efficiently while you browse.',
    duration: 'Session',
  },
  {
    key: '4',
    name: '_ga / _gid (if enabled)',
    type: 'Cookie',
    category: 'Analytics',
    purpose: 'Measures traffic and product usage to improve the booking experience.',
    duration: 'Up to 24 months',
  },
  {
    key: '5',
    name: 'Marketing pixels (if enabled)',
    type: 'Cookie / pixel',
    category: 'Marketing',
    purpose: 'Measures campaign performance and helps deliver relevant offers.',
    duration: 'Varies by provider',
  },
];

export default function CookiePolicyPage() {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      subtitle="How Tablevera uses cookies and similar technologies, and how you can control them."
      badge="Privacy"
      icon={<SafetyCertificateOutlined />}
      toc={TOC}
    >
      <LegalSection id="what" title="1. What are cookies?">
        <Paragraph>
          Cookies are small text files stored on your device. We also use similar technologies such
          as local storage, session storage, and pixels. Together, we refer to these as
          &quot;cookies&quot; in this policy.
        </Paragraph>
        <Paragraph>
          Cookies help websites remember your preferences, keep you signed in, understand how
          features are used, and — with your permission — support analytics and marketing.
        </Paragraph>
      </LegalSection>

      <LegalSection id="how" title="2. How we use them">
        <Paragraph>
          {COMPANY_NAME} uses cookies to operate the reservation platform, protect accounts, remember
          your cookie choices, and improve performance. Optional cookies are only activated when you
          consent through our cookie banner or preference center.
        </Paragraph>
        <Paragraph>
          For broader information about how we handle personal data, see our{' '}
          <Link href="/privacy">Privacy Policy</Link>.
        </Paragraph>
      </LegalSection>

      <LegalSection id="categories" title="3. Cookie categories">
        <Paragraph>
          <Text strong>Essential:</Text> Required for authentication, security, fraud prevention, and
          core booking functionality. These cannot be disabled through our preference center because
          the Service would not work without them.
        </Paragraph>
        <Paragraph>
          <Text strong>Analytics:</Text> Help us understand which pages and flows are most useful so we
          can improve search, maps, and checkout. Data is aggregated where possible.
        </Paragraph>
        <Paragraph>
          <Text strong>Marketing:</Text> Used to measure advertising campaigns and show relevant
          offers. We do not sell your personal information to advertisers.
        </Paragraph>
      </LegalSection>

      <LegalSection id="list" title="4. Cookies we use">
        <Paragraph>
          The table below describes the main technologies used on our diner website. Optional entries
          apply only when you have enabled the corresponding category.
        </Paragraph>
        <Table
          className="legal-cookie-table"
          dataSource={COOKIE_TABLE}
          pagination={false}
          scroll={{ x: 720 }}
          columns={[
            { title: 'Name', dataIndex: 'name', key: 'name', width: 180 },
            { title: 'Type', dataIndex: 'type', key: 'type', width: 120 },
            { title: 'Category', dataIndex: 'category', key: 'category', width: 110 },
            { title: 'Purpose', dataIndex: 'purpose', key: 'purpose' },
            { title: 'Duration', dataIndex: 'duration', key: 'duration', width: 140 },
          ]}
        />
      </LegalSection>

      <LegalSection id="manage" title="5. Managing your preferences">
        <Paragraph>
          When you first visit {COMPANY_NAME}, you can accept all cookies, reject non-essential
          cookies, or customize your choices. You can change your mind at any time:
        </Paragraph>
        <ul>
          <li>
            Open{' '}
            <button type="button" className="legal-inline-button" onClick={openCookieSettings}>
              Cookie settings
            </button>{' '}
            from the site footer
          </li>
          <li>Adjust your browser settings to block or delete cookies</li>
          <li>Use browser extensions or device controls where available</li>
        </ul>
        <Paragraph>
          Blocking essential cookies may prevent you from signing in or completing a reservation.
          Browser-level controls affect all websites you visit, not just {COMPANY_NAME}.
        </Paragraph>
      </LegalSection>

      <LegalSection id="contact" title="6. Contact">
        <Paragraph>
          Questions about this Cookie Policy:{' '}
          <Text copyable>
            <a href={`mailto:${LEGAL_CONTACT.privacy}`}>{LEGAL_CONTACT.privacy}</a>
          </Text>
        </Paragraph>
      </LegalSection>
    </LegalPageLayout>
  );
}
