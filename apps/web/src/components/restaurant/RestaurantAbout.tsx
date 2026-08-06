'use client';

import { useState } from 'react';
import { Tag, Typography } from 'antd';

const { Title, Paragraph } = Typography;

type Props = {
  name: string;
  description?: string | null;
  diningStyles?: string[];
  discoveryOccasions?: string[];
  amenities?: string[];
  dietaryTags?: string[];
  meals?: string[];
};

export function RestaurantAbout({
  name,
  description,
  diningStyles = [],
  discoveryOccasions = [],
  amenities = [],
  dietaryTags = [],
  meals = [],
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const tags = [
    ...diningStyles.slice(0, 3),
    ...discoveryOccasions.slice(0, 2),
    ...amenities.slice(0, 2),
    ...dietaryTags.slice(0, 2),
    ...meals.slice(0, 2),
  ].filter(Boolean);

  const uniqueTags = [...new Set(tags)];
  const text = description?.trim();
  const isLong = (text?.length ?? 0) > 280;
  const displayText = text && isLong && !expanded ? `${text.slice(0, 280).trim()}…` : text;

  return (
    <section id="overview" className="rt-restaurant-section">
      <Title level={3} className="rt-restaurant-section__title">
        About {name}
      </Title>

      {uniqueTags.length > 0 && (
        <div className="rt-restaurant-tags">
          {uniqueTags.map((tag) => (
            <Tag key={tag} className="rt-restaurant-tag">
              {tag}
            </Tag>
          ))}
        </div>
      )}

      {displayText ? (
        <Paragraph className="rt-restaurant-about__text">
          {displayText}
          {isLong && (
            <button
              type="button"
              className="rt-restaurant-about__read-more"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </Paragraph>
      ) : (
        <Paragraph type="secondary">
          Welcome to {name}. Reserve your table below to experience what makes this restaurant special.
        </Paragraph>
      )}
    </section>
  );
}
