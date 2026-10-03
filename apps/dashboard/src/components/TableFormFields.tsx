'use client';

import { useMemo, useState } from 'react';
import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import PhotoUpload from '@/components/PhotoUpload';

export const TABLE_SHAPE_OPTIONS = [
  { value: 'rect', label: 'Rectangle' },
  { value: 'round', label: 'Round' },
] as const;

export const tableFormTips = {
  name: 'Label shown on the floor plan and when diners pick a table.',
  minCapacity: 'Smallest party this table can seat.',
  maxCapacity: 'Largest party this table can seat.',
  floorArea: 'Groups tables on the floor plan and in diner booking (Main, Patio, Bar…).',
  shape: 'How the table appears on the floor plan. You can still resize and rotate it later.',
  combinable: 'Allow joining this table with nearby combinable tables for larger parties.',
  active: 'Inactive tables are hidden from diner booking and floor assignment.',
  requiresManualApproval: 'Bookings assigned to this table stay pending until staff confirms.',
  photoUrl: 'Optional photo shown on the diner restaurant page.',
} as const;

function normalizeAreaName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function findAreaName(name: string, areas: string[]) {
  const lower = name.toLowerCase();
  return areas.find((area) => area.toLowerCase() === lower);
}

type FloorAreaSelectProps = {
  value?: string;
  onChange?: (value?: string) => void;
  areas: string[];
  onAddArea?: (value: string) => void;
};

function FloorAreaSelect({ value, onChange, areas, onAddArea }: FloorAreaSelectProps) {
  const [draft, setDraft] = useState('');

  const options = useMemo(() => {
    const seen = new Set<string>();
    const items: { value: string; label: string }[] = [];
    for (const area of areas) {
      const key = area.toLowerCase();
      if (!area || seen.has(key)) continue;
      seen.add(key);
      items.push({ value: area, label: area });
    }
    if (value && !seen.has(value.toLowerCase())) {
      items.unshift({ value, label: value });
    }
    return items.sort((a, b) => a.label.localeCompare(b.label));
  }, [areas, value]);

  const addArea = () => {
    const next = normalizeAreaName(draft);
    if (!next) return;
    const existing = findAreaName(next, options.map((item) => item.value));
    const selected = existing ?? next;
    if (!existing) onAddArea?.(selected);
    onChange?.(selected);
    setDraft('');
  };

  return (
    <Select
      showSearch
      allowClear
      value={value}
      onChange={(next) => onChange?.(next)}
      options={options}
      placeholder="Select or add an area"
      optionFilterProp="label"
      popupRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '8px 0' }} />
          <Space
            style={{ padding: '0 8px 8px', width: '100%' }}
            orientation="vertical"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Input
              placeholder="New area name"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addArea();
                }
              }}
              maxLength={40}
            />
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={addArea}
              disabled={!normalizeAreaName(draft)}
              block
            >
              Add “{normalizeAreaName(draft) || '…'}”
            </Button>
          </Space>
        </>
      )}
    />
  );
}

type TableFormFieldsProps = {
  floorAreas: string[];
  onAddArea: (area: string) => void;
  /** When false, omit shape (e.g. surfaces that don't show the floor plan). Default true. */
  showShape?: boolean;
};

export function TableFormFields({
  floorAreas,
  onAddArea,
  showShape = true,
}: TableFormFieldsProps) {
  return (
    <>
      <Form.Item
        name="name"
        label="Table name"
        tooltip={tableFormTips.name}
        rules={[{ required: true, message: 'Enter a table name' }]}
        style={{ marginBottom: 12 }}
      >
        <Input placeholder="e.g. T1, Window 4, Banquette" maxLength={40} />
      </Form.Item>

      <Row gutter={12}>
        <Col span={12}>
          <Form.Item
            name="minCapacity"
            label="Min guests"
            tooltip={tableFormTips.minCapacity}
            rules={[{ required: true, message: 'Enter min guests' }]}
            style={{ marginBottom: 12 }}
          >
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="maxCapacity"
            label="Max guests"
            tooltip={tableFormTips.maxCapacity}
            dependencies={['minCapacity']}
            rules={[
              { required: true, message: 'Enter max guests' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const min = getFieldValue('minCapacity');
                  if (value != null && min != null && value < min) {
                    return Promise.reject(new Error('Max must be at least min'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
            style={{ marginBottom: 12 }}
          >
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="floorArea"
        label="Floor area"
        tooltip={tableFormTips.floorArea}
        style={{ marginBottom: 12 }}
      >
        <FloorAreaSelect areas={floorAreas} onAddArea={onAddArea} />
      </Form.Item>

      {showShape ? (
        <Form.Item
          name="shape"
          label="Shape"
          tooltip={tableFormTips.shape}
          style={{ marginBottom: 12 }}
        >
          <Select
            options={TABLE_SHAPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            placeholder="Select shape"
          />
        </Form.Item>
      ) : null}

      <Row gutter={12}>
        <Col xs={24} sm={8}>
          <Form.Item
            name="combinable"
            label="Combinable"
            tooltip={tableFormTips.combinable}
            valuePropName="checked"
            style={{ marginBottom: 12 }}
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item
            name="active"
            label="Active"
            tooltip={tableFormTips.active}
            valuePropName="checked"
            style={{ marginBottom: 12 }}
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item
            name="requiresManualApproval"
            label="Manual approval"
            tooltip={tableFormTips.requiresManualApproval}
            valuePropName="checked"
            style={{ marginBottom: 12 }}
          >
            <Switch />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="photoUrl"
        label="Photo"
        tooltip={tableFormTips.photoUrl}
        style={{ marginBottom: 0 }}
      >
        <PhotoUpload maxCount={1} />
      </Form.Item>
    </>
  );
}
