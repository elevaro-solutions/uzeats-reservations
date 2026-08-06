'use client';

import { useEffect, useMemo, useState } from 'react';
import { Typography } from 'antd';
import { colors, radii, shadows, typography } from './tokens';

const { Text } = Typography;

export interface SlotPickerProps {
  slots: Array<{ time: string; available: boolean; remainingTables: number }>;
  selected?: string | null;
  onSelect: (time: string) => void;
  loading?: boolean;
  /** How many popular times to show before expanding. Default 5. */
  popularCount?: number;
}

type Slot = { time: string; available: boolean; remainingTables: number };

function getSlotMinutes(time: string): number {
  const d = new Date(time);
  return d.getHours() * 60 + d.getMinutes();
}

/** Lower score = more "popular" (dinner peak near 7 PM, then lunch). */
function popularityScore(time: string): number {
  const mins = getSlotMinutes(time);
  const dinnerPeak = 19 * 60;
  const distanceFromDinner = Math.abs(mins - dinnerPeak);

  if (mins >= 17 * 60 && mins <= 21 * 60 + 30) {
    return distanceFromDinner;
  }
  if (mins >= 11 * 60 + 30 && mins <= 14 * 60 + 30) {
    return 500 + distanceFromDinner;
  }
  return 5000 + distanceFromDinner;
}

function pickPopularSlots(openSlots: Slot[], max: number, selected?: string | null): Slot[] {
  if (openSlots.length <= max) return openSlots;

  const byPopularity = [...openSlots].sort(
    (a, b) => popularityScore(a.time) - popularityScore(b.time),
  );
  let picked = byPopularity.slice(0, max).sort((a, b) => a.time.localeCompare(b.time));

  if (selected && !picked.some((s) => s.time === selected)) {
    const selectedSlot = openSlots.find((s) => s.time === selected);
    if (selectedSlot) {
      picked = [...picked.filter((s) => s.time !== picked[picked.length - 1]?.time), selectedSlot].sort(
        (a, b) => a.time.localeCompare(b.time),
      );
    }
  }

  return picked;
}

function formatSlotLabel(time: string): string {
  return new Date(time).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function SlotButton({
  slot,
  selected,
  onSelect,
}: {
  slot: Slot;
  selected: boolean;
  onSelect: (time: string) => void;
}) {
  const label = formatSlotLabel(slot.time);
  const fewLeft = slot.remainingTables > 0 && slot.remainingTables <= 2;

  return (
    <button
      type="button"
      onClick={() => onSelect(slot.time)}
      className="rt-slot-picker__btn"
      style={{
        cursor: 'pointer',
        fontFamily: 'inherit',
        borderRadius: radii.md,
        padding: '10px 12px',
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
        lineHeight: 1.2,
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        minHeight: 44,
        width: '100%',
        ...(selected
          ? {
              background: colors.brand[600],
              color: colors.textInverse,
              border: `1.5px solid ${colors.brand[600]}`,
              boxShadow: shadows.brand,
            }
          : {
              background: colors.surface,
              color: colors.brand[600],
              border: `1.5px solid ${colors.brand[200]}`,
            }),
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = colors.brand[400];
          e.currentTarget.style.background = colors.brand[50];
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = colors.brand[200];
          e.currentTarget.style.background = colors.surface;
        }
      }}
    >
      {label}
      {fewLeft && (
        <span
          style={{
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.regular,
            color: selected ? 'rgba(255,255,255,0.85)' : colors.warning,
          }}
        >
          {slot.remainingTables} left
        </span>
      )}
    </button>
  );
}

export function SlotPicker({
  slots,
  selected,
  onSelect,
  loading,
  popularCount = 5,
}: SlotPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const openSlots = useMemo(() => slots.filter((s) => s.available), [slots]);

  const popularSlots = useMemo(
    () => pickPopularSlots(openSlots, popularCount, selected),
    [openSlots, popularCount, selected],
  );

  const showExpand = openSlots.length > popularSlots.length;
  const visibleSlots = expanded || !showExpand ? openSlots : popularSlots;

  useEffect(() => {
    setExpanded(false);
  }, [slots]);

  useEffect(() => {
    if (selected && !popularSlots.some((s) => s.time === selected)) {
      setExpanded(true);
    }
  }, [selected, popularSlots]);

  if (loading) {
    return (
      <div className="rt-slot-picker rt-slot-picker--loading">
        {Array.from({ length: popularCount }, (_, i) => (
          <div key={i} className="rt-slot-picker__skeleton" />
        ))}
      </div>
    );
  }

  if (openSlots.length === 0) {
    return (
      <div
        style={{
          padding: '20px 16px',
          background: colors.neutral[50],
          border: `1px dashed ${colors.border}`,
          borderRadius: radii.md,
          textAlign: 'center',
        }}
      >
        <Text type="secondary">No available times for this date and party size.</Text>
      </div>
    );
  }

  return (
    <div component="SlotPicker">
      {!expanded && showExpand && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
          Popular times
        </Text>
      )}
      <div className={`rt-slot-picker${expanded ? ' rt-slot-picker--expanded' : ''}`}>
        {visibleSlots.map((slot) => (
          <SlotButton
            key={slot.time}
            slot={slot}
            selected={selected === slot.time}
            onSelect={onSelect}
          />
        ))}
      </div>
      {showExpand && (
        <button
          type="button"
          className="rt-slot-picker__toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? 'Show popular times only'
            : `Show all ${openSlots.length} available times`}
        </button>
      )}
    </div>
  );
}
