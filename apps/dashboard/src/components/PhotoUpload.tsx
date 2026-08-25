'use client';

import { useState } from 'react';
import { Upload, Image, Button, message, Progress, Typography, Tag, Space } from 'antd';
import {
  DeleteOutlined,
  InboxOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import { colors } from '@reservations/ui';
import { uploadFile } from '@/lib/upload';

const { Dragger } = Upload;
const { Text } = Typography;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BRAND = colors.brand[600];

interface PhotoUploadProps {
  value?: string[];
  onChange?: (urls: string[]) => void;
  maxCount?: number;
  /** Shown when there is no uploaded image (e.g. taxonomy stock default). Not saved. */
  placeholderSrc?: string | null;
  alt?: string;
}

export default function PhotoUpload({
  value = [],
  onChange,
  maxCount = 10,
  placeholderSrc,
  alt = 'Photo',
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState<Record<string, number>>({});
  const [previewUrl, setPreviewUrl] = useState<string>();

  const handleUpload = async (file: RcFile) => {
    if (file.size > MAX_FILE_SIZE) {
      message.error(`${file.name} exceeds 5MB limit`);
      return false;
    }

    const uid = file.uid;
    setUploading((prev) => ({ ...prev, [uid]: 0 }));

    try {
      const { publicUrl } = await uploadFile(file, file.name, {
        onProgress: (pct) => setUploading((prev) => ({ ...prev, [uid]: pct })),
      });
      onChange?.(maxCount === 1 ? [publicUrl] : [...value, publicUrl]);
      message.success(`${file.name} uploaded`);
    } catch (err: any) {
      message.error(err.message ?? 'Upload failed');
    } finally {
      setUploading((prev) => {
        const copy = { ...prev };
        delete copy[uid];
        return copy;
      });
    }

    return false;
  };

  const handleRemove = (url: string) => {
    onChange?.(value.filter((u) => u !== url));
  };

  const activeUploads = Object.entries(uploading);
  const customSrc = value[0];
  const showingDefault = !customSrc && Boolean(placeholderSrc);
  const displaySrc = customSrc || placeholderSrc || null;
  const singleMode = maxCount === 1;

  const lightbox = previewUrl ? (
    <Image
      style={{ display: 'none' }}
      src={previewUrl}
      alt={alt}
      preview={{
        visible: Boolean(previewUrl),
        src: previewUrl,
        onVisibleChange: (visible) => {
          if (!visible) setPreviewUrl(undefined);
        },
      }}
    />
  ) : null;

  if (singleMode) {
    return (
      <div component="PhotoUpload" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Dragger
          accept="image/*"
          showUploadList={false}
          beforeUpload={handleUpload}
          style={{ width: '100%' }}
        >
          <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
            <InboxOutlined style={{ color: BRAND, fontSize: 28 }} />
          </p>
          <p className="ant-upload-text" style={{ margin: 0, fontSize: 14 }}>
            {showingDefault || customSrc ? 'Click or drag to replace' : 'Click or drag to upload'}
          </p>
          <p className="ant-upload-hint" style={{ margin: '4px 0 0' }}>
            JPG, PNG or WebP — max 5 MB
          </p>
        </Dragger>

        {activeUploads.map(([uid, pct]) => (
          <Progress key={uid} percent={pct} size="small" strokeColor={BRAND} />
        ))}

        {displaySrc ? (
          <div>
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 320,
                aspectRatio: '16 / 10',
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid #e8e8e8',
                background: '#f5f5f5',
              }}
            >
              <img
                src={displaySrc}
                alt={alt}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  cursor: 'pointer',
                }}
                onClick={() => setPreviewUrl(displaySrc)}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = '0.4';
                }}
              />
              <Tag
                color={showingDefault ? undefined : 'success'}
                style={{ position: 'absolute', left: 8, bottom: 8, margin: 0 }}
              >
                {showingDefault ? 'Default' : 'Custom'}
              </Tag>
            </div>
            <Space style={{ marginTop: 8 }}>
              <Button size="small" icon={<EyeOutlined />} onClick={() => setPreviewUrl(displaySrc)}>
                Preview
              </Button>
              {customSrc ? (
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemove(customSrc)}
                >
                  Remove
                </Button>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Stock default — used until you upload
                </Text>
              )}
            </Space>
          </div>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            No image yet
          </Text>
        )}

        {lightbox}
      </div>
    );
  }

  return (
    <div component="PhotoUpload">
      {value.length < maxCount && (
        <Dragger
          accept="image/*"
          multiple
          showUploadList={false}
          beforeUpload={handleUpload}
          style={{ width: '100%', marginBottom: value.length ? 12 : 0 }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ color: BRAND, fontSize: 36 }} />
          </p>
          <p className="ant-upload-text">Click or drag photos here</p>
          <p className="ant-upload-hint">
            JPG, PNG or WebP — max 5 MB each — up to {maxCount} photos
          </p>
        </Dragger>
      )}

      {activeUploads.map(([uid, pct]) => (
        <Progress
          key={uid}
          percent={pct}
          size="small"
          strokeColor={BRAND}
          style={{ maxWidth: 300, marginBottom: 8 }}
        />
      ))}

      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {value.map((url) => (
            <div
              key={url}
              style={{
                position: 'relative',
                width: 104,
                height: 104,
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid #d9d9d9',
                background: '#f5f5f5',
              }}
            >
              <img
                src={url}
                alt={alt}
                width={104}
                height={104}
                style={{ objectFit: 'cover', display: 'block', width: '100%', height: '100%' }}
                onClick={() => setPreviewUrl(url)}
              />
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleRemove(url)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  padding: 0,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {lightbox}
    </div>
  );
}
