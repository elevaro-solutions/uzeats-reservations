'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AutoComplete, Button, Input, Tooltip } from 'antd';
import type { DefaultOptionType } from 'antd/es/select';
import { AimOutlined, CloseCircleFilled, EnvironmentFilled, EnvironmentOutlined } from '@ant-design/icons';
import { colors, typography } from '@reservations/ui';
import {
  fetchPlacePredictions,
  hasGoogleMapsKey,
  resolvePlace,
  type PlacePrediction,
} from '@/lib/googleMaps';
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
};

const DEBOUNCE_MS = 280;

export function AddressAutocomplete({
  value,
  onChange,
  onSelectLocation,
  onUseMyLocation,
  onClear,
  geoLoading,
  style,
}: AddressAutocompleteProps) {
  const useGoogle = hasGoogleMapsKey();
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!useGoogle) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setPredictions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const requestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(() => {
      void fetchPlacePredictions(trimmed).then((results) => {
        if (requestId !== requestIdRef.current) return;
        setPredictions(results);
        setSearching(false);
      });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, useGoogle]);

  const fallbackOptions = useMemo((): DefaultOptionType[] => {
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
      options: list.map((c) => ({
        value: cityLabel(c),
        search: `${c.city} ${c.state} ${US_STATE_NAMES[c.state] ?? ''}`.toLowerCase(),
        location: { label: cityLabel(c), lat: c.lat, lng: c.lng } satisfies LocationSelection,
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

  const googleOptions = useMemo(
    (): DefaultOptionType[] =>
      predictions.map((p) => ({
        value: p.description,
        placeId: p.placeId,
        label: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 0' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <EnvironmentOutlined style={{ color: colors.textTertiary }} />
              <span style={{ fontWeight: typography.fontWeight.medium }}>{p.mainText}</span>
            </span>
            {p.secondaryText ? (
              <span
                style={{
                  color: colors.textTertiary,
                  fontSize: typography.fontSize.xs,
                  paddingLeft: 22,
                }}
              >
                {p.secondaryText}
              </span>
            ) : null}
          </div>
        ),
      })),
    [predictions],
  );

  const handleSelect = useCallback(
    async (selected: string, option: DefaultOptionType) => {
      const location = (option as DefaultOptionType & { location?: LocationSelection }).location;
      const placeId = (option as DefaultOptionType & { placeId?: string }).placeId;
      if (location) {
        onSelectLocation(location);
        return;
      }
      if (placeId) {
        const place = await resolvePlace(placeId);
        if (place) {
          onSelectLocation({ label: place.label, lat: place.lat, lng: place.lng });
          return;
        }
      }
      // Fallback city match by label if Google details fail
      const match = POPULAR_CITIES.find((c) => cityLabel(c) === selected || c.city === selected);
      if (match) {
        onSelectLocation({ label: cityLabel(match), lat: match.lat, lng: match.lng });
      }
    },
    [onSelectLocation],
  );

  return (
    <AutoComplete
      value={value}
      onChange={onChange}
      options={useGoogle ? googleOptions : fallbackOptions}
      popupMatchSelectWidth={320}
      style={style}
      notFoundContent={
        useGoogle && searching
          ? 'Searching addresses…'
          : useGoogle && value.trim().length >= 2
            ? 'No addresses found'
            : undefined
      }
      filterOption={
        useGoogle
          ? false
          : (input, option) => {
              const s = (option as { search?: string })?.search;
              return s ? s.includes(input.toLowerCase()) : false;
            }
      }
      onSelect={(v, option) => {
        void handleSelect(String(v), option);
      }}
    >
      <Input
        size="large"
        variant="filled"
        placeholder={useGoogle ? 'Address or neighborhood' : 'City'}
        prefix={<EnvironmentFilled style={{ color: colors.textTertiary }} />}
        suffix={
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
        }
      />
    </AutoComplete>
  );
}
