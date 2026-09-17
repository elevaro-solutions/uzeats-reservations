'use client';

import { useMutation } from '@apollo/client/react';
import {
  Button,
  Checkbox,
  Image,
  Input,
  Modal,
  Rate,
  Space,
  Typography,
  message,
} from 'antd';
import {
  BookOutlined,
  CalendarOutlined,
  DeleteOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { REVIEW_MAX_PHOTOS, buildRestaurantBookingPath } from '@reservations/shared';
import { CREATE_REVIEW, SAVE_RESTAURANT } from '@/lib/graphql';
import { uploadFile } from '@/lib/upload';

const { Text } = Typography;

const MAX_FILE_SIZE = 5 * 1024 * 1024;

type RestaurantInfo = {
  id?: string;
  name?: string;
  slug?: string;
  isSaved?: boolean;
} | null;

type Props = {
  open: boolean;
  reservationId: string | null;
  partySize?: number;
  restaurant?: RestaurantInfo;
  onClose: () => void;
  onCompleted?: () => void;
};

type QualityKey = 'overall' | 'food' | 'service' | 'atmosphere';

const EMPTY_RATINGS = {
  overall: 0,
  food: 0,
  service: 0,
  atmosphere: 0,
};

const QUALITY_ROWS: { key: QualityKey; label: string }[] = [
  { key: 'overall', label: 'Overall' },
  { key: 'food', label: 'Food' },
  { key: 'service', label: 'Service' },
  { key: 'atmosphere', label: 'Atmosphere' },
];

export function PostVisitModal({
  open,
  reservationId,
  partySize,
  restaurant,
  onClose,
  onCompleted,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'review' | 'done'>('review');
  const [ratings, setRatings] = useState(EMPTY_RATINGS);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [saveRestaurantChecked, setSaveRestaurantChecked] = useState(true);
  const [wasAlreadySaved, setWasAlreadySaved] = useState(false);
  const [didSaveRestaurant, setDidSaveRestaurant] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createReview] = useMutation(CREATE_REVIEW);
  const [saveRestaurant] = useMutation(SAVE_RESTAURANT);

  const hasAllRatings =
    ratings.overall > 0 &&
    ratings.food > 0 &&
    ratings.service > 0 &&
    ratings.atmosphere > 0;

  useEffect(() => {
    if (!open) return;
    const alreadySaved = !!restaurant?.isSaved;
    setStep('review');
    setRatings(EMPTY_RATINGS);
    setComment('');
    setPhotos([]);
    setUploadingPhotos(false);
    setWasAlreadySaved(alreadySaved);
    setSaveRestaurantChecked(!alreadySaved);
    setDidSaveRestaurant(false);
    setSubmitting(false);
    // Capture restaurant save state only when opening for a reservation.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open, reservationId]);

  const bookAgainPath = (() => {
    const path = buildRestaurantBookingPath(restaurant?.slug, restaurant?.id);
    if (!partySize) return path;
    return `${path}?party=${partySize}`;
  })();

  const setQuality = (key: QualityKey, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

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
    if (!reservationId) return;
    if (!hasAllRatings) {
      message.warning('Please rate overall, food, service, and atmosphere');
      return;
    }
    setSubmitting(true);
    try {
      await createReview({
        variables: {
          input: {
            reservationId,
            rating: ratings.overall,
            foodRating: ratings.food,
            serviceRating: ratings.service,
            atmosphereRating: ratings.atmosphere,
            comment,
            ...(photos.length ? { photos } : {}),
          },
        },
      });

      let saved = false;
      if (saveRestaurantChecked && restaurant?.id && !wasAlreadySaved) {
        try {
          await saveRestaurant({ variables: { restaurantId: restaurant.id } });
          saved = true;
        } catch {
          // Review succeeded; saving is best-effort.
        }
      }

      setDidSaveRestaurant(saved);
      message.success('Thanks for your review!');
      setStep('done');
      onCompleted?.();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      title={step === 'review' ? 'How was your visit?' : 'Thanks for sharing'}
      open={open}
      onCancel={handleClose}
      destroyOnClose
      footer={
        step === 'review'
          ? [
              <Button key="cancel" onClick={handleClose}>
                Not now
              </Button>,
              <Button
                key="submit"
                type="primary"
                loading={submitting || uploadingPhotos}
                disabled={!hasAllRatings || uploadingPhotos}
                onClick={handleSubmit}
              >
                Submit review
              </Button>,
            ]
          : [
              <Button key="done" onClick={handleClose}>
                Done
              </Button>,
              <Button
                key="again"
                type="primary"
                icon={<CalendarOutlined />}
                onClick={() => {
                  handleClose();
                  router.push(bookAgainPath);
                }}
              >
                Book again
              </Button>,
            ]
      }
    >
      {step === 'review' ? (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Text>
            Share ratings for <Text strong>{restaurant?.name ?? 'this restaurant'}</Text>.
          </Text>
          <Space orientation="vertical" size={12} style={{ width: '100%' }}>
            {QUALITY_ROWS.map(({ key, label }) => (
              <div key={key}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  {label}
                </Text>
                <Rate
                  value={ratings[key]}
                  onChange={(value) => setQuality(key, value)}
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
              onChange={(e) => handlePickPhotos(e.target.files)}
            />
            {photos.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <Image.PreviewGroup>
                  {photos.map((url) => (
                    <div key={url} style={{ position: 'relative' }}>
                      <Image
                        src={url}
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
          {restaurant?.id && !wasAlreadySaved && (
            <Checkbox
              checked={saveRestaurantChecked}
              onChange={(e) => setSaveRestaurantChecked(e.target.checked)}
            >
              <Space size={6}>
                <BookOutlined />
                Save this restaurant for later
              </Space>
            </Checkbox>
          )}
          {wasAlreadySaved && (
            <Text type="secondary">
              <BookOutlined /> Already saved to your list
            </Text>
          )}
        </Space>
      ) : (
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          <Text>
            Your review helps other diners. Ready for another night out at{' '}
            <Text strong>{restaurant?.name ?? 'this restaurant'}</Text>?
          </Text>
          {didSaveRestaurant && (
            <Text type="secondary">We also saved it to your list.</Text>
          )}
        </Space>
      )}
    </Modal>
  );
}
