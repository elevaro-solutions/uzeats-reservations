export type HelpFaqItem = {
  question: string;
  answer: string;
};

/** Mirrors apps/web/src/lib/legal.ts — keep in sync manually. */
export const HELP_SUPPORT_EMAIL = "support@tablevera.online";
export const HELP_PHONE_E164 = "+16507707788";
export const HELP_PHONE_DISPLAY = "+1 (650) 770-7788";
export const HELP_WEBSITE_URL = "https://tablevera.online";
export const HELP_WEBSITE_LABEL = "tablevera.online";
export const HELP_INSTAGRAM_URL = "https://www.instagram.com/tablevera.online/";
export const HELP_INSTAGRAM_HANDLE = "@tablevera.online";
export const HELP_ADDRESS = {
  line1: "20844 Waterbeach Place",
  city: "Sterling",
  state: "VA",
  zip: "20165",
  country: "USA",
} as const;
export const HELP_ADDRESS_DISPLAY =
  `${HELP_ADDRESS.line1}, ${HELP_ADDRESS.city}, ${HELP_ADDRESS.state} ${HELP_ADDRESS.zip}, ${HELP_ADDRESS.country}`;

export const HELP_FAQ_ITEMS: HelpFaqItem[] = [
  {
    question: "How do I make a reservation?",
    answer:
      "Browse or search for a restaurant, then choose your party size, date, and time from available slots. You can add an occasion or restaurant packages if offered. Sign in for a smoother checkout, then confirm — some restaurants require a deposit before your booking is finalized.",
  },
  {
    question: "How do I change or cancel a reservation?",
    answer:
      "Open Reservations, select your booking, and use Edit or Cancel when the restaurant allows it. If those options aren’t available, contact the restaurant from the reservation detail screen — they set their own change and cancellation windows.",
  },
  {
    question: "Who should I contact about my booking?",
    answer:
      "Reach out to the restaurant for seating, menu, accessibility, late arrival, deposits, fees, or refunds — use Message or Call on your reservation detail. Contact Tablevera support for account or app issues using the details below.",
  },
  {
    question: "What if no tables are available?",
    answer:
      "If the times you want aren’t listed, the restaurant may be fully booked online. Join the waitlist when offered, or save the restaurant to Favorites and turn on availability alerts so you’re notified when a matching table opens up.",
  },
  {
    question: "What are deposits and cancellation fees?",
    answer:
      "Deposits, no-show charges, and late-cancellation policies are set by each restaurant. Review their terms during booking and on your reservation detail. For questions about a charge or refund, contact the restaurant directly.",
  },
  {
    question: "How do favorites work?",
    answer:
      "Tap the heart on any restaurant to save it. Your saved spots live under Favorites in Profile for quick rebooking. You can also opt into availability alerts for favorites when that option is offered.",
  },
  {
    question: "How does loyalty work?",
    answer:
      "Tablevera awards points for completed visits. Your balance, tier, and referral code appear in Profile. Points may expire per program rules, and some restaurants also run their own loyalty perks.",
  },
  {
    question: "How quickly will support reply?",
    answer:
      "We aim to respond to general and support inquiries within 1–2 business days. Email support@tablevera.online and include your reservation ID when the question is about a booking.",
  },
];
