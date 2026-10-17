import Link from 'next/link';
import { AppStoreBadges } from '@reservations/ui';
import { MOBILE_APPS } from '@reservations/shared';
import { BRAND_DOWNLOADS } from '@/lib/brandKit';

const APPS = [MOBILE_APPS.diner, MOBILE_APPS.partner] as const;

export default function DownloadsPage() {
  return (
    <div className="rt-downloads">
      <header className="rt-downloads__hero">
        <p className="rt-downloads__kicker">Downloads</p>
        <h1>Apps and brand kit</h1>
        <p className="rt-downloads__lead">
          Android apps are on Google Play. The iPhone apps are coming soon. Logos, icons, and store
          graphics are free to download.
        </p>
      </header>

      <section className="rt-downloads__apps" aria-label="Mobile apps">
        {APPS.map((app) => (
          <article key={app.id} id={app.id} className="rt-downloads__app">
            <p className="rt-downloads__kicker">{app.audience}</p>
            <h2>{app.name}</h2>
            <p>{app.blurb}</p>
            <AppStoreBadges app={app.id} tone="light" />
          </article>
        ))}
      </section>

      <section className="rt-downloads__brand" aria-labelledby="brand-kit-heading">
        <div className="rt-downloads__brand-head">
          <h2 id="brand-kit-heading">Brand kit</h2>
          <p>Forest, gold, and cream. Use the color logo on light backgrounds and the white logo on forest.</p>
        </div>
        {BRAND_DOWNLOADS.map((group) => (
          <div key={group.id} className="rt-downloads__group">
            <h3>{group.title}</h3>
            <ul>
              {group.items.map((item) => (
                <li key={item.href}>
                  <a className="rt-downloads__asset" href={item.href} download={item.filename}>
                    <span className={`rt-downloads__preview rt-downloads__preview--${item.surface}`}>
                      <img src={item.preview} alt="" />
                    </span>
                    <span className="rt-downloads__asset-copy">
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </span>
                    <span className="rt-downloads__asset-action">Download</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <p className="rt-downloads__footnote">
        Restaurant partners can also open the{' '}
        <Link href="/for-restaurants">partner overview</Link> or{' '}
        <Link href="/pricing">pricing</Link>.
      </p>
    </div>
  );
}
