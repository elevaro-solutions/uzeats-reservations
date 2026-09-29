'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Button, Image, Input, Modal, Rate, Space, Typography, message } from 'antd';
import { DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import { REVIEW_MAX_PHOTOS, browserMediaUrl } from '@reservations/shared';
import { UPDATE_REVIEW } from '@/lib/graphql';
import { uploadFile } from '@/lib/upload';

const { Text } = Typography;

const MAX_FILE_SIZE = 5 * 1024 * 1024;

type QualityKey = 'overall' | 'food' | 'service' | 'atmosphere';

const QUALITY_ROWS: { key: QualityKey; label: string }[] = [
  { key: 'overall', label: 'Overall' },
  { key: 'food', label: 'Food' },
  { key: 'service', label: 'Service' },
  { key: 'atmosphere', label: 'Atmosphere' },
];

export type EditableReview = {
  id: string;
  rating: number;
  foodRating?: number | null;
  serviceRating?: number | null;
  atmosphereRating?: number | null;
  comment?: string | null;
  photos: string[];
  restaurant?: { name?: string | null } | null;
};

type Props = {
  open: boolean;
  review: EditableReview | null;
  onClose: () => void;
  onSaved?: () => void;
};

export function EditReviewModal({ open, review, onClose, onSaved }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ratings, setRatings] = useState({
    overall: 0,
    food: 0,
    service: 0,
    atmosphere: 0,
  });
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updateReview] = useMutation(UPDATE_REVIEW);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened || !review) return;
    setRatings({
      overall: review.rating,
      food: review.foodRating ?? 0,
      service: review.serviceRating ?? 0,
      atmosphere: review.atmosphereRating ?? 0,
    });
    setComment(review.comment ?? '');
    setPhotos(review.photos ?? []);
    setUploadingPhotos(false);
    setSubmitting(false);
  }, [open, review]);

  const hasAllRatings =
    ratings.overall > 0 &&
    ratings.food > 0 &&
    ratings.service > 0 &&
    ratings.atmosphere > 0;

  const handlePickPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = REVIEW_MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      message.warning(`You can attach up to ${REVIEW_MAX_PHOTOS} photos`);
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    setUploadingPhotos(true);
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        if (!file.type.startsWith('image/')) {
          message.error(`${file.name} is not an image`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          message.error(`${file.name} exceeds 5MB limit`);
          continue;
        }
        const { publicUrl } = await uploadFile(file, file.name);
        uploaded.push(publicUrl);
      }
      if (uploaded.length) {
        setPhotos((prev) => [...prev, ...uploaded].slice(0, REVIEW_MAX_PHOTOS));
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not upload photo');
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!review) return;
    if (!hasAllRatings) {
      message.warning('Please rate overall, food, service, and atmosphere');
      return;
    }
    setSubmitting(true);
    try {
      await updateReview({
        variables: {
          reviewId: review.id,
          input: {
            rating: ratings.overall,
            foodRating: ratings.food,
            serviceRating: ratings.service,
            atmosphereRating: ratings.atmosphere,
            comment,
            photos,
          },
        },
      });
      message.success('Review updated');
      onSaved?.();
      onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not update review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Edit your review"
      open={open}
      onCancel={onClose}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={submitting || uploadingPhotos}
          disabled={!hasAllRatings || uploadingPhotos}
          onClick={() => void handleSubmit()}
        >
          Save changes
        </Button>,
      ]}
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Text>
          Update your ratings for{' '}
          <Text strong>{review?.restaurant?.name ?? 'this restaurant'}</Text>.
        </Text>
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          {QUALITY_ROWS.map(({ key, label }) => (
            <div key={key}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>
                {label}
              </Text>
              <Rate
                value={ratings[key]}
                onChange={(value) => setRatings((prev) => ({ ...prev, [key]: value }))}
                style={key === 'overall' ? { fontSize: 28 } : undefined}
              />
            </div>
          ))}
        </Space>
        <Input.TextArea
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="How was your visit?"
          maxLength={1000}
          showCount
        />
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Photos (optional)
          </Text>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
            Up to {REVIEW_MAX_PHOTOS} images, 5MB each
          </Text>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            hidden
            onChange={(e) => void handlePickPhotos(e.target.files)}
          />
          {photos.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <Image.PreviewGroup>
                {photos.map((url) => (
                  <div key={url} style={{ position: 'relative' }}>
                    <Image
                      src={browserMediaUrl(url)}
                      alt="Review photo"
                      width={72}
                      height={72}
                      style={{ objectFit: 'cover', borderRadius: 8 }}
                    />
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label="Remove photo"
                      onClick={() => setPhotos((prev) => prev.filter((p) => p !== url))}
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        background: 'rgba(255,255,255,0.85)',
                      }}
                    />
                  </div>
                ))}
              </Image.PreviewGroup>
            </div>
          )}
          {photos.length < REVIEW_MAX_PHOTOS && (
            <Button
              icon={<PictureOutlined />}
              loading={uploadingPhotos}
              onClick={() => fileInputRef.current?.click()}
            >
              Add photos
            </Button>
          )}
        </div>
      </Space>
    </Modal>
  );
}
