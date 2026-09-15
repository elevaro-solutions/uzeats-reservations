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

export const TERMS_CONDITIONS_DOCUMENT: LegalDocument = {
  title: "Terms & Conditions",
  subtitle:
    "The rules and responsibilities that apply when you discover restaurants and book tables through Tablevera’s website and mobile app.",
  relatedRoute: "/privacy",
  relatedLabel: "Privacy Policy",
  relatedDescription:
    "How we collect, use, and protect your personal information.",
  sections: [
    {
      id: "acceptance",
      title: "1. Acceptance of terms",
      blocks: [
        {
          kind: "paragraph",
          segments: [
            {
              text: `These Terms & Conditions ("Terms") govern your access to and use of the ${COMPANY_NAME} website, mobile app, and related services (collectively, the "Service"). By creating an account, making a reservation, or otherwise using the Service, you agree to these Terms and our `,
            },
            { text: "Privacy Policy", link: "privacy" },
            { text: "." },
          ],
        },
        text(
          "If you do not agree, do not use the Service. If you use the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms.",
        ),
      ],
    },
    {
      id: "service",
      title: "2. Our service",
      blocks: [
        text(
          `${COMPANY_NAME} is a restaurant reservation platform. We help diners discover venues, check availability, join waitlists, book tables, pay deposits where required, earn loyalty rewards, and leave reviews. Restaurant partners use our partner tools to manage reservations, tables, and guest communication.`,
        ),
        text(
          `${COMPANY_NAME} is a technology platform — not a restaurant, caterer, or food provider. We do not prepare, serve, or control food, beverages, or on-site hospitality. Your dining experience is provided directly by the restaurant you visit.`,
        ),
      ],
    },
    {
      id: "accounts",
      title: "3. Accounts & eligibility",
      blocks: [
        text(
          "You must provide accurate, current, and complete information when registering and keep your account details up to date. You are responsible for safeguarding your login credentials and for all activity under your account.",
        ),
        text(
          "You must be at least 16 years old to use the Service. We may suspend or refuse accounts that appear fraudulent, abusive, or in violation of these Terms.",
        ),
      ],
    },
    {
      id: "sms",
      title: "4. SMS messaging",
      blocks: [
        {
          kind: "paragraph",
          segments: [
            {
              text: `By providing a mobile phone number and completing the applicable opt-in (for example, account registration disclosure, requesting an OTP, enabling SMS in notification preferences, or joining a waitlist with your number), you consent to receive SMS from ${COMPANY_NAME} for verification, reservation updates, waitlist alerts, and other service-related messages described in our `,
            },
            { text: "SMS Messaging Terms & Opt-In", link: "sms" },
            { text: "." },
          ],
        },
        {
          kind: "paragraph",
          segments: [
            {
              text: "Message and data rates may apply. Message frequency varies. Reply ",
            },
            { text: "STOP", bold: true },
            { text: " to cancel SMS or " },
            { text: "HELP", bold: true },
            {
              text: " for help. Consent is not required as a condition of purchase. See our ",
            },
            { text: "Privacy Policy", link: "privacy" },
            { text: " for how we handle phone numbers." },
          ],
        },
      ],
    },
    {
      id: "bookings",
      title: "5. Reservations & bookings",
      blocks: [
        text(
          "A reservation is a request to dine at a specific restaurant, date, time, and party size. Confirmation depends on restaurant availability and any deposit or policy requirements shown at checkout.",
        ),
        text("When booking, you agree to:"),
        {
          kind: "bullets",
          items: [
            "Arrive on time with the confirmed party size",
            "Provide accurate contact details so the restaurant can reach you",
            "Follow the restaurant's house rules, dress code, and age restrictions",
            "Respect any special requests, seating notes, or accessibility needs you provide",
          ],
        },
        text(
          "We may limit the number of active reservations, waitlist entries, or accounts associated with the same person or device to protect restaurants and other guests.",
        ),
      ],
    },
    {
      id: "cancellations",
      title: "6. Cancellations & no-shows",
      blocks: [
        labeled(
          "Cancellations:",
          "You may cancel eligible reservations through the Service. We encourage cancelling at least 2 hours before your reservation so the restaurant can offer the table to other guests. Some venues set stricter windows or non-refundable deposits — those rules are shown before you confirm.",
        ),
        labeled(
          "No-shows:",
          `If you fail to arrive or cancel in time, the restaurant may charge or retain a deposit, mark the visit as a no-show, or decline future bookings. Repeated no-shows may result in account restrictions on ${COMPANY_NAME}.`,
        ),
        labeled(
          "Restaurant changes:",
          "Restaurants may modify seating, timing, or availability due to operational needs. We will notify you when possible if a booking is changed or cancelled by the venue.",
        ),
      ],
    },
    {
      id: "payments",
      title: "7. Deposits & payments",
      blocks: [
        text(
          `Some restaurants require a deposit or prepayment to secure a table. Payments are processed by Stripe, our payment partner. ${COMPANY_NAME} does not store full card numbers on our servers.`,
        ),
        text(
          "Refund eligibility depends on the restaurant's stated policy and the timing of your cancellation. Chargebacks or payment disputes may be shared with the restaurant and payment processor to resolve the claim.",
        ),
      ],
    },
    {
      id: "loyalty",
      title: "8. Loyalty program",
      blocks: [
        text(
          "Eligible completed visits may earn loyalty points that can be redeemed for discounts or perks on future bookings, as described in the Service. Points have no cash value, are non-transferable, and may expire according to program rules shown in your profile.",
        ),
        text(
          "We may change earning rates, redemption options, tiers, or end the program with reasonable notice. Abuse of the loyalty program — including fake bookings or referral fraud — may result in forfeiture of points and account suspension.",
        ),
      ],
    },
    {
      id: "content",
      title: "9. Reviews & user content",
      blocks: [
        text(
          "You may submit ratings, reviews, photos, or messages only for reservations you completed or experiences you genuinely had. Content must be truthful, relevant, and respectful.",
        ),
        text("You agree not to post content that is:"),
        {
          kind: "bullets",
          items: [
            "False, misleading, or defamatory",
            "Harassing, hateful, or discriminatory",
            "Infringing intellectual property or privacy rights",
            "Promotional spam unrelated to your visit",
          ],
        },
        text(
          `We may remove content or restrict accounts that violate these standards. You grant ${COMPANY_NAME} a non-exclusive license to display and distribute your content within the Service.`,
        ),
      ],
    },
    {
      id: "partners",
      title: "10. Restaurant partners",
      blocks: [
        text(
          `Restaurants listed on ${COMPANY_NAME} are independent businesses. They are responsible for menu accuracy, pricing, allergens, service quality, staffing, and honoring confirmed reservations within their stated policies.`,
        ),
        text(
          "Partner restaurant terms, including cancellation windows and deposit rules, are displayed at booking time and may vary by venue.",
        ),
      ],
    },
    {
      id: "conduct",
      title: "11. Acceptable use",
      blocks: [
        text("You agree not to:"),
        {
          kind: "bullets",
          items: [
            "Create fake accounts, bots, or fraudulent reservations",
            "Scrape, crawl, reverse engineer, or overload the Service",
            "Circumvent security, access controls, or rate limits",
            `Harass restaurant staff, other diners, or ${COMPANY_NAME} personnel`,
            "Use the Service for unlawful purposes or to resell bookings without authorization",
          ],
        },
      ],
    },
    {
      id: "liability",
      title: "12. Disclaimers & liability",
      blocks: [
        text(
          `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." TO THE FULLEST EXTENT PERMITTED BY LAW, ${COMPANY_NAME.toUpperCase()} DISCLAIMS WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.`,
        ),
        text(
          `We are not liable for restaurant conduct, food safety, allergic reactions, personal injury, property damage, or losses arising from your dining experience. Our total liability to you for claims relating to the Service is limited to the greater of (a) amounts you paid to ${COMPANY_NAME} in the 12 months before the claim or (b) USD $100.`,
        ),
        text(
          "Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the maximum extent permitted by law.",
        ),
      ],
    },
    {
      id: "disputes",
      title: "13. Dispute resolution",
      blocks: [
        {
          kind: "paragraph",
          segments: [
            { text: "Before filing a claim, contact us at " },
            { text: LEGAL_CONTACT.legal, link: "mailto-legal" },
            { text: " so we can try to resolve the issue informally." },
          ],
        },
        {
          kind: "paragraph",
          segments: [
            {
              text: "Except where prohibited by law, disputes arising from these Terms or the Service will be resolved through binding individual arbitration under the American Arbitration Association rules, and you waive the right to participate in class actions. You may opt out of arbitration within 30 days of account creation by emailing ",
            },
            { text: LEGAL_CONTACT.legal, link: "mailto-legal" },
            { text: "." },
          ],
        },
      ],
    },
    {
      id: "changes",
      title: "14. Changes & termination",
      blocks: [
        text(
          "We may update these Terms from time to time. Material changes will be communicated by email or in-product notice at least 30 days before they take effect, when practicable. Continued use after the effective date constitutes acceptance.",
        ),
        text(
          "You may close your account at any time. We may suspend or terminate access for violations of these Terms. Upon termination, unused loyalty points may be forfeited unless required otherwise by law.",
        ),
      ],
    },
  ],
};
