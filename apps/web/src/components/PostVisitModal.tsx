'use client';

import { useMutation } from '@apollo/client/react';
import { Button, Checkbox, Input, Modal, Rate, Space, Typography, message } from 'antd';
import { BookOutlined, CalendarOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildRestaurantBookingPath } from '@reservations/shared';
import { CREATE_REVIEW, SAVE_RESTAURANT } from '@/lib/graphql';

const { Text } = Typography;

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
  const [step, setStep] = useState<'review' | 'done'>('review');
  const [ratings, setRatings] = useState({
    overall: 5,
    food: 5,
    service: 5,
    atmosphere: 5,
  });
  const [comment, setComment] = useState('');
  const [saveRestaurantChecked, setSaveRestaurantChecked] = useState(true);
  const [wasAlreadySaved, setWasAlreadySaved] = useState(false);
  const [didSaveRestaurant, setDidSaveRestaurant] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createReview] = useMutation(CREATE_REVIEW);
  const [saveRestaurant] = useMutation(SAVE_RESTAURANT);

  useEffect(() => {
    if (!open) return;
    const alreadySaved = !!restaurant?.isSaved;
    setStep('review');
    setRatings({ overall: 5, food: 5, service: 5, atmosphere: 5 });
    setComment('');
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

  const handleSubmit = async () => {
    if (!reservationId) return;
    if (
      ratings.overall < 1 ||
      ratings.food < 1 ||
      ratings.service < 1 ||
      ratings.atmosphere < 1
    ) {
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
              <Button key="submit" type="primary" loading={submitting} onClick={handleSubmit}>
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
