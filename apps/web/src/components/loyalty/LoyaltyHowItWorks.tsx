'use client';

import { Collapse } from 'antd';
import { ClockCircleOutlined, CrownOutlined, DownOutlined, PlusCircleOutlined, TagOutlined } from '@ant-design/icons';
import type { LoyaltyProgram } from '@reservations/shared';
import { formatMultiplier, formatPoints, formatPointsValue } from './loyaltyFormat';

export interface LoyaltyHowItWorksProps {
  program: LoyaltyProgram;
}

export function LoyaltyHowItWorks({ program }: LoyaltyHowItWorksProps) {
  const tiers = [...program.tiers].sort((a, b) => a.minVisits - b.minVisits);
  const topTier = tiers[tiers.length - 1];
  const minValue = formatPointsValue(program.minRedeemPoints, program.redeemPointsPerDollar);
  const expires = program.pointsExpiryMonths > 0;

  const earnBits = [
    `${formatPoints(program.pointsPerCompletedVisit)} pts for every completed visit`,
    program.pointsPerDollarDeposit > 0
      ? `${formatPoints(program.pointsPerDollarDeposit)} ${program.pointsPerDollarDeposit === 1 ? 'pt' : 'pts'} per $1 of deposit paid`
      : null,
    program.firstBookingBonusPoints > 0
      ? `${formatPoints(program.firstBookingBonusPoints)} pts bonus on your first booking`
      : null,
    program.pointsPerReview > 0 ? `${formatPoints(program.pointsPerReview)} pts for each review` : null,
  ].filter(Boolean) as string[];

  const steps = [
    {
      key: 'earn',
      icon: <PlusCircleOutlined />,
      title: 'Earn',
      body: (
        <ul className="rt-loyalty-how__bullets">
          {earnBits.map((bit) => (
            <li key={bit}>{bit}</li>
          ))}
        </ul>
      ),
    },
    {
      key: 'redeem',
      icon: <TagOutlined />,
      title: 'Redeem',
      body: (
        <p>
          {formatPoints(program.redeemPointsPerDollar)} pts = $1 off a booking deposit. Once you have{' '}
          {formatPoints(program.minRedeemPoints)} pts ({minValue}), choose how many to use when you book a table
          that takes a deposit.
        </p>
      ),
    },
    {
      key: 'tiers',
      icon: <CrownOutlined />,
      title: 'Level up',
      body: (
        <p>
          Completed visits move you up through {tiers.map((tier) => tier.name).join(', ')}. Each tier multiplies
          the points you earn per visit
          {topTier ? `, up to ${formatMultiplier(topTier.earnMultiplier)} at ${topTier.name}` : ''}.
        </p>
      ),
    },
    {
      key: 'expiry',
      icon: <ClockCircleOutlined />,
      title: 'Keep them fresh',
      body: (
        <p>
          {expires
            ? `Points expire ${program.pointsExpiryMonths} months after you earn them. When you redeem, your oldest points are used first.`
            : 'Your points don’t expire.'}
        </p>
      ),
    },
  ];

  const faq = [
    {
      key: 'when',
      label: 'When do my points show up?',
      children: (
        <p>
          Visit points are added after the restaurant marks your reservation as completed. Deposit points are
          added when your deposit is paid, and review points when you submit a review.
        </p>
      ),
    },
    {
      key: 'cancel',
      label: 'What happens if I cancel a booking?',
      children: (
        <p>
          Points you used on that booking go back to your balance. Points earned from its deposit are removed.
        </p>
      ),
    },
    {
      key: 'nodeposit',
      label: 'Can I use points on a booking without a deposit?',
      children: (
        <p>
          Not yet. Points are applied as a discount on the deposit, so the option appears only when a booking
          requires one.
        </p>
      ),
    },
    {
      key: 'restaurant',
      label: 'How are restaurant rewards different?',
      children: (
        <p>
          Tablevera points work at every restaurant on Tablevera. Restaurant rewards are run by individual
          restaurants and can only be used at the restaurant where you earned them.
        </p>
      ),
    },
  ];

  return (
    <section component="LoyaltyHowItWorks" className="rt-loyalty-card" aria-labelledby="loyalty-how-title">
      <header className="rt-loyalty-card__header">
        <div>
          <h2 id="loyalty-how-title" className="rt-loyalty-card__title">How Tablevera rewards work</h2>
          <p className="rt-loyalty-card__subtitle">Book, dine, and earn points you can use on future bookings.</p>
        </div>
      </header>

      <ol className="rt-loyalty-how">
        {steps.map((step) => (
          <li key={step.key} className="rt-loyalty-how__step">
            <span className="rt-loyalty-how__icon" aria-hidden>
              {step.icon}
            </span>
            <div className="rt-loyalty-how__body">
              <strong>{step.title}</strong>
              {step.body}
            </div>
          </li>
        ))}
      </ol>

      <div className="rt-loyalty-faq">
        <h3 className="rt-loyalty-faq__title">Common questions</h3>
        <Collapse
          bordered={false}
          className="rt-loyalty-faq__list"
          expandIconPlacement="end"
          expandIcon={({ isActive }) => (
            <span className={`rt-loyalty-faq__chevron${isActive ? ' is-open' : ''}`} aria-hidden>
              <DownOutlined />
            </span>
          )}
          items={faq}
        />
      </div>
    </section>
  );
}
