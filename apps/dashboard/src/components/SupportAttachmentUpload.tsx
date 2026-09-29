'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Image, Progress, Typography, Upload, App } from 'antd';
import { DeleteOutlined, InboxOutlined, PaperClipOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import {
  SUPPORT_TICKET_ATTACHMENT_CONTENT_TYPES,
  SUPPORT_TICKET_ATTACHMENT_MAX_BYTES,
  SUPPORT_TICKET_ATTACHMENT_MAX_COUNT,
  browserMediaUrl,
} from '@reservations/shared';
import { colors } from '@reservations/ui';
import { uploadFile } from '@/lib/upload';
import { formatBytes } from '@/lib/supportTickets';

const { Dragger } = Upload;
const { Text } = Typography;

export type SupportAttachmentDraft = {
  url: string;
  key?: string;
  filename: string;
  contentType: string;
  size?: number;
};

const ALLOWED_TYPES = new Set<string>(SUPPORT_TICKET_ATTACHMENT_CONTENT_TYPES);

type SupportAttachmentUploadProps = {
  value?: SupportAttachmentDraft[];
  onChange?: (files: SupportAttachmentDraft[]) => void;
  maxCount?: number;
  /** `compact` = paperclip control for chat composers; default is the large dragger. */
  variant?: 'dragger' | 'compact';
  /** Placed before the paperclip in compact mode (e.g. chat text field). */
  leading?: ReactNode;
  /** Placed after the paperclip in compact mode (e.g. send button). */
  trailing?: ReactNode;
};

export default function SupportAttachmentUpload({
  value = [],
  onChange,
  maxCount = SUPPORT_TICKET_ATTACHMENT_MAX_COUNT,
  variant = 'dragger',
  leading,
  trailing,
}: SupportAttachmentUploadProps) {
  const { message } = App.useApp();
  const [uploading, setUploading] = useState<Record<string, number>>({});
  const [previewUrl, setPreviewUrl] = useState<string>();
  const itemsRef = useRef(value);
  const pendingCountRef = useRef(0);

  useEffect(() => {
    if (pendingCountRef.current > 0 && value.length < itemsRef.current.length) return;
    itemsRef.current = value;
  }, [value]);

  const handleUpload = async (file: RcFile) => {
    const contentType = (file.type || '').split(';')[0]?.trim().toLowerCase();
    if (!contentType || !ALLOWED_TYPES.has(contentType)) {
      message.error(`${file.name} must be a JPEG, PNG, WebP, or GIF`);
      return false;
    }
    if (file.size > SUPPORT_TICKET_ATTACHMENT_MAX_BYTES) {
      message.error(`${file.name} exceeds 10 MB`);
      return false;
    }
    if (itemsRef.current.length + pendingCountRef.current >= maxCount) {
      message.warning(`You can attach up to ${maxCount} images`);
      return false;
    }

    pendingCountRef.current += 1;
    const uid = file.uid;
    setUploading((prev) => ({ ...prev, [uid]: 0 }));

    try {
      const { publicUrl, key } = await uploadFile(file, file.name, {
        onProgress: (pct) => setUploading((prev) => ({ ...prev, [uid]: pct })),
      });
      const next = [
        ...itemsRef.current,
        {
          url: publicUrl,
          key,
          filename: file.name,
          contentType,
          size: file.size,
        },
      ];
      itemsRef.current = next;
      onChange?.(next);
      message.success(`${file.name} attached`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
      setUploading((prev) => {
        const copy = { ...prev };
        delete copy[uid];
        return copy;
      });
    }

    return false;
  };

  const handleRemove = (url: string) => {
    const next = itemsRef.current.filter((item) => item.url !== url);
    itemsRef.current = next;
    onChange?.(next);
  };

  const activeUploads = Object.entries(uploading);

  if (variant === 'compact') {
    return (
      <div component="SupportAttachmentUpload">
        {value.length > 0 || activeUploads.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 8,
              alignItems: 'center',
            }}
          >
            {value.map((item) => (
              <div
                key={item.url}
                style={{
                  position: 'relative',
                  width: 56,
                  height: 56,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: `1px solid ${colors.bordersubtle}`,
                  background: colors.neutral[50],
                }}
              >
                <button
                  type="button"
                  onClick={() => setPreviewUrl(item.url)}
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    padding: 0,
                    border: 0,
                    cursor: 'pointer',
                    background: 'transparent',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={browserMediaUrl(item.url)}
                    alt={item.filename}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </button>
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemove(item.url)}
                  aria-label={`Remove ${item.filename}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 22,
                    height: 22,
                    minWidth: 22,
                    padding: 0,
                    background: 'rgba(255,255,255,0.9)',
                  }}
                />
              </div>
            ))}
            {activeUploads.map(([uid, pct]) => (
              <div key={uid} style={{ width: 56 }}>
                <Progress percent={pct} size="small" showInfo={false} />
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {leading ? <div style={{ flex: 1, minWidth: 0 }}>{leading}</div> : null}
          <Upload
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            showUploadList={false}
            beforeUpload={handleUpload}
            disabled={value.length >= maxCount}
          >
            <Button
              type="text"
              shape="circle"
              icon={<PaperClipOutlined />}
              disabled={value.length >= maxCount}
              aria-label="Attach image"
              title="Attach image"
            />
          </Upload>
          {trailing}
        </div>

        {previewUrl ? (
          <Image
            style={{ display: 'none' }}
            src={previewUrl}
            alt="Attachment preview"
            preview={{
              visible: Boolean(previewUrl),
              src: previewUrl,
              onVisibleChange: (visible) => {
                if (!visible) setPreviewUrl(undefined);
              },
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div component="SupportAttachmentUpload">
      <Dragger
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        showUploadList={false}
        beforeUpload={handleUpload}
        disabled={value.length >= maxCount}
      >
        <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
          <InboxOutlined style={{ color: colors.brand[600], fontSize: 28 }} />
        </p>
        <p className="ant-upload-text" style={{ margin: 0, fontSize: 14 }}>
          Click or drag screenshots
        </p>
        <p className="ant-upload-hint" style={{ margin: '4px 0 0' }}>
          JPEG, PNG, WebP, or GIF — up to {maxCount} files, 10 MB each
        </p>
      </Dragger>

      {activeUploads.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          {activeUploads.map(([uid, pct]) => (
            <Progress key={uid} percent={pct} size="small" />
          ))}
        </div>
      ) : null}

      {value.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginTop: 12,
          }}
        >
          {value.map((item) => (
            <div
              key={item.url}
              style={{
                width: 104,
                border: `1px solid ${colors.bordersubtle}`,
                borderRadius: 8,
                overflow: 'hidden',
                background: '#fff',
              }}
            >
              <button
                type="button"
                onClick={() => setPreviewUrl(item.url)}
                style={{
                  display: 'block',
                  width: '100%',
                  height: 72,
                  padding: 0,
                  border: 0,
                  cursor: 'pointer',
                  background: '#f7f5f2',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={browserMediaUrl(item.url)}
                  alt={item.filename}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </button>
              <div style={{ padding: '6px 8px 8px' }}>
                <Text ellipsis style={{ display: 'block', fontSize: 12 }} title={item.filename}>
                  {item.filename}
                </Text>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {formatBytes(item.size)}
                  </Text>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemove(item.url)}
                    aria-label={`Remove ${item.filename}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {previewUrl ? (
        <Image
          style={{ display: 'none' }}
          src={previewUrl}
          alt="Attachment preview"
          preview={{
            visible: Boolean(previewUrl),
            src: previewUrl,
            onVisibleChange: (visible) => {
              if (!visible) setPreviewUrl(undefined);
            },
          }}
        />
      ) : null}
    </div>
  );
}
