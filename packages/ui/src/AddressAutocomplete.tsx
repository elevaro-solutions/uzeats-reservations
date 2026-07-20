'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AutoComplete, Input } from 'antd';
import type { InputProps } from 'antd';
import type { DefaultOptionType } from 'antd/es/select';
import { EnvironmentOutlined } from '@ant-design/icons';
import { colors, typography } from './tokens';
import {
  fetchPlacePredictions,
  getGooglePlacesAvailability,
  resolveAddress,
  subscribeGooglePlacesAvailability,
  type AddressSelection,
  type PlacePrediction,
} from './googlePlaces';

export type { AddressSelection };

/**
 * Option shape for the non-Google fallback dropdown. Attach a `selection`
 * so the consumer still receives a structured AddressSelection on pick.
 */
export type AddressFallbackOption = DefaultOptionType & {
  selection?: AddressSelection;
  /** Lowercased haystack used by the default fallback filter. */
  search?: string;
};

export type AddressAutocompleteProps = {
  /** Controlled value. Optional so the component works inside antd Form.Item. */
  value?: string;
  onChange?: (value: string) => void;
  /** Fired when the user picks a suggestion (Google or fallback). */
  onSelect?: (selection: AddressSelection) => void;
  placeholder?: string;
  /** Google Places types, e.g. ['address'] (default) or ['geocode']. */
  searchTypes?: string[];
  /** ISO country restriction for Google predictions. Default 'us'. */
  country?: string | string[];
  debounceMs?: number;
  /**
   * Optional static suggestions shown when Google Places is unavailable
   * (missing/invalid API key). Without them the component degrades to a
   * plain text input.
   */
  fallbackOptions?: AddressFallbackOption[];
  fallbackPlaceholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  /** Extra props forwarded to the underlying antd Input. */
  inputProps?: InputProps;
  /** Width of the suggestions dropdown; defaults to the input width. */
  popupMatchSelectWidth?: boolean | number;
};

const DEFAULT_DEBOUNCE_MS = 280;
const MIN_QUERY_LENGTH = 2;

/** Re-renders when the Google Places availability changes (e.g. bad key detected). */
export function useGooglePlacesAvailability() {
  return useSyncExternalStore(
    subscribeGooglePlacesAvailability,
    getGooglePlacesAvailability,
    getGooglePlacesAvailability,
  );
}

/**
 * Reusable address input backed by Google Places Autocomplete.
 *
 * - With a valid NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: live address suggestions;
 *   picking one resolves coordinates and parsed address parts via onSelect.
 * - Without a key (or when Google rejects it): falls back to the provided
 *   static options, or to a plain text input when none are given.
 */
export function AddressAutocomplete({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Start typing an address',
  searchTypes,
  country = 'us',
  debounceMs = DEFAULT_DEBOUNCE_MS,
  fallbackOptions,
  fallbackPlaceholder,
  disabled,
  style,
  inputProps,
  popupMatchSelectWidth,
}: AddressAutocompleteProps) {
  const availability = useGooglePlacesAvailability();
  const useGoogle = availability !== 'unavailable';

  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!useGoogle) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setPredictions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const requestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(() => {
      void fetchPlacePredictions(trimmed, { types: searchTypes, country }).then((results) => {
        if (requestId !== requestIdRef.current) return;
        setPredictions(results);
        setSearching(false);
      });
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, useGoogle, debounceMs, country, searchTypes]);

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
      if (!onSelect) return;

      const fallbackSelection = (option as AddressFallbackOption).selection;
      if (fallbackSelection) {
        onSelect(fallbackSelection);
        return;
      }

      const placeId = (option as DefaultOptionType & { placeId?: string }).placeId;
      if (placeId) {
        const resolved = await resolveAddress(placeId);
        onSelect(resolved ?? { label: selected, placeId });
        return;
      }

      onSelect({ label: selected });
    },
    [onSelect],
  );

  const effectivePlaceholder = useGoogle ? placeholder : (fallbackPlaceholder ?? placeholder);
  const inputEl = (
    <Input
      size="large"
      disabled={disabled}
      placeholder={effectivePlaceholder}
      {...inputProps}
    />
  );

  // No Google and nothing to suggest: plain input, no dropdown chrome.
  if (!useGoogle && !fallbackOptions?.length) {
    return (
      <Input
        size="large"
        disabled={disabled}
        placeholder={effectivePlaceholder}
        style={style}
        value={value}
        onChange={(e) => {
          onChange?.(e.target.value);
        }}
        {...inputProps}
      />
    );
  }

  return (
    <AutoComplete
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={useGoogle ? googleOptions : fallbackOptions}
      popupMatchSelectWidth={popupMatchSelectWidth ?? true}
      style={style}
      notFoundContent={
        useGoogle && searching
          ? 'Searching addresses…'
          : useGoogle && value.trim().length >= MIN_QUERY_LENGTH
            ? 'No addresses found'
            : undefined
      }
      filterOption={
        useGoogle
          ? false
          : (input, option) => {
              const haystack = (option as AddressFallbackOption | undefined)?.search;
              return haystack ? haystack.includes(input.toLowerCase()) : false;
            }
      }
      onSelect={(selected, option) => {
        void handleSelect(String(selected), option);
      }}
    >
      {inputEl}
    </AutoComplete>
  );
}
