import {
  COMPANY_NAME,
  LEGAL_CONTACT,
} from "./legal.constants";
import type { LegalDocument } from "./legal.types";

function text(...parts: string[]): { kind: "paragraph"; segments: { text: string }[] } {
  return { kind: "paragraph", segments: parts.map((part) => ({ text: part })) };
}

function labeled(
  label: string,
  body: string,
): { kind: "paragraph"; segments: { text: string; bold?: boolean }[] } {
  return {
    kind: "paragraph",
    segments: [
      { text: `${label} `, bold: true },
      { text: body },
    ],
  };
}

export const PRIVACY_POLICY_DOCUMENT: LegalDocument = {
  title: "Privacy Policy",
  subtitle:
    "How Tablevera collects, uses, and protects your personal information when you book and dine through our website and mobile app.",
  relatedRoute: "/terms",
  relatedLabel: "Terms & Conditions",
  relatedDescription:
    "Rules for booking, deposits, loyalty, and using Tablevera.",
  sections: [
    {
      id: "overview",
      title: "1. Overview",
      blocks: [
        text(
          `${COMPANY_NAME} ("we," "us," or "our") operates a restaurant reservation platform that connects diners with restaurants. This Privacy Policy explains what personal information we collect, why we collect it, who we share it with, and the choices you have.`,
        ),
        text(
          "This policy applies to diners using our public website, mobile app, and related services. Restaurant partners using our dashboard are covered by separate partner agreements and notices where applicable.",
        ),
      ],
    },
    {
      id: "collect",
      title: "2. Information we collect",
      blocks: [
        labeled(
          "Account information:",
          "Name, email address, phone number, password (stored in hashed form), profile preferences, and loyalty program details.",
        ),
        labeled(
          "Booking information:",
          "Restaurant selected, date, time, party size, special requests, occasion, waitlist entries, messages with restaurants, and reservation status history.",
        ),
        labeled(
          "Payment information:",
          "When a deposit is required, card and billing details are collected and processed by Stripe. We receive limited payment metadata (such as last four digits, brand, and transaction status) but not your full card number.",
        ),
        labeled(
          "Communications:",
          "Support messages, survey responses, review content, and notification preferences (email, SMS, and push notifications on the mobile app).",
        ),
        labeled(
          "Device & usage data:",
          "IP address, browser or app version, device identifiers, screens or pages viewed, referral sources, approximate location (when you grant permission or as derived from IP), push notification tokens, and interaction events used to secure and improve the Service.",
        ),
        labeled(
          "Information from third parties:",
          "If you sign in with Google, we receive profile information permitted by your Google account settings. Restaurants may provide feedback about completed visits (for example, no-show status).",
        ),
      ],
    },
    {
      id: "use",
      title: "3. How we use information",
      blocks: [
        text("We use personal information to:"),
        {
          kind: "bullets",
          items: [
            "Create and manage your account",
            "Process, confirm, modify, and cancel reservations",
            "Send booking confirmations, reminders, waitlist alerts, and service messages (including push notifications when enabled)",
            "Facilitate deposits, refunds, and payment disputes through Stripe",
            "Operate loyalty points, referrals, and rewards",
            "Display reviews and moderate user-generated content",
            "Detect fraud, abuse, and security incidents",
            "Analyze usage to improve search, maps, and booking flows",
            "Send marketing communications where you have opted in",
            "Comply with legal obligations and enforce our terms",
          ],
        },
        text(
          "We rely on contractual necessity, legitimate interests, consent (where required), and legal obligation as appropriate bases for processing under GDPR and similar laws.",
        ),
      ],
    },
    {
      id: "sms",
      title: "4. SMS & text messages",
      blocks: [
        text(
          "If you provide a mobile number, we may send SMS for account verification (one-time passcodes), reservation confirmations and reminders, waitlist and availability alerts, and — only if you enable them — optional loyalty or feedback notifications. Message and data rates may apply.",
        ),
        {
          kind: "paragraph",
          segments: [
            {
              text: "SMS for most notification types is off by default and can be managed in your profile. Providing a phone number for waitlist entry or requesting an OTP constitutes consent for those specific messages. Reply ",
            },
            { text: "STOP", bold: true },
            { text: " to opt out of SMS, or " },
            { text: "HELP", bold: true },
            { text: " for assistance." },
          ],
        },
        {
          kind: "paragraph",
          segments: [
            {
              text: "Full opt-in language, message types, and examples are in our ",
            },
            { text: "SMS Messaging Terms & Opt-In", link: "sms" },
            { text: " page on tablevera.online." },
          ],
        },
      ],
    },
    {
      id: "share",
      title: "5. How we share information",
      blocks: [
        labeled(
          "Restaurants you book with:",
          "We share your name, contact details, booking information, dietary or occasion notes you provide, and relevant loyalty status so the venue can host your reservation.",
        ),
        labeled(
          "Service providers:",
          "We use trusted vendors for hosting, email and SMS delivery, payment processing (Stripe), maps, analytics, push notification delivery, customer support tools, and security monitoring. They process data only under our instructions and confidentiality obligations.",
        ),
        labeled(
          "Legal & safety:",
          "We may disclose information when required by law, to respond to lawful requests, to protect rights and safety, or to investigate fraud or abuse.",
        ),
        labeled(
          "Business transfers:",
          "If we are involved in a merger, acquisition, or asset sale, your information may transfer as part of that transaction, subject to this policy.",
        ),
        labeled(
          "We do not sell your personal information.",
          "We do not share it for cross-context behavioral advertising except where you have opted in to marketing cookies or similar technologies and applicable law permits such sharing.",
        ),
      ],
    },
    {
      id: "cookies",
      title: "6. Cookies, SDKs & similar technologies",
      blocks: [
        text(
          "On the website, we use cookies, local storage, and similar technologies to keep you signed in, remember preferences, measure performance, and — with your consent — support analytics and marketing. Essential technologies are required for core functionality.",
        ),
        text(
          "In the mobile app, we use similar technologies such as secure token storage, device identifiers, analytics SDKs, and push notification services to keep you signed in, personalize your experience, measure performance, and deliver optional notifications.",
        ),
        {
          kind: "paragraph",
          segments: [
            { text: "See our " },
            { text: "Cookie Policy", link: "cookies" },
            {
              text: " on tablevera.online for a detailed list of website technologies, purposes, and retention periods. You can update website cookie preferences from the site footer.",
            },
          ],
        },
      ],
    },
    {
      id: "retention",
      title: "7. Data retention",
      blocks: [
        text(
          "We keep account information while your account is active. Reservation and transaction records are retained for up to 3 years for loyalty accounting, fraud prevention, and dispute resolution unless a longer period is required by law.",
        ),
        text(
          "Marketing preferences and cookie consent choices are stored according to the periods described in our Cookie Policy. When you request deletion, we will remove or anonymize personal data unless we must retain it for legal, security, or legitimate business purposes.",
        ),
      ],
    },
    {
      id: "rights",
      title: "8. Your privacy rights",
      blocks: [
        text("Depending on where you live, you may have the right to:"),
        {
          kind: "bullets",
          items: [
            "Access a copy of the personal data we hold about you",
            "Correct inaccurate or incomplete data",
            "Delete your personal data",
            "Restrict or object to certain processing",
            "Receive your data in a portable format",
            "Withdraw consent where processing is consent-based",
            "Opt out of targeted advertising or certain profiling (where applicable)",
            "Appeal our response to your request",
          ],
        },
        text(
          "California residents may also have rights under the CCPA/CPRA, including knowing what categories of personal information we collect and requesting deletion. We do not sell personal information as defined by California law.",
        ),
        {
          kind: "paragraph",
          segments: [
            { text: "To exercise your rights, email " },
            { text: LEGAL_CONTACT.privacy, link: "mailto-privacy" },
            {
              text: ". We may verify your identity before fulfilling a request. EU/UK residents may lodge a complaint with their local supervisory authority.",
            },
          ],
        },
      ],
    },
    {
      id: "security",
      title: "9. Security",
      blocks: [
        text(
          "We implement technical and organizational measures including encryption in transit (TLS), access controls, monitoring, and secure development practices. No method of transmission or storage is completely secure; please use a strong, unique password and notify us promptly of any suspected unauthorized access.",
        ),
      ],
    },
    {
      id: "children",
      title: "10. Children's privacy",
      blocks: [
        text(
          "The Service is not directed to children under 16, and we do not knowingly collect personal information from them. If you believe a child has provided us data, contact us and we will take appropriate steps to delete it.",
        ),
      ],
    },
    {
      id: "international",
      title: "11. International transfers",
      blocks: [
        text(
          "We may process and store information in the United States and other countries where we or our service providers operate. When we transfer personal data internationally, we use appropriate safeguards such as standard contractual clauses where required.",
        ),
      ],
    },
    {
      id: "changes",
      title: "12. Policy changes",
      blocks: [
        text(
          "We may update this Privacy Policy from time to time. Material changes will be communicated by email or prominent notice in the Service before they take effect, when practicable. Continued use after the effective date means you accept the updated policy.",
        ),
      ],
    },
  ],
};
