'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Descriptions, Modal, Typography, type DescriptionsProps } from 'antd';
import { noShowFeePolicyText, prepaymentPolicyText, type BookingApprovalPreview } from '@reservations/shared';
import { resolveRestaurantTerms } from '@/lib/restaurantTerms';

const { Text, Paragraph, Link } = Typography;

export type ReservationConfirmDetails = {
  dateLabel: string;
  timeLabel: string;
  partySize: number;
  occasionLabel: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  notes?: string;
  tableName?: string;
  tableFloorArea?: string;
  /** Charged at booking (after discounts). */
  depositCents: number;
  /** Card guarantee: charged only on no-show / late cancel. */
  noShowFeeCents?: number;
  packageTitle?: string;
  packagePriceCents?: number;
  privateDiningSpaceName?: string;
  privateDiningPriceCents?: number;
  experienceTitle?: string;
  experiencePriceCents?: number;
  promoDiscountCents?: number;
  promoTitle?: string;
  giftCardDiscountCents?: number;
  loyaltyPointsRedeemed?: number;
  restaurantPointsRedeemed?: number;
};

type Props = {
  open: boolean;
  confirming: boolean;
  restaurantName: string;
  termsAndConditions?: string | null;
  depositRequired?: boolean;
  depositAmountCents?: number;
  depositPolicy?: string | null;
  approvalPreview?: BookingApprovalPreview;
  details: ReservationConfirmDetails;
  /** Shown inside the modal so booking failures stay visible over the confirm UI */
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
  onViewTerms?: () => void;
};

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatOccasion(value: string) {
  return value === 'none' ? 'None' : value.charAt(0).toUpperCase() + value.slice(1);
}

export function ReservationConfirmModal({
  open,
  confirming,
  restaurantName,
  termsAndConditions,
  depositRequired,
  depositAmountCents,
  depositPolicy,
  approvalPreview = 'none',
  details,
  error,
  onClose,
  onConfirm,
  onViewTerms,
}: Props) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setAcceptedTerms(false);
  }, [open]);

  useEffect(() => {
    if (!error) return;
    errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [error]);

  const termsText = resolveRestaurantTerms({
    name: restaurantName,
    termsAndConditions,
    depositRequired,
    depositAmountCents,
    depositPolicy,
  });
  const termsParagraphs = termsText.split(/\n\s*\n/).filter(Boolean);

  const items: NonNullable<DescriptionsProps['items']> = [
    { key: 'restaurant', label: 'Restaurant', children: restaurantName },
    { key: 'date', label: 'Date', children: details.dateLabel },
    { key: 'time', label: 'Time', children: details.timeLabel },
    {
      key: 'party',
      label: 'Party size',
      children: `${details.partySize} ${details.partySize === 1 ? 'guest' : 'guests'}`,
    },
    { key: 'occasion', label: 'Occasion', children: details.occasionLabel },
  ];

  if (details.packageTitle) {
    items.push({
      key: 'package',
      label: 'Package',
      children: details.packagePriceCents
        ? `${details.packageTitle} (+${formatUsd(details.packagePriceCents)})`
        : details.packageTitle,
    });
  }

  if (details.privateDiningSpaceName) {
    items.push({
      key: 'private-room',
      label: 'Private room',
      children: details.privateDiningPriceCents
        ? `${details.privateDiningSpaceName} (+${formatUsd(details.privateDiningPriceCents)})`
        : details.privateDiningSpaceName,
    });
  }

  if (details.experienceTitle) {
    items.push({
      key: 'experience',
      label: 'Experience',
      children: details.experiencePriceCents
        ? `${details.experienceTitle} (+${formatUsd(details.experiencePriceCents)})`
        : details.experienceTitle,
    });
  }

  if (details.guestName) {
    items.push({ key: 'guest', label: 'Name', children: details.guestName });
  }
  if (details.guestEmail) {
    items.push({ key: 'email', label: 'Email', children: details.guestEmail });
  }
  if (details.guestPhone) {
    items.push({ key: 'phone', label: 'Phone', children: details.guestPhone });
  }
  if (details.tableName) {
    items.push({
      key: 'table',
      label: 'Table',
      children: details.tableFloorArea
        ? `${details.tableName} · ${details.tableFloorArea}`
        : details.tableName,
    });
  }
  if (details.notes?.trim()) {
    items.push({ key: 'notes', label: 'Special requests', children: details.notes.trim() });
  }
  if (details.depositCents > 0) {
    items.push({
      key: 'deposit',
      label: 'Due now',
      children: (
        <>
          <Text strong>{formatUsd(details.depositCents)}</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            {prepaymentPolicyText()}
          </Text>
        </>
      ),
    });
  }
  if (details.noShowFeeCents && details.noShowFeeCents > 0) {
    items.push({
      key: 'no-show-fee',
      label: 'Card guarantee',
      children: (
        <>
          <Text strong>{formatUsd(details.noShowFeeCents)} no-show fee</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            {noShowFeePolicyText(details.noShowFeeCents)}
          </Text>
        </>
      ),
    });
  }
  if (details.promoDiscountCents && details.promoDiscountCents > 0) {
    items.push({
      key: 'promo',
      label: 'Promotion',
      children: `${details.promoTitle ?? 'Promotion'} (−${formatUsd(details.promoDiscountCents)})`,
    });
  }
  if (details.giftCardDiscountCents && details.giftCardDiscountCents > 0) {
    items.push({
      key: 'gift',
      label: 'Gift card',
      children: `−${formatUsd(details.giftCardDiscountCents)}`,
    });
  }
  if (details.loyaltyPointsRedeemed && details.loyaltyPointsRedeemed > 0) {
    items.push({
      key: 'loyalty',
      label: 'Loyalty points',
      children: `${details.loyaltyPointsRedeemed} pts redeemed`,
    });
  }
  if (details.restaurantPointsRedeemed && details.restaurantPointsRedeemed > 0) {
    items.push({
      key: 'restaurant-loyalty',
      label: `${restaurantName} points`,
      children: `${details.restaurantPointsRedeemed} pts redeemed`,
    });
  }

  return (
    <Modal
      title="Confirm your reservation"
      open={open}
      onCancel={onClose}
      width={560}
      destroyOnClose
      className={error ? 'rt-reservation-confirm-modal rt-reservation-confirm-modal--error' : 'rt-reservation-confirm-modal'}
      footer={
        <div className="rt-reservation-confirm-modal__footer">
          {error ? (
            <div ref={errorRef} className="rt-reservation-confirm-modal__error">
              <Alert
                type="error"
                showIcon
                message="Reservation not confirmed"
                description={error}
              />
            </div>
          ) : null}
          <div className="rt-reservation-confirm-modal__actions">
            <Button key="cancel" onClick={onClose} disabled={confirming}>
              Go back
            </Button>
            <Button
              key="confirm"
              type="primary"
              loading={confirming}
              disabled={!acceptedTerms}
              onClick={onConfirm}
            >
              {approvalPreview === 'required' ? 'Send request' : 'Confirm reservation'}
            </Button>
          </div>
        </div>
      }
    >
      {approvalPreview !== 'none' ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            approvalPreview === 'required'
              ? 'Requires restaurant approval'
              : 'May require restaurant approval'
          }
          description={
            approvalPreview === 'required'
              ? `${restaurantName} will review this request before confirming. Your booking stays pending until then, and we'll notify you when they respond.`
              : `If your assigned table needs approval, ${restaurantName} will review the request first. We'll notify you when it's confirmed.`
          }
        />
      ) : null}
      <Descriptions
        column={1}
        size="small"
        bordered
        items={items}
        style={{ marginBottom: 16 }}
      />

      <div className="rt-reservation-confirm-terms">
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          Terms &amp; conditions
        </Text>
        <div className="rt-reservation-confirm-terms__body">
          {termsParagraphs.map((paragraph, index) => (
            <Paragraph key={index} style={{ marginBottom: 8 }}>
              {paragraph}
            </Paragraph>
          ))}
        </div>
      </div>

      <Checkbox
        checked={acceptedTerms}
        onChange={(e) => setAcceptedTerms(e.target.checked)}
        style={{ marginTop: 12, alignItems: 'flex-start' }}
      >
        <span>
          I agree to {restaurantName}&apos;s terms and conditions
          {onViewTerms ? (
            <>
              {' '}
              (
              <Link
                onClick={(e) => {
                  e.preventDefault();
                  onViewTerms();
                }}
              >
                view on page
              </Link>
              )
            </>
          ) : null}
        </span>
      </Checkbox>
    </Modal>
  );
}
