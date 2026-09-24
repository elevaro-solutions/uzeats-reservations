'use client';

import { Button, Typography } from 'antd';
import {
  DollarOutlined,
  HomeOutlined,
  TeamOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

export type PrivateDiningSpaceItem = {
  id: string;
  name: string;
  description?: string | null;
  minGuests: number;
  maxGuests: number;
  rentalFeeCents: number;
  minimumSpendCents: number;
  photoUrl?: string | null;
  amenities?: string[];
};

type Props = {
  spaces: PrivateDiningSpaceItem[];
  selectedSpaceId?: string | null;
  onBook: (space: PrivateDiningSpaceItem) => void;
};

function formatFee(cents: number) {
  if (cents <= 0) return 'Included';
  return `$${(cents / 100).toFixed(2)}`;
}

export function RestaurantPrivateDiningSection({
  spaces,
  selectedSpaceId,
  onBook,
}: Props) {
  if (spaces.length === 0) return null;

  return (
    <section id="private-dining" className="rt-restaurant-section">
      <Title level={3} className="rt-restaurant-section__title">
        Private dining
      </Title>
      <div className="rt-experience-list">
        {spaces.map((space) => {
          const selected = selectedSpaceId === space.id;
          const amenities = space.amenities?.filter(Boolean) ?? [];
          return (
            <article
              key={space.id}
              className={`rt-experience-card${selected ? ' is-selected' : ''}`}
            >
              <div className="rt-experience-card__copy">
                <h4 className="rt-experience-card__title">{space.name}</h4>
                <ul className="rt-experience-card__meta">
                  <li>
                    <TeamOutlined aria-hidden />
                    <span>
                      {space.minGuests}–{space.maxGuests} guests
                    </span>
                  </li>
                  <li>
                    <DollarOutlined aria-hidden />
                    <span>
                      {space.rentalFeeCents > 0
                        ? `${formatFee(space.rentalFeeCents)} room fee`
                        : 'No room fee'}
                      {space.minimumSpendCents > 0
                        ? ` · ${formatFee(space.minimumSpendCents)} min spend`
                        : ''}
                    </span>
                  </li>
                  {amenities.length > 0 && (
                    <li>
                      <HomeOutlined aria-hidden />
                      <span>{amenities.slice(0, 4).join(' · ')}</span>
                    </li>
                  )}
                </ul>
                {space.description && (
                  <Text type="secondary" className="rt-experience-card__desc">
                    {space.description.length > 160
                      ? `${space.description.slice(0, 160).trim()}…`
                      : space.description}
                  </Text>
                )}
                <Button
                  type="primary"
                  className="rt-experience-card__reserve"
                  onClick={() => onBook(space)}
                >
                  Book this room
                </Button>
              </div>
              {space.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="rt-experience-card__photo" src={space.photoUrl} alt="" />
              ) : (
                <div className="rt-experience-card__photo rt-experience-card__photo--empty" />
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
