'use client';

import Link from 'next/link';
import { Typography } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { LegalPageLayout, LegalSection } from '@/components/LegalPageLayout';
import { COMPANY_NAME, LEGAL_CONTACT } from '@/lib/legal';

const { Paragraph, Text } = Typography;

const TOC = [
  { id: 'acceptance', label: 'Acceptance of terms' },
  { id: 'service', label: 'Our service' },
  { id: 'accounts', label: 'Accounts & eligibility' },
  { id: 'bookings', label: 'Reservations & bookings' },
  { id: 'cancellations', label: 'Cancellations & no-shows' },
  { id: 'payments', label: 'Deposits & payments' },
  { id: 'loyalty', label: 'Loyalty program' },
  { id: 'content', label: 'Reviews & user content' },
  { id: 'partners', label: 'Restaurant partners' },
  { id: 'conduct', label: 'Acceptable use' },
  { id: 'liability', label: 'Disclaimers & liability' },
  { id: 'disputes', label: 'Dispute resolution' },
  { id: 'changes', label: 'Changes & termination' },
  { id: 'contact', label: 'Contact' },
];

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      subtitle="The rules and responsibilities that apply when you discover restaurants and book tables through Tablevera."
      badge="Legal"
      icon={<FileTextOutlined />}
      toc={TOC}
    >
      <LegalSection id="acceptance" title="1. Acceptance of terms">
        <Paragraph>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of the {COMPANY_NAME}{' '}
          website, mobile experiences, and related services (collectively, the &quot;Service&quot;).
          By creating an account, making a reservation, or otherwise using the Service, you agree to
          these Terms and our{' '}
          <Link href="/privacy">Privacy Policy</Link>.
        </Paragraph>
        <Paragraph>
          If you do not agree, do not use the Service. If you use the Service on behalf of an
          organization, you represent that you have authority to bind that organization to these Terms.
        </Paragraph>
      </LegalSection>

      <LegalSection id="service" title="2. Our service">
        <Paragraph>
          {COMPANY_NAME} is a restaurant reservation platform. We help diners discover venues, check
          availability, join waitlists, book tables, pay deposits where required, earn loyalty
          rewards, and leave reviews. Restaurant partners use our partner tools to manage
          reservations, tables, and guest communication.
        </Paragraph>
        <Paragraph>
          {COMPANY_NAME} is a technology platform — not a restaurant, caterer, or food provider. We
          do not prepare, serve, or control food, beverages, or on-site hospitality. Your dining
          experience is provided directly by the restaurant you visit.
        </Paragraph>
      </LegalSection>

      <LegalSection id="accounts" title="3. Accounts & eligibility">
        <Paragraph>
          You must provide accurate, current, and complete information when registering and keep your
          account details up to date. You are responsible for safeguarding your login credentials
          and for all activity under your account.
        </Paragraph>
        <Paragraph>
          You must be at least 16 years old to use the Service. We may suspend or refuse accounts
          that appear fraudulent, abusive, or in violation of these Terms.
        </Paragraph>
      </LegalSection>

      <LegalSection id="bookings" title="4. Reservations & bookings">
        <Paragraph>
          A reservation is a request to dine at a specific restaurant, date, time, and party size.
          Confirmation depends on restaurant availability and any deposit or policy requirements shown
          at checkout.
        </Paragraph>
        <Paragraph>When booking, you agree to:</Paragraph>
        <ul>
          <li>Arrive on time with the confirmed party size</li>
          <li>Provide accurate contact details so the restaurant can reach you</li>
          <li>Follow the restaurant&apos;s house rules, dress code, and age restrictions</li>
          <li>Respect any special requests, seating notes, or accessibility needs you provide</li>
        </ul>
        <Paragraph>
          We may limit the number of active reservations, waitlist entries, or accounts associated
          with the same person or device to protect restaurants and other guests.
        </Paragraph>
      </LegalSection>

      <LegalSection id="cancellations" title="5. Cancellations & no-shows">
        <Paragraph>
          <Text strong>Cancellations:</Text> You may cancel eligible reservations through the Service.
          We encourage cancelling at least 2 hours before your reservation so the restaurant can
          offer the table to other guests. Some venues set stricter windows or non-refundable
          deposits — those rules are shown before you confirm.
        </Paragraph>
        <Paragraph>
          <Text strong>No-shows:</Text> If you fail to arrive or cancel in time, the restaurant may
          charge or retain a deposit, mark the visit as a no-show, or decline future bookings.
          Repeated no-shows may result in account restrictions on {COMPANY_NAME}.
        </Paragraph>
        <Paragraph>
          <Text strong>Restaurant changes:</Text> Restaurants may modify seating, timing, or
          availability due to operational needs. We will notify you when possible if a booking is
          changed or cancelled by the venue.
        </Paragraph>
      </LegalSection>

      <LegalSection id="payments" title="6. Deposits & payments">
        <Paragraph>
          Some restaurants require a deposit or prepayment to secure a table. Payments are processed
          by Stripe, our payment partner. {COMPANY_NAME} does not store full card numbers on our
          servers.
        </Paragraph>
        <Paragraph>
          Refund eligibility depends on the restaurant&apos;s stated policy and the timing of your
          cancellation. Chargebacks or payment disputes may be shared with the restaurant and payment
          processor to resolve the claim.
        </Paragraph>
      </LegalSection>

      <LegalSection id="loyalty" title="7. Loyalty program">
        <Paragraph>
          Eligible completed visits may earn loyalty points that can be redeemed for discounts or
          perks on future bookings, as described in the Service. Points have no cash value, are
          non-transferable, and may expire according to program rules shown in your profile.
        </Paragraph>
        <Paragraph>
          We may change earning rates, redemption options, tiers, or end the program with reasonable
          notice. Abuse of the loyalty program — including fake bookings or referral fraud — may
          result in forfeiture of points and account suspension.
        </Paragraph>
      </LegalSection>

      <LegalSection id="content" title="8. Reviews & user content">
        <Paragraph>
          You may submit ratings, reviews, photos, or messages only for reservations you completed
          or experiences you genuinely had. Content must be truthful, relevant, and respectful.
        </Paragraph>
        <Paragraph>You agree not to post content that is:</Paragraph>
        <ul>
          <li>False, misleading, or defamatory</li>
          <li>Harassing, hateful, or discriminatory</li>
          <li>Infringing intellectual property or privacy rights</li>
          <li>Promotional spam unrelated to your visit</li>
        </ul>
        <Paragraph>
          We may remove content or restrict accounts that violate these standards. You grant{' '}
          {COMPANY_NAME} a non-exclusive license to display and distribute your content within the
          Service.
        </Paragraph>
      </LegalSection>

      <LegalSection id="partners" title="9. Restaurant partners">
        <Paragraph>
          Restaurants listed on {COMPANY_NAME} are independent businesses. They are responsible for
          menu accuracy, pricing, allergens, service quality, staffing, and honoring confirmed
          reservations within their stated policies.
        </Paragraph>
        <Paragraph>
          Partner restaurant terms, including cancellation windows and deposit rules, are displayed
          at booking time and may vary by venue.
        </Paragraph>
      </LegalSection>

      <LegalSection id="conduct" title="10. Acceptable use">
        <Paragraph>You agree not to:</Paragraph>
        <ul>
          <li>Create fake accounts, bots, or fraudulent reservations</li>
          <li>Scrape, crawl, reverse engineer, or overload the Service</li>
          <li>Circumvent security, access controls, or rate limits</li>
          <li>Harass restaurant staff, other diners, or {COMPANY_NAME} personnel</li>
          <li>Use the Service for unlawful purposes or to resell bookings without authorization</li>
        </ul>
      </LegalSection>

      <LegalSection id="liability" title="11. Disclaimers & liability">
        <Paragraph>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE FULLEST
          EXTENT PERMITTED BY LAW, {COMPANY_NAME.toUpperCase()} DISCLAIMS WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </Paragraph>
        <Paragraph>
          We are not liable for restaurant conduct, food safety, allergic reactions, personal injury,
          property damage, or losses arising from your dining experience. Our total liability to you
          for claims relating to the Service is limited to the greater of (a) amounts you paid to{' '}
          {COMPANY_NAME} in the 12 months before the claim or (b) USD $100.
        </Paragraph>
        <Paragraph>
          Some jurisdictions do not allow certain limitations; in those cases, our liability is limited
          to the maximum extent permitted by law.
        </Paragraph>
      </LegalSection>

      <LegalSection id="disputes" title="12. Dispute resolution">
        <Paragraph>
          Before filing a claim, contact us at{' '}
          <a href={`mailto:${LEGAL_CONTACT.legal}`}>{LEGAL_CONTACT.legal}</a> so we can try to
          resolve the issue informally.
        </Paragraph>
        <Paragraph>
          Except where prohibited by law, disputes arising from these Terms or the Service will be
          resolved through binding individual arbitration under the American Arbitration Association
          rules, and you waive the right to participate in class actions. You may opt out of
          arbitration within 30 days of account creation by emailing{' '}
          <a href={`mailto:${LEGAL_CONTACT.legal}`}>{LEGAL_CONTACT.legal}</a>.
        </Paragraph>
      </LegalSection>

      <LegalSection id="changes" title="13. Changes & termination">
        <Paragraph>
          We may update these Terms from time to time. Material changes will be communicated by email
          or in-product notice at least 30 days before they take effect, when practicable. Continued
          use after the effective date constitutes acceptance.
        </Paragraph>
        <Paragraph>
          You may close your account at any time. We may suspend or terminate access for violations
          of these Terms. Upon termination, unused loyalty points may be forfeited unless required
          otherwise by law.
        </Paragraph>
      </LegalSection>

      <LegalSection id="contact" title="14. Contact">
        <Paragraph>
          Questions about these Terms:{' '}
          <Text copyable>
            <a href={`mailto:${LEGAL_CONTACT.legal}`}>{LEGAL_CONTACT.legal}</a>
          </Text>
        </Paragraph>
      </LegalSection>
    </LegalPageLayout>
  );
}
