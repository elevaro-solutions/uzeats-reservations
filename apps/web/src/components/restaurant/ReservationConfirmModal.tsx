'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Collapse, Modal, Typography } from 'antd';
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
  /** Resolved cancel / no-show window in hours for this booking. */
  cancellationPeriodHours?: number;
  /** 3D table selection fee charged to the diner at booking (platform payer = diner). */
  virtualRoomSelectionFeeCents?: number;
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

type DetailRow = { key: string; label: string; value: string };
type ChargeLine = { key: string; label: string; amountLabel: string; hint?: string; tone?: 'muted' | 'discount' };

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatOccasion(value: string) {
  return value === 'none' ? 'None' : value.charAt(0).toUpperCase() + value.slice(1);
}

function buildDetailRows(details: ReservationConfirmDetails): DetailRow[] {
  const rows: DetailRow[] = [];

  // Priced add-ons are listed in the charges card; only show unpriced ones here.
  if (details.packageTitle && !(details.packagePriceCents && details.packagePriceCents > 0)) {
    rows.push({
      key: 'package',
      label: 'Package',
      value: details.packageTitle,
    });
  }
  if (
    details.privateDiningSpaceName &&
    !(details.privateDiningPriceCents && details.privateDiningPriceCents > 0)
  ) {
    rows.push({
      key: 'private-room',
      label: 'Private room',
      value: details.privateDiningSpaceName,
    });
  }
  if (
    details.experienceTitle &&
    !(details.experiencePriceCents && details.experiencePriceCents > 0)
  ) {
    rows.push({
      key: 'experience',
      label: 'Experience',
      value: details.experienceTitle,
    });
  }
  if (details.occasionLabel && details.occasionLabel !== 'None') {
    rows.push({ key: 'occasion', label: 'Occasion', value: details.occasionLabel });
  }
  if (details.guestName) {
    rows.push({ key: 'guest', label: 'Name', value: details.guestName });
  }
  if (details.guestEmail) {
    rows.push({ key: 'email', label: 'Email', value: details.guestEmail });
  }
  if (details.guestPhone) {
    rows.push({ key: 'phone', label: 'Phone', value: details.guestPhone });
  }
  if (details.tableName) {
    rows.push({
      key: 'table',
      label: 'Table',
      value: details.tableFloorArea
        ? `${details.tableName} · ${details.tableFloorArea}`
        : details.tableName,
    });
  }
  if (details.notes?.trim()) {
    rows.push({ key: 'notes', label: 'Special requests', value: details.notes.trim() });
  }

  return rows;
}

function buildChargeLines(details: ReservationConfirmDetails, restaurantName: string): ChargeLine[] {
  const lines: ChargeLine[] = [];

  if (details.packagePriceCents && details.packagePriceCents > 0) {
    lines.push({
      key: 'package',
      label: details.packageTitle ? `Package · ${details.packageTitle}` : 'Package',
      amountLabel: formatUsd(details.packagePriceCents),
    });
  }
  if (details.privateDiningPriceCents && details.privateDiningPriceCents > 0) {
    lines.push({
      key: 'private-room',
      label: details.privateDiningSpaceName
        ? `Private room · ${details.privateDiningSpaceName}`
        : 'Private room',
      amountLabel: formatUsd(details.privateDiningPriceCents),
    });
  }
  if (details.experiencePriceCents && details.experiencePriceCents > 0) {
    lines.push({
      key: 'experience',
      label: details.experienceTitle ? `Experience · ${details.experienceTitle}` : 'Experience',
      amountLabel: formatUsd(details.experiencePriceCents),
    });
  }
  if (details.virtualRoomSelectionFeeCents && details.virtualRoomSelectionFeeCents > 0) {
    lines.push({
      key: 'virtual-room-fee',
      label: '3D table selection',
      amountLabel: formatUsd(details.virtualRoomSelectionFeeCents),
      hint: 'Charged now for picking your table in 3D.',
    });
  }
  if (details.promoDiscountCents && details.promoDiscountCents > 0) {
    lines.push({
      key: 'promo',
      label: details.promoTitle ?? 'Promotion',
      amountLabel: `−${formatUsd(details.promoDiscountCents)}`,
      tone: 'discount',
    });
  }
  if (details.giftCardDiscountCents && details.giftCardDiscountCents > 0) {
    lines.push({
      key: 'gift',
      label: 'Gift card',
      amountLabel: `−${formatUsd(details.giftCardDiscountCents)}`,
      tone: 'discount',
    });
  }
  if (details.loyaltyPointsRedeemed && details.loyaltyPointsRedeemed > 0) {
    lines.push({
      key: 'loyalty',
      label: 'Loyalty points',
      amountLabel: `${details.loyaltyPointsRedeemed} pts`,
      tone: 'muted',
    });
  }
  if (details.restaurantPointsRedeemed && details.restaurantPointsRedeemed > 0) {
    lines.push({
      key: 'restaurant-loyalty',
      label: `${restaurantName} points`,
      amountLabel: `${details.restaurantPointsRedeemed} pts`,
      tone: 'muted',
    });
  }

  return lines;
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
  const detailRows = buildDetailRows(details);
  const chargeLines = buildChargeLines(details, restaurantName);
  const hasDueNow = details.depositCents > 0;
  const hasNoShow = !!(details.noShowFeeCents && details.noShowFeeCents > 0);
  const hasCharges = chargeLines.length > 0 || hasDueNow || hasNoShow;
  const partyLabel = `${details.partySize} ${details.partySize === 1 ? 'guest' : 'guests'}`;
  const confirmLabel = approvalPreview === 'required' ? 'Send request' : 'Confirm reservation';

  return (
    <Modal
      title="Confirm your reservation"
      open={open}
      onCancel={onClose}
      width={520}
      destroyOnClose
      className={
        error
          ? 'rt-reservation-confirm-modal rt-reservation-confirm-modal--error'
          : 'rt-reservation-confirm-modal'
      }
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
              {confirmLabel}
            </Button>
          </div>
        </div>
      }
    >
      {approvalPreview !== 'none' ? (
        <Alert
          type="warning"
          showIcon
          className="rt-reservation-confirm-modal__approval"
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

      <div className="rt-reservation-confirm-summary">
        <Text className="rt-reservation-confirm-summary__restaurant">{restaurantName}</Text>
        <div className="rt-reservation-confirm-summary__visit">
          <span>{details.dateLabel}</span>
          <span className="rt-reservation-confirm-summary__dot" aria-hidden>
            ·
          </span>
          <span>{details.timeLabel}</span>
          <span className="rt-reservation-confirm-summary__dot" aria-hidden>
            ·
          </span>
          <span>{partyLabel}</span>
        </div>
      </div>

      {detailRows.length > 0 ? (
        <dl className="rt-reservation-confirm-details">
          {detailRows.map((row) => (
            <div key={row.key} className="rt-reservation-confirm-details__row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {hasCharges ? (
        <section className="rt-reservation-confirm-charges" aria-label="Charges">
          {chargeLines.length > 0 ? (
            <ul className="rt-reservation-confirm-charges__lines">
              {chargeLines.map((line) => (
                <li
                  key={line.key}
                  className={
                    line.tone
                      ? `rt-reservation-confirm-charges__line rt-reservation-confirm-charges__line--${line.tone}`
                      : 'rt-reservation-confirm-charges__line'
                  }
                >
                  <div className="rt-reservation-confirm-charges__line-main">
                    <span>{line.label}</span>
                    <span className="rt-reservation-confirm-charges__amount">{line.amountLabel}</span>
                  </div>
                  {line.hint ? (
                    <Text type="secondary" className="rt-reservation-confirm-charges__hint">
                      {line.hint}
                    </Text>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {hasDueNow ? (
            <div className="rt-reservation-confirm-charges__total">
              <div className="rt-reservation-confirm-charges__line-main">
                <span>Due now</span>
                <span className="rt-reservation-confirm-charges__amount">
                  {formatUsd(details.depositCents)}
                </span>
              </div>
              <Text type="secondary" className="rt-reservation-confirm-charges__hint">
                {prepaymentPolicyText(details.cancellationPeriodHours)}
              </Text>
            </div>
          ) : null}

          {hasNoShow ? (
            <div className="rt-reservation-confirm-charges__guarantee">
              <div className="rt-reservation-confirm-charges__line-main">
                <span>Card guarantee</span>
                <span className="rt-reservation-confirm-charges__amount">
                  {formatUsd(details.noShowFeeCents!)} no-show fee
                </span>
              </div>
              <Text type="secondary" className="rt-reservation-confirm-charges__hint">
                {noShowFeePolicyText(details.noShowFeeCents!, details.cancellationPeriodHours)}
              </Text>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="rt-reservation-confirm-terms">
        <Collapse
          ghost
          size="small"
          className="rt-reservation-confirm-terms__collapse"
          items={[
            {
              key: 'terms',
              label: 'Terms & conditions',
              children: (
                <div className="rt-reservation-confirm-terms__body">
                  {termsParagraphs.map((paragraph, index) => (
                    <Paragraph key={index}>{paragraph}</Paragraph>
                  ))}
                </div>
              ),
            },
          ]}
        />

        <Checkbox
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="rt-reservation-confirm-terms__agree"
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
      </div>
    </Modal>
  );
}
