'use client';

import Link from 'next/link';
import { Typography } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { LegalPageLayout, LegalSection } from '@/components/LegalPageLayout';
import {
  COMPANY_NAME,
  LEGAL_CONTACT,
  COMPANY_ADDRESS_DISPLAY,
  COMPANY_PHONE,
  COMPANY_PHONE_DISPLAY,
} from '@/lib/legal';

const { Paragraph, Text } = Typography;

const TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'types', label: 'Message types' },
  { id: 'opt-in', label: 'How you opt in' },
  { id: 'opt-out', label: 'How you opt out' },
  { id: 'examples', label: 'Example messages' },
  { id: 'frequency', label: 'Frequency & rates' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'contact', label: 'Contact' },
];

export default function SmsMessagingPage() {
  return (
    <LegalPageLayout
      title="SMS Messaging Terms & Opt-In"
      subtitle="Clear consent, message types, and opt-out instructions for text messages from Tablevera."
      badge="SMS"
      icon={<MessageOutlined />}
      toc={TOC}
      relatedLinks={[
        { href: '/privacy', label: 'Privacy Policy' },
        { href: '/terms', label: 'Terms of Service' },
        { href: '/cookies', label: 'Cookie Policy' },
        { href: '/contact', label: 'Contact us' },
      ]}
    >
      <LegalSection id="overview" title="1. Overview">
        <Paragraph>
          {COMPANY_NAME} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) may send SMS text
          messages to phone numbers you provide when you create an account, verify your phone, join
          a waitlist, book a reservation, or enable SMS in your notification preferences.
        </Paragraph>
        <Paragraph>
          We use SMS only for the purposes described on this page. We do not sell your phone number.
          Message content is transactional and service-related unless you separately opt in to
          promotional texts (we do not currently send marketing SMS campaigns to diners).
        </Paragraph>
        <Paragraph>
          By providing your mobile number and completing the applicable opt-in step below, you
          consent to receive SMS from {COMPANY_NAME} as described here. Consent is not a condition of
          purchasing any goods or services.
        </Paragraph>
      </LegalSection>

      <LegalSection id="types" title="2. Message types we send">
        <Paragraph>We may send the following categories of SMS:</Paragraph>
        <ul>
          <li>
            <Text strong>Account verification (2FA / OTP):</Text> One-time passcodes to sign in or
            verify your phone number.
          </li>
          <li>
            <Text strong>Reservation notifications:</Text> Confirmations, reminders, cancellations,
            and schedule changes for bookings you make through {COMPANY_NAME}.
          </li>
          <li>
            <Text strong>Waitlist & availability alerts:</Text> Notices when your table is ready or
            when a requested opening becomes available at a restaurant you follow or favorited.
          </li>
          <li>
            <Text strong>Loyalty & feedback (optional):</Text> Points updates or survey invitations
            only when you enable SMS for those notification types in your account settings.
          </li>
          <li>
            <Text strong>Restaurant staff alerts (partners):</Text> Partner dashboard users who
            enable SMS may receive alerts about new reservations, guest messages, and waitlist
            events for their restaurant.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="opt-in" title="3. How you opt in">
        <Paragraph>You opt in to SMS in one or more of these ways:</Paragraph>
        <ul>
          <li>
            <Text strong>Account registration:</Text> When you create a diner account and provide a
            phone number, you acknowledge that you may receive verification and service-related SMS
            as disclosed on the sign-up form and this page.
          </li>
          <li>
            <Text strong>Phone verification / sign-in:</Text> Requesting a one-time code by SMS
            constitutes consent to receive that authentication message.
          </li>
          <li>
            <Text strong>Notification preferences:</Text> SMS for reservation updates, waitlist
            alerts, loyalty, and similar events is off by default. You can turn SMS on per event type
            in your{' '}
            <Link href="/profile#notifications">profile notification settings</Link> (diners) or the
            partner notifications page (restaurant staff).
          </li>
          <li>
            <Text strong>Waitlist phone:</Text> Providing a mobile number when joining a restaurant
            waitlist constitutes consent to receive table-ready and related waitlist SMS for that
            visit.
          </li>
        </ul>
        <Paragraph>
          You can review this policy anytime at{' '}
          <Link href="/sms">https://tablevera.online/sms</Link>.
        </Paragraph>
      </LegalSection>

      <LegalSection id="opt-out" title="4. How you opt out">
        <Paragraph>You can stop SMS messages at any time:</Paragraph>
        <ul>
          <li>
            Reply <Text strong>STOP</Text> to any {COMPANY_NAME} text message. You will receive a
            one-time confirmation that you have been unsubscribed from SMS.
          </li>
          <li>
            Reply <Text strong>HELP</Text> for help information, or email{' '}
            <a href={`mailto:${LEGAL_CONTACT.general}`}>{LEGAL_CONTACT.general}</a>.
          </li>
          <li>
            Turn off SMS channels in your{' '}
            <Link href="/profile#notifications">notification preferences</Link>.
          </li>
          <li>
            Contact us at{' '}
            <a href={`mailto:${LEGAL_CONTACT.privacy}`}>{LEGAL_CONTACT.privacy}</a> or{' '}
            <Link href="/contact?topic=privacy">our contact form</Link> to request removal.
          </li>
        </ul>
        <Paragraph>
          After opting out, you may still receive a final confirmation message. Account access via
          email or other channels remains available. If you later request a new OTP or re-enable SMS
          preferences, that is a new opt-in for those messages.
        </Paragraph>
      </LegalSection>

      <LegalSection id="examples" title="5. Example messages">
        <Paragraph>Representative examples (wording may vary slightly):</Paragraph>
        <ul>
          <li>
            <Text strong>OTP:</Text> &quot;Your Tablevera verification code is 123456. It expires
            in 10 minutes. Do not share this code.&quot;
          </li>
          <li>
            <Text strong>Confirmation:</Text> &quot;Reservation confirmed: Your reservation at
            Samarkand Palace is confirmed.&quot;
          </li>
          <li>
            <Text strong>Reminder:</Text> &quot;Reservation in 24h: Reminder: Bella Vista at
            7/15/2026, 7:00:00 PM.&quot;
          </li>
          <li>
            <Text strong>Cancellation:</Text> &quot;Reservation cancelled: Your reservation at
            Harbor Kitchen has been cancelled.&quot;
          </li>
          <li>
            <Text strong>Waitlist ready:</Text> &quot;Your table is ready! Please check in with the
            host.&quot;
          </li>
          <li>
            <Text strong>Availability alert:</Text> &quot;A table opened up!: A table is available on
            Sat, Aug 15. Book now before it&apos;s gone.&quot;
          </li>
          <li>
            <Text strong>Help / Stop replies:</Text> Standard carrier HELP and STOP confirmation
            responses apply.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="frequency" title="6. Message frequency & rates">
        <Paragraph>
          Message frequency varies. Typical diner volume is a few messages per reservation (for
          example, confirmation plus one or two reminders), plus occasional waitlist or availability
          alerts when applicable. Authentication codes are sent only when you request them.
        </Paragraph>
        <Paragraph>
          <Text strong>Message and data rates may apply.</Text> Check your mobile plan with your
          wireless carrier. Carriers are not liable for delayed or undelivered messages.
        </Paragraph>
        <Paragraph>
          Supported carriers include major U.S. wireless providers. Delivery is subject to carrier
          and device availability.
        </Paragraph>
      </LegalSection>

      <LegalSection id="privacy" title="7. Privacy">
        <Paragraph>
          We process phone numbers and related message metadata to deliver SMS and secure your
          account. Details are in our <Link href="/privacy">Privacy Policy</Link>. SMS delivery is
          provided by Twilio and other trusted vendors under our instructions.
        </Paragraph>
        <Paragraph>
          Use of the Service is also governed by our <Link href="/terms">Terms of Service</Link>.
        </Paragraph>
      </LegalSection>

      <LegalSection id="contact" title="8. Contact">
        <Paragraph>
          Questions about SMS or privacy:{' '}
          <Text copyable>
            <a href={`mailto:${LEGAL_CONTACT.privacy}`}>{LEGAL_CONTACT.privacy}</a>
          </Text>
        </Paragraph>
        <Paragraph>
          Phone:{' '}
          <a href={`tel:${COMPANY_PHONE}`}>{COMPANY_PHONE_DISPLAY}</a>
        </Paragraph>
        <Paragraph>Mail: {COMPANY_ADDRESS_DISPLAY}</Paragraph>
      </LegalSection>
    </LegalPageLayout>
  );
}
