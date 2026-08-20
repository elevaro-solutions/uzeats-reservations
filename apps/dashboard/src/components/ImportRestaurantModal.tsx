'use client';

import { useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Descriptions,
  Modal,
  Space,
  Spin,
  Tag,
  Typography,
  Upload,
} from 'antd';
import { CloudUploadOutlined, ImportOutlined, ShopOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

export interface ImportedRestaurantData {
  source: 'doordash' | 'ubereats' | 'unknown';
  name?: string;
  description?: string;
  cuisine?: string;
  priceRange?: number;
  phone?: string;
  website?: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  rating?: number;
  reviewCount?: number;
  menuCategories?: string[];
  menuItems?: Array<{ name: string; description?: string; price?: number; category?: string; imageUrl?: string }>;
  coverImageUrl?: string;
  hours?: string;
}

interface ImportRestaurantModalProps {
  open: boolean;
  onClose: () => void;
  /** Called when the user confirms the import — provides extracted data */
  onImport: (data: ImportedRestaurantData) => void;
}

function apiBaseUrl() {
  const graphqlUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';
  return graphqlUrl.replace(/\/graphql\/?$/, '');
}

async function parseRestaurantMhtml(file: File): Promise<ImportedRestaurantData> {
  const url = `${apiBaseUrl()}/api/import-restaurant`;
  const buffer = await file.arrayBuffer();

  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-Client-App': 'dashboard',
    },
    body: buffer,
  });

  const json = (await res.json()) as { ok?: boolean; data?: ImportedRestaurantData; error?: string };
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? `Server returned ${res.status}`);
  }
  return json.data!;
}

const SOURCE_LABELS: Record<string, string> = {
  doordash: 'DoorDash',
  ubereats: 'Uber Eats',
  unknown: 'Unknown',
};

const SOURCE_STYLES: Record<string, { background: string; color: string; borderColor: string }> = {
  doordash: {
    background: '#fff1f0',
    color: '#ff4d4f',
    borderColor: '#ffd6d9',
  },
  ubereats: {
    background: '#f6ffed',
    color: '#389e0d',
    borderColor: '#d9f7be',
  },
  unknown: {
    background: '#fafafa',
    color: '#8c8c8c',
    borderColor: '#d9d9d9',
  },
};

export default function ImportRestaurantModal({ open, onClose, onImport }: ImportRestaurantModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportedRestaurantData | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPreview(null);
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.mhtml') && !file.name.endsWith('.mht') && file.type !== 'text/html') {
      setError('Please select an .mhtml file saved from DoorDash or Uber Eats.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await parseRestaurantMhtml(file);
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!preview) return;
    onImport(preview);
    handleClose();
  };

  const formatPrice = (cents?: number) =>
    cents != null ? `$${(cents / 100).toFixed(2)}` : '—';

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={
        <Space>
          <ImportOutlined />
          Import Restaurant from Delivery App
        </Space>
      }
      width={680}
      footer={
        preview
          ? [
              <Button key="back" onClick={reset}>
                Upload Different File
              </Button>,
              <Button key="cancel" onClick={handleClose}>
                Cancel
              </Button>,
              <Button key="import" type="primary" icon={<ImportOutlined />} onClick={handleConfirm}>
                Use This Data
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={handleClose}>
                Cancel
              </Button>,
            ]
      }
    >
      {!preview && !loading && (
        <div>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="How to export a restaurant page"
            description={
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                <li>Open the restaurant page on <strong>DoorDash</strong> or <strong>Uber Eats</strong> in your browser.</li>
                <li>Press <kbd>Ctrl+S</kbd> (or <kbd>⌘+S</kbd> on Mac) and choose <strong>Webpage, Single File (.mhtml)</strong>.</li>
                <li>Upload the saved <code>.mhtml</code> file here.</li>
              </ol>
            }
          />
          <div
            style={{
              border: '2px dashed #d9d9d9',
              borderRadius: 8,
              padding: '40px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: '#fafafa',
              transition: 'border-color 0.2s',
            }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) void handleFile(file);
            }}
          >
            <CloudUploadOutlined style={{ fontSize: 48, color: '#bbb', marginBottom: 12 }} />
            <div>
              <Text strong>Click to select or drag & drop an .mhtml file</Text>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Supports DoorDash and Uber Eats restaurant pages
              </Text>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".mhtml,.mht"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = '';
              }}
            />
          </div>
          {error && <Alert type="error" message={error} style={{ marginTop: 12 }} showIcon />}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Parsing restaurant data…</Text>
          </div>
        </div>
      )}

      {preview && !loading && (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Tag
              style={{
                backgroundColor: SOURCE_STYLES[preview.source].background,
                color: SOURCE_STYLES[preview.source].color,
                borderColor: SOURCE_STYLES[preview.source].borderColor,
                fontWeight: 600,
              }}
            >
              {SOURCE_LABELS[preview.source]}
            </Tag>
            <Text type="secondary">Review the extracted data before importing</Text>
          </Space>

          <Descriptions
            bordered
            size="small"
            column={1}
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="Name">
              {preview.name ? <Text strong>{preview.name}</Text> : <Text type="secondary">Not found</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Cuisine">
              {preview.cuisine ?? <Text type="secondary">Not found</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Price Range">
              {preview.priceRange ? '$'.repeat(preview.priceRange) : <Text type="secondary">Not found</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Rating">
              {preview.rating != null
                ? `${preview.rating} ★ (${preview.reviewCount?.toLocaleString() ?? '?'} ratings)`
                : <Text type="secondary">Not found</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Address">
              {preview.address
                ? [preview.address.line1, preview.address.city, preview.address.state, preview.address.zip]
                    .filter(Boolean)
                    .join(', ')
                : <Text type="secondary">Not found</Text>}
            </Descriptions.Item>
            {preview.hours && (
              <Descriptions.Item label="Hours">{preview.hours}</Descriptions.Item>
            )}
            {preview.description && (
              <Descriptions.Item label="Description">
                <Text style={{ whiteSpace: 'pre-wrap' }}>{preview.description}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>

          {(preview.menuCategories?.length ?? 0) > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Text strong>Menu Categories</Text>
              <div style={{ marginTop: 6 }}>
                {preview.menuCategories!.map((cat) => (
                  <Tag key={cat} style={{ marginBottom: 4 }}>
                    {cat}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {(preview.menuItems?.length ?? 0) > 0 && (
            <div>
              <Text strong>
                Menu Items{' '}
                <Badge count={preview.menuItems!.length} showZero style={{ backgroundColor: '#52c41a' }} />
              </Text>
              <div
                style={{
                  marginTop: 6,
                  maxHeight: 180,
                  overflowY: 'auto',
                  border: '1px solid #f0f0f0',
                  borderRadius: 6,
                  padding: '8px 12px',
                }}
              >
                {preview.menuItems!.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '3px 0',
                      borderBottom: i < preview.menuItems!.length - 1 ? '1px solid #f5f5f5' : 'none',
                    }}
                  >
                    <Text style={{ fontSize: 13 }}>{item.name}</Text>
                    {item.price != null && (
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {formatPrice(item.price)}
                      </Text>
                    )}
                  </div>
                ))}
              </div>
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                Menu items will be available after restaurant creation under Menu management.
              </Text>
            </div>
          )}

          {error && <Alert type="error" message={error} style={{ marginTop: 12 }} showIcon />}
        </div>
      )}
    </Modal>
  );
}
