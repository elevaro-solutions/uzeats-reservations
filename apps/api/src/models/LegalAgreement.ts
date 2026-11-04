import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

export const LEGAL_AGREEMENT_KEYS = ['terms_of_use', 'partner_agreement'] as const;
export type LegalAgreementKey = (typeof LEGAL_AGREEMENT_KEYS)[number];

const legalAgreementSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: LEGAL_AGREEMENT_KEYS,
    },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    bodyHtml: { type: String, required: true },
    /** Increments each time a superadmin saves body content (starts a re-accept window). */
    version: { type: Number, required: true, default: 1, min: 1 },
    /** When the current version became effective (body save). Used for 7-day grace. */
    versionPublishedAt: { type: Date },
    updatedById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export type LegalAgreementDocument = InferSchemaType<typeof legalAgreementSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const LegalAgreement: Model<LegalAgreementDocument> =
  mongoose.models.LegalAgreement ??
  mongoose.model<LegalAgreementDocument>('LegalAgreement', legalAgreementSchema);

function section(title: string, blocks: string[]) {
  return [`<h2>${title}</h2>`, ...blocks].join('');
}

function p(text: string) {
  return `<p>${text}</p>`;
}

function ul(items: string[]) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

/** OpenTable-style diner Terms of Use (adapted for Tablevera). */
const TERMS_OF_USE_HTML = [
  '<h1>Tablevera Terms of Use</h1>',
  p(
    '<strong>Effective date:</strong> November 4, 2026. These Terms of Use (“Terms”) are a binding agreement between you and Tablevera (“Tablevera,” “we,” “us,” or “our”) governing your access to and use of tablevera.online, our mobile apps, and related diner services (collectively, the “Service”).',
  ),
  p(
    'By creating an account, making a reservation, joining a waitlist, posting a review, or otherwise using the Service, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the Service.',
  ),

  section('1. Our role', [
    p(
      'Tablevera operates an online marketplace that helps diners discover restaurants and request, book, modify, or cancel reservations, and helps restaurants manage guest demand. <strong>We are not a restaurant, caterer, or food-service provider.</strong> Restaurants that appear on the Service are independent third parties. Your dining experience, food and beverage quality, pricing, and house rules are between you and the restaurant.',
    ),
  ]),

  section('2. Eligibility and accounts', [
    p(
      'You must be at least 18 years old (or the age of majority where you live) to create an account. You agree to provide accurate registration information and keep it current so restaurants and Tablevera can reach you about bookings and account notices.',
    ),
    p(
      'You are responsible for safeguarding your password and for all activity under your account. Notify us promptly of unauthorized use. We may refuse, suspend, or close accounts that violate these Terms or create risk for diners, restaurants, or Tablevera.',
    ),
  ]),

  section('3. Reservations, waitlists, and restaurant policies', [
    p(
      'When you request or confirm a reservation (or join a waitlist), you make an offer to the restaurant under that restaurant’s availability, party-size rules, seating preferences, deposits, cancellation windows, late policies, dress codes, and other posted terms. The restaurant may accept, decline, modify, or cancel according to its policies and applicable law.',
    ),
    ul([
      'Honor the reservation time and party size you booked. If your plans change, cancel or modify as early as the restaurant’s policy allows.',
      'No-shows, late arrivals, and late cancellations may result in fees, deposits retained, or restricted booking privileges under the restaurant’s policy and these Terms.',
      'Large parties, private dining, experiences, and special events may require separate confirmation, contracts, or deposits with the restaurant.',
      'Availability shown in the Service is based on information provided by restaurants and may change without notice.',
    ]),
  ]),

  section('4. Payments, deposits, and card guarantees', [
    p(
      'Some restaurants require a deposit, prepaid experience, or card on file to hold a table. Payment processing is handled by our payment partners (for example, Stripe). Charges, refunds, and chargebacks follow the restaurant’s disclosed policy, the payment processor’s rules, and applicable law.',
    ),
    p(
      'By providing a payment method, you authorize charges described at checkout or in the restaurant’s policy (including no-show or late-cancellation fees when disclosed). Tablevera does not guarantee that every restaurant will refund deposits outside its stated rules.',
    ),
  ]),

  section('5. Loyalty, referrals, and promotions', [
    p(
      'Tablevera may offer loyalty points, tiers, referral rewards, or promotional offers. Program rules, point values, expiration, and redemption limits may change. Abuse (including fake accounts, fraudulent referrals, or fabricated reviews) may forfeit rewards and lead to account suspension.',
    ),
  ]),

  section('6. Communications', [
    p(
      'We and participating restaurants may send transactional messages about your account, reservations, waitlists, and security (email, SMS, push, or in-app). Marketing messages require applicable consent; you can opt out of marketing as described in the message or your account settings. Transactional booking messages may still be sent when needed to fulfill a reservation.',
    ),
    p(
      'Standard message and data rates may apply for SMS. Message frequency varies. Reply STOP to opt out of SMS where supported; HELP for help. See our SMS terms for additional details.',
    ),
  ]),

  section('7. Reviews and user content', [
    p(
      'You may post reviews, photos, and other content (“User Content”). You retain ownership of your User Content, and you grant Tablevera a worldwide, non-exclusive, royalty-free license to host, use, reproduce, modify (for formatting), publish, and display it in connection with the Service and our marketing of the Service.',
    ),
    p(
      'You represent that your User Content is accurate to the best of your knowledge, that you have the rights to post it, and that it does not violate law or third-party rights. Do not post defamatory, harassing, obscene, discriminatory, or infringing content, or content that discloses others’ private information. We may remove or hide content and may share reports with restaurants or authorities when appropriate.',
    ),
  ]),

  section('8. Acceptable use', [
    p('You agree not to:'),
    ul([
      'Use the Service for unlawful purposes, harassment, or spam',
      'Create fake reservations, scrape, crawl, or harvest data without our written permission',
      'Circumvent booking limits, security controls, or restaurant inventory rules',
      'Impersonate others or misrepresent your affiliation',
      'Interfere with or reverse-engineer the Service except to the extent permitted by law',
      'Use automated means to book or cancel in a way that harms restaurants or other diners',
    ]),
  ]),

  section('9. Intellectual property', [
    p(
      'The Service, including software, design, trademarks, and Tablevera branding, is owned by Tablevera or its licensors. Restaurants retain rights in their names, logos, menus, and photos, which appear under license. These Terms do not transfer ownership of any intellectual property to you.',
    ),
  ]),

  section('10. Third-party services', [
    p(
      'The Service may link to maps, payment processors, app stores, social networks, or other third parties. Their terms and privacy practices apply to those services. Tablevera is not responsible for third-party sites or services.',
    ),
  ]),

  section('11. Disclaimers', [
    p(
      'THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, TABLEVERA DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT RESTAURANT INFORMATION OR AVAILABILITY IS COMPLETE OR CURRENT.',
    ),
  ]),

  section('12. Limitation of liability', [
    p(
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, TABLEVERA AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE OR ANY RESTAURANT EXPERIENCE.',
    ),
    p(
      'OUR TOTAL LIABILITY FOR CLAIMS RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID TO TABLEVERA FOR THE SERVICE IN THE TWELVE (12) MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS (US $100). SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN THOSE CASES, OUR LIABILITY IS LIMITED TO THE FULLEST EXTENT PERMITTED BY LAW.',
    ),
  ]),

  section('13. Indemnity', [
    p(
      'You agree to defend, indemnify, and hold harmless Tablevera and its affiliates from claims, damages, losses, and expenses (including reasonable attorneys’ fees) arising out of your User Content, your misuse of the Service, your breach of these Terms, or your violation of law or third-party rights.',
    ),
  ]),

  section('14. Dispute resolution and governing law', [
    p(
      'These Terms are governed by the laws of the Commonwealth of Virginia, USA, without regard to conflict-of-law rules. Except where prohibited, you and Tablevera agree to resolve disputes through good-faith negotiation first. If unresolved, exclusive venue for litigation is the state or federal courts located in Virginia, and you consent to personal jurisdiction there, unless applicable consumer law requires otherwise.',
    ),
    p(
      'You may only bring claims in your individual capacity, not as a plaintiff or class member in any class or representative proceeding, to the extent permitted by law.',
    ),
  ]),

  section('15. Changes and termination', [
    p(
      'We may update these Terms from time to time. The effective date above (or a notice in the Service) will reflect material changes. Continued use after changes become effective constitutes acceptance for future use. We may suspend or terminate access to the Service at any time for violation of these Terms or to protect the platform. You may stop using the Service and delete your account as described in the Service.',
    ),
  ]),

  section('16. Contact', [
    p(
      'Questions about these Terms: <a href="mailto:support@tablevera.online">support@tablevera.online</a> · +1 (650) 770-7788 · Tablevera, 20844 Waterbeach Place, Sterling, VA 20165, USA.',
    ),
  ]),
].join('');

/** OpenTable-style restaurant / partner network agreement (adapted for Tablevera). */
const PARTNER_AGREEMENT_HTML = [
  '<h1>Tablevera Restaurant Partner Agreement</h1>',
  p(
    '<strong>Effective date:</strong> November 4, 2026. This Restaurant Partner Agreement (“Agreement”) is between Tablevera (“Tablevera,” “we,” “us,” or “our”) and the restaurant, hospitality group, or other venue (“Partner,” “you”) that registers for Partner Hub or otherwise enables Tablevera’s reservation and guest-management services.',
  ),
  p(
    'By creating a partner account, adding a venue, or clicking to accept, you agree to this Agreement on behalf of Partner and represent that you have authority to bind Partner. If you do not agree, do not use Partner Hub.',
  ),

  section('1. Platform services', [
    p(
      'Tablevera provides software and related services that may include online reservations, waitlists, guest messaging, floor and shift tools, reviews, loyalty features, billing, analytics, and optional add-ons (collectively, “Platform Services”). Tablevera may improve, modify, or discontinue features with reasonable notice when practicable.',
    ),
    p(
      'Partner remains solely responsible for its premises, staff, licenses, food and beverage, guest safety, accessibility accommodations it offers, and the in-restaurant experience. Tablevera does not employ Partner’s staff and does not control day-of seating decisions beyond tools Partner configures.',
    ),
  ]),

  section('2. Network participation and inventory', [
    p(
      'Partner authorizes Tablevera to display Partner’s listing (name, location, photos, menus, hours, policies, and availability Partner supplies) to diners on Tablevera websites, apps, and partner channels Partner enables.',
    ),
    ul([
      'Keep availability, party-size rules, hours, blackouts, and special events accurate so diners are not misled.',
      'Honor accepted reservations and waitlist offers in good faith, consistent with the policies shown to guests at booking time.',
      'Do not systematically overbook or withhold inventory in a way that intentionally frustrates confirmed guests without a legitimate operational reason.',
      'Promptly update closures, renovations, and service interruptions in Partner Hub.',
    ]),
  ]),

  section('3. Guest experience standards', [
    p(
      'Partner will treat Tablevera guests with the same care as other patrons. Partner will not discriminate against guests based on protected characteristics under applicable law. Partner will apply posted cancellation, deposit, and no-show policies consistently and disclose material rules before booking is confirmed.',
    ),
    p(
      'Partner will not require guests who booked through Tablevera to waive rights or pay undisclosed fees that conflict with information shown at booking, except as required by law or clearly disclosed before confirmation.',
    ),
  ]),

  section('4. Guest data and marketing', [
    p(
      'Guest personal data provided through Platform Services (names, contact details, reservation history, preferences, and related records) may be used by Partner only to provide hospitality services, honor reservations, handle incidents, and comply with law. Partner will not sell, rent, or share Tablevera guest data with third parties for their independent marketing, except with guest consent or as required by law.',
    ),
    p(
      'Partner is responsible for lawful use of SMS, email, and other marketing it initiates outside Tablevera-controlled flows, including obtaining and honoring consents. Partner will implement reasonable security measures to protect guest data and notify Tablevera promptly of any breach affecting Tablevera guest data.',
    ),
  ]),

  section('5. Fees, billing, and taxes', [
    p(
      'Partner agrees to pay subscription fees, per-cover or network fees, SMS credits, add-ons, and other charges for the plan and products Partner selects, as shown in Partner Hub, an order form, or pricing disclosures at signup. Fees may change for renewal periods with notice as described in Partner Hub or billing communications.',
    ),
    ul([
      'Invoices are due as stated. Late or failed payments may incur finance charges, listing restrictions, Partner Hub limits, or suspension as described in our billing policies.',
      'Partner is responsible for taxes arising from its sales of food, beverage, and experiences. Platform fees may exclude applicable taxes, which Partner pays when required.',
      'Chargebacks or payment disputes related to guest deposits or no-show fees are handled under processor rules and Partner’s guest policy; Partner remains responsible for amounts owed to Tablevera for Platform Services.',
    ]),
  ]),

  section('6. Content, branding, and intellectual property', [
    p(
      'Partner grants Tablevera a non-exclusive license to use Partner’s name, logos, photos, menus, descriptions, and related content to operate and promote the listing and Platform Services. Partner represents it owns or has rights to all content it uploads and that such content is accurate and lawful.',
    ),
    p(
      'Tablevera and its licensors retain all rights in the Platform Services, software, and Tablevera trademarks. Partner will not copy, reverse engineer, or create competing services from Tablevera’s confidential interfaces or documentation except as permitted by law.',
    ),
  ]),

  section('7. Non-circumvention and fair use', [
    p(
      'During the term, Partner will not knowingly divert Tablevera-originated reservations offline solely to avoid platform fees while continuing to benefit from Tablevera discovery, except for ordinary guest relationship management after a visit. Partner will not scrape diner data from Tablevera interfaces or use the Platform Services to build a competing reservation network.',
    ),
  ]),

  section('8. Compliance and insurance', [
    p(
      'Partner will comply with all applicable laws, including health, alcohol, employment, consumer protection, accessibility, privacy, and advertising rules. Partner will maintain commercially reasonable insurance customary for its industry (including general liability) and will provide certificates upon reasonable request.',
    ),
  ]),

  section('9. Confidentiality', [
    p(
      'Each party will protect the other’s non-public business, technical, and guest information with reasonable care and use it only to perform under this Agreement, except for information that is public, independently developed, or required to be disclosed by law (with notice when legally permitted).',
    ),
  ]),

  section('10. Representations', [
    p(
      'Partner represents that it is duly organized, has authority to enter this Agreement, holds licenses required to operate its venues, and that information it provides to Tablevera is materially accurate. Tablevera represents that it will provide Platform Services in a professional manner consistent with industry standards for SaaS reservation platforms.',
    ),
  ]),

  section('11. Indemnification', [
    p(
      'Partner will defend and indemnify Tablevera against third-party claims arising from Partner’s venues, food and beverage, staff conduct, guest injuries at Partner premises, Partner content, Partner’s misuse of guest data, or Partner’s breach of this Agreement or law, except to the extent caused by Tablevera’s willful misconduct.',
    ),
    p(
      'Tablevera will defend and indemnify Partner against third-party claims that the unmodified Platform Services infringe a U.S. intellectual-property right, provided Partner gives prompt notice and reasonable cooperation. Tablevera may modify, replace, or terminate the affected feature if needed.',
    ),
  ]),

  section('12. Disclaimers and limitation of liability', [
    p(
      'PLATFORM SERVICES ARE PROVIDED “AS IS.” EXCEPT AS EXPRESSLY STATED, TABLEVERA DISCLAIMS IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. TABLEVERA DOES NOT GUARANTEE UNINTERRUPTED UPTIME, A PARTICULAR VOLUME OF BOOKINGS, OR THAT EVERY GUEST WILL HONOR A RESERVATION.',
    ),
    p(
      'EXCEPT FOR PARTNER’S PAYMENT OBLIGATIONS, INDEMNITY OBLIGATIONS, OR LIABILITY THAT CANNOT BE LIMITED BY LAW, EACH PARTY’S AGGREGATE LIABILITY UNDER THIS AGREEMENT IS LIMITED TO THE FEES PAID OR PAYABLE BY PARTNER TO TABLEVERA FOR THE AFFECTED VENUE IN THE TWELVE (12) MONTHS BEFORE THE CLAIM. NEITHER PARTY IS LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR LOST-PROFITS DAMAGES.',
    ),
  ]),

  section('13. Term, suspension, and termination', [
    p(
      'This Agreement starts when Partner accepts it and continues while Partner uses Platform Services for any venue. Either party may terminate according to the subscription plan terms (including notice periods) or for material breach not cured within thirty (30) days after written notice (shorter for non-payment as stated in billing policies).',
    ),
    p(
      'Tablevera may suspend access immediately for non-payment, security risk, legal compliance, or material guest-harm risk. Upon termination, Partner remains responsible for outstanding fees. Sections that by nature should survive (fees owed, IP, confidentiality, indemnity, liability limits) survive termination.',
    ),
  ]),

  section('14. Changes', [
    p(
      'Tablevera may update this Agreement for new signups at any time. For existing Partners, material changes will be posted in Partner Hub or emailed; continued use after the effective date constitutes acceptance unless Partner terminates as allowed under its plan. The version accepted at signup is recorded with Partner’s account.',
    ),
  ]),

  section('15. General', [
    p(
      'This Agreement is governed by the laws of the Commonwealth of Virginia, USA. Exclusive venue for disputes is the state or federal courts in Virginia, unless applicable law requires otherwise. Partner may not assign this Agreement without Tablevera’s consent, except to a successor of substantially all assets with notice. Tablevera may assign to an affiliate or acquirer. If any provision is unenforceable, the remainder stays in effect. This Agreement, together with plan terms and policies referenced in Partner Hub, is the entire agreement regarding Platform Services and supersedes prior negotiations on that subject.',
    ),
  ]),

  section('16. Contact', [
    p(
      'Legal notices: <a href="mailto:support@tablevera.online">support@tablevera.online</a> · +1 (650) 770-7788 · Tablevera, 20844 Waterbeach Place, Sterling, VA 20165, USA. Billing and product support: Partner Hub → Support.',
    ),
  ]),
].join('');

export const DEFAULT_LEGAL_AGREEMENTS: Array<{
  key: LegalAgreementKey;
  name: string;
  description: string;
  bodyHtml: string;
}> = [
  {
    key: 'terms_of_use',
    name: 'Terms of Use',
    description:
      'Diner terms (OpenTable-style): marketplace role, reservations, payments, reviews, liability. Required at Create account.',
    bodyHtml: TERMS_OF_USE_HTML,
  },
  {
    key: 'partner_agreement',
    name: 'Restaurant Partner Agreement',
    description:
      'Restaurant network agreement (OpenTable-style): inventory, guest data, fees, standards. Required at Partner Hub signup.',
    bodyHtml: PARTNER_AGREEMENT_HTML,
  },
];
