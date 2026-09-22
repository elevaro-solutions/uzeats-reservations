'use client';

import { Button, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import type { ReactNode } from 'react';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

export type ListExportFormat = 'xlsx' | 'pdf' | 'json';

const LABELS: Record<ListExportFormat, string> = {
  xlsx: 'Excel',
  pdf: 'PDF',
  json: 'JSON',
};

const ICONS: Record<ListExportFormat, ReactNode> = {
  xlsx: <FileExcelOutlined />,
  pdf: <FilePdfOutlined />,
  json: <FileTextOutlined />,
};

type Props = {
  formats: ListExportFormat[];
  loading?: boolean;
  disabled?: boolean;
  onExport: (format: ListExportFormat) => void;
};

export function ExportMenu({ formats, loading, disabled, onExport }: Props) {
  const items: MenuProps['items'] = formats.map((format) => ({
    key: format,
    icon: ICONS[format],
    label: LABELS[format],
    onClick: () => onExport(format),
  }));

  return (
    <Dropdown menu={{ items }} trigger={['click']} disabled={disabled}>
      <Button icon={<DownloadOutlined />} loading={loading} disabled={disabled}>
        Export
      </Button>
    </Dropdown>
  );
}
