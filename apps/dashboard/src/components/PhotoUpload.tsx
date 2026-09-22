'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Image, Button, message, Progress, Typography, Tag, Space, Tooltip } from 'antd';
import {
  DeleteOutlined,
  InboxOutlined,
  EyeOutlined,
  HolderOutlined,
  LeftOutlined,
  RightOutlined,
  StarOutlined,
} from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import { colors } from '@reservations/ui';
import { uploadFile } from '@/lib/upload';

const { Dragger } = Upload;
const { Text } = Typography;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BRAND = colors.brand[600];
const HERO_SLOT_COUNT = 3;

interface PhotoUploadProps {
  value?: string[];
  onChange?: (urls: string[]) => void;
  maxCount?: number;
  /** Shown when there is no uploaded image (e.g. taxonomy stock default). Not saved. */
  placeholderSrc?: string | null;
  alt?: string;
  /**
   * Restaurant gallery mode: first photo is the large hero, the next two sit beside it.
   * Defaults on when more than one photo is allowed.
   */
  showHeroOrder?: boolean;
}

function galleryRole(index: number): { label: string; color?: string } {
  if (index === 0) return { label: 'Hero', color: 'gold' };
  if (index < HERO_SLOT_COUNT) return { label: `Hero ${index + 1}`, color: 'blue' };
  return { label: 'Gallery' };
}

function moveItem(urls: string[], from: number, to: number): string[] {
  if (to < 0 || to >= urls.length || from === to) return urls;
  const next = [...urls];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function PhotoUpload({
  value = [],
  onChange,
  maxCount = 10,
  placeholderSrc,
  alt = 'Photo',
  showHeroOrder,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState<Record<string, number>>({});
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const urlsRef = useRef(value);
  const pendingCountRef = useRef(0);
  const extraWarnedRef = useRef(false);

  useEffect(() => {
    // Parent can lag behind concurrent uploads; don't shrink the ref mid-batch.
    if (pendingCountRef.current > 0 && value.length < urlsRef.current.length) {
      return;
    }
    urlsRef.current = value;
  }, [value]);

  const heroOrder = showHeroOrder ?? maxCount !== 1;

  const handleUpload = async (file: RcFile) => {
    if (file.size > MAX_FILE_SIZE) {
      message.error(`${file.name} exceeds 5MB limit`);
      return false;
    }

    const occupied = maxCount === 1 ? 0 : urlsRef.current.length;
    if (occupied + pendingCountRef.current >= maxCount) {
      if (!extraWarnedRef.current) {
        extraWarnedRef.current = true;
        message.warning(`You can upload up to ${maxCount} photo${maxCount === 1 ? '' : 's'}`);
        queueMicrotask(() => {
          extraWarnedRef.current = false;
        });
      }
      return false;
    }

    pendingCountRef.current += 1;
    const uid = file.uid;
    setUploading((prev) => ({ ...prev, [uid]: 0 }));

    try {
      const { publicUrl } = await uploadFile(file, file.name, {
        onProgress: (pct) => setUploading((prev) => ({ ...prev, [uid]: pct })),
      });
      const next = maxCount === 1 ? [publicUrl] : [...urlsRef.current, publicUrl];
      urlsRef.current = next;
      onChange?.(next);
      message.success(`${file.name} uploaded`);
    } catch (err: any) {
      message.error(err.message ?? 'Upload failed');
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
    const next = urlsRef.current.filter((u) => u !== url);
    urlsRef.current = next;
    onChange?.(next);
  };

  const handleReorder = (from: number, to: number) => {
    const next = moveItem(urlsRef.current, from, to);
    urlsRef.current = next;
    onChange?.(next);
  };

  const handleSetHero = (index: number) => {
    if (index === 0) return;
    const next = moveItem(urlsRef.current, index, 0);
    urlsRef.current = next;
    onChange?.(next);
    message.success('Hero photo updated');
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

  const hero = value[0];
  const side = value.slice(1, HERO_SLOT_COUNT);
  const extraCount = Math.max(0, value.length - HERO_SLOT_COUNT);

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

      {heroOrder && value.length > 0 && (
        <div className="rt-photo-hero-order">
          <Text strong style={{ display: 'block', marginBottom: 4 }}>
            Public hero preview
          </Text>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            Drag photos below to change what diners see first. The first image is the large hero;
            the next two appear beside it. Remaining photos show in the gallery.
          </Text>
          <div
            className={
              value.length === 1
                ? 'rt-photo-hero-preview rt-photo-hero-preview--single'
                : 'rt-photo-hero-preview'
            }
          >
            <button
              type="button"
              className="rt-photo-hero-preview__hero"
              onClick={() => setPreviewUrl(hero)}
              aria-label="Preview hero photo"
            >
              <img src={hero} alt={`${alt} hero`} />
            </button>
            {value.length > 1 && (
              <div className="rt-photo-hero-preview__side">
                {side.map((url, i) => (
                  <button
                    key={`${url}-side-${i}`}
                    type="button"
                    className="rt-photo-hero-preview__thumb"
                    onClick={() => setPreviewUrl(url)}
                    aria-label={`Preview hero gallery photo ${i + 2}`}
                  >
                    <img src={url} alt={`${alt} ${i + 2}`} />
                    {i === 1 && extraCount > 0 && (
                      <span className="rt-photo-hero-preview__more">+{extraCount} photos</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {value.length > 0 && (
        <div className="rt-photo-sort-grid" style={{ marginTop: 12 }}>
          {value.map((url, index) => {
            const role = galleryRole(index);
            const isDragging = dragIndex === index;
            const isDropTarget = dropIndex === index && dragIndex !== index;
            return (
              <div
                key={`${url}-${index}`}
                className={[
                  'rt-photo-sort-tile',
                  isDragging ? 'rt-photo-sort-tile--dragging' : '',
                  isDropTarget ? 'rt-photo-sort-tile--drop' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                draggable={heroOrder}
                onDragStart={(e) => {
                  setDragIndex(index);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(index));
                }}
                onDragOver={(e) => {
                  if (dragIndex === null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDropIndex(index);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain'));
                  handleReorder(from, index);
                  setDragIndex(null);
                  setDropIndex(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDropIndex(null);
                }}
              >
                <img
                  src={url}
                  alt={`${alt} ${index + 1}`}
                  onClick={() => setPreviewUrl(url)}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.opacity = '0.4';
                  }}
                />
                <Tag
                  color={role.color}
                  className="rt-photo-sort-tile__badge"
                >
                  {role.label}
                </Tag>
                {heroOrder && (
                  <span className="rt-photo-sort-tile__handle" aria-hidden>
                    <HolderOutlined />
                  </span>
                )}
                <div
                  className="rt-photo-sort-tile__actions"
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {heroOrder && (
                    <>
                      <Tooltip title="Move earlier">
                        <Button
                          type="text"
                          size="small"
                          disabled={index === 0}
                          icon={<LeftOutlined />}
                          onClick={() => handleReorder(index, index - 1)}
                          aria-label={`Move photo ${index + 1} earlier`}
                        />
                      </Tooltip>
                      <Tooltip title="Move later">
                        <Button
                          type="text"
                          size="small"
                          disabled={index === value.length - 1}
                          icon={<RightOutlined />}
                          onClick={() => handleReorder(index, index + 1)}
                          aria-label={`Move photo ${index + 1} later`}
                        />
                      </Tooltip>
                      <Tooltip title={index === 0 ? 'Current hero' : 'Set as hero'}>
                        <Button
                          type="text"
                          size="small"
                          disabled={index === 0}
                          icon={<StarOutlined />}
                          onClick={() => handleSetHero(index)}
                          aria-label={`Set photo ${index + 1} as hero`}
                        />
                      </Tooltip>
                    </>
                  )}
                  <Tooltip title="Preview">
                    <Button
                      type="text"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => setPreviewUrl(url)}
                      aria-label={`Preview photo ${index + 1}`}
                    />
                  </Tooltip>
                  <Tooltip title="Remove">
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemove(url)}
                      aria-label={`Remove photo ${index + 1}`}
                    />
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lightbox}
    </div>
  );
}
