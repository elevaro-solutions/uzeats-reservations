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
  POPULAR_NEIGHBORHOODS,
  US_STATE_NAMES,
  cityLabel,
  neighborhoodLabel,
  type CityOption,
  type NeighborhoodOption,
} from '@/lib/cities';

const LOCATION_SEARCH_TYPES: string[] = ['geocode'];

export type LocationSelection = {
  label: string;
  lat: number;
  lng: number;
  city?: string;
  neighborhood?: string;
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
    const cityGroups = Array.from(byState.entries()).map(([state, list]) => ({
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
        selection: { label: cityLabel(c), lat: c.lat, lng: c.lng, city: c.city } satisfies AddressSelection,
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

    const neighborhoodGroup = {
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
          Popular neighborhoods
        </span>
      ),
      options: POPULAR_NEIGHBORHOODS.map((n): AddressFallbackOption => ({
        value: neighborhoodLabel(n),
        search: `${n.neighborhood} ${n.city} ${n.state}`.toLowerCase(),
        selection: {
          label: neighborhoodLabel(n),
          lat: n.lat,
          lng: n.lng,
          city: n.city,
          neighborhood: n.neighborhood,
        } satisfies AddressSelection,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <EnvironmentOutlined style={{ color: colors.textTertiary }} />
              {n.neighborhood}
            </span>
            <span style={{ color: colors.textTertiary, fontSize: typography.fontSize.xs }}>{n.city}</span>
          </div>
        ),
      })),
    };

    return [...cityGroups, neighborhoodGroup];
  }, []);

  const handleSelect = useCallback(
    (selection: AddressSelection) => {
      if (selection.lat != null && selection.lng != null) {
        onSelectLocation({
          label: selection.label,
          lat: selection.lat,
          lng: selection.lng,
          city: selection.city,
          neighborhood: selection.neighborhood,
        });
        return;
      }
      const hood = POPULAR_NEIGHBORHOODS.find((n) => neighborhoodLabel(n) === selection.label);
      if (hood) {
        onSelectLocation({
          label: neighborhoodLabel(hood),
          lat: hood.lat,
          lng: hood.lng,
          city: hood.city,
          neighborhood: hood.neighborhood,
        });
        return;
      }
      const match = POPULAR_CITIES.find(
        (c) => cityLabel(c) === selection.label || c.city === selection.label,
      );
      if (match) {
        onSelectLocation({
          label: cityLabel(match),
          lat: match.lat,
          lng: match.lng,
          city: match.city,
        });
      }
    },
    [onSelectLocation],
  );

  return (
    <div component="AddressAutocomplete" style={{ display: 'contents' }}><SharedAddressAutocomplete       value={value}
      onChange={onChange}
      onSelect={handleSelect}
      searchTypes={LOCATION_SEARCH_TYPES}
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
    /></div>
  );
}
