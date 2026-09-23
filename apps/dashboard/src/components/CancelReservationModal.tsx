'use client';

import { useEffect, useState } from 'react';
import { Input, Modal, Select, Space, Typography, message } from 'antd';
import {
  RESTAURANT_RESERVATION_CANCELLATION_REASONS,
  buildReservationCancellationReason,
} from '@reservations/shared';

const { Text } = Typography;

export type CancelReservationModalProps = {
  open: boolean;
  guestName?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
};

export function CancelReservationModal({
  open,
  guestName,
  loading = false,
  onClose,
  onConfirm,
}: CancelReservationModalProps) {
  const [preset, setPreset] = useState<string | undefined>();
  const [details, setDetails] = useState('');

  useEffect(() => {
    if (!open) {
      setPreset(undefined);
      setDetails('');
    }
  }, [open]);

  const detailsRequired = preset === 'Other';
  const canSubmit = Boolean(preset) && (!detailsRequired || Boolean(details.trim()));

  const handleOk = async () => {
    if (!preset) {
      message.warning('Please select a cancellation reason');
      return;
    }
    if (detailsRequired && !details.trim()) {
      message.warning('Please add a few details');
      return;
    }
    await onConfirm(buildReservationCancellationReason(preset, details));
  };

  return (
    <Modal
      title="Cancel reservation?"
      open={open}
      onCancel={onClose}
      onOk={() => void handleOk()}
      confirmLoading={loading}
      okText="Cancel reservation"
      okButtonProps={{ danger: true, disabled: !canSubmit }}
      cancelText="Keep reservation"
      destroyOnHidden
    >
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        <Text>
          Cancel{guestName ? (
            <>
              {' '}
              <Text strong>{guestName}</Text>&apos;s
            </>
          ) : (
            ' this'
          )}{' '}
          booking? The guest will be notified. This cannot be undone.
        </Text>
        <div>
          <Text style={{ display: 'block', marginBottom: 6 }}>
            Reason <Text type="danger">*</Text>
          </Text>
          <Select
            allowClear
            placeholder="Select a reason"
            style={{ width: '100%' }}
            value={preset}
            onChange={setPreset}
            options={RESTAURANT_RESERVATION_CANCELLATION_REASONS.map((reason) => ({
              value: reason,
              label: reason,
            }))}
          />
        </div>
        <div>
          <Text style={{ display: 'block', marginBottom: 6 }}>
            Additional message{' '}
            {detailsRequired ? <Text type="danger">*</Text> : <Text type="secondary">(optional)</Text>}
          </Text>
          <Input.TextArea
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={
              detailsRequired
                ? 'Tell the guest why you are cancelling…'
                : 'Optional note shared with the guest…'
            }
            maxLength={500}
            showCount
          />
        </div>
      </Space>
    </Modal>
  );
}
