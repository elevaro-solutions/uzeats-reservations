'use client';

import { Collapse, Typography } from 'antd';

const { Title } = Typography;

type FaqItem = { question: string; answer: string };

type Props = {
  items: FaqItem[];
};

export function RestaurantFaqSection({ items }: Props) {
  return (
    <section id="faq" className="rt-restaurant-section">
      <Title level={3} className="rt-restaurant-section__title">
        Frequently asked questions
      </Title>
      <Collapse
        className="rt-restaurant-faq"
        bordered={false}
        expandIconPosition="end"
        items={items.map((item, i) => ({
          key: String(i),
          label: <span className="rt-restaurant-faq__question">{item.question}</span>,
          children: <p className="rt-restaurant-faq__answer">{item.answer}</p>,
        }))}
      />
    </section>
  );
}
