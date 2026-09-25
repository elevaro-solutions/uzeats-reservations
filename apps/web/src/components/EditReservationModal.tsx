'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import { DatePicker, Input, InputNumber, Modal, Select, Space, Typography, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import {
  OCCASIONS,
  formatTimeInTimeZone,
  isPastCalendarDay,
  isoDateInTimeZone,
  restaurantTimeZone,
} from '@reservations/shared';
import { AVAILABILITY, MY_RESERVATION, MY_RESERVATIONS, UPDATE_RESERVATION } from '@/lib/graphql';
import { formatOccasion } from '@/components/restaurant/ReservationConfirmModal';

const { Text } = Typography;

type Props = {
  open: boolean;
  reservation?: {
    id: string;
    slotStart: string;
    partySize: number;
    occasion?: string;
    guestNotes?: string;
    restaurant?: {
      id?: string;
      name?: string;
      timezone?: string | null;
      address?: { state?: string | null; zip?: string | null; country?: string | null } | null;
      location?: { lng?: number | null; coordinates?: number[] | null } | null;
    } | null;
  } | null;
  onClose: () => void;
  onUpdated?: () => void;
};

export function EditReservationModal({ open, reservation, onClose, onUpdated }: Props) {
  const timeZone = useMemo(
    () => reservation?.restaurant?.timezone || restaurantTimeZone(reservation?.restaurant ?? {}),
    [reservation?.restaurant],
  );
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [partySize, setPartySize] = useState(2);
  const [slotStart, setSlotStart] = useState<string | undefined>();
  const [occasion, setOccasion] = useState('none');
  const [guestNotes, setGuestNotes] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!reservation || !open) return;
    const tz = reservation.restaurant?.timezone || restaurantTimeZone(reservation.restaurant ?? {});
    setDate(dayjs(isoDateInTimeZone(new Date(reservation.slotStart), tz)));
    setPartySize(reservation.partySize);
    setSlotStart(reservation.slotStart);
    setOccasion(reservation.occasion ?? 'none');
    setGuestNotes(reservation.guestNotes ?? '');
    setDirty(false);
  }, [reservation, open]);

  const restaurantId = reservation?.restaurant?.id;
  const dateStr = date.format('YYYY-MM-DD');
  const { data: slotsData, loading: slotsLoading } = useQuery(AVAILABILITY, {
    skip: !open || !restaurantId,
    variables: { restaurantId, date: dateStr, partySize },
    fetchPolicy: 'network-only',
  });

  const [updateReservation, { loading: saving }] = useMutation(UPDATE_RESERVATION);

  const slotOptions = useMemo(() => {
    const slots = (slotsData as { availability?: Array<{ time: string; available: boolean }> } | undefined)
      ?.availability ?? [];
    const current = reservation?.slotStart;
    return slots
      .filter((s) => s.available || s.time === current || s.time === slotStart)
      .map((s) => ({
        value: s.time,
        label: formatTimeInTimeZone(s.time, timeZone),
      }));
  }, [slotsData, reservation?.slotStart, slotStart, timeZone]);

  const handleOk = async () => {
    if (!dirty) return;
    if (!reservation || !slotStart) {
      message.warning('Please pick a time');
      throw new Error('time required');
    }
    await updateReservation({
      variables: {
        id: reservation.id,
        input: {
          partySize,
          slotStart,
          occasion,
          guestNotes: guestNotes.trim() || undefined,
        },
      },
      refetchQueries: [
        { query: MY_RESERVATIONS },
        { query: MY_RESERVATION, variables: { id: reservation.id } },
      ],
      awaitRefetchQueries: true,
    });
    message.success('Reservation updated');
    await onUpdated?.();
    onClose();
  };

  return (
    <Modal
      title="Edit reservation"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Save changes"
      okButtonProps={{ disabled: !dirty }}
      confirmLoading={saving}
      destroyOnClose
    >
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        <Text>
          Update your booking at <Text strong>{reservation?.restaurant?.name}</Text>.
        </Text>
        <div>
          <Text style={{ display: 'block', marginBottom: 6 }}>Date</Text>
          <DatePicker
            value={date}
            allowClear={false}
            disabledDate={(d) => isPastCalendarDay(d.format('YYYY-MM-DD'), timeZone)}
            onChange={(d) => {
              if (!d) return;
              setDate(d);
              setSlotStart(undefined);
              setDirty(true);
            }}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <Text style={{ display: 'block', marginBottom: 6 }}>Party size</Text>
          <InputNumber
            min={1}
            max={50}
            value={partySize}
            onChange={(v) => {
              if (!v) return;
              setPartySize(v);
              setDirty(true);
            }}
          />
        </div>
        <div>
          <Text style={{ display: 'block', marginBottom: 6 }}>Time</Text>
          <Select
            placeholder={slotsLoading ? 'Loading times…' : 'Select a time'}
            loading={slotsLoading}
            style={{ width: '100%' }}
            value={slotStart}
            onChange={(v) => {
              setSlotStart(v);
              setDirty(true);
            }}
            options={slotOptions}
            notFoundContent={slotsLoading ? 'Loading…' : 'No times available for this date'}
          />
        </div>
        <div>
          <Text style={{ display: 'block', marginBottom: 6 }}>Occasion</Text>
          <Select
            style={{ width: '100%' }}
            value={occasion}
            onChange={(v) => {
              setOccasion(v);
              setDirty(true);
            }}
            options={OCCASIONS.map((o) => ({
              value: o,
              label: formatOccasion(o),
            }))}
          />
        </div>
        <div>
          <Text style={{ display: 'block', marginBottom: 6 }}>Notes for the restaurant</Text>
          <Input.TextArea
            rows={3}
            value={guestNotes}
            onChange={(e) => {
              setGuestNotes(e.target.value);
              setDirty(true);
            }}
            maxLength={500}
            showCount
          />
        </div>
      </Space>
    </Modal>
  );
}
