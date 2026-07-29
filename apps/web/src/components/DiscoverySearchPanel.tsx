'use client';

import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Button, DatePicker, Input, Select, Tag } from 'antd';
import { EnvironmentFilled, SearchOutlined } from '@ant-design/icons';
import { CUISINES } from '@reservations/shared';
import { colors, radii, shadows, typography } from '@reservations/ui';
import {
  AddressAutocomplete,
  type LocationSelection,
} from '@/components/AddressAutocomplete';

type DiscoverySearchPanelProps = {
  variant?: 'hero' | 'map';
  query: string;
  cuisine?: string;
  locationInput: string;
  usingDeviceLocation: boolean;
  partySize: number;
  date: Dayjs;
  geoLoading: boolean;
  datePresets: Array<{ label: string; value: Dayjs }>;
  onQueryChange: (value: string) => void;
  onCuisineChange: (value: string | undefined) => void;
  onLocationInputChange: (value: string) => void;
  onSelectLocation: (location: LocationSelection) => void;
  onUseMyLocation: () => void;
  onClearLocation: () => void;
  onClearDeviceLocation: () => void;
  onDateChange: (date: Dayjs) => void;
  onPartySizeChange: (size: number) => void;
  onSearch: () => void;
  onClearCategory: () => void;
};

export function DiscoverySearchPanel({
  variant = 'hero',
  query,
  cuisine,
  locationInput,
  usingDeviceLocation,
  partySize,
  date,
  geoLoading,
  datePresets,
  onQueryChange,
  onCuisineChange,
  onLocationInputChange,
  onSelectLocation,
  onUseMyLocation,
  onClearLocation,
  onClearDeviceLocation,
  onDateChange,
  onPartySizeChange,
  onSearch,
  onClearCategory,
}: DiscoverySearchPanelProps) {
  return (
    <div
      className={variant === 'map' ? 'rt-search-panel rt-search-panel--map' : 'rt-fade-up rt-search-panel'}
      role="search"
      style={variant === 'hero' ? { animationDelay: '180ms' } : undefined}
    >
      <div className="rt-search-field rt-sf-what">
        <span className="rt-search-label">Search</span>
        <Input
          size="large"
          variant="borderless"
          allowClear
          prefix={<SearchOutlined style={{ color: colors.textTertiary }} />}
          placeholder="Restaurant name or dish"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            onClearCategory();
          }}
          onPressEnter={onSearch}
        />
      </div>
      <span className="rt-search-divider" aria-hidden />
      <div className="rt-search-field rt-sf-cuisine">
        <span className="rt-search-label">Cuisine</span>
        <Select
          size="large"
          variant="borderless"
          allowClear
          placeholder="Any cuisine"
          value={cuisine}
          onChange={(value) => {
            onCuisineChange(value);
          }}
          options={CUISINES.map((c) => ({ value: c, label: c }))}
        />
      </div>
      <span className="rt-search-divider" aria-hidden />
      <div className="rt-search-field rt-sf-where">
        <span className="rt-search-label">Where</span>
        {usingDeviceLocation ? (
          <Tag
            color={colors.brand[600]}
            closable
            onClose={onClearDeviceLocation}
            style={{
              height: 40,
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: 14,
              padding: '0 12px',
              borderRadius: radii.md,
              margin: '0 4px 2px',
            }}
          >
            <EnvironmentFilled style={{ marginRight: 6 }} /> Near me — closest tables first
          </Tag>
        ) : (
          <AddressAutocomplete
            value={locationInput}
            onChange={onLocationInputChange}
            onSelectLocation={onSelectLocation}
            onUseMyLocation={onUseMyLocation}
            onClear={onClearLocation}
            geoLoading={geoLoading}
            variant="borderless"
          />
        )}
      </div>
      <span className="rt-search-divider" aria-hidden />
      <div className="rt-search-field rt-sf-when">
        <span className="rt-search-label">When</span>
        <DatePicker
          size="large"
          variant="borderless"
          value={date}
          onChange={(d) => d && onDateChange(d)}
          allowClear={false}
          format="ddd, MMM D"
          disabledDate={(d) => d.isBefore(dayjs().startOf('day'))}
          presets={datePresets}
        />
      </div>
      <span className="rt-search-divider" aria-hidden />
      <div className="rt-search-field rt-sf-who">
        <span className="rt-search-label">Guests</span>
        <Select
          size="large"
          variant="borderless"
          value={partySize}
          onChange={(v) => onPartySizeChange(v ?? 2)}
          options={Array.from({ length: 20 }, (_, i) => ({
            value: i + 1,
            label: `${i + 1} ${i === 0 ? 'guest' : 'guests'}`,
          }))}
        />
      </div>
      <div className="rt-search-submit">
        <Button
          type="primary"
          size="large"
          icon={<SearchOutlined />}
          className={variant === 'hero' ? 'rt-hero-cta' : undefined}
          onClick={onSearch}
          style={{
            height: 'auto',
            minHeight: variant === 'map' ? 48 : 52,
            borderRadius: radii.lg,
            fontWeight: typography.fontWeight.semibold,
            paddingInline: variant === 'map' ? 20 : 26,
            background: colors.brand[600],
            boxShadow: shadows.brand,
          }}
        >
          Find a table
        </Button>
      </div>
    </div>
  );
}
