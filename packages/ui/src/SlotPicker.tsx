'use client';

import { Typography } from 'antd';
import { colors, radii, typography } from './tokens';

const { Text } = Typography;

export interface SlotPickerProps {
  slots: Array<{ time: string; available: boolean; remainingTables: number }>;
  selected?: string | null;
  onSelect: (time: string) => void;
  loading?: boolean;
}

export function SlotPicker({ slots, selected, onSelect, loading }: SlotPickerProps) {
  if (!loading && slots.length === 0) {
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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {slots.map((slot) => {
        const label = new Date(slot.time).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        });
        const isSelected = selected === slot.time;
        const fewLeft = slot.available && slot.remainingTables > 0 && slot.remainingTables <= 2;

        return (
          <button
            key={slot.time}
            type="button"
            disabled={!slot.available}
            onClick={() => onSelect(slot.time)}
            style={{
              cursor: slot.available ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              borderRadius: radii.md,
              padding: '10px 16px',
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              lineHeight: 1.2,
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              ...(isSelected
                ? {
                    background: colors.brand[600],
                    color: colors.textInverse,
                    border: `1.5px solid ${colors.brand[600]}`,
                    boxShadow: `0 4px 12px rgba(196, 71, 47, 0.28)`,
                  }
                : slot.available
                  ? {
                      background: colors.surface,
                      color: colors.brand[600],
                      border: `1.5px solid ${colors.brand[200]}`,
                    }
                  : {
                      background: colors.neutral[50],
                      color: colors.textTertiary,
                      border: `1.5px solid ${colors.bordersubtle}`,
                      textDecoration: 'line-through',
                    }),
            }}
            onMouseEnter={(e) => {
              if (slot.available && !isSelected) {
                e.currentTarget.style.borderColor = colors.brand[400];
                e.currentTarget.style.background = colors.brand[50];
              }
            }}
            onMouseLeave={(e) => {
              if (slot.available && !isSelected) {
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
                  color: isSelected ? 'rgba(255,255,255,0.85)' : colors.warning,
                }}
              >
                {slot.remainingTables} left
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
