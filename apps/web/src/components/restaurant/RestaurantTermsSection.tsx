'use client';

import { Typography } from 'antd';
import { resolveRestaurantTerms } from '@/lib/restaurantTerms';

const { Title, Paragraph } = Typography;

type Props = {
  name: string;
  termsAndConditions?: string | null;
  depositRequired?: boolean;
  depositAmountCents?: number;
};

export function RestaurantTermsSection({
  name,
  termsAndConditions,
  depositRequired,
  depositAmountCents,
}: Props) {
  const text = resolveRestaurantTerms({
    name,
    termsAndConditions,
    depositRequired,
    depositAmountCents,
  });

  const paragraphs = text.split(/\n\s*\n/).filter(Boolean);

  return (
    <section id="terms" className="rt-restaurant-section">
      <Title level={3} className="rt-restaurant-section__title">
        Terms &amp; conditions
      </Title>
      <div className="rt-restaurant-terms">
        {paragraphs.map((paragraph, index) => (
          <Paragraph key={index} className="rt-restaurant-terms__paragraph">
            {paragraph}
          </Paragraph>
        ))}
      </div>
    </section>
  );
}
