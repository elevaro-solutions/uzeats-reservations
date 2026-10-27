'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { Skeleton } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, RiseOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { PageHeader, StatCard } from '@reservations/ui';
import { defaultLoyaltyProgram, resolveLoyaltyTier, type LoyaltyProgram } from '@reservations/shared';
import { useAuth } from '@/lib/auth';
import { LOYALTY_PROGRAM, MY_LOYALTY, MY_RESTAURANT_LOYALTY } from '@/lib/graphql';
import { sumEarnedPoints, type LoyaltyTransactionItem } from '@/lib/loyaltyHistory';
import { LoyaltyHeroCard } from '@/components/loyalty/LoyaltyHeroCard';
import { LoyaltyTierLadder } from '@/components/loyalty/LoyaltyTierLadder';
import { LoyaltyReferralCard } from '@/components/loyalty/LoyaltyReferralCard';
import {
  LoyaltyRestaurantRewards,
  type RestaurantLoyaltyActivityItem,
  type RestaurantLoyaltyBalanceItem,
} from '@/components/loyalty/LoyaltyRestaurantRewards';
import { LoyaltyHistory } from '@/components/loyalty/LoyaltyHistory';
import { LoyaltyHowItWorks } from '@/components/loyalty/LoyaltyHowItWorks';
import { formatMultiplier, formatPoints } from '@/components/loyalty/loyaltyFormat';

type MyLoyaltyData = { myLoyalty: LoyaltyTransactionItem[] };
type MyRestaurantLoyaltyData = {
  myRestaurantLoyalty: RestaurantLoyaltyBalanceItem[];
  myRestaurantLoyaltyHistory: RestaurantLoyaltyActivityItem[];
};
type LoyaltyProgramData = { loyaltyProgram: LoyaltyProgram };

function LoyaltyPageSkeleton() {
  return (
    <div className="rt-loyalty-page" aria-busy="true">
      <div className="rt-loyalty-skeleton rt-loyalty-skeleton--hero" />
      <div className="rt-loyalty-stats">
        {[0, 1, 2].map((key) => (
          <div key={key} className="rt-loyalty-skeleton rt-loyalty-skeleton--stat" />
        ))}
      </div>
      <div className="rt-loyalty-card">
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    </div>
  );
}

export default function LoyaltyPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data: historyData, loading: historyLoading } = useQuery<MyLoyaltyData>(MY_LOYALTY, {
    skip: !user,
    fetchPolicy: 'cache-and-network',
  });
  const { data: restaurantData } = useQuery<MyRestaurantLoyaltyData>(MY_RESTAURANT_LOYALTY, {
    skip: !user,
    fetchPolicy: 'cache-and-network',
  });
  const { data: programData, loading: programLoading } = useQuery<LoyaltyProgramData>(LOYALTY_PROGRAM);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login?next=/profile/loyalty');
  }, [authLoading, user, router]);

  const header = (
    <PageHeader
      back={
        <Link href="/profile" className="rt-loyalty-back">
          <ArrowLeftOutlined aria-hidden /> Profile
        </Link>
      }
      title="Loyalty & rewards"
      subtitle="Your points, status, and everything you can earn on Tablevera"
    />
  );

  if (authLoading || !user || (programLoading && !programData)) {
    return (
      <div component="LoyaltyPage" style={{ display: 'contents' }}>
        <div className="rt-loyalty-shell">
          {header}
          <LoyaltyPageSkeleton />
        </div>
      </div>
    );
  }

  const program = programData?.loyaltyProgram ?? defaultLoyaltyProgram();
  const visits = user.loyaltyCompletedVisits ?? 0;
  const tier = resolveLoyaltyTier(visits, program.tiers);
  const history = historyData?.myLoyalty ?? [];
  const earnedRecently = sumEarnedPoints(history);

  return (
    <div component="LoyaltyPage" style={{ display: 'contents' }}>
      <div className="rt-loyalty-shell">
        {header}
        <div className="rt-loyalty-page">
          <LoyaltyHeroCard
            points={user.loyaltyPoints ?? 0}
            tierId={user.loyaltyTier ?? tier.id}
            tierName={user.loyaltyTierName ?? tier.name}
            expiresAt={user.loyaltyPointsExpireAt}
            program={program}
          />

          <div className="rt-loyalty-stats">
            <StatCard
              label="Completed visits"
              value={formatPoints(visits)}
              icon={<CalendarOutlined />}
              hint={
                tier.visitsToNextTier != null && tier.nextTier
                  ? `${tier.visitsToNextTier} to ${tier.nextTier.name}`
                  : 'Top tier reached'
              }
            />
            <StatCard
              label="Points earned"
              value={historyLoading && !historyData ? '—' : formatPoints(earnedRecently)}
              icon={<RiseOutlined />}
              hint="Recent activity"
            />
            <StatCard
              label="Earn rate"
              value={formatMultiplier(tier.earnMultiplier)}
              icon={<ThunderboltOutlined />}
              hint={`${formatPoints(Math.round(program.pointsPerCompletedVisit * tier.earnMultiplier))} pts per visit`}
            />
          </div>

          <LoyaltyTierLadder
            completedVisits={visits}
            tiers={program.tiers}
            pointsPerCompletedVisit={program.pointsPerCompletedVisit}
          />

          {user.referralCode ? (
            <LoyaltyReferralCard
              referralCode={user.referralCode}
              referralBonusPoints={program.referralBonusPoints}
            />
          ) : null}

          <LoyaltyRestaurantRewards
            balances={restaurantData?.myRestaurantLoyalty ?? []}
            history={restaurantData?.myRestaurantLoyaltyHistory ?? []}
          />

          {historyLoading && !historyData ? (
            <div className="rt-loyalty-card">
              <Skeleton active paragraph={{ rows: 5 }} />
            </div>
          ) : (
            <LoyaltyHistory items={history} />
          )}

          <LoyaltyHowItWorks program={program} />
        </div>
      </div>
    </div>
  );
}
