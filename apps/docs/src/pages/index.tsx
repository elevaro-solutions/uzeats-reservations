import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

type DocCard = {
  title: string;
  description: string;
  to: string;
};

const DOC_SECTIONS: DocCard[] = [
  {
    title: 'Developers',
    description: 'Local setup, monorepo layout, GraphQL API, env vars, testing, and deployment.',
    to: '/developers/getting-started',
  },
  {
    title: 'Diners',
    description: 'Discover restaurants, book tables, manage reservations, loyalty, and saved places.',
    to: '/diners/overview',
  },
  {
    title: 'Restaurant staff',
    description: 'Daily operations in the partner dashboard: reservations, floor plan, and guest messaging.',
    to: '/staff/overview',
  },
  {
    title: 'Platform admins',
    description: 'Manage restaurants, users, billing, support tickets, and platform configuration.',
    to: '/admins/platform-overview',
  },
  {
    title: 'How it works',
    description: 'Architecture, data model, auth, booking engine, notifications, and integrations.',
    to: '/architecture/overview',
  },
  {
    title: 'LLM docs',
    description: 'Context for AI coding agents: codebase map, conventions, and common tasks.',
    to: '/llm/overview',
  },
];

function DocSectionCard({title, description, to}: DocCard) {
  return (
    <Link to={to} className={styles.card}>
      <Heading as="h3" className={styles.cardTitle}>
        {title}
      </Heading>
      <p className={styles.cardDescription}>{description}</p>
    </Link>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();

  return (
    <Layout title="Home" description="Tablevera documentation">
      <header className={clsx('hero hero--primary', styles.heroBanner)}>
        <div className="container">
          <Heading as="h1" className="hero__title">
            {siteConfig.title}
          </Heading>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link className="button button--secondary button--lg" to="/developers/getting-started">
              Get started
            </Link>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <section className="container">
          <div className={styles.grid}>
            {DOC_SECTIONS.map((section) => (
              <DocSectionCard key={section.title} {...section} />
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
