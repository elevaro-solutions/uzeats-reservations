'use client';

import { useEffect, useState } from 'react';
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
import { SlotPicker, priceRangeLabel, colors, radii } from '@reservations/ui';
import { OCCASIONS } from '@reservations/shared';
import { useAuth } from '@/lib/auth';
import {
  RESTAURANT_DETAIL,
  AVAILABILITY,
  CREATE_RESERVATION,
  CONFIRM_DEPOSIT,
  JOIN_WAITLIST,
  RESTAURANT_REVIEWS,
  PROMOTIONS,
  EXPERIENCES,
} from '@/lib/graphql';
import DepositPayment from '@/components/DepositPayment';

const { Title, Paragraph, Text } = Typography;

export default function RestaurantPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [date, setDate] = useState(dayjs(search.get('date') ?? dayjs().add(1, 'day')));
  const [partySize, setPartySize] = useState(Number(search.get('party') ?? 2));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(search.get('slot'));
  const [occasion, setOccasion] = useState('none');
  const [notes, setNotes] = useState('');
  const [redeemPoints, setRedeemPoints] = useState<number>(0);
  const [depositInfo, setDepositInfo] = useState<{
    clientSecret: string;
    reservationId: string;
    amountCents: number;
    paymentIntentId: string;
  } | null>(null);

  const { data } = useQuery(RESTAURANT_DETAIL, { variables: { id: params.id } });
  const { data: availData, loading: availLoading } = useQuery(AVAILABILITY, {
    variables: {
      restaurantId: params.id,
      date: date.format('YYYY-MM-DD'),
      partySize,
    },
  });
  const { data: reviewsData } = useQuery(RESTAURANT_REVIEWS, {
    variables: { restaurantId: params.id },
  });
  const { data: promotionsData } = useQuery(PROMOTIONS, {
    variables: { restaurantId: params.id, activeOnly: true },
  });
  const { data: experiencesData } = useQuery(EXPERIENCES, {
    variables: { restaurantId: params.id, upcoming: true },
  });

  const [createReservation, { loading: booking }] = useMutation(CREATE_RESERVATION);
  const [confirmDeposit] = useMutation(CONFIRM_DEPOSIT);
  const [joinWaitlist, { loading: waitlisting }] = useMutation(JOIN_WAITLIST);

  const restaurant = (data as any)?.restaurant;
  const slots = (availData as any)?.availability ?? [];
  const availableCount = slots.filter((s: any) => s.available).length;
  const promotions = (promotionsData as any)?.promotions ?? [];
  const experiences = (experiencesData as any)?.experiences ?? [];

  useEffect(() => {
    const slot = search.get('slot');
    if (slot) setSelectedSlot(slot);
  }, [search]);

  const book = async () => {
    if (!user) {
      message.info('Please sign in to book');
      router.push(`/login?next=/restaurants/${params.id}`);
      return;
    }
    if (!selectedSlot) {
      message.warning('Select a time slot');
      return;
    }
    try {
      const { data: result } = await createReservation({
        variables: {
          input: {
            restaurantId: params.id,
            partySize,
            slotStart: selectedSlot,
            occasion,
            guestNotes: notes || undefined,
            ...(redeemPoints >= 500 ? { redeemPoints } : {}),
          },
        },
      });
      const payload = (result as any)?.createReservation;
      if (payload?.clientSecret) {
        const cs = payload.clientSecret as string;
        setDepositInfo({
          clientSecret: cs,
          reservationId: payload.reservation.id,
          amountCents: payload.reservation.depositAmountCents ?? 0,
          paymentIntentId: cs.split('_secret')[0] ?? '',
        });
        return;
      }
      message.success('Reservation confirmed!');
      router.push('/reservations');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Booking failed');
    }
  };

  const handleDepositSuccess = async () => {
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
    message.success('Deposit authorized — reservation confirmed!');
    router.push('/reservations');
  };

  const waitlist = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    await joinWaitlist({
      variables: {
        input: {
          restaurantId: params.id,
          partySize,
          preferredDate: date.format('YYYY-MM-DD'),
        },
      },
    });
    message.success('Added to waitlist — we will notify you if a table opens.');
  };

  if (!restaurant) return <Card loading />;

  return (
    <Space orientation="vertical" size={24} style={{ width: '100%' }}>
      <Card
        cover={
          restaurant.photos?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={restaurant.photos[0]}
              alt={restaurant.name}
              style={{ height: 280, objectFit: 'cover' }}
            />
          ) : undefined
        }
      >
        <Title level={2} style={{ marginTop: 0 }}>
          {restaurant.name}
        </Title>
        <Space wrap>
          <Tag>{restaurant.cuisine}</Tag>
          <Text>{priceRangeLabel(restaurant.priceRange)}</Text>
          <Text type="secondary">
            {restaurant.address.line1}, {restaurant.address.city}, {restaurant.address.state}{' '}
            {restaurant.address.zip}
          </Text>
        </Space>
        <div style={{ marginTop: 8 }}>
          <Rate disabled allowHalf value={restaurant.averageRating} />
          <Text type="secondary" style={{ marginLeft: 8 }}>
            {restaurant.averageRating.toFixed(1)} ({restaurant.reviewCount} reviews)
          </Text>
        </div>
        <Paragraph style={{ marginTop: 16 }}>{restaurant.description}</Paragraph>
        {restaurant.depositRequired && (
          <Tag color="gold">
            Deposit ${(restaurant.depositAmountCents / 100).toFixed(2)} per guest
          </Tag>
        )}
      </Card>

      {promotions.length > 0 && (
        <Card title="Offers">
          <Row gutter={[16, 16]}>
            {promotions.map((p: any) => (
              <Col xs={24} md={12} key={p.id}>
                <Card size="small" style={{ height: '100%', background: colors.brand[50], borderColor: colors.brand[100] }}>
                  <Space align="baseline" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Text strong>{p.title}</Text>
                    {p.discountPercent ? <Tag color="red">{p.discountPercent}% off</Tag> : null}
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
        </Card>
      )}

      {experiences.length > 0 && (
        <Card title="Experiences & events">
          <Row gutter={[16, 16]}>
            {experiences.map((e: any) => (
              <Col xs={24} md={12} lg={8} key={e.id}>
                <Card
                  size="small"
                  style={{ height: '100%' }}
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
        </Card>
      )}

      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <Card title="Make a reservation" style={{ borderColor: colors.brand[100] }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Pick a date, party size, and time — confirmed in seconds.
            </Text>
            <Space wrap style={{ marginBottom: 16 }}>
              <DatePicker value={date} onChange={(d) => d && setDate(d)} />
              <Select
                value={partySize}
                onChange={(v) => setPartySize(v ?? 2)}
                style={{ width: 140 }}
                options={Array.from({ length: 20 }, (_, i) => ({
                  value: i + 1,
                  label: `${i + 1} ${i === 0 ? 'guest' : 'guests'}`,
                }))}
              />
            </Space>
            <SlotPicker
              slots={slots}
              selected={selectedSlot}
              onSelect={setSelectedSlot}
              loading={availLoading}
            />
            <Form layout="vertical" style={{ marginTop: 24 }}>
              <Form.Item label="Occasion">
                <Select
                  value={occasion}
                  onChange={setOccasion}
                  options={OCCASIONS.map((o) => ({
                    value: o,
                    label: o === 'none' ? 'None' : o.charAt(0).toUpperCase() + o.slice(1),
                  }))}
                />
              </Form.Item>
              <Form.Item label="Special requests">
                <Input.TextArea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Allergies, seating preferences, celebration details..."
                />
              </Form.Item>
              {user && (user.loyaltyPoints ?? 0) >= 500 && (
                <Form.Item label="Redeem loyalty points">
                  <div style={{
                    padding: 16,
                    borderRadius: radii.md,
                    background: colors.brand[50],
                    border: `1px solid ${colors.brand[100]}`,
                  }}>
                    <div style={{ marginBottom: 12 }}>
                      <Text>
                        Your balance: <Text strong style={{ color: colors.brand[600] }}>{user.loyaltyPoints} pts</Text>
                      </Text>
                    </div>
                    <InputNumber
                      min={0}
                      max={user.loyaltyPoints}
                      step={100}
                      value={redeemPoints}
                      onChange={(v) => setRedeemPoints(v ?? 0)}
                      style={{ width: 160 }}
                      addonAfter="pts"
                    />
                    {redeemPoints >= 500 ? (
                      <Alert
                        type="success"
                        showIcon
                        style={{ marginTop: 10 }}
                        message={`${redeemPoints} pts = $${(redeemPoints / 100).toFixed(2)} off deposit`}
                      />
                    ) : redeemPoints > 0 ? (
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginTop: 10 }}
                        message="Minimum 500 points required to redeem"
                      />
                    ) : null}
                  </div>
                </Form.Item>
              )}

              <Space>
                <Button type="primary" size="large" loading={booking} onClick={book}>
                  Complete reservation
                </Button>
                {availableCount === 0 && (
                  <Button loading={waitlisting} onClick={waitlist}>
                    Join waitlist
                  </Button>
                )}
              </Space>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Menu" style={{ marginBottom: 16 }}>
            {(restaurant.menu?.sections ?? []).map((section: any) => (
              <div key={section.id} style={{ marginBottom: 16 }}>
                <Title level={5}>{section.name}</Title>
                {(section.items ?? []).map((item: any, idx: number) => (
                  <div
                    key={item.id ?? idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: 16,
                      padding: '10px 0',
                      borderBottom: '1px solid #f0ede8',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <Text strong>{item.name}</Text>
                      {item.description && (
                        <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
                          {item.description}
                        </Text>
                      )}
                    </div>
                    <Text style={{ whiteSpace: 'nowrap' }}>
                      ${(item.priceCents / 100).toFixed(2)}
                    </Text>
                  </div>
                ))}
              </div>
            ))}
            {!restaurant.menu && <Text type="secondary">Menu coming soon.</Text>}
          </Card>
          <Card title="Reviews">
            {((reviewsData as any)?.restaurantReviews ?? []).length === 0 && (
              <Text type="secondary">No reviews yet</Text>
            )}
            {((reviewsData as any)?.restaurantReviews ?? []).map((r: any, idx: number) => (
              <div
                key={r.id ?? idx}
                style={{
                  padding: '12px 0',
                  borderBottom: `1px solid ${colors.bordersubtle}`,
                }}
              >
                <Space>
                  <Text strong>
                    {r.diner?.firstName} {r.diner?.lastName?.[0]}.
                  </Text>
                  <Rate disabled value={r.rating} style={{ fontSize: 12 }} />
                </Space>
                {r.comment && (
                  <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                    {r.comment}
                  </Text>
                )}
              </div>
            ))}
          </Card>
        </Col>
      </Row>

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
    </Space>
  );
}
