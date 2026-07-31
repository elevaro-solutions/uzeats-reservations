'use client';

import { useMemo, useState } from 'react';
import { Button, Divider, Input, Select, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { CUISINES } from '@reservations/shared';

type CuisineSelectProps = {
  value?: string;
  onChange?: (value: string) => void;
  size?: 'small' | 'middle' | 'large';
  placeholder?: string;
};

function titleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default function CuisineSelect({
  value,
  onChange,
  size,
  placeholder = 'Select or add cuisine',
}: CuisineSelectProps) {
  const [customCuisines, setCustomCuisines] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  const options = useMemo(() => {
    const seen = new Set<string>();
    const items: { value: string; label: string }[] = [];
    for (const cuisine of [...CUISINES, ...customCuisines]) {
      if (seen.has(cuisine)) continue;
      seen.add(cuisine);
      items.push({ value: cuisine, label: cuisine });
    }
    if (value && !seen.has(value)) {
      items.unshift({ value, label: value });
    }
    return items.sort((a, b) => a.label.localeCompare(b.label));
  }, [customCuisines, value]);

  const addCustomCuisine = () => {
    const normalized = titleCase(draft);
    if (!normalized || normalized.length < 2) return;
    setCustomCuisines((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
    onChange?.(normalized);
    setDraft('');
  };

  return (
    <Select
      size={size}
      showSearch
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      optionFilterProp="label"
      popupRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '8px 0' }} />
          <Space style={{ padding: '0 8px 8px', width: '100%' }} orientation="vertical">
            <Input
              placeholder="Add custom cuisine"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomCuisine();
                }
              }}
              maxLength={60}
            />
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={addCustomCuisine}
              disabled={!draft.trim() || draft.trim().length < 2}
              block
            >
              Add &ldquo;{draft.trim() ? titleCase(draft) : '…'}&rdquo;
            </Button>
          </Space>
        </>
      )}
    />
  );
}
