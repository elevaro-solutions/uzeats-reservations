'use client';

import { useEffect, useState } from 'react';
import { Input, InputNumber, Modal, Select, Space, Typography, message } from 'antd';

const { Text } = Typography;

const REASON_PRESETS = [
  'Goodwill / guest accommodation',
  'Service issue',
  'Booking error',
  'Duplicate charge',
  'Other',
] as const;

export type RefundDepositModalProps = {
  open: boolean;
  /** When true, copy frames a hold release instead of a captured refund. */
  isHold?: boolean;
  guestName?: string;
  /** Original deposit amount label (for display). */
  amountLabel?: string | null;
  /** Max refundable cents (captured remaining). Required for partial refund UI. */
  maxRefundableCents?: number | null;
  loading?: boolean;
  onClose: () => void;
  /** amountCents omitted (or equal to max) = full remaining / full hold release. */
  onConfirm: (reason: string, amountCents?: number) => void | Promise<void>;
};

export function RefundDepositModal({
  open,
  isHold = false,
  guestName,
  amountLabel,
  maxRefundableCents,
  loading = false,
  onClose,
  onConfirm,
}: RefundDepositModalProps) {
  const [preset, setPreset] = useState<string | undefined>();
  const [details, setDetails] = useState('');
  const maxDollars = Math.max(0, (maxRefundableCents ?? 0) / 100);
  const [refundDollars, setRefundDollars] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setPreset(undefined);
      setDetails('');
      setRefundDollars(null);
      return;
    }
    setRefundDollars(maxDollars > 0 ? maxDollars : null);
  }, [open, maxDollars]);

  const detailsRequired = preset === 'Other';
  const refundCents =
    refundDollars != null && Number.isFinite(refundDollars)
      ? Math.round(refundDollars * 100)
      : null;
  const amountValid =
    isHold ||
    (refundCents != null &&
      refundCents > 0 &&
      refundCents <= (maxRefundableCents ?? 0));
  const canSubmit =
    Boolean(preset) && (!detailsRequired || Boolean(details.trim())) && amountValid;

  const handleOk = async () => {
    if (!preset) {
      message.warning('Please select a reason');
      return;
    }
    if (detailsRequired && !details.trim()) {
      message.warning('Please add a few details');
      return;
    }
    if (!isHold) {
      if (refundCents == null || refundCents <= 0) {
        message.warning('Enter a refund amount greater than $0');
        return;
      }
      if (refundCents > (maxRefundableCents ?? 0)) {
        message.warning('Amount exceeds the remaining deposit');
        return;
      }
    }
    const reason = details.trim() ? `${preset}: ${details.trim()}` : preset;
    await onConfirm(reason, isHold ? undefined : (refundCents ?? undefined));
  };

  const amount = amountLabel ?? 'deposit';
  const guest = guestName ? (
    <>
      {' '}
      <Text strong>{guestName}</Text>
    </>
  ) : (
    ' the guest'
  );

  const isPartial =
    !isHold &&
    refundCents != null &&
    maxRefundableCents != null &&
    refundCents < maxRefundableCents;

  return (
    <Modal
      title={isHold ? 'Release deposit hold?' : 'Refund deposit?'}
      open={open}
      onCancel={onClose}
      onOk={() => void handleOk()}
      confirmLoading={loading}
      okText={isHold ? 'Release hold' : isPartial ? 'Refund partial' : 'Refund'}
      okButtonProps={{ danger: true, disabled: !canSubmit }}
      cancelText="Keep deposit"
      destroyOnHidden
    >
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        <Text>
          {isHold ? (
            <>
              Release the {amount} authorization hold for{guest}. The guest will not be charged.
            </>
          ) : (
            <>
              Refund up to {amount} to{guest}. You can refund a partial amount; the rest stays
              captured.
            </>
          )}
        </Text>
        {!isHold ? (
          <div>
            <Text style={{ display: 'block', marginBottom: 6 }}>
              Refund amount (USD) <Text type="danger">*</Text>
            </Text>
            <InputNumber
              min={0.01}
              max={maxDollars || undefined}
              step={0.01}
              precision={2}
              value={refundDollars}
              onChange={(v) => setRefundDollars(typeof v === 'number' ? v : null)}
              prefix="$"
              style={{ width: '100%' }}
            />
            {maxDollars > 0 ? (
              <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                Remaining refundable: ${maxDollars.toFixed(2)}
              </Text>
            ) : null}
          </div>
        ) : null}
        <div>
          <Text style={{ display: 'block', marginBottom: 6 }}>
            Reason <Text type="danger">*</Text>
          </Text>
          <Select
            placeholder="Select a reason"
            value={preset}
            onChange={setPreset}
            options={REASON_PRESETS.map((value) => ({ value, label: value }))}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <Text style={{ display: 'block', marginBottom: 6 }}>
            Details{detailsRequired ? <Text type="danger"> *</Text> : ' (optional)'}
          </Text>
          <Input.TextArea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={
              detailsRequired ? 'Briefly explain why' : 'Optional note for the guest / audit log'
            }
            rows={3}
            maxLength={500}
            showCount
          />
        </div>
      </Space>
    </Modal>
  );
}
