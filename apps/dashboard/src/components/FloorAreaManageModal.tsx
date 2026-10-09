'use client';

import { useEffect } from 'react';
import { Form, Input, Modal } from 'antd';
import { normalizeAreaName } from '@/components/TableFormFields';

type FloorAreaManageModalProps = {
  open: boolean;
  mode: 'add' | 'edit';
  /** Current name when editing. */
  initialName?: string;
  existingAreas: string[];
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (name: string) => void | Promise<void>;
};

export function FloorAreaManageModal({
  open,
  mode,
  initialName,
  existingAreas,
  confirmLoading,
  onCancel,
  onSubmit,
}: FloorAreaManageModalProps) {
  const [form] = Form.useForm<{ name: string }>();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({ name: mode === 'edit' ? (initialName ?? '') : '' });
  }, [form, initialName, mode, open]);

  return (
    <Modal
      title={mode === 'edit' ? 'Rename floor area' : 'Add floor area'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
      okText={mode === 'edit' ? 'Save name' : 'Add area'}
      destroyOnHidden
      centered
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => {
          const name = normalizeAreaName(values.name);
          if (!name) return;
          void onSubmit(name);
        }}
        style={{ marginTop: 8 }}
      >
        <Form.Item
          name="name"
          label="Area name"
          extra="Groups tables on the floor plan and in diner booking (Main, Patio, Bar…)."
          rules={[
            { required: true, message: 'Enter an area name' },
            {
              validator: async (_, value) => {
                const next = normalizeAreaName(String(value ?? ''));
                if (!next) return;
                const clash = existingAreas.find(
                  (area) =>
                    area.toLowerCase() === next.toLowerCase() &&
                    (mode !== 'edit' ||
                      area.toLowerCase() !== (initialName ?? '').toLowerCase()),
                );
                if (clash) throw new Error(`“${clash}” already exists`);
              },
            },
          ]}
        >
          <Input placeholder="e.g. Patio, Private dining, Rooftop" maxLength={60} autoFocus />
        </Form.Item>
      </Form>
    </Modal>
  );
}
