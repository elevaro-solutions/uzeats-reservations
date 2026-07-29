'use client';

import Link from 'next/link';
import { Typography } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { LegalPageLayout, LegalSection } from '@/components/LegalPageLayout';
import { openCookieSettings } from '@/components/CookieConsent';
import { COMPANY_NAME, LEGAL_CONTACT } from '@/lib/legal';

const { Paragraph, Text } = Typography;

const TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'collect', label: 'Information we collect' },
  { id: 'use', label: 'How we use information' },
  { id: 'share', label: 'How we share information' },
  { id: 'cookies', label: 'Cookies & similar tech' },
  { id: 'retention', label: 'Data retention' },
  { id: 'rights', label: 'Your privacy rights' },
  { id: 'security', label: 'Security' },
  { id: 'children', label: "Children's privacy" },
  { id: 'international', label: 'International transfers' },
  { id: 'changes', label: 'Policy changes' },
  { id: 'contact', label: 'Contact us' },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="How Tablevera collects, uses, and protects your personal information when you book and dine."
      badge="Privacy"
      icon={<SafetyCertificateOutlined />}
      toc={TOC}
    >
      <LegalSection id="overview" title="1. Overview">
        <Paragraph>
          {COMPANY_NAME} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates a restaurant
          reservation platform that connects diners with restaurants. This Privacy Policy explains what
          personal information we collect, why we collect it, who we share it with, and the choices
          you have.
        </Paragraph>
        <Paragraph>
          This policy applies to diners using our public website and related services. Restaurant
          partners using our dashboard are covered by separate partner agreements and notices where
          applicable.
        </Paragraph>
      </LegalSection>

      <LegalSection id="collect" title="2. Information we collect">
        <Paragraph>
          <Text strong>Account information:</Text> Name, email address, phone number, password (stored
          in hashed form), profile preferences, and loyalty program details.
        </Paragraph>
        <Paragraph>
          <Text strong>Booking information:</Text> Restaurant selected, date, time, party size,
          special requests, occasion, waitlist entries, messages with restaurants, and reservation
          status history.
        </Paragraph>
        <Paragraph>
          <Text strong>Payment information:</Text> When a deposit is required, card and billing
          details are collected and processed by Stripe. We receive limited payment metadata (such as
          last four digits, brand, and transaction status) but not your full card number.
        </Paragraph>
        <Paragraph>
          <Text strong>Communications:</Text> Support messages, survey responses, review content, and
          notification preferences (email, SMS, push).
        </Paragraph>
        <Paragraph>
          <Text strong>Device & usage data:</Text> IP address, browser type, device identifiers,
          pages viewed, referral URLs, approximate location derived from IP, and interaction events
          used to secure and improve the Service.
        </Paragraph>
        <Paragraph>
          <Text strong>Information from third parties:</Text> If you sign in with Google, we receive
          profile information permitted by your Google account settings. Restaurants may provide
          feedback about completed visits (for example, no-show status).
        </Paragraph>
      </LegalSection>

      <LegalSection id="use" title="3. How we use information">
        <Paragraph>We use personal information to:</Paragraph>
        <ul>
          <li>Create and manage your account</li>
          <li>Process, confirm, modify, and cancel reservations</li>
          <li>Send booking confirmations, reminders, waitlist alerts, and service messages</li>
          <li>Facilitate deposits, refunds, and payment disputes through Stripe</li>
          <li>Operate loyalty points, referrals, and rewards</li>
          <li>Display reviews and moderate user-generated content</li>
          <li>Detect fraud, abuse, and security incidents</li>
          <li>Analyze usage to improve search, maps, and booking flows</li>
          <li>Send marketing communications where you have opted in</li>
          <li>Comply with legal obligations and enforce our terms</li>
        </ul>
        <Paragraph>
          We rely on contractual necessity, legitimate interests, consent (where required), and legal
          obligation as appropriate bases for processing under GDPR and similar laws.
        </Paragraph>
      </LegalSection>

      <LegalSection id="share" title="4. How we share information">
        <Paragraph>
          <Text strong>Restaurants you book with:</Text> We share your name, contact details, booking
          information, dietary or occasion notes you provide, and relevant loyalty status so the venue
          can host your reservation.
        </Paragraph>
        <Paragraph>
          <Text strong>Service providers:</Text> We use trusted vendors for hosting, email and SMS
          delivery, payment processing (Stripe), maps, analytics, customer support tools, and security
          monitoring. They process data only under our instructions and confidentiality obligations.
        </Paragraph>
        <Paragraph>
          <Text strong>Legal & safety:</Text> We may disclose information when required by law, to
          respond to lawful requests, to protect rights and safety, or to investigate fraud or abuse.
        </Paragraph>
        <Paragraph>
          <Text strong>Business transfers:</Text> If we are involved in a merger, acquisition, or asset
          sale, your information may transfer as part of that transaction, subject to this policy.
        </Paragraph>
        <Paragraph>
          <Text strong>We do not sell your personal information.</Text> We do not share it for
          cross-context behavioral advertising except where you have opted in to marketing cookies and
          applicable law permits such sharing.
        </Paragraph>
      </LegalSection>

      <LegalSection id="cookies" title="5. Cookies & similar technologies">
        <Paragraph>
          We use cookies, local storage, and similar technologies to keep you signed in, remember
          preferences, measure performance, and — with your consent — support analytics and
          marketing. Essential technologies are required for core functionality and cannot be turned
          off through our cookie banner.
        </Paragraph>
        <Paragraph>
          See our <Link href="/cookies">Cookie Policy</Link> for a detailed list of technologies,
          purposes, and retention periods. You can update your preferences anytime via{' '}
          <button type="button" className="legal-inline-button" onClick={openCookieSettings}>
            Cookie settings
          </button>{' '}
          in the site footer.
        </Paragraph>
      </LegalSection>

      <LegalSection id="retention" title="6. Data retention">
        <Paragraph>
          We keep account information while your account is active. Reservation and transaction
          records are retained for up to 3 years for loyalty accounting, fraud prevention, and
          dispute resolution unless a longer period is required by law.
        </Paragraph>
        <Paragraph>
          Marketing preferences and cookie consent choices are stored according to the periods
          described in our Cookie Policy. When you request deletion, we will remove or anonymize
          personal data unless we must retain it for legal, security, or legitimate business
          purposes.
        </Paragraph>
      </LegalSection>

      <LegalSection id="rights" title="7. Your privacy rights">
        <Paragraph>Depending on where you live, you may have the right to:</Paragraph>
        <ul>
          <li>Access a copy of the personal data we hold about you</li>
          <li>Correct inaccurate or incomplete data</li>
          <li>Delete your personal data</li>
          <li>Restrict or object to certain processing</li>
          <li>Receive your data in a portable format</li>
          <li>Withdraw consent where processing is consent-based</li>
          <li>Opt out of targeted advertising or certain profiling (where applicable)</li>
          <li>Appeal our response to your request</li>
        </ul>
        <Paragraph>
          California residents may also have rights under the CCPA/CPRA, including knowing what
          categories of personal information we collect and requesting deletion. We do not sell
          personal information as defined by California law.
        </Paragraph>
        <Paragraph>
          To exercise your rights, email{' '}
          <a href={`mailto:${LEGAL_CONTACT.privacy}`}>{LEGAL_CONTACT.privacy}</a> or use our{' '}
          <Link href="/contact?topic=privacy">privacy contact form</Link>. We may verify your
          identity before fulfilling a request. EU/UK residents may lodge a complaint with their local
          supervisory authority.
        </Paragraph>
      </LegalSection>

      <LegalSection id="security" title="8. Security">
        <Paragraph>
          We implement technical and organizational measures including encryption in transit (TLS),
          access controls, monitoring, and secure development practices. No method of transmission or
          storage is completely secure; please use a strong, unique password and notify us promptly of
          any suspected unauthorized access.
        </Paragraph>
      </LegalSection>

      <LegalSection id="children" title="9. Children's privacy">
        <Paragraph>
          The Service is not directed to children under 16, and we do not knowingly collect personal
          information from them. If you believe a child has provided us data, contact us and we will
          take appropriate steps to delete it.
        </Paragraph>
      </LegalSection>

      <LegalSection id="international" title="10. International transfers">
        <Paragraph>
          We may process and store information in the United States and other countries where we or
          our service providers operate. When we transfer personal data internationally, we use
          appropriate safeguards such as standard contractual clauses where required.
        </Paragraph>
      </LegalSection>

      <LegalSection id="changes" title="11. Policy changes">
        <Paragraph>
          We may update this Privacy Policy from time to time. Material changes will be communicated
          by email or prominent notice in the Service before they take effect, when practicable.
          Continued use after the effective date means you accept the updated policy.
        </Paragraph>
      </LegalSection>

      <LegalSection id="contact" title="12. Contact us">
        <Paragraph>
          Privacy questions or data requests:{' '}
          <Text copyable>
            <a href={`mailto:${LEGAL_CONTACT.privacy}`}>{LEGAL_CONTACT.privacy}</a>
          </Text>
        </Paragraph>
        <Paragraph>
          General support:{' '}
          <a href={`mailto:${LEGAL_CONTACT.general}`}>{LEGAL_CONTACT.general}</a>
        </Paragraph>
      </LegalSection>
    </LegalPageLayout>
  );
}
