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
import {
  TABLE_SHAPE_SELECT_OPTIONS,
  buildTableShapeSelectOptions,
} from '@/components/TableShapeGlyph';
import { depositAmountWhenRequiredRule } from '@/lib/restaurantFormTooltips';
import { useTableShapes } from '@/lib/useTableShapes';

/** Static fallback — prefer `useTableShapes` / live catalog in forms. */
export const TABLE_SHAPE_OPTIONS = TABLE_SHAPE_SELECT_OPTIONS;

export const tableFormTips = {
  name: 'Label shown on the floor plan and when diners pick a table.',
  minCapacity: 'Smallest party this table can seat.',
  maxCapacity: 'Largest party this table can seat.',
  floorArea: 'Groups tables on the floor plan and in diner booking (Main, Patio, Bar…).',
  shape: 'How the table appears on the floor plan. You can still resize and rotate it later.',
  combinable: 'Allow joining this table with nearby combinable tables for larger parties.',
  active: 'Inactive tables are hidden from diner booking and floor assignment.',
  requiresManualApproval: 'Bookings assigned to this table stay pending until staff confirms.',
  depositRequired:
    'Charge a per-guest deposit for this table instead of the restaurant default. When off, the restaurant deposit setting applies.',
  depositAmount: 'Deposit charged per guest for this table, in USD (e.g. 25.00 = $25.00).',
  cancellationPeriodHours:
    'Hours before the reservation when free cancellation ends for bookings on this table. Leave empty to use the restaurant or platform default.',
  photoUrl: 'Optional photo shown on the diner restaurant page.',
} as const;

/** Table form values hold the deposit in dollars; the API stores cents. */
export type TableDepositFormValues = {
  depositRequired?: boolean;
  depositAmount?: number | null;
  cancellationPeriodHours?: number | null;
};

export function tableDepositFormValues(table: {
  depositRequired?: boolean | null;
  depositAmountCents?: number | null;
  cancellationPeriodHours?: number | null;
}): TableDepositFormValues {
  return {
    depositRequired: table.depositRequired ?? false,
    depositAmount: table.depositAmountCents ? table.depositAmountCents / 100 : null,
    cancellationPeriodHours: table.cancellationPeriodHours ?? null,
  };
}

export function tableDepositInput(values: TableDepositFormValues) {
  const depositRequired = values.depositRequired ?? false;
  return {
    depositRequired,
    depositAmountCents: depositRequired
      ? Math.round((Number(values.depositAmount) || 0) * 100)
      : 0,
    cancellationPeriodHours:
      values.cancellationPeriodHours == null || !(Number(values.cancellationPeriodHours) >= 1)
        ? null
        : Math.round(Number(values.cancellationPeriodHours)),
  };
}

export function normalizeAreaName(value: string) {
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

export function FloorAreaSelect({ value, onChange, areas, onAddArea }: FloorAreaSelectProps) {
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
  const form = Form.useFormInstance();
  const depositRequired = Form.useWatch('depositRequired', form);
  const { shapes } = useTableShapes();
  const shapeOptions = useMemo(
    () => (shapes.length ? buildTableShapeSelectOptions(shapes) : TABLE_SHAPE_OPTIONS),
    [shapes],
  );

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
            dependencies={['maxCapacity']}
            rules={[
              { required: true, message: 'Enter min guests' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const max = getFieldValue('maxCapacity');
                  if (value != null && max != null && value > max) {
                    return Promise.reject(new Error('Min cannot be greater than max'));
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
                    return Promise.reject(new Error('Max cannot be less than min'));
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
            options={shapeOptions}
            optionLabelProp="label"
            popupMatchSelectWidth={240}
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

      <Row gutter={12}>
        <Col xs={24} sm={8}>
          <Form.Item
            name="depositRequired"
            label="Require deposit"
            tooltip={tableFormTips.depositRequired}
            valuePropName="checked"
            style={{ marginBottom: 12 }}
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col xs={24} sm={16}>
          <Form.Item
            name="depositAmount"
            label="Deposit per guest (USD)"
            tooltip={tableFormTips.depositAmount}
            dependencies={['depositRequired']}
            rules={[depositAmountWhenRequiredRule]}
            style={{ marginBottom: 12 }}
          >
            <InputNumber
              min={0}
              max={10_000}
              precision={2}
              prefix="$"
              disabled={!depositRequired}
              placeholder="Uses restaurant default"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="cancellationPeriodHours"
        label="Cancel / no-show window (hours)"
        tooltip={tableFormTips.cancellationPeriodHours}
        style={{ marginBottom: 12 }}
      >
        <InputNumber
          min={1}
          max={720}
          precision={0}
          placeholder="Restaurant / platform default"
          style={{ width: '100%' }}
        />
      </Form.Item>

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
