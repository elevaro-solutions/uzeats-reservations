'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Modal, Select, Typography, message } from 'antd';
import {
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FieldTimeOutlined,
  LeftOutlined,
  PhoneOutlined,
  ShareAltOutlined,
  StarFilled,
  UserOutlined,
} from '@ant-design/icons';
import { SlotPicker, pickRestaurantPhoto } from '@reservations/ui';
import { formatTimeInTimeZone, timeZoneLabel } from '@reservations/shared';
import dayjs, { type Dayjs } from 'dayjs';
import { buildMapsSearchUrl, formatRestaurantAddress } from '@/lib/restaurantLinks';
import { buildCancellationPolicy } from '@/lib/restaurantTerms';
import {
  experienceDateBounds,
  experienceTypeLabel,
  formatExperienceClock,
  formatExperienceBookingHours,
  formatExperiencePartyLabel,
  formatUsdFromCents,
  isExperienceSoldOut,
  isSlotInExperienceHours,
  maxBookableExperienceParty,
  truncateExperienceDescription,
  type ExperienceItem,
} from '@/lib/experiences';

const { Title, Text, Paragraph } = Typography;

export type ExperiencePackageOption = {
  id: string;
  title: string;
  description?: string | null;
  priceCents: number;
  pricePerGuest: boolean;
};

type Address = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zip: string;
  neighborhood?: string | null;
};

type RestaurantInfo = {
  name: string;
  slug?: string | null;
  cuisine?: string | null;
  averageRating?: number | null;
  reviewCount?: number | null;
  photos?: string[] | null;
  phone?: string | null;
  address: Address;
  location?: { lat: number; lng: number } | null;
  depositRequired?: boolean;
  depositAmountCents?: number;
  termsAndConditions?: string | null;
};

type Slot = { time: string; available: boolean; remainingTables: number };

type Step = 'find' | 'addons' | 'details';

type Props = {
  open: boolean;
  experience: ExperienceItem | null;
  experiences: ExperienceItem[];
  restaurant: RestaurantInfo;
  timeZone?: string;
  workingHours?: string | null;
  date: Dayjs;
  partySize: number;
  selectedSlot: string | null;
  slots: Slot[];
  slotsLoading?: boolean;
  packages: ExperiencePackageOption[];
  selectedPackageId: string | null;
  depositCents: number;
  onDateChange: (date: Dayjs) => void;
  onPartySizeChange: (partySize: number) => void;
  onSlotChange: (slot: string | null) => void;
  onPackageChange: (packageId: string | null) => void;
  onSelectRelated: (experience: ExperienceItem) => void;
  onClose: () => void;
  onContinueToBooking: () => void;
};

function formatSlotLabel(time: string, timeZone?: string) {
  if (timeZone) return formatTimeInTimeZone(time, timeZone);
  return new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function ExperienceBookingModal({
  open,
  experience,
  experiences,
  restaurant,
  timeZone,
  workingHours,
  date,
  partySize,
  selectedSlot,
  slots,
  slotsLoading,
  packages,
  selectedPackageId,
  depositCents,
  onDateChange,
  onPartySizeChange,
  onSlotChange,
  onPackageChange,
  onSelectRelated,
  onClose,
  onContinueToBooking,
}: Props) {
  const [step, setStep] = useState<Step>('find');

  useEffect(() => {
    if (open) setStep('find');
  }, [open, experience?.id]);

  const related = useMemo(
    () =>
      experiences.filter(
        (item) => item.id !== experience?.id && !isExperienceSoldOut(item),
      ),
    [experiences, experience?.id],
  );

  const experienceSlots = useMemo(() => {
    if (!experience) return slots;
    return slots.filter((slot) => isSlotInExperienceHours(slot.time, experience, timeZone));
  }, [slots, experience, timeZone]);

  if (!experience) return null;

  const soldOut = isExperienceSoldOut(experience);
  const { start, end } = experienceDateBounds(experience);
  const maxParty = maxBookableExperienceParty(experience);
  const partyOptions = Array.from({ length: maxParty }, (_, i) => ({
    value: i + 1,
    label: `${i + 1} ${i === 0 ? 'person' : 'people'}`,
  }));
  const availableSlots = experienceSlots.filter((slot) => slot.available);
  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId) ?? null;
  const experiencePrice = experience.ticketPriceCents * partySize;
  const packagePrice = selectedPackage
    ? selectedPackage.pricePerGuest
      ? selectedPackage.priceCents * partySize
      : selectedPackage.priceCents
    : 0;
  const subtotal = experiencePrice + packagePrice;
  const total = subtotal + depositCents;
  const partyLabel = formatExperiencePartyLabel(experience);
  const hostedPhoto = pickRestaurantPhoto(restaurant.photos ?? undefined);
  const fullAddress = formatRestaurantAddress(restaurant.address);
  const mapSrc =
    restaurant.location?.lat && restaurant.location?.lng
      ? `https://maps.google.com/maps?q=${restaurant.location.lat},${restaurant.location.lng}&z=15&output=embed`
      : `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&z=15&output=embed`;
  const mapsUrl = buildMapsSearchUrl(restaurant.address, restaurant.location);
  const includes = experience.includes?.filter(Boolean) ?? [];
  const terms = restaurant.termsAndConditions?.trim();
  const cancellation = buildCancellationPolicy({
    depositRequired: restaurant.depositRequired,
    depositAmountCents: restaurant.depositAmountCents,
  });
  const detailsStep = step === 'details';

  const goBack = () => {
    if (step === 'details') {
      setStep(packages.length > 0 ? 'addons' : 'find');
      return;
    }
    if (step === 'addons') {
      setStep('find');
      return;
    }
    onClose();
  };

  const goAfterFind = () => {
    if (!selectedSlot) {
      message.warning('Pick a time to continue');
      return;
    }
    setStep(packages.length > 0 ? 'addons' : 'details');
  };

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      await navigator.clipboard.writeText(url);
      message.success('Link copied');
    } catch {
      message.info(url);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      centered
      destroyOnClose
      closable={false}
      className="rt-experience-modal"
    >
      <header className="rt-experience-modal__header">
        <button type="button" className="rt-experience-modal__icon-btn" onClick={goBack} aria-label="Back">
          <LeftOutlined />
        </button>
        <ol className="rt-experience-modal__steps">
          <li className={detailsStep ? 'is-done' : 'is-active'}>
            {detailsStep ? <CheckCircleFilled /> : <span>1</span>}
            Find a table
          </li>
          <li className={detailsStep ? 'is-active' : ''}>
            <span>2</span>
            Add your details
          </li>
        </ol>
        <button type="button" className="rt-experience-modal__icon-btn" onClick={onClose} aria-label="Close">
          <CloseOutlined />
        </button>
      </header>

      {step === 'find' && (
        <div className="rt-experience-modal__body">
          <div className="rt-experience-modal__hero">
            <div className="rt-experience-modal__hero-copy">
              <Title level={3} className="rt-experience-modal__title">
                {experience.title}
              </Title>
              <ul className="rt-experience-modal__facts">
                <li>
                  <DollarOutlined aria-hidden />
                  {formatUsdFromCents(experience.ticketPriceCents)} per person
                </li>
                {partyLabel && (
                  <li>
                    <UserOutlined aria-hidden />
                    {partyLabel}
                  </li>
                )}
                <li>
                  <EnvironmentOutlined aria-hidden />
                  {fullAddress}
                </li>
                {workingHours && (
                  <li>
                    <ClockCircleOutlined aria-hidden />
                    Hours {workingHours}
                  </li>
                )}
                <li>
                  <FieldTimeOutlined aria-hidden />
                  Available {formatExperienceBookingHours(experience, timeZone)}
                </li>
              </ul>
              <div className="rt-experience-modal__hosted">
                <Text className="rt-experience-modal__hosted-label">Hosted by</Text>
                <div className="rt-experience-modal__hosted-row">
                  {hostedPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hostedPhoto} alt="" />
                  ) : (
                    <span className="rt-experience-modal__hosted-fallback">{restaurant.name.slice(0, 1)}</span>
                  )}
                  <div>
                    <Text strong>{restaurant.name}</Text>
                    <div className="rt-experience-modal__hosted-meta">
                      {restaurant.averageRating ? (
                        <span>
                          <StarFilled /> {restaurant.averageRating.toFixed(1)}
                          {restaurant.reviewCount ? ` (${restaurant.reviewCount})` : ''}
                        </span>
                      ) : null}
                      {restaurant.cuisine ? <span>· {restaurant.cuisine}</span> : null}
                      {restaurant.address.neighborhood ? (
                        <span className="rt-experience-modal__hosted-hood">
                          {restaurant.address.neighborhood}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="rt-experience-modal__hero-media">
              <button type="button" className="rt-experience-modal__share" onClick={share} aria-label="Share">
                <ShareAltOutlined />
              </button>
              {experience.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={experience.photoUrl} alt="" />
              ) : hostedPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hostedPhoto} alt="" />
              ) : null}
            </div>
          </div>

          <div className="rt-experience-modal__controls">
            <DatePicker
              value={date}
              allowClear={false}
              disabledDate={(current) => {
                const str = current.format('YYYY-MM-DD');
                return current.isBefore(dayjs(), 'day') || str < start || str > end;
              }}
              onChange={(next) => next && onDateChange(next)}
              suffixIcon={<CalendarOutlined />}
            />
            <Select
              value={selectedSlot}
              placeholder={formatExperienceClock(experience.startTime)}
              options={availableSlots.map((slot) => ({
                value: slot.time,
                label: formatSlotLabel(slot.time, timeZone),
              }))}
              onChange={(value) => onSlotChange(value)}
              suffixIcon={<ClockCircleOutlined />}
            />
            <Select
              value={Math.min(partySize, maxParty)}
              options={partyOptions}
              onChange={(value) => onPartySizeChange(value)}
              suffixIcon={<UserOutlined />}
            />
          </div>

          <div className="rt-experience-modal__slots">
            {soldOut ? (
              <Text type="secondary">This experience is sold out.</Text>
            ) : (
              <SlotPicker
                slots={experienceSlots}
                selected={selectedSlot}
                loading={slotsLoading}
                popularCount={18}
                timeZone={timeZone}
                onSelect={(slot) => {
                  onSlotChange(slot);
                  setStep(packages.length > 0 ? 'addons' : 'details');
                }}
              />
            )}
          </div>

          {selectedSlot && (
            <Button type="primary" block className="rt-experience-modal__continue" onClick={goAfterFind}>
              Continue
            </Button>
          )}

          <section className="rt-experience-modal__block">
            <Title level={4}>About the experience</Title>
            {experience.description
              ? experience.description.split(/\n\s*\n/).map((para) => (
                  <Paragraph key={para.slice(0, 48)}>{para}</Paragraph>
                ))
              : (
                <Paragraph type="secondary">Details for this experience will be shared after you book.</Paragraph>
              )}
            {includes.length > 0 && (
              <ul className="rt-experience-modal__includes">
                {includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          {packages.length > 0 && (
            <section className="rt-experience-modal__block">
              <Title level={4}>Add-ons available</Title>
              <dl className="rt-experience-modal__addon-preview">
                {packages.map((pkg) => (
                  <div key={pkg.id}>
                    <dt>{pkg.title}</dt>
                    <dd>
                      {formatUsdFromCents(
                        pkg.pricePerGuest ? pkg.priceCents * partySize : pkg.priceCents,
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="rt-experience-modal__venue">
            <div>
              <Title level={4}>{restaurant.name}</Title>
              <Paragraph className="rt-experience-modal__address">
                {restaurant.address.line1}
                <br />
                {restaurant.address.city}, {restaurant.address.state}
              </Paragraph>
              {restaurant.phone && (
                <a className="rt-experience-modal__phone" href={`tel:${restaurant.phone}`}>
                  <PhoneOutlined /> {restaurant.phone}
                </a>
              )}
              <button
                type="button"
                className="rt-experience-modal__profile-link"
                onClick={() => {
                  onClose();
                  document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                View full profile &gt;
              </button>
            </div>
            <a className="rt-experience-modal__map" href={mapsUrl} target="_blank" rel="noreferrer">
              <iframe title={`${restaurant.name} map`} src={mapSrc} loading="lazy" />
            </a>
          </section>

          {related.length > 0 && (
            <section className="rt-experience-modal__block">
              <Title level={4}>Related</Title>
              <div className="rt-experience-modal__related">
                {related.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="rt-experience-related-card"
                    onClick={() => onSelectRelated(item)}
                  >
                    <span className="rt-experience-related-card__title">{item.title}</span>
                    <span className="rt-experience-related-card__price">
                      {formatUsdFromCents(item.ticketPriceCents)} per person
                    </span>
                    <span className="rt-experience-related-card__desc">
                      {truncateExperienceDescription(item.description, 90)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {step === 'addons' && (
        <div className="rt-experience-modal__body">
          <Title level={3} className="rt-experience-modal__title">
            Add-ons
          </Title>
          <div className="rt-experience-addon-list">
            {packages.map((pkg) => {
              const selected = selectedPackageId === pkg.id;
              const price = pkg.pricePerGuest ? pkg.priceCents * partySize : pkg.priceCents;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  className={`rt-experience-addon${selected ? ' is-selected' : ''}`}
                  onClick={() => onPackageChange(selected ? null : pkg.id)}
                >
                  <span>
                    <strong>{pkg.title}</strong>
                    {pkg.description && <span className="rt-experience-addon__desc">{pkg.description}</span>}
                  </span>
                  <span className="rt-experience-addon__price">{formatUsdFromCents(price)}</span>
                </button>
              );
            })}
          </div>
          <Button type="primary" block className="rt-experience-modal__continue" onClick={() => setStep('details')}>
            Continue
          </Button>
        </div>
      )}

      {step === 'details' && (
        <div className="rt-experience-modal__body">
          <Title level={3} className="rt-experience-modal__title">
            You&apos;re almost done
          </Title>
          <div className="rt-experience-summary__venue">
            {hostedPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hostedPhoto} alt="" />
            ) : null}
            <div>
              <Text strong className="rt-experience-summary__name">{restaurant.name}</Text>
              <div className="rt-experience-summary__when">
                <span>
                  <CalendarOutlined /> {date.format('ddd, MMM D')}
                </span>
                <span>
                  <ClockCircleOutlined /> {selectedSlot ? formatSlotLabel(selectedSlot, timeZone) : formatExperienceClock(experience.startTime)}
                  {timeZone ? ` ${timeZoneLabel(timeZone)}` : ''}
                </span>
              </div>
              <div className="rt-experience-summary__party">
                <UserOutlined /> {partySize} {partySize === 1 ? 'person' : 'people'}
                {' '}({experienceTypeLabel(experience.type)})
              </div>
            </div>
          </div>

          <section className="rt-experience-modal__block">
            <Title level={4}>Reservation summary</Title>
            <div className="rt-experience-summary__line">
              <div>
                <Text type="secondary">Experience</Text>
                <div className="rt-experience-summary__exp">
                  <strong>{experience.title}</strong>
                  <span>
                    {partySize}x {formatUsdFromCents(experience.ticketPriceCents)}
                  </span>
                </div>
              </div>
              <div className="rt-experience-summary__amount">
                {formatUsdFromCents(experiencePrice)}
                <button type="button" className="rt-experience-summary__edit" onClick={() => setStep('find')}>
                  Edit
                </button>
              </div>
            </div>
            {selectedPackage && (
              <div className="rt-experience-summary__line">
                <div>
                  <Text type="secondary">Add-on</Text>
                  <div>{selectedPackage.title}</div>
                </div>
                <div className="rt-experience-summary__amount">{formatUsdFromCents(packagePrice)}</div>
              </div>
            )}
            <div className="rt-experience-summary__totals">
              <div>
                <span>Subtotal</span>
                <span>{formatUsdFromCents(subtotal)}</span>
              </div>
              {depositCents > 0 && (
                <div>
                  <span>Deposit</span>
                  <span>{formatUsdFromCents(depositCents)}</span>
                </div>
              )}
              <div className="is-total">
                <span>Total</span>
                <span>{formatUsdFromCents(total)}</span>
              </div>
            </div>
          </section>

          <section className="rt-experience-modal__block">
            <Title level={4}>What to know before you go</Title>
            <Text strong>Experience terms and conditions</Text>
            <Paragraph>
              {terms ||
                `This booking is for ${experience.title}. The experience price is ${formatUsdFromCents(experience.ticketPriceCents)} per person.`}
            </Paragraph>
            <Text strong>Cancellation</Text>
            <Paragraph>{cancellation}</Paragraph>
          </section>

          <Button type="primary" block className="rt-experience-modal__continue" onClick={onContinueToBooking}>
            Continue
          </Button>
        </div>
      )}
    </Modal>
  );
}
