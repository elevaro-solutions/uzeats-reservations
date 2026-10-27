'use client';

import { CheckOutlined, CrownFilled, LockOutlined } from '@ant-design/icons';
import { resolveLoyaltyTier, type LoyaltyTierDef } from '@reservations/shared';
import { formatMultiplier, loyaltyTierClass } from './loyaltyFormat';

export interface LoyaltyTierLadderProps {
  completedVisits: number;
  tiers: readonly LoyaltyTierDef[];
  pointsPerCompletedVisit: number;
}

export function LoyaltyTierLadder({ completedVisits, tiers, pointsPerCompletedVisit }: LoyaltyTierLadderProps) {
  const sorted = [...tiers].sort((a, b) => a.minVisits - b.minVisits);
  const current = resolveLoyaltyTier(completedVisits, sorted);
  const currentIdx = Math.max(0, sorted.findIndex((tier) => tier.id === current.id));
  const next = current.nextTier;

  const partial = next
    ? Math.min(1, Math.max(0, (completedVisits - current.minVisits) / Math.max(1, next.minVisits - current.minVisits)))
    : 0;
  const fillPercent = sorted.length > 1 ? ((currentIdx + partial) / (sorted.length - 1)) * 100 : 100;
  const visitWord = (count: number) => (count === 1 ? 'visit' : 'visits');

  return (
    <section component="LoyaltyTierLadder" className="rt-loyalty-card" aria-labelledby="loyalty-status-title">
      <header className="rt-loyalty-card__header">
        <div>
          <h2 id="loyalty-status-title" className="rt-loyalty-card__title">Your status</h2>
          <p className="rt-loyalty-card__subtitle">
            Tiers are based on completed visits. Higher tiers earn more points on every visit.
          </p>
        </div>
      </header>

      <div
        className={`rt-loyalty-ladder ${loyaltyTierClass(current.id)}`}
        style={{ ['--rt-loyalty-steps' as string]: sorted.length }}
      >
        <div className="rt-loyalty-ladder__inner">
          <div className="rt-loyalty-ladder__track" aria-hidden>
            <div className="rt-loyalty-ladder__fill" style={{ width: `${fillPercent}%` }} />
          </div>
          <ol className="rt-loyalty-ladder__steps">
            {sorted.map((tier, idx) => {
              const state = idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : 'locked';
              return (
                <li
                  key={tier.id}
                  className={`rt-loyalty-ladder__step rt-loyalty-ladder__step--${state}`}
                  aria-current={state === 'current' ? 'step' : undefined}
                >
                  <span className="rt-loyalty-ladder__medal">
                    {state === 'done' ? (
                      <CheckOutlined aria-hidden />
                    ) : state === 'current' ? (
                      <CrownFilled aria-hidden />
                    ) : (
                      <LockOutlined aria-hidden />
                    )}
                  </span>
                  <span className="rt-loyalty-ladder__name">{tier.name}</span>
                  <span className="rt-loyalty-ladder__req">
                    {tier.minVisits === 0 ? 'Starting tier' : `${tier.minVisits}+ ${visitWord(tier.minVisits)}`}
                  </span>
                  <span className="rt-loyalty-ladder__perk">{formatMultiplier(tier.earnMultiplier)} points</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className={`rt-loyalty-ladder__caption ${loyaltyTierClass(current.id)}`}>
        <CrownFilled aria-hidden className="rt-loyalty-ladder__caption-icon" />
        <div>
          <strong>You&apos;re a {current.name} member</strong>
          <span>
            {next && current.visitsToNextTier != null
              ? `${current.visitsToNextTier} more completed ${visitWord(current.visitsToNextTier)} to reach ${next.name} and earn ${Math.round(pointsPerCompletedVisit * next.earnMultiplier)} pts per visit.`
              : `You're at the top tier, earning ${Math.round(pointsPerCompletedVisit * current.earnMultiplier)} pts on every completed visit.`}
          </span>
        </div>
      </div>
    </section>
  );
}
