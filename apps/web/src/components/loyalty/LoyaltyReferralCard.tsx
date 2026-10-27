'use client';

import { useCallback } from 'react';
import { Button, message } from 'antd';
import { CopyOutlined, GiftOutlined, ShareAltOutlined } from '@ant-design/icons';
import { formatPoints } from './loyaltyFormat';

export interface LoyaltyReferralCardProps {
  referralCode: string;
  referralBonusPoints: number;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function LoyaltyReferralCard({ referralCode, referralBonusPoints }: LoyaltyReferralCardProps) {
  const handleCopyCode = useCallback(async () => {
    if (await copyText(referralCode)) message.success('Referral code copied');
    else message.error('Could not copy — select the code and copy it manually');
  }, [referralCode]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/login?tab=register&ref=${encodeURIComponent(referralCode)}`;
    const text = `Join me on Tablevera and book great restaurants. Sign up with my code ${referralCode}.`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Join me on Tablevera', text, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    if (await copyText(url)) message.success('Invite link copied');
    else message.error('Could not copy the invite link');
  }, [referralCode]);

  const bonus = formatPoints(referralBonusPoints);

  return (
    <section component="LoyaltyReferralCard" className="rt-loyalty-card" aria-labelledby="loyalty-referral-title">
      <header className="rt-loyalty-card__header">
        <span className="rt-loyalty-card__icon" aria-hidden>
          <GiftOutlined />
        </span>
        <div>
          <h2 id="loyalty-referral-title" className="rt-loyalty-card__title">
            Invite friends, earn {bonus} pts
          </h2>
          <p className="rt-loyalty-card__subtitle">
            Share your code. When a friend signs up with it and completes their first visit, you get {bonus} points.
          </p>
        </div>
      </header>

      <div className="rt-loyalty-ticket">
        <div className="rt-loyalty-ticket__code-wrap">
          <span className="rt-loyalty-ticket__label">Your referral code</span>
          <span className="rt-loyalty-ticket__code">{referralCode}</span>
        </div>
        <Button
          type="text"
          icon={<CopyOutlined />}
          onClick={() => void handleCopyCode()}
          aria-label="Copy referral code"
        />
      </div>

      <Button type="primary" icon={<ShareAltOutlined />} block onClick={() => void handleShare()}>
        Share invite link
      </Button>

      <ol className="rt-loyalty-steps-inline">
        <li>
          <span className="rt-loyalty-steps-inline__num">1</span>
          Share your link or code
        </li>
        <li>
          <span className="rt-loyalty-steps-inline__num">2</span>
          Your friend signs up with it
        </li>
        <li>
          <span className="rt-loyalty-steps-inline__num">3</span>
          After their first visit, you get {bonus} pts
        </li>
      </ol>
    </section>
  );
}
