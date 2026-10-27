'use client';

import Link from 'next/link';
import { CheckCircleFilled, CrownFilled, SearchOutlined } from '@ant-design/icons';
import { loyaltyRedeemProgress, type LoyaltyProgram } from '@reservations/shared';
import { formatPoints, formatPointsValue, loyaltyTierClass } from './loyaltyFormat';

export interface LoyaltyHeroCardProps {
  points: number;
  tierId: string;
  tierName: string;
  expiresAt?: string | null;
  program: LoyaltyProgram;
}

export function LoyaltyHeroCard({ points, tierId, tierName, expiresAt, program }: LoyaltyHeroCardProps) {
  const progress = loyaltyRedeemProgress(points, program.minRedeemPoints);
  const expiryDate = expiresAt ? new Date(expiresAt) : null;
  const hasExpiry = Boolean(expiryDate && Number.isFinite(expiryDate.getTime()));

  return (
    <section component="LoyaltyHeroCard" className="rt-loyalty-hero" aria-label="Your points balance">
      <div className="rt-loyalty-hero__top">
        <p className="rt-loyalty-hero__label">Your points</p>
        <span className={`rt-loyalty-tier-pill ${loyaltyTierClass(tierId)}`}>
          <CrownFilled aria-hidden />
          {tierName} member
        </span>
      </div>

      <div className="rt-loyalty-hero__balance">
        <span className="rt-loyalty-hero__value">{formatPoints(points)}</span>
        <span className="rt-loyalty-hero__unit">pts</span>
      </div>

      <dl className="rt-loyalty-hero__facts">
        <div className="rt-loyalty-hero__fact">
          <dt>Worth</dt>
          <dd>
            <strong className="rt-loyalty-hero__money">
              {formatPointsValue(points, program.redeemPointsPerDollar)}
            </strong>{' '}
            off deposits
          </dd>
        </div>
        <div className="rt-loyalty-hero__fact">
          <dt>Status</dt>
          {progress.canRedeem ? (
            <dd className="rt-loyalty-hero__ready">
              <CheckCircleFilled aria-hidden />
              Ready to redeem
            </dd>
          ) : (
            <dd>
              {formatPoints(progress.remaining)} pts to go
              <div
                className="rt-loyalty-progress rt-loyalty-progress--inverse rt-loyalty-hero__mini-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={progress.target}
                aria-valuenow={points}
                aria-label={`Progress to the ${formatPoints(progress.target)} pt redeem minimum`}
              >
                <div className="rt-loyalty-progress__fill" style={{ width: `${progress.percent}%` }} />
              </div>
            </dd>
          )}
        </div>
        {hasExpiry && expiryDate ? (
          <div className="rt-loyalty-hero__fact">
            <dt>Next expiry</dt>
            <dd>{expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</dd>
          </div>
        ) : null}
      </dl>

      <div className="rt-loyalty-hero__footer">
        <p>
          {progress.canRedeem
            ? 'Apply your points at checkout when you book a table that takes a deposit.'
            : `You can redeem from ${formatPoints(progress.target)} pts, at checkout on bookings that take a deposit.`}
        </p>
        <Link href="/" className="rt-loyalty-hero__cta">
          <SearchOutlined aria-hidden />
          Find a table
        </Link>
      </div>
    </section>
  );
}
