'use client';

import { useState } from 'react';
import { Upload, Image, Button, message, Progress } from 'antd';
import {
  DeleteOutlined,
  InboxOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import { colors } from '@reservations/ui';
import { uploadFile } from '@/lib/upload';

const { Dragger } = Upload;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BRAND = colors.brand[600];

interface PhotoUploadProps {
  value?: string[];
  onChange?: (urls: string[]) => void;
  maxCount?: number;
}

export default function PhotoUpload({
  value = [],
  onChange,
  maxCount = 10,
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

      const next = [...value, publicUrl];
      onChange?.(next);
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

  return (
    <div component="PhotoUpload">
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
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
              }}
            >
              <Image
                src={url}
                alt="Restaurant photo"
                width={104}
                height={104}
                style={{ objectFit: 'cover' }}
                preview={{ mask: <EyeOutlined style={{ fontSize: 16 }} /> }}
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
                  background: 'rgba(255,255,255,0.85)',
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </div>
          ))}
        </div>
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

      {value.length < maxCount && (
        <Dragger
          accept="image/*"
          multiple
          showUploadList={false}
          beforeUpload={handleUpload}
          style={{ width: '100%' }}
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
    </div>
  );
}
