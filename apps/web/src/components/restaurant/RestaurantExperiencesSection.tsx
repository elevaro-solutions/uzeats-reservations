'use client';

import { Button, Typography } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FieldTimeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  formatExperienceAvailabilityLabel,
  formatExperienceBookingHours,
  formatExperiencePartyLabel,
  formatUsdFromCents,
  isExperienceSoldOut,
  truncateExperienceDescription,
  type ExperienceItem,
} from '@/lib/experiences';

const { Title, Text } = Typography;

type Props = {
  experiences: ExperienceItem[];
  selectedExperienceId?: string | null;
  workingHours?: string | null;
  timeZone?: string;
  onReserve: (experience: ExperienceItem) => void;
};

export function RestaurantExperiencesSection({
  experiences,
  selectedExperienceId,
  workingHours,
  timeZone,
  onReserve,
}: Props) {
  if (experiences.length === 0) return null;

  return (
    <section id="experiences" className="rt-restaurant-section">
      <Title level={3} className="rt-restaurant-section__title">
        Experiences
      </Title>
      <div className="rt-experience-list">
        {experiences.map((exp) => {
          const soldOut = isExperienceSoldOut(exp);
          const selected = selectedExperienceId === exp.id;
          const partyLabel = formatExperiencePartyLabel(exp);
          return (
            <article
              key={exp.id}
              className={`rt-experience-card${selected ? ' is-selected' : ''}${soldOut ? ' is-sold-out' : ''}`}
            >
              <div className="rt-experience-card__copy">
                <h4 className="rt-experience-card__title">{exp.title}</h4>
                <ul className="rt-experience-card__meta">
                  <li>
                    <DollarOutlined aria-hidden />
                    <span>{formatUsdFromCents(exp.ticketPriceCents)} per person</span>
                  </li>
                  {partyLabel && (
                    <li>
                      <UserOutlined aria-hidden />
                      <span>{partyLabel}</span>
                    </li>
                  )}
                  <li>
                    <CalendarOutlined aria-hidden />
                    <span>{formatExperienceAvailabilityLabel(exp)}</span>
                  </li>
                  {workingHours && (
                    <li>
                      <ClockCircleOutlined aria-hidden />
                      <span>Hours {workingHours}</span>
                    </li>
                  )}
                  <li>
                    <FieldTimeOutlined aria-hidden />
                    <span>Available {formatExperienceBookingHours(exp, timeZone)}</span>
                  </li>
                </ul>
                {exp.description && (
                  <Text type="secondary" className="rt-experience-card__desc">
                    {truncateExperienceDescription(exp.description)}
                  </Text>
                )}
                <Button
                  type="primary"
                  className="rt-experience-card__reserve"
                  disabled={soldOut}
                  onClick={() => onReserve(exp)}
                >
                  {soldOut ? 'Sold out' : 'Reserve'}
                </Button>
              </div>
              {exp.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="rt-experience-card__photo" src={exp.photoUrl} alt="" />
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
