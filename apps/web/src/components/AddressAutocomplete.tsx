'use client';

import { useCallback, useMemo } from 'react';
import { Button, Tooltip } from 'antd';
import { AimOutlined, CloseCircleFilled, EnvironmentFilled, EnvironmentOutlined } from '@ant-design/icons';
import {
  AddressAutocomplete as SharedAddressAutocomplete,
  useGooglePlacesAvailability,
  colors,
  typography,
  type AddressFallbackOption,
  type AddressSelection,
} from '@reservations/ui';
import {
  POPULAR_CITIES,
  US_STATE_NAMES,
  cityLabel,
  type CityOption,
} from '@/lib/cities';

export type LocationSelection = {
  label: string;
  lat: number;
  lng: number;
};

type AddressAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onSelectLocation: (location: LocationSelection) => void;
  onUseMyLocation: () => void;
  onClear?: () => void;
  geoLoading?: boolean;
  style?: React.CSSProperties;
  variant?: 'outlined' | 'filled' | 'borderless';
};

/**
 * Location picker for restaurant discovery. Wraps the shared
 * AddressAutocomplete with a "use my location" action and a popular-cities
 * fallback when Google Places is unavailable.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onSelectLocation,
  onUseMyLocation,
  onClear,
  geoLoading,
  style,
  variant = 'filled',
}: AddressAutocompleteProps) {
  const googleAvailable = useGooglePlacesAvailability() !== 'unavailable';

  const fallbackOptions = useMemo((): AddressFallbackOption[] => {
    const byState = new Map<string, CityOption[]>();
    for (const c of POPULAR_CITIES) {
      const list = byState.get(c.state) ?? [];
      list.push(c);
      byState.set(c.state, list);
    }
    return Array.from(byState.entries()).map(([state, list]) => ({
      label: (
        <span
          style={{
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
            textTransform: 'uppercase',
            letterSpacing: typography.letterSpacing.wide,
            color: colors.textTertiary,
          }}
        >
          {US_STATE_NAMES[state] ?? state}
        </span>
      ),
      options: list.map((c): AddressFallbackOption => ({
        value: cityLabel(c),
        search: `${c.city} ${c.state} ${US_STATE_NAMES[c.state] ?? ''}`.toLowerCase(),
        selection: { label: cityLabel(c), lat: c.lat, lng: c.lng } satisfies AddressSelection,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <EnvironmentOutlined style={{ color: colors.textTertiary }} />
              {c.city}
            </span>
            <span style={{ color: colors.textTertiary, fontSize: typography.fontSize.xs }}>{c.state}</span>
          </div>
        ),
      })),
    }));
  }, []);

  const handleSelect = useCallback(
    (selection: AddressSelection) => {
      if (selection.lat != null && selection.lng != null) {
        onSelectLocation({ label: selection.label, lat: selection.lat, lng: selection.lng });
        return;
      }
      // Google details failed — fall back to a popular-city match by label.
      const match = POPULAR_CITIES.find(
        (c) => cityLabel(c) === selection.label || c.city === selection.label,
      );
      if (match) {
        onSelectLocation({ label: cityLabel(match), lat: match.lat, lng: match.lng });
      }
    },
    [onSelectLocation],
  );

  return (
    <SharedAddressAutocomplete
      value={value}
      onChange={onChange}
      onSelect={handleSelect}
      searchTypes={['geocode']}
      country="us"
      fallbackOptions={fallbackOptions}
      placeholder={googleAvailable ? 'Address or neighborhood' : 'City'}
      style={style}
      popupMatchSelectWidth={320}
      inputProps={{
        size: 'large',
        variant,
        prefix: <EnvironmentFilled style={{ color: colors.textTertiary }} />,
        suffix: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            {value.trim() ? (
              <Tooltip title="Clear location">
                <Button
                  type="text"
                  size="small"
                  icon={<CloseCircleFilled />}
                  aria-label="Clear location"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange('');
                    onClear?.();
                  }}
                  style={{ color: colors.textTertiary }}
                />
              </Tooltip>
            ) : null}
            <Tooltip title="Use my current location">
              <Button
                type="text"
                size="small"
                icon={<AimOutlined />}
                loading={geoLoading}
                onMouseDown={(e) => e.preventDefault()}
                onClick={onUseMyLocation}
                style={{ color: colors.brand[600], marginRight: -4 }}
              />
            </Tooltip>
          </span>
        ),
      }}
    />
  );
}
