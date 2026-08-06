'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Rate,
  Row,
  Select,
  Space,
  Typography,
  message,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import { StarFilled } from '@ant-design/icons';
import { SlotPicker, priceRangeLabel, colors, radii } from '@reservations/ui';
import {
  OCCASIONS,
  LOYALTY,
  RESTAURANT_LOYALTY,
  pointsToDiscountCents,
  restaurantPointsToDiscountCents,
  depositPointsFromCents,
  loyaltyRedeemProgress,
  isMongoObjectId,
  buildRestaurantBookingPath,
  buildBookingResumePath,
} from '@reservations/shared';
import {
  saveBookingDraftToSession,
  loadBookingDraftFromSession,
  clearBookingDraftFromSession,
} from '@/lib/bookingDraft';
import { useAuth } from '@/lib/auth';
import {
  RESTAURANT_DETAIL,
  AVAILABILITY,
  CREATE_RESERVATION,
  CONFIRM_DEPOSIT,
  JOIN_WAITLIST,
  BOOKABLE_TABLES,
  RESTAURANT_REVIEWS,
  PROMOTIONS,
  EXPERIENCES,
  MY_RESTAURANT_LOYALTY_BALANCE,
  VALIDATE_PROMOTION,
  BEST_PROMOTION,
  VALIDATE_GIFT_CARD,
} from '@/lib/graphql';
import { getGraphQLErrorMessage, getValidationIssues, toFieldErrors } from '@/lib/errors';
import {
  useRestaurantPageParams,
  useRestaurantSectionScroll,
} from '@/lib/useRestaurantPageParams';
import { JsonLd } from '@/components/JsonLd';
import { faqJsonLd, restaurantJsonLd } from '@/lib/seo';
import DepositPayment from '@/components/DepositPayment';
import { RestaurantPhotoGallery } from '@/components/restaurant/RestaurantPhotoGallery';
import { RestaurantSectionNav } from '@/components/restaurant/RestaurantSectionNav';
import { RestaurantAbout } from '@/components/restaurant/RestaurantAbout';
import { RestaurantMenuSection } from '@/components/restaurant/RestaurantMenuSection';
import { RestaurantReviewsSection } from '@/components/restaurant/RestaurantReviewsSection';
import { RestaurantPhotosSection } from '@/components/restaurant/RestaurantPhotosSection';
import { RestaurantDetailsSection } from '@/components/restaurant/RestaurantDetailsSection';
import { RestaurantFeaturedIn } from '@/components/restaurant/RestaurantFeaturedIn';
import { RestaurantFaqSection } from '@/components/restaurant/RestaurantFaqSection';
import { RestaurantActions } from '@/components/restaurant/RestaurantActions';
import { RestaurantBookmarkButtons } from '@/components/restaurant/RestaurantBookmarkButtons';
import { RestaurantTermsSection } from '@/components/restaurant/RestaurantTermsSection';
import { RestaurantMessageModal } from '@/components/restaurant/RestaurantMessageModal';
import {
  ReservationConfirmModal,
  formatOccasion,
} from '@/components/restaurant/ReservationConfirmModal';
import { buildCancellationPolicy, buildCancellationPolicySummary } from '@/lib/restaurantTerms';

const { Title, Paragraph, Text } = Typography;

export default function RestaurantPage() {
  const params = useParams<{ id: string }>();
  const slugOrId = params.id;
  const isObjectId = isMongoObjectId(slugOrId);
  const search = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { section, bookingFromUrl, syncBookingToUrl } = useRestaurantPageParams();
  useRestaurantSectionScroll(section);
  const [date, setDate] = useState(bookingFromUrl.date);
  const [partySize, setPartySize] = useState(bookingFromUrl.partySize);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(bookingFromUrl.selectedSlot);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<{
    tableName?: string;
    photoUrl?: string | null;
    floorArea?: string;
  } | null>(null);
  const [occasion, setOccasion] = useState('none');
  const [notes, setNotes] = useState('');
  const [redeemPoints, setRedeemPoints] = useState<number>(0);
  const [redeemRestaurantPoints, setRedeemRestaurantPoints] = useState<number>(0);
  const [promoCode, setPromoCode] = useState(bookingFromUrl.promoCode);
  const [giftCardCode, setGiftCardCode] = useState('');
  const [messageOpen, setMessageOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const draftRestoredRef = useRef(false);
  const prevSlotPartyRef = useRef<{ slot: string | null; party: number } | null>(null);

  useEffect(() => {
    setDate(bookingFromUrl.date);
    setPartySize(bookingFromUrl.partySize);
    setSelectedSlot(bookingFromUrl.selectedSlot);
    setPromoCode(bookingFromUrl.promoCode);
  }, [
    bookingFromUrl.date.format('YYYY-MM-DD'),
    bookingFromUrl.partySize,
    bookingFromUrl.selectedSlot,
    bookingFromUrl.promoCode,
    bookingFromUrl,
  ]);

  const updateBooking = useCallback(
    (next: Partial<{
      date: typeof date;
      partySize: number;
      selectedSlot: string | null;
      promoCode: string;
    }>) => {
      const merged = {
        date: next.date ?? date,
        partySize: next.partySize ?? partySize,
        selectedSlot: next.selectedSlot !== undefined ? next.selectedSlot : selectedSlot,
        promoCode: next.promoCode ?? promoCode,
      };
      if (next.date !== undefined) setDate(next.date);
      if (next.partySize !== undefined) setPartySize(next.partySize);
      if (next.selectedSlot !== undefined) setSelectedSlot(next.selectedSlot);
      if (next.promoCode !== undefined) setPromoCode(next.promoCode);
      syncBookingToUrl(merged);
    },
    [date, partySize, selectedSlot, promoCode, syncBookingToUrl],
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationSummary, setValidationSummary] = useState<string[]>([]);
  const [depositInfo, setDepositInfo] = useState<{
    clientSecret: string;
    reservationId: string;
    amountCents: number;
    paymentIntentId: string;
    tableInfo?: { tableName?: string; photoUrl?: string | null; floorArea?: string } | null;
  } | null>(null);

  const { data } = useQuery(RESTAURANT_DETAIL, {
    variables: isObjectId ? { id: slugOrId } : { slug: slugOrId },
  });
  const restaurant = (data as any)?.restaurant;
  const restaurantId = restaurant?.id ?? (isObjectId ? slugOrId : undefined);
  const bookingPath = buildRestaurantBookingPath(restaurant?.slug, restaurantId);

  const { data: availData, loading: availLoading } = useQuery(AVAILABILITY, {
    variables: {
      restaurantId: restaurantId!,
      date: date.format('YYYY-MM-DD'),
      partySize,
    },
    skip: !restaurantId,
  });
  const { data: bookableData, loading: bookableLoading } = useQuery(BOOKABLE_TABLES, {
    variables: {
      restaurantId: restaurantId!,
      slotStart: selectedSlot!,
      partySize,
    },
    skip: !restaurantId || !selectedSlot,
  });
  const bookableTables = (bookableData as any)?.bookableTables ?? [];
  const { data: reviewsData } = useQuery(RESTAURANT_REVIEWS, {
    variables: { restaurantId: restaurantId!, limit: 50, offset: 0 },
    skip: !restaurantId,
  });
  const { data: promotionsData } = useQuery(PROMOTIONS, {
    variables: { restaurantId: restaurantId!, activeOnly: true, limit: 50, offset: 0 },
    skip: !restaurantId,
  });
  const { data: experiencesData } = useQuery(EXPERIENCES, {
    variables: { restaurantId: restaurantId!, upcoming: true, limit: 50, offset: 0 },
    skip: !restaurantId,
  });
  const { data: restaurantLoyaltyData } = useQuery(MY_RESTAURANT_LOYALTY_BALANCE, {
    variables: { restaurantId: restaurantId! },
    skip: !user || !restaurantId,
  });

  const [createReservation, { loading: booking }] = useMutation(CREATE_RESERVATION);
  const [confirmDeposit] = useMutation(CONFIRM_DEPOSIT);
  const [joinWaitlist, { loading: waitlisting }] = useMutation(JOIN_WAITLIST);

  const slots = (availData as any)?.availability ?? [];
  const grossDepositCents =
    restaurant?.depositRequired && restaurant.depositAmountCents > 0
      ? restaurant.depositAmountCents * partySize
      : 0;
  const redeemProgress = loyaltyRedeemProgress(user?.loyaltyPoints ?? 0);
  const restaurantLoyaltyBalance = (restaurantLoyaltyData as any)?.myRestaurantLoyaltyBalance ?? 0;
  const restaurantMinRedeem =
    restaurant?.loyaltyMinRedeemPoints ?? RESTAURANT_LOYALTY.DEFAULT_MIN_REDEEM_POINTS;
  const canRedeemRestaurant =
    !!restaurant?.loyaltyEnabled &&
    restaurantLoyaltyBalance >= restaurantMinRedeem &&
    grossDepositCents > 0;
  const depositBeforePromo = useMemo(() => {
    let d = grossDepositCents;
    if (redeemPoints >= LOYALTY.MIN_REDEEM_POINTS) {
      d -= pointsToDiscountCents(redeemPoints);
    }
    if (canRedeemRestaurant && redeemRestaurantPoints >= restaurantMinRedeem) {
      d -= restaurantPointsToDiscountCents(redeemRestaurantPoints);
    }
    return Math.max(0, d);
  }, [
    grossDepositCents,
    redeemPoints,
    redeemRestaurantPoints,
    canRedeemRestaurant,
    restaurantMinRedeem,
  ]);
  const { data: promoValidationData } = useQuery(VALIDATE_PROMOTION, {
    variables: {
      restaurantId: restaurantId!,
      code: promoCode.trim().toUpperCase(),
      slotStart: selectedSlot!,
      depositCents: depositBeforePromo,
    },
    skip: !restaurantId || !promoCode.trim() || !selectedSlot || depositBeforePromo <= 0,
  });
  const { data: bestPromoData } = useQuery(BEST_PROMOTION, {
    variables: {
      restaurantId: restaurantId!,
      slotStart: selectedSlot!,
      depositCents: depositBeforePromo,
    },
    skip: !restaurantId || !!promoCode.trim() || !selectedSlot || depositBeforePromo <= 0,
  });
  const promoValidation = (promoValidationData as any)?.validatePromotion;
  const bestPromotion = (bestPromoData as any)?.bestPromotion;
  const activePromo = promoCode.trim() ? promoValidation : bestPromotion;
  const depositAfterPromo = Math.max(
    0,
    depositBeforePromo - (activePromo?.valid ? activePromo.discountCents : 0),
  );
  const { data: giftValidationData } = useQuery(VALIDATE_GIFT_CARD, {
    variables: {
      restaurantId: restaurantId!,
      code: giftCardCode.trim().toUpperCase(),
      depositCents: depositAfterPromo,
    },
    skip: !restaurantId || !giftCardCode.trim() || depositAfterPromo <= 0,
  });
  const giftValidation = (giftValidationData as any)?.validateGiftCard;
  const finalDepositCents = Math.max(
    0,
    depositAfterPromo - (giftValidation?.valid ? giftValidation.discountCents : 0),
  );
  const selectedTable = bookableTables.find((t: { id: string }) => t.id === selectedTableId);
  const availableCount = slots.filter((s: any) => s.available).length;
  const promotions = (promotionsData as any)?.promotions?.items ?? [];
  const experiences = (experiencesData as any)?.experiences?.items ?? [];

  useEffect(() => {
    if (availLoading || !selectedSlot) return;
    const match = slots.find((s: { time: string; available: boolean }) => s.time === selectedSlot);
    if (!match?.available) {
      updateBooking({ selectedSlot: null });
      setSelectedTableId(null);
    }
  }, [availLoading, slots, selectedSlot, updateBooking]);

  useEffect(() => {
    if (prevSlotPartyRef.current === null) {
      prevSlotPartyRef.current = { slot: selectedSlot, party: partySize };
      return;
    }
    if (
      prevSlotPartyRef.current.slot !== selectedSlot ||
      prevSlotPartyRef.current.party !== partySize
    ) {
      setSelectedTableId(null);
      prevSlotPartyRef.current = { slot: selectedSlot, party: partySize };
    }
  }, [selectedSlot, partySize]);

  useEffect(() => {
    if (!restaurantId || draftRestoredRef.current || search.get('resume') !== '1') return;
    const draft = loadBookingDraftFromSession(restaurantId);
    if (!draft) return;
    draftRestoredRef.current = true;
    setDate(dayjs(draft.date));
    setPartySize(draft.partySize);
    if (draft.selectedSlot) setSelectedSlot(draft.selectedSlot);
    setOccasion(draft.occasion);
    setNotes(draft.notes);
    setPromoCode(draft.promoCode);
    setGiftCardCode(draft.giftCardCode);
    setRedeemPoints(draft.redeemPoints);
    setRedeemRestaurantPoints(draft.redeemRestaurantPoints);
    if (draft.selectedTableId) setSelectedTableId(draft.selectedTableId);
    prevSlotPartyRef.current = { slot: draft.selectedSlot, party: draft.partySize };
    syncBookingToUrl({
      date: dayjs(draft.date),
      partySize: draft.partySize,
      selectedSlot: draft.selectedSlot,
      promoCode: draft.promoCode,
    });
  }, [restaurantId, search]);

  const showResumeBanner = search.get('resume') === '1' && !!user;

  useEffect(() => {
    if (!showResumeBanner) return;
    document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [showResumeBanner]);

  const redirectToLoginForBooking = () => {
    if (!restaurantId) return;
    const draft = {
      restaurantId,
      date: date.format('YYYY-MM-DD'),
      partySize,
      selectedSlot,
      selectedTableId,
      occasion,
      notes,
      promoCode,
      giftCardCode,
      redeemPoints,
      redeemRestaurantPoints,
    };
    saveBookingDraftToSession(draft);
    const next = buildBookingResumePath(bookingPath, draft);
    router.push(`/login?next=${encodeURIComponent(next)}`);
  };

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const book = () => {
    if (!user) {
      message.info('Please sign in to complete your reservation');
      redirectToLoginForBooking();
      return;
    }
    if (!selectedSlot) {
      message.warning('Select a time slot');
      return;
    }
    const slotStillOpen = slots.some(
      (s: { time: string; available: boolean }) => s.time === selectedSlot && s.available,
    );
    if (!slotStillOpen) {
      message.warning('That time is no longer available — pick another slot');
      setSelectedSlot(null);
      return;
    }
    setConfirmOpen(true);
  };

  const submitBooking = async () => {
    if (!user || !selectedSlot) return;
    setFieldErrors({});
    setValidationSummary([]);
    try {
      const { data: result } = await createReservation({
        variables: {
          input: {
            restaurantId: restaurantId!,
            partySize,
            slotStart: selectedSlot,
            occasion,
            guestNotes: notes || undefined,
            ...(redeemPoints >= LOYALTY.MIN_REDEEM_POINTS ? { redeemPoints } : {}),
            ...(canRedeemRestaurant && redeemRestaurantPoints >= restaurantMinRedeem
              ? { redeemRestaurantPoints }
              : {}),
            ...(promoCode.trim() ? { promoCode: promoCode.trim().toUpperCase() } : {}),
            ...(giftCardCode.trim() ? { giftCardCode: giftCardCode.trim().toUpperCase() } : {}),
            ...(selectedTableId ? { tableId: selectedTableId } : {}),
          },
        },
      });
      const payload = (result as any)?.createReservation;
      const bookedTable = payload?.reservation?.tables?.[0];
      const successInfo = bookedTable
        ? {
            tableName: bookedTable.name,
            photoUrl: bookedTable.photoUrl,
            floorArea: bookedTable.floorArea,
          }
        : null;
      if (payload?.clientSecret) {
        const cs = payload.clientSecret as string;
        setConfirmOpen(false);
        setDepositInfo({
          clientSecret: cs,
          reservationId: payload.reservation.id,
          amountCents: payload.reservation.depositAmountCents ?? 0,
          paymentIntentId: cs.split('_secret')[0] ?? '',
          tableInfo: successInfo,
        } as any);
        return;
      }
      if (successInfo) {
        clearBookingDraftFromSession(restaurantId!);
        setConfirmOpen(false);
        setBookingSuccess(successInfo);
        return;
      }
      clearBookingDraftFromSession(restaurantId!);
      setConfirmOpen(false);
      message.success('Reservation confirmed!');
      router.push('/reservations');
    } catch (err) {
      const issues = getValidationIssues(err);
      if (issues.length > 0) {
        setFieldErrors(toFieldErrors(issues));
        setValidationSummary(issues.map((i) => i.message));
        message.error('Please fix the highlighted fields and try again.');
        return;
      }
      message.error(getGraphQLErrorMessage(err, 'Booking failed'));
    }
  };

  const handleDepositSuccess = async () => {
    const tableInfo = depositInfo?.tableInfo;
    if (depositInfo) {
      try {
        await confirmDeposit({
          variables: { paymentIntentId: depositInfo.paymentIntentId },
        });
      } catch {
        // backend will reconcile via webhook if this call fails
      }
    }
    setDepositInfo(null);
    if (tableInfo) {
      clearBookingDraftFromSession(restaurantId!);
      setBookingSuccess(tableInfo);
      return;
    }
    clearBookingDraftFromSession(restaurantId!);
    message.success('Deposit authorized — reservation confirmed!');
    router.push('/reservations');
  };

  const waitlist = async () => {
    if (!user) {
      message.info('Please sign in to join the waitlist');
      redirectToLoginForBooking();
      return;
    }
    const { data: wlData } = await joinWaitlist({
      variables: {
        input: {
          restaurantId: restaurantId!,
          partySize,
          preferredDate: date.format('YYYY-MM-DD'),
        },
      },
    });
    const entry = (wlData as any)?.joinWaitlist;
    const eta =
      entry?.position != null && entry?.estimatedWaitMinutes != null
        ? ` You are #${entry.position} · ~${entry.estimatedWaitMinutes} min wait.`
        : '';
    message.success(`Added to waitlist.${eta}`);
  };

  if (!restaurant) return <div component="RestaurantPage" style={{ display: 'contents' }}><Card loading /></div>;

  const defaultFaq = [
    {
      question: `How do I book a table at ${restaurant.name}?`,
      answer: `Choose your date, party size, and an available time slot on this page. Confirmation is instant through Tablevera.`,
    },
    {
      question: `What cuisine does ${restaurant.name} serve?`,
      answer: `${restaurant.name} serves ${restaurant.cuisine} cuisine in ${restaurant.address.city}, ${restaurant.address.state}.`,
    },
    {
      question: `Where is ${restaurant.name} located?`,
      answer: `${restaurant.name} is located at ${restaurant.address.line1}, ${restaurant.address.city}, ${restaurant.address.state} ${restaurant.address.zip}.${restaurant.address.neighborhood ? ` The restaurant is in the ${restaurant.address.neighborhood} neighborhood.` : ''}`,
    },
    ...(restaurant.depositRequired
      ? [{
          question: `Is a deposit required at ${restaurant.name}?`,
          answer: `Yes, a deposit of $${(restaurant.depositAmountCents / 100).toFixed(2)} per guest is required when booking. The deposit is applied toward your final bill.`,
        }]
      : []),
    {
      question: `What is the cancellation policy at ${restaurant.name}?`,
      answer: buildCancellationPolicy({
        depositRequired: restaurant.depositRequired,
        depositAmountCents: restaurant.depositAmountCents,
      }),
    },
    ...(restaurant.dietaryTags?.length
      ? [{
          question: `Does ${restaurant.name} accommodate dietary restrictions?`,
          answer: `${restaurant.name} offers ${restaurant.dietaryTags.join(', ')} options. Mention any allergies or dietary needs in your special requests when booking.`,
        }]
      : []),
    ...(restaurant.phone
      ? [{
          question: `How can I contact ${restaurant.name}?`,
          answer: `You can reach ${restaurant.name} at ${restaurant.phone}${restaurant.website ? ` or visit their website at ${restaurant.website}` : ''}.`,
        }]
      : []),
  ];

  const restaurantFaq =
    (restaurant.faq?.length ?? 0) > 0 ? restaurant.faq : defaultFaq;

  const reviews = (reviewsData as any)?.restaurantReviews?.items ?? [];

  return (
    <div component="RestaurantPage" style={{ display: 'contents' }}><JsonLd
        data={[
          restaurantJsonLd({
            ...restaurant,
            location: restaurant.location,
            dietaryTags: restaurant.dietaryTags,
            amenities: restaurant.amenities,
            meals: restaurant.meals,
          }),
          faqJsonLd(restaurantFaq),
        ]}
      />
      <div className="rt-restaurant-page">
      <div className="rt-restaurant-profile">
        <RestaurantPhotoGallery photos={restaurant.photos ?? []} name={restaurant.name} />

        <div className="rt-restaurant-profile__header rt-fade-up">
          <Title level={2} style={{ marginTop: 0, marginBottom: 8 }}>
            {restaurant.name}
          </Title>
          <div className="rt-restaurant-profile__meta">
            {restaurant.averageRating > 0 && (
              <span className="rt-restaurant-profile__rating">
                <StarFilled style={{ color: colors.rating }} />
                <Text strong>{restaurant.averageRating.toFixed(1)}</Text>
                <Text type="secondary">({restaurant.reviewCount} reviews)</Text>
              </span>
            )}
            <Text>{priceRangeLabel(restaurant.priceRange)}</Text>
            <Text type="secondary">·</Text>
            <Tag>{restaurant.cuisine}</Tag>
            {restaurant.address.neighborhood && (
              <>
                <Text type="secondary">·</Text>
                <Text type="secondary">{restaurant.address.neighborhood}</Text>
              </>
            )}
          </div>
          <Text type="secondary" className="rt-restaurant-profile__address">
            {restaurant.address.line1}, {restaurant.address.city}, {restaurant.address.state}{' '}
            {restaurant.address.zip}
          </Text>
          {restaurant.depositRequired && (
            <Tag color="gold" style={{ marginTop: 8 }}>
              Deposit ${(restaurant.depositAmountCents / 100).toFixed(2)} per guest
            </Tag>
          )}
          <div style={{ marginTop: 12 }}>
            <RestaurantBookmarkButtons
              restaurantId={restaurant.id}
              isSaved={restaurant.isSaved}
              isFavorite={restaurant.isFavorite}
            />
          </div>
          <RestaurantActions
            address={restaurant.address}
            location={restaurant.location}
            onMessage={() => setMessageOpen(true)}
          />
        </div>

        <RestaurantSectionNav />

        <Row gutter={[32, 32]} className="rt-restaurant-profile__body">
          <Col xs={24} lg={14}>
            <div className="rt-restaurant-profile__content">
              <RestaurantAbout
                name={restaurant.name}
                description={restaurant.description}
                diningStyles={restaurant.diningStyles}
                discoveryOccasions={restaurant.discoveryOccasions}
                amenities={restaurant.amenities}
                dietaryTags={restaurant.dietaryTags}
                meals={restaurant.meals}
              />

              {promotions.length > 0 && (
                <div className="rt-restaurant-section">
                  <Title level={3} className="rt-restaurant-section__title">Offers</Title>
                  <Row gutter={[16, 16]}>
                    {promotions.map((p: any) => (
                      <Col xs={24} md={12} key={p.id}>
                        <Card size="small" className="rt-restaurant-offer-card">
                          <Space align="baseline" style={{ justifyContent: 'space-between', width: '100%' }}>
                            <Text strong>{p.title}</Text>
                            {p.discountPercent ? (
                              <Tag color="red">{p.discountPercent}% off</Tag>
                            ) : p.discountAmountCents ? (
                              <Tag color="red">${(p.discountAmountCents / 100).toFixed(2)} off</Tag>
                            ) : null}
                          </Space>
                          {p.description && (
                            <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                              {p.description}
                            </Paragraph>
                          )}
                          <Space wrap size={8}>
                            {p.code && <Tag color="gold">Code: {p.code}</Tag>}
                            {(p.startDate || p.endDate) && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {p.startDate ? `From ${p.startDate}` : ''}
                                {p.startDate && p.endDate ? ' ' : ''}
                                {p.endDate ? `Until ${p.endDate}` : ''}
                              </Text>
                            )}
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}

              {experiences.length > 0 && (
                <div className="rt-restaurant-section">
                  <Title level={3} className="rt-restaurant-section__title">Experiences & events</Title>
                  <Row gutter={[16, 16]}>
                    {experiences.map((e: any) => (
                      <Col xs={24} md={12} lg={8} key={e.id}>
                        <Card
                          size="small"
                          className="rt-restaurant-experience-card"
                          cover={
                            e.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={e.photoUrl}
                                alt={e.title}
                                style={{ height: 140, objectFit: 'cover' }}
                              />
                            ) : undefined
                          }
                        >
                          <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                            <Text strong>{e.title}</Text>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              {dayjs(e.date).format('MMM D, YYYY')} · {e.startTime}–{e.endTime}
                            </Text>
                            <Space>
                              <Tag>{String(e.type).replace(/_/g, ' ')}</Tag>
                              <Text strong>${(e.ticketPriceCents / 100).toFixed(2)}</Text>
                            </Space>
                            {e.status === 'sold_out' ? (
                              <Tag color="red">Sold out</Tag>
                            ) : (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {e.availableTickets} tickets left
                              </Text>
                            )}
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}

              <RestaurantMenuSection
                sections={restaurant.menu?.sections ?? []}
                menuUrl={restaurant.menuUrl}
                website={restaurant.website}
              />

              <RestaurantReviewsSection
                reviews={reviews}
                averageRating={restaurant.averageRating}
                reviewCount={restaurant.reviewCount}
              />

              <RestaurantPhotosSection photos={restaurant.photos ?? []} name={restaurant.name} />

              <RestaurantDetailsSection
                address={restaurant.address}
                phone={restaurant.phone}
                website={restaurant.website}
                cuisine={restaurant.cuisine}
                priceRange={restaurant.priceRange}
                diningStyles={restaurant.diningStyles}
                amenities={restaurant.amenities}
                meals={restaurant.meals}
                dietaryTags={restaurant.dietaryTags}
                wheelchairAccessible={restaurant.wheelchairAccessible}
                location={restaurant.location}
              />

              <RestaurantFeaturedIn
                name={restaurant.name}
                cuisine={restaurant.cuisine}
                featured={restaurant.featured}
                address={restaurant.address}
                averageRating={restaurant.averageRating}
                reviewCount={restaurant.reviewCount}
                entries={restaurant.featuredIn}
              />

              <RestaurantTermsSection
                name={restaurant.name}
                termsAndConditions={restaurant.termsAndConditions}
                depositRequired={restaurant.depositRequired}
                depositAmountCents={restaurant.depositAmountCents}
              />

              <RestaurantFaqSection items={restaurantFaq} />
            </div>
          </Col>

          <Col xs={24} lg={10}>
            <div className="rt-restaurant-profile__booking-sticky">
          <Card
            id="booking-form"
            title="Make a reservation"
            className="rt-restaurant-booking-card"
          >
            {showResumeBanner && (
              <Alert
                type="info"
                showIcon
                message="Welcome back — your reservation details have been restored. Review and complete your booking."
              />
            )}
            <Text type="secondary" className="rt-restaurant-booking-card__intro">
              Pick a date, party size, and time — confirmed in seconds.
            </Text>
            {user && (
              <Text type="secondary" className="rt-restaurant-booking-card__loyalty">
                Earn {LOYALTY.POINTS_PER_COMPLETED_VISIT} pts when you complete your visit
                {grossDepositCents > 0
                  ? ` and ${depositPointsFromCents(grossDepositCents)} pts when your deposit is paid`
                  : ''}
                .
                {restaurant?.loyaltyEnabled ? (
                  <>
                    {' '}
                    Plus {restaurant.loyaltyPointsPerVisit ?? RESTAURANT_LOYALTY.DEFAULT_POINTS_PER_VISIT}{' '}
                    {restaurant.name} points for this visit.
                  </>
                ) : null}
              </Text>
            )}
            <Space wrap className="rt-restaurant-booking-card__date-row">
              <DatePicker
                size="small"
                value={date}
                onChange={(d) => d && updateBooking({ date: d })}
              />
              <Select
                size="small"
                value={partySize}
                onChange={(v) => updateBooking({ partySize: v ?? 2 })}
                style={{ width: 124 }}
                options={Array.from({ length: 20 }, (_, i) => ({
                  value: i + 1,
                  label: `${i + 1} ${i === 0 ? 'guest' : 'guests'}`,
                }))}
              />
            </Space>
            <SlotPicker
              slots={slots}
              selected={selectedSlot}
              onSelect={(slot) => updateBooking({ selectedSlot: slot })}
              loading={availLoading}
              popularCount={4}
            />
            {selectedSlot && restaurant?.allowGuestTableSelection && (
              <div className="rt-restaurant-booking-card__table-pick">
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  Choose your table
                </Text>
                {bookableLoading ? (
                  <Text type="secondary">Loading tables…</Text>
                ) : bookableTables.length === 0 ? (
                  <Text type="secondary">No tables available for this time</Text>
                ) : (
                  <Row gutter={[12, 12]}>
                    {bookableTables.map((t: any) => {
                      const selected = selectedTableId === t.id;
                      return (
                        <Col xs={12} sm={8} key={t.id}>
                          <Card
                            hoverable
                            size="small"
                            onClick={() => setSelectedTableId(t.id)}
                            style={{
                              borderColor: selected ? colors.brand[600] : undefined,
                              borderWidth: selected ? 2 : 1,
                            }}
                            cover={
                              t.photoUrl ? (
                                <img
                                  alt={t.name}
                                  src={t.photoUrl}
                                  style={{ height: 100, objectFit: 'cover' }}
                                />
                              ) : undefined
                            }
                          >
                            <Text strong>{t.name}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {t.floorArea} · {t.minCapacity}-{t.maxCapacity} guests
                            </Text>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                )}
              </div>
            )}
            {selectedSlot && !restaurant?.allowGuestTableSelection && (
              <Alert
                type="info"
                showIcon
                style={{ marginTop: 10 }}
                message="Your table will be assigned automatically when you book."
              />
            )}
            <Form layout="vertical" size="small" className="rt-restaurant-booking-card__form">
              <Form.Item
                label="Occasion"
                validateStatus={fieldErrors.occasion ? 'error' : undefined}
                help={fieldErrors.occasion}
              >
                <Select
                  value={occasion}
                  onChange={(v) => {
                    setOccasion(v);
                    clearFieldError('occasion');
                  }}
                  options={OCCASIONS.map((o) => ({
                    value: o,
                    label: o === 'none' ? 'None' : o.charAt(0).toUpperCase() + o.slice(1),
                  }))}
                />
              </Form.Item>
              <Form.Item
                label="Special requests"
                validateStatus={fieldErrors.guestNotes ? 'error' : undefined}
                help={fieldErrors.guestNotes}
              >
                <Input.TextArea
                  rows={2}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    clearFieldError('guestNotes');
                  }}
                  maxLength={500}
                  showCount
                  status={fieldErrors.guestNotes ? 'error' : undefined}
                  placeholder="Allergies, seating preferences, celebration details..."
                />
              </Form.Item>
              {user && redeemProgress.canRedeem && grossDepositCents > 0 && (
                <Form.Item
                  label="Redeem loyalty points"
                  validateStatus={fieldErrors.redeemPoints ? 'error' : undefined}
                  help={fieldErrors.redeemPoints}
                >
                  <div className="rt-restaurant-booking-card__loyalty-panel">
                    <div style={{ marginBottom: 8 }}>
                      <Text>
                        Your balance: <Text strong style={{ color: colors.brand[600] }}>{user.loyaltyPoints} pts</Text>
                      </Text>
                    </div>
                    <div style={{
                      height: 8,
                      borderRadius: radii.pill,
                      background: colors.brand[100],
                      overflow: 'hidden',
                      marginBottom: 12,
                    }}>
                      <div style={{
                        width: `${redeemProgress.percent}%`,
                        height: '100%',
                        background: colors.brand[600],
                        borderRadius: radii.pill,
                      }} />
                    </div>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
                      {redeemProgress.canRedeem
                        ? `Ready to redeem (${LOYALTY.MIN_REDEEM_POINTS}+ pts)`
                        : `${redeemProgress.remaining} pts until you can redeem`}
                    </Text>
                    <InputNumber
                      min={0}
                      max={user.loyaltyPoints}
                      step={100}
                      value={redeemPoints}
                      onChange={(v) => {
                        setRedeemPoints(v ?? 0);
                        clearFieldError('redeemPoints');
                      }}
                      style={{ width: 160 }}
                      addonAfter="pts"
                    />
                    {redeemPoints >= LOYALTY.MIN_REDEEM_POINTS ? (
                      <Alert
                        type="success"
                        showIcon
                        style={{ marginTop: 10 }}
                        message={`${redeemPoints} pts = $${(pointsToDiscountCents(redeemPoints) / 100).toFixed(2)} off deposit`}
                      />
                    ) : redeemPoints > 0 ? (
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginTop: 10 }}
                        message={`Minimum ${LOYALTY.MIN_REDEEM_POINTS} points required to redeem`}
                      />
                    ) : null}
                  </div>
                </Form.Item>
              )}

              {user && canRedeemRestaurant && (
                <Form.Item
                  label={`Redeem ${restaurant.name} points`}
                  validateStatus={fieldErrors.redeemRestaurantPoints ? 'error' : undefined}
                  help={fieldErrors.redeemRestaurantPoints}
                >
                  <div className="rt-restaurant-booking-card__loyalty-panel">
                    <Text>
                      Your balance:{' '}
                      <Text strong style={{ color: colors.brand[600] }}>
                        {restaurantLoyaltyBalance} pts
                      </Text>
                    </Text>
                    <InputNumber
                      min={0}
                      max={restaurantLoyaltyBalance}
                      step={50}
                      value={redeemRestaurantPoints}
                      onChange={(v) => {
                        setRedeemRestaurantPoints(v ?? 0);
                        clearFieldError('redeemRestaurantPoints');
                      }}
                      style={{ width: 160, marginTop: 8 }}
                      addonAfter="pts"
                    />
                    {redeemRestaurantPoints >= restaurantMinRedeem ? (
                      <Alert
                        type="success"
                        showIcon
                        style={{ marginTop: 10 }}
                        message={`${redeemRestaurantPoints} pts = $${(restaurantPointsToDiscountCents(redeemRestaurantPoints) / 100).toFixed(2)} off deposit`}
                      />
                    ) : redeemRestaurantPoints > 0 ? (
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginTop: 10 }}
                        message={`Minimum ${restaurantMinRedeem} restaurant points required to redeem`}
                      />
                    ) : null}
                  </div>
                </Form.Item>
              )}

              {grossDepositCents > 0 && (
                <Form.Item label="Promotion code">
                  <Input
                    placeholder="Enter code"
                    value={promoCode}
                    onChange={(e) => {
                      updateBooking({ promoCode: e.target.value.toUpperCase() });
                      clearFieldError('promoCode');
                    }}
                    style={{ maxWidth: 220 }}
                  />
                  {promoCode.trim() && selectedSlot && promoValidation && (
                    promoValidation.valid ? (
                      <Alert
                        type="success"
                        showIcon
                        style={{ marginTop: 10 }}
                        message={`${promoValidation.promotion?.title ?? 'Promotion'}: $${(promoValidation.discountCents / 100).toFixed(2)} off deposit`}
                      />
                    ) : (
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginTop: 10 }}
                        message={promoValidation.message ?? 'Invalid code'}
                      />
                    )
                  )}
                  {!promoCode.trim() && selectedSlot && bestPromotion?.valid && (
                    <Alert
                      type="info"
                      showIcon
                      style={{ marginTop: 10 }}
                      message={`Auto-applied: ${bestPromotion.promotion?.title ?? 'Promotion'} — $${(bestPromotion.discountCents / 100).toFixed(2)} off deposit`}
                    />
                  )}
                </Form.Item>
              )}

              {depositAfterPromo > 0 && (
                <Form.Item label="Gift card">
                  <Input
                    placeholder="GV-XXXX-XXXX"
                    value={giftCardCode}
                    onChange={(e) => {
                      setGiftCardCode(e.target.value.toUpperCase());
                      clearFieldError('giftCardCode');
                    }}
                    style={{ maxWidth: 220 }}
                  />
                  {giftCardCode.trim() && giftValidation && (
                    giftValidation.valid ? (
                      <Alert
                        type="success"
                        showIcon
                        style={{ marginTop: 10 }}
                        message={`Gift card: $${(giftValidation.discountCents / 100).toFixed(2)} off deposit`}
                      />
                    ) : (
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginTop: 10 }}
                        message={giftValidation.message ?? 'Invalid gift card'}
                      />
                    )
                  )}
                </Form.Item>
              )}

              {validationSummary.length > 0 && (
                <Alert
                  type="error"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="Please fix the following"
                  description={
                    validationSummary.length === 1 ? (
                      validationSummary[0]
                    ) : (
                      <ul style={{ margin: 0, paddingInlineStart: 20 }}>
                        {validationSummary.map((msg, idx) => (
                          <li key={idx}>{msg}</li>
                        ))}
                      </ul>
                    )
                  }
                />
              )}

              <Space size={8}>
                <Button type="primary" loading={booking} onClick={book}>
                  Complete reservation
                </Button>
                {availableCount === 0 && (
                  <Button loading={waitlisting} onClick={waitlist}>
                    Join waitlist
                  </Button>
                )}
              </Space>
              <Text type="secondary" className="rt-restaurant-booking-card__cancellation">
                {buildCancellationPolicySummary({
                  depositRequired: restaurant.depositRequired,
                  depositAmountCents: restaurant.depositAmountCents,
                })}
              </Text>
            </Form>
          </Card>
            </div>
          </Col>
        </Row>
      </div>
      </div>

      <RestaurantMessageModal
        open={messageOpen}
        restaurantId={restaurantId!}
        restaurantName={restaurant.name}
        onClose={() => setMessageOpen(false)}
      />

      <ReservationConfirmModal
        open={confirmOpen}
        confirming={booking}
        restaurantName={restaurant.name}
        termsAndConditions={restaurant.termsAndConditions}
        depositRequired={restaurant.depositRequired}
        depositAmountCents={restaurant.depositAmountCents}
        details={{
          dateLabel: date.format('dddd, MMMM D, YYYY'),
          timeLabel: new Date(selectedSlot!).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          }),
          partySize,
          occasionLabel: formatOccasion(occasion),
          guestName: user
            ? [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined
            : undefined,
          guestEmail: user?.email ?? undefined,
          notes: notes || undefined,
          tableName: selectedTable?.name,
          tableFloorArea: selectedTable?.floorArea,
          depositCents: finalDepositCents,
          promoDiscountCents: activePromo?.valid ? activePromo.discountCents : undefined,
          promoTitle: activePromo?.valid ? activePromo.promotion?.title : undefined,
          giftCardDiscountCents: giftValidation?.valid ? giftValidation.discountCents : undefined,
          loyaltyPointsRedeemed:
            redeemPoints >= LOYALTY.MIN_REDEEM_POINTS ? redeemPoints : undefined,
          restaurantPointsRedeemed:
            canRedeemRestaurant && redeemRestaurantPoints >= restaurantMinRedeem
              ? redeemRestaurantPoints
              : undefined,
        }}
        onClose={() => setConfirmOpen(false)}
        onConfirm={submitBooking}
        onViewTerms={() => {
          setConfirmOpen(false);
          document.getElementById('terms')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />

      <Modal
        open={!!bookingSuccess}
        title="Reservation confirmed"
        onOk={() => {
          setBookingSuccess(null);
          router.push('/reservations');
        }}
        onCancel={() => {
          setBookingSuccess(null);
          router.push('/reservations');
        }}
        okText="View reservations"
        cancelButtonProps={{ style: { display: 'none' } }}
        width={480}
      >
        {bookingSuccess && (
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Text>
              Your table: <Text strong>{bookingSuccess.tableName}</Text>
              {bookingSuccess.floorArea ? ` · ${bookingSuccess.floorArea}` : ''}
            </Text>
            {bookingSuccess.photoUrl && (
              <img
                src={bookingSuccess.photoUrl}
                alt={bookingSuccess.tableName ?? 'Your table'}
                style={{ width: '100%', borderRadius: 8, maxHeight: 240, objectFit: 'cover' }}
              />
            )}
          </Space>
        )}
      </Modal>

      <Modal
        open={!!depositInfo}
        footer={null}
        closable={false}
        destroyOnClose
        width={560}
      >
        {depositInfo && (
          <DepositPayment
            clientSecret={depositInfo.clientSecret}
            amount={depositInfo.amountCents}
            onSuccess={handleDepositSuccess}
            onCancel={() => setDepositInfo(null)}
          />
        )}
      </Modal>
    </div>
  );
}
