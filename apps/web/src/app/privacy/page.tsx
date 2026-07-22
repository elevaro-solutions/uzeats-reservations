'use client';

import { Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

export default function PrivacyPolicyPage() {
  return (
    <div component="PrivacyPolicyPage" style={{ display: 'contents' }}><Typography style={{ maxWidth: 780 }}>
      <Title level={2}>Privacy Policy</Title>
      <Paragraph type="secondary">Last updated: July 11, 2026</Paragraph>

      <Paragraph>
        Tablevera (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates a restaurant
        reservation platform that connects diners with restaurants. This Privacy Policy explains how
        we collect, use, disclose, and safeguard your information when you use our service.
      </Paragraph>

      <Title level={4}>1. Information We Collect</Title>
      <Paragraph>
        <Text strong>Account Information:</Text> When you create an account, we collect your name,
        email address, phone number, and password.
      </Paragraph>
      <Paragraph>
        <Text strong>Booking Data:</Text> We collect information about your reservations, including
        restaurant, date, time, party size, special requests, and occasion.
      </Paragraph>
      <Paragraph>
        <Text strong>Payment Information:</Text> When deposits are required, payment details are
        processed securely by our payment partner Stripe. We do not store your full card number.
      </Paragraph>
      <Paragraph>
        <Text strong>Usage Data:</Text> We automatically collect device information, IP address,
        browser type, pages visited, and interaction data to improve our service.
      </Paragraph>

      <Title level={4}>2. How We Use Your Information</Title>
      <Paragraph>We use your information to:</Paragraph>
      <ul>
        <li>Process and manage your restaurant reservations</li>
        <li>Send booking confirmations, reminders, and updates</li>
        <li>Facilitate deposits and payments through Stripe</li>
        <li>Manage your loyalty points and rewards</li>
        <li>Improve and personalize our platform</li>
        <li>Communicate service updates and promotional offers (with your consent)</li>
        <li>Detect and prevent fraud or abuse</li>
      </ul>

      <Title level={4}>3. Third-Party Sharing</Title>
      <Paragraph>
        <Text strong>Restaurants:</Text> We share your name, contact information, and booking details
        with the restaurant where you make a reservation.
      </Paragraph>
      <Paragraph>
        <Text strong>Stripe:</Text> Payment processing is handled by Stripe, Inc. Your payment data
        is subject to Stripe&apos;s privacy policy.
      </Paragraph>
      <Paragraph>
        <Text strong>Service Providers:</Text> We may share data with hosting, analytics, and
        communication providers who assist in operating our platform, subject to confidentiality
        agreements.
      </Paragraph>
      <Paragraph>
        We do not sell your personal information to third parties.
      </Paragraph>

      <Title level={4}>4. Cookies & Tracking</Title>
      <Paragraph>
        We use essential cookies for authentication and session management. We may also use analytics
        cookies to understand how our service is used. You can manage cookie preferences through your
        browser settings.
      </Paragraph>

      <Title level={4}>5. Data Retention</Title>
      <Paragraph>
        We retain your account information for as long as your account is active. Reservation history
        is retained for up to 3 years for loyalty tracking and dispute resolution. You may request
        deletion of your data at any time.
      </Paragraph>

      <Title level={4}>6. Your Rights (CCPA/GDPR)</Title>
      <Paragraph>Depending on your jurisdiction, you may have the right to:</Paragraph>
      <ul>
        <li>Access the personal data we hold about you</li>
        <li>Request correction of inaccurate data</li>
        <li>Request deletion of your personal data</li>
        <li>Object to or restrict processing of your data</li>
        <li>Data portability (receive your data in a structured format)</li>
        <li>Withdraw consent at any time</li>
        <li>Opt out of the sale of personal information (California residents)</li>
      </ul>

      <Title level={4}>7. Data Security</Title>
      <Paragraph>
        We implement industry-standard security measures including encryption in transit (TLS),
        encrypted storage, access controls, and regular security audits to protect your personal
        data.
      </Paragraph>

      <Title level={4}>8. Children&apos;s Privacy</Title>
      <Paragraph>
        Our service is not directed to individuals under 16. We do not knowingly collect personal
        information from children.
      </Paragraph>

      <Title level={4}>9. Changes to This Policy</Title>
      <Paragraph>
        We may update this policy from time to time. We will notify you of material changes by email
        or through our platform. Continued use of the service after changes constitutes acceptance.
      </Paragraph>

      <Title level={4}>10. Contact Us</Title>
      <Paragraph>
        If you have questions about this Privacy Policy or wish to exercise your rights, please
        contact us at: <Text copyable>privacy@tablevera.online</Text>
      </Paragraph>
    </Typography></div>
  );
}
