'use client';

import Link from 'next/link';
import { Typography } from 'antd';
import {
  CalendarOutlined,
  CompassOutlined,
  MessageOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const PRICING_HREF = '/pricing';

const BENEFITS = [
  {
    icon: <CompassOutlined />,
    title: 'Get discovered by diners already looking to book',
    outcome: 'New covers without extra ad spend',
    description:
      'Your restaurant appears in Tablevera search, maps, city pages, and Google Reserve. Guests find you when they are ready to sit down — not when they happen to walk by.',
  },
  {
    icon: <ThunderboltOutlined />,
    title: 'Turn empty seats into confirmed tables',
    outcome: 'Higher occupancy on slow nights',
    description:
      'Live availability, waitlist alerts, and instant confirmation fill gaps the moment they open. Last-minute cancellations become someone else’s reservation instead of a dark table.',
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: 'Protect the floor from no-shows',
    outcome: 'Fewer wasted covers',
    description:
      'Deposits and card holds keep bookings honest. You only pay network cover fees when guests are seated — never for no-shows or cancellations.',
  },
  {
    icon: <CalendarOutlined />,
    title: 'Give hosts a calmer service',
    outcome: 'Less phone time, fewer double-books',
    description:
      'One dashboard for the book, the floor, and walk-ins. Staff see who is coming, where they sit, and what they asked for — without a paper log or a ringing phone.',
  },
  {
    icon: <MessageOutlined />,
    title: 'Keep guests informed without chasing them',
    outcome: 'Fewer “are we still on?” calls',
    description:
      'Automatic reminders and two-way messaging let diners confirm, change, or ask questions. Your team spends service on the room, not on texting back.',
  },
  {
    icon: <TeamOutlined />,
    title: 'Know your regulars before they walk in',
    outcome: 'Better hospitality, more return visits',
    description:
      'Guest notes, tags, and visit history help the floor greet people by name, honor preferences, and turn first-timers into regulars.',
  },
] as const;

const STORIES = [
  {
    image: '/images/partner-dining-service.jpg',
    alt: 'Guests dining in a full restaurant during evening service',
    kicker: 'More covers',
    title: 'Be the restaurant diners choose when they search tonight',
    body: 'Tablevera is where people already come to find a table. A live listing, photos, and open slots put you in that moment of decision — so you compete on hospitality, not on who has the biggest ad budget.',
    points: [
      'Shown in diner search, maps, and neighborhood pages',
      'Booking widget on your own website',
      'Google “Reserve a table” for guests already on Maps',
    ],
    reverse: false,
  },
  {
    image: '/images/partner-host-stand.jpg',
    alt: 'Host welcoming guests at a restaurant entrance',
    kicker: 'Smoother door',
    title: 'Let the host stand run the book, not the phone',
    body: 'Every reservation, waitlist name, and special request lives in one place. Hosts greet with confidence, seat faster, and stop losing tables to overlapping paper notes.',
    points: [
      'Instant confirmation for online bookings',
      'In-house and online waitlist',
      'Reminders that cut last-minute surprises',
    ],
    reverse: true,
  },
  {
    image: '/images/partner-table-set.jpg',
    alt: 'Beautifully set restaurant table ready for guests',
    kicker: 'Protected revenue',
    title: 'Make every reserved table more likely to show',
    body: 'A deposit or card hold signals a real booking. Guests who cannot come cancel in time — and you can release the table to the waitlist instead of serving an empty room.',
    points: [
      'Deposits applied to the bill',
      'No-show fees when you need them',
      'Cover fees only on seated network bookings',
    ],
    reverse: false,
  },
] as const;

export default function ForRestaurantsPage() {
  return (
    <div className="fr-page">
      <section className="fr-hero">
        <div className="fr-hero__media" aria-hidden>
          <img src="/images/partner-dining-service.jpg" alt="" />
        </div>
        <div className="fr-hero__shade" />
        <div className="fr-hero__inner">
          <span className="fr-badge">For restaurants</span>
          <Title className="fr-hero__title">
            Fill more tables.
            <span> Keep more of what you earn.</span>
          </Title>
          <Paragraph className="fr-hero__lead">
            Tablevera helps restaurants get discovered, confirm the right guests, and cut no-shows —
            so the floor stays busy and the host stand stays calm.
          </Paragraph>
          <div className="fr-hero__actions">
            <Link href={PRICING_HREF} className="fr-btn fr-btn--primary">
              Register your restaurant
            </Link>
            <a href="#benefits" className="fr-btn fr-btn--ghost">
              See how it helps
            </a>
          </div>
          <ul className="fr-hero__proof">
            <li>30-day free trial</li>
            <li>No annual contract</li>
            <li>Month-to-month plans</li>
          </ul>
        </div>
      </section>

      <section className="fr-strip" aria-label="Outcomes">
        <div className="fr-wrap fr-strip__grid">
          <div>
            <strong>More discovery</strong>
            <span>Reach diners already searching for a table</span>
          </div>
          <div>
            <strong>Fewer empty seats</strong>
            <span>Waitlist and reminders fill last-minute gaps</span>
          </div>
          <div>
            <strong>Lower no-shows</strong>
            <span>Deposits protect covers you already booked</span>
          </div>
          <div>
            <strong>Calmer service</strong>
            <span>One book for online, phone, and walk-ins</span>
          </div>
        </div>
      </section>

      <div className="fr-stories-band">
      <section className="fr-stories">
        {STORIES.map((story) => (
          <article
            key={story.title}
            className={`fr-story${story.reverse ? ' fr-story--reverse' : ''}`}
          >
            <div className="fr-story__photo">
              <img src={story.image} alt={story.alt} />
            </div>
            <div className="fr-story__copy">
              <span className="fr-kicker">{story.kicker}</span>
              <Title level={2}>{story.title}</Title>
              <Paragraph>{story.body}</Paragraph>
              <ul>
                {story.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <Link href={PRICING_HREF} className="fr-text-link">
                Register your restaurant
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="fr-gallery" aria-label="How restaurants show up on Tablevera">
        <article className="fr-gallery__item">
          <img src="/images/hero-restaurant.jpg" alt="Modern restaurant dining room ready for service" />
          <div className="fr-gallery__overlay">
            <span>Showcase the room</span>
            <strong>A listing diners want to book</strong>
            <p>Photos, hours, and live tables — so guests choose you before they walk in.</p>
          </div>
        </article>
        <article className="fr-gallery__item">
          <img src="/images/partner-chef-plating.jpg" alt="Chef plating a dish in the kitchen" />
          <div className="fr-gallery__overlay">
            <span>Protect the craft</span>
            <strong>Covers that actually show</strong>
            <p>Deposits and reminders keep the kitchen cooking for real guests, not empty seats.</p>
          </div>
        </article>
        <article className="fr-gallery__item">
          <img src="/images/partner-patio-night.jpg" alt="Evening patio dining under string lights" />
          <div className="fr-gallery__overlay">
            <span>Fill every setting</span>
            <strong>Patio, bar, and dining room</strong>
            <p>Waitlist and last-minute slots turn a slow night into a full house.</p>
          </div>
        </article>
      </section>
      </div>

      <section id="benefits" className="fr-benefits">
        <div className="fr-wrap">
          <div className="fr-section-head">
            <span className="fr-kicker">Benefits</span>
            <Title level={2}>Built around what actually moves a restaurant</Title>
            <Paragraph>
              Software should show up as more covers, fewer surprises, and a floor that runs on time —
              not another screen your team ignores.
            </Paragraph>
          </div>
          <div className="fr-benefits__grid">
            {BENEFITS.map((benefit) => (
              <article key={benefit.title} className="fr-benefit">
                <div className="fr-benefit__icon">{benefit.icon}</div>
                <Text className="fr-benefit__outcome">{benefit.outcome}</Text>
                <Title level={4}>{benefit.title}</Title>
                <Paragraph>{benefit.description}</Paragraph>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fr-closing" aria-label="Partner proof and next step">
        <article className="fr-closing__block">
          <div className="fr-closing__photo">
            <img
              src="/images/partner-chef-plating.jpg"
              alt="Chef plating a dish in the kitchen"
            />
          </div>
          <div className="fr-closing__copy">
            <span className="fr-kicker fr-kicker--on-dark">From a partner group</span>
            <blockquote className="fr-closing__quote">
              <p>
                “Tablevera makes it easy for our restaurants to be discovered by new guests while
                giving us smart marketing tools and useful data — without eating our margins.”
              </p>
              <ul>
                <li>New guests from diner search</li>
                <li>Marketing tools that don’t eat the check</li>
                <li>Useful data for the floor</li>
              </ul>
              <footer>
                <strong>Sarah Chen</strong>
                <span>Director of Operations, Metropolitan Dining Group</span>
              </footer>
            </blockquote>
          </div>
        </article>

        <article className="fr-closing__block fr-closing__block--reverse">
          <div className="fr-closing__photo">
            <img src="/images/partner-patio-night.jpg" alt="Evening patio dining under string lights" />
          </div>
          <div className="fr-closing__copy">
            <span className="fr-kicker fr-kicker--on-dark">Get started</span>
            <Title level={2}>List your restaurant. Start seating more guests.</Title>
            <Paragraph>
              Pick a plan on the pricing page, then register your venue. Every plan includes a
              30-day free trial — no annual contract.
            </Paragraph>
            <div className="fr-closing__actions">
              <Link href={PRICING_HREF} className="fr-btn fr-btn--primary">
                Choose a plan &amp; register
              </Link>
              <Link href="/contact?topic=restaurant" className="fr-closing__text-link">
                Talk to our team about multi-location
              </Link>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
