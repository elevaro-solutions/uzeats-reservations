'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Button, Image, Rate, Typography, message } from 'antd';
import { HeartFilled, HeartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  REVIEW_REACTION_OPTIONS,
  browserMediaUrl,
  type ReviewReactionType,
} from '@reservations/shared';
import { colors } from '@reservations/ui';

dayjs.extend(relativeTime);

const { Text, Paragraph } = Typography;

export type RestaurantReviewItem = {
  id?: string;
  rating: number;
  foodRating?: number | null;
  serviceRating?: number | null;
  atmosphereRating?: number | null;
  comment?: string | null;
  photos?: string[] | null;
  createdAt?: string;
  ownerReply?: string | null;
  dinerId?: string;
  diner?: { firstName?: string; lastName?: string };
  reactionCounts?: {
    love: number;
    helpful: number;
    amazing: number;
    yum: number;
    omg: number;
    total: number;
  } | null;
  myReaction?: ReviewReactionType | null;
};

type Props = {
  review: RestaurantReviewItem;
  currentUserId?: string | null;
  onReact?: (reviewId: string, reaction: ReviewReactionType) => Promise<void>;
};

export function RestaurantReviewCard({
  review,
  currentUserId,
  onReact,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reacting, setReacting] = useState(false);
  const commentRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const comment = review.comment?.trim() ?? '';
  const counts = review.reactionCounts;
  const myReaction = review.myReaction ?? null;
  const activeOption =
    REVIEW_REACTION_OPTIONS.find((option) => option.type === myReaction) ?? null;
  const isOwn = Boolean(currentUserId && review.dinerId && currentUserId === review.dinerId);

  useLayoutEffect(() => {
    if (expanded) {
      setOverflows(false);
      return;
    }
    if (!comment) {
      setOverflows(Boolean(review.ownerReply?.trim()));
      return;
    }
    const el = commentRef.current;
    if (!el) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1 || Boolean(review.ownerReply?.trim()));
  }, [comment, expanded, review.ownerReply]);

  const showReadMore = overflows || expanded;

  const openPicker = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setPickerOpen(true);
  };

  const closePickerSoon = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setPickerOpen(false), 160);
  };

  const handleReact = async (reaction: ReviewReactionType) => {
    if (!review.id || !onReact) return;
    if (isOwn) {
      message.info('You cannot react to your own review');
      return;
    }
    setReacting(true);
    try {
      await onReact(review.id, reaction);
      setPickerOpen(false);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not save reaction');
    } finally {
      setReacting(false);
    }
  };

  return (
    <article className="rt-restaurant-review">
      <div className="rt-restaurant-review__header">
        <div className="rt-restaurant-review__avatar">
          {(review.diner?.firstName?.[0] ?? 'G').toUpperCase()}
        </div>
        <div>
          <Text strong>
            {review.diner?.firstName}{' '}
            {review.diner?.lastName?.[0] ? `${review.diner.lastName[0]}.` : ''}
          </Text>
          <div className="rt-restaurant-review__meta">
            <Rate disabled value={review.rating} style={{ fontSize: 12 }} />
            {review.createdAt && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(review.createdAt).fromNow()}
              </Text>
            )}
          </div>
        </div>
      </div>

      {comment ? (
        <div className="rt-restaurant-review__comment-wrap">
          <div
            ref={commentRef}
            className={
              expanded
                ? 'rt-restaurant-review__comment'
                : 'rt-restaurant-review__comment rt-restaurant-review__comment--clamp'
            }
          >
            {comment}
          </div>
          {showReadMore && (
            <button
              type="button"
              className="rt-restaurant-review__read-more"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      ) : showReadMore ? (
        <div className="rt-restaurant-review__comment-wrap">
          <button
            type="button"
            className="rt-restaurant-review__read-more"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        </div>
      ) : null}

      {(review.foodRating != null ||
        review.serviceRating != null ||
        review.atmosphereRating != null) && (
        <div className="rt-restaurant-review__qualities">
          {review.foodRating != null && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Food {review.foodRating}/5
            </Text>
          )}
          {review.serviceRating != null && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Service {review.serviceRating}/5
            </Text>
          )}
          {review.atmosphereRating != null && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Atmosphere {review.atmosphereRating}/5
            </Text>
          )}
        </div>
      )}

      {review.photos && review.photos.length > 0 && (
        <div className="rt-restaurant-review__photos">
          <Image.PreviewGroup>
            {review.photos.map((url) => (
              <Image
                key={url}
                src={browserMediaUrl(url)}
                alt="Review photo"
                width={72}
                height={72}
                style={{ objectFit: 'cover', borderRadius: 8 }}
              />
            ))}
          </Image.PreviewGroup>
        </div>
      )}

      {expanded && review.ownerReply ? (
        <div className="rt-restaurant-review__reply">
          <Text strong style={{ fontSize: 13 }}>
            Response from the restaurant
          </Text>
          <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>{review.ownerReply}</Paragraph>
        </div>
      ) : null}

      {onReact ? (
        <div
          className="rt-restaurant-review__react"
          onMouseEnter={openPicker}
          onMouseLeave={closePickerSoon}
        >
          {pickerOpen ? (
            <div
              className="rt-restaurant-review__react-picker"
              role="group"
              aria-label="React to this review"
              onMouseEnter={openPicker}
              onMouseLeave={closePickerSoon}
            >
              {REVIEW_REACTION_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  className={
                    myReaction === option.type
                      ? 'rt-restaurant-review__react-emoji is-active'
                      : 'rt-restaurant-review__react-emoji'
                  }
                  title={option.label}
                  aria-label={option.label}
                  disabled={reacting || isOwn}
                  onClick={() => void handleReact(option.type)}
                >
                  <span aria-hidden>{option.emoji}</span>
                  {(counts?.[option.type] ?? 0) > 0 ? (
                    <span className="rt-restaurant-review__react-count">
                      {counts?.[option.type]}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
          <Button
            type="text"
            size="small"
            loading={reacting}
            className={
              myReaction
                ? 'rt-restaurant-review__react-trigger is-active'
                : 'rt-restaurant-review__react-trigger'
            }
            icon={
              activeOption ? (
                <span aria-hidden style={{ fontSize: 16 }}>
                  {activeOption.emoji}
                </span>
              ) : myReaction ? (
                <HeartFilled style={{ color: colors.brand[600] }} />
              ) : (
                <HeartOutlined />
              )
            }
            onClick={() => {
              if (isOwn) {
                message.info('You cannot react to your own review');
                return;
              }
              if (myReaction) {
                void handleReact(myReaction);
                return;
              }
              setPickerOpen(true);
            }}
          >
            {myReaction
              ? activeOption?.label ?? 'Reacted'
              : (counts?.total ?? 0) > 0
                ? `Hover to react · ${counts?.total}`
                : 'Hover to react'}
          </Button>
        </div>
      ) : null}
    </article>
  );
}
