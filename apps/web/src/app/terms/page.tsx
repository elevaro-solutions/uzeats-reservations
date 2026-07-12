'use client';

import { Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

export default function TermsOfServicePage() {
  return (
    <Typography style={{ maxWidth: 780 }}>
      <Title level={2}>Terms of Service</Title>
      <Paragraph type="secondary">Last updated: July 11, 2026</Paragraph>

      <Paragraph>
        Welcome to ReserveTable. By accessing or using our platform, you agree to be bound by these
        Terms of Service. Please read them carefully.
      </Paragraph>

      <Title level={4}>1. Service Description</Title>
      <Paragraph>
        ReserveTable is a restaurant reservation platform that allows diners to discover restaurants,
        book tables, earn loyalty points, and leave reviews. Restaurant partners use our platform to
        manage reservations, tables, and customer engagement.
      </Paragraph>

      <Title level={4}>2. User Accounts</Title>
      <Paragraph>
        You must provide accurate and complete information when creating an account. You are
        responsible for maintaining the confidentiality of your credentials and for all activity
        under your account. You must be at least 16 years old to use our service.
      </Paragraph>

      <Title level={4}>3. Booking Policies</Title>
      <Paragraph>
        When you make a reservation, you agree to arrive at the designated time with the specified
        party size. Reservations are confirmed based on restaurant availability. We reserve the right
        to limit the number of active reservations per user.
      </Paragraph>

      <Title level={4}>4. Cancellation & No-Show Policy</Title>
      <Paragraph>
        <Text strong>Cancellation:</Text> You may cancel a reservation at any time through the
        platform. We encourage cancelling at least 2 hours before your reservation time so the
        restaurant can accommodate other guests.
      </Paragraph>
      <Paragraph>
        <Text strong>No-Shows:</Text> Failing to arrive for a confirmed reservation without
        cancelling may result in forfeiture of any deposit paid. Repeated no-shows may result in
        account restrictions or suspension.
      </Paragraph>

      <Title level={4}>5. Deposits & Payments</Title>
      <Paragraph>
        Some restaurants require a deposit to confirm a reservation. Deposits are processed securely
        through Stripe. Deposit refund policies are set by individual restaurants. In the event of a
        valid cancellation within the restaurant&apos;s cancellation window, deposits will be
        refunded.
      </Paragraph>

      <Title level={4}>6. Loyalty Program</Title>
      <Paragraph>
        Users earn loyalty points for completed reservations. Points have no cash value and may be
        redeemed for discounts on future bookings. We reserve the right to modify point values,
        earning rates, or terminate the loyalty program with reasonable notice.
      </Paragraph>

      <Title level={4}>7. Reviews & Content</Title>
      <Paragraph>
        You may submit reviews only for reservations you have completed. Reviews must be truthful,
        relevant, and free of offensive or illegal content. We reserve the right to remove reviews
        that violate these guidelines.
      </Paragraph>

      <Title level={4}>8. Restaurant Partners</Title>
      <Paragraph>
        Restaurant partners are responsible for honoring confirmed reservations, maintaining accurate
        availability, and providing the service standard expected by diners. ReserveTable is not
        responsible for the dining experience itself.
      </Paragraph>

      <Title level={4}>9. Limitation of Liability</Title>
      <Paragraph>
        ReserveTable provides the platform &quot;as is.&quot; We are not liable for restaurant
        service quality, food safety, or the accuracy of restaurant-provided information. Our total
        liability to you shall not exceed the amount you paid to us in the 12 months preceding the
        claim.
      </Paragraph>

      <Title level={4}>10. Prohibited Conduct</Title>
      <Paragraph>You agree not to:</Paragraph>
      <ul>
        <li>Create fake accounts or make fraudulent reservations</li>
        <li>Abuse the loyalty points system</li>
        <li>Harass restaurant staff or other users</li>
        <li>Scrape, crawl, or automate access to the platform</li>
        <li>Circumvent security measures or interfere with platform operations</li>
      </ul>

      <Title level={4}>11. Dispute Resolution</Title>
      <Paragraph>
        Any disputes arising from these Terms shall be resolved through binding arbitration in
        accordance with the rules of the American Arbitration Association. You agree to resolve
        disputes individually and waive any right to participate in class actions.
      </Paragraph>

      <Title level={4}>12. Modifications</Title>
      <Paragraph>
        We may update these Terms at any time. Material changes will be communicated via email or
        platform notification at least 30 days in advance. Continued use after changes take effect
        constitutes acceptance.
      </Paragraph>

      <Title level={4}>13. Termination</Title>
      <Paragraph>
        We may suspend or terminate your account for violations of these Terms. You may delete your
        account at any time. Upon termination, unused loyalty points are forfeited.
      </Paragraph>

      <Title level={4}>14. Contact</Title>
      <Paragraph>
        For questions about these Terms, contact us at:{' '}
        <Text copyable>legal@reservetable.com</Text>
      </Paragraph>
    </Typography>
  );
}
