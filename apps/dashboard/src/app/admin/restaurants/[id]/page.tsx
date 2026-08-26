'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Space,
  Spin,
  Tabs,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  ExportOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { buildRestaurantBookingUrl } from '@reservations/shared';
import { PageHeader, StatusTag, spacing } from '@reservations/ui';
import {
  AdminManageRestaurant,
  type AdminRestaurantRecord,
} from '@/components/AdminManageRestaurant';
import { AdminRestaurantInvoicesPanel } from '@/components/AdminRestaurantInvoicesPanel';
import { AdminRestaurantMenuPanel } from '@/components/AdminRestaurantMenuPanel';
import { AdminRestaurantReservationsPanel } from '@/components/AdminRestaurantReservationsPanel';
import { ADMIN_RESTAURANT } from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { getPublicWebUrl } from '@/lib/webUrl';

const { Text, Title } = Typography;

type RestaurantDetail = AdminRestaurantRecord & {
  menu?: {
    sections?: Array<{
      name: string;
      items: Array<{
        name: string;
        description?: string | null;
        priceCents?: number;
        dietary?: string[];
        available?: boolean;
        photoUrl?: string | null;
      }>;
    }>;
  } | null;
};

function money(cents?: number | null) {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

export default function AdminRestaurantDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const { ready } = useRequireAdmin();
  const [tab, setTab] = useState('overview');
  const [previewKey, setPreviewKey] = useState(0);
  const [restaurantOverride, setRestaurantOverride] = useState<RestaurantDetail | null>(null);

  const { data, loading, refetch } = useQuery(ADMIN_RESTAURANT, {
    skip: !ready || !id,
    variables: { id },
  });

  const restaurant = (restaurantOverride ?? data?.restaurant ?? null) as RestaurantDetail | null;

  const dinerUrl = useMemo(() => {
    if (!restaurant) return null;
    return buildRestaurantBookingUrl(getPublicWebUrl(), {
      slug: restaurant.slug,
      id: restaurant.id,
    });
  }, [restaurant]);

  const addressLine = restaurant?.address
    ? [
        restaurant.address.line1,
        restaurant.address.line2,
        [restaurant.address.city, restaurant.address.state, restaurant.address.zip]
          .filter(Boolean)
          .join(', '),
      ]
        .filter(Boolean)
        .join(', ')
    : null;

  const menuItemCount = (restaurant?.menu?.sections ?? []).reduce(
    (n, s) => n + (s.items?.length ?? 0),
    0,
  );

  const refresh = async () => {
    const result = await refetch();
    if (result.data?.restaurant) {
      setRestaurantOverride(result.data.restaurant);
    }
    setPreviewKey((k) => k + 1);
  };

  if (!ready) return null;

  if (!loading && !restaurant) {
    return (
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Restaurant"
          extra={
            <Link href="/admin/restaurants">
              <Button icon={<ArrowLeftOutlined />}>Back to restaurants</Button>
            </Link>
          }
        />
        <Empty description="Restaurant not found" />
      </Space>
    );
  }

  return (
    <div component="AdminRestaurantDetailPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
        <PageHeader
          title={restaurant?.name ?? 'Restaurant'}
          subtitle="Super-admin hub — profile, package, team, menu, reservations, and invoices."
          extra={
            <Space wrap>
              <Link href="/admin/restaurants">
                <Button icon={<ArrowLeftOutlined />}>Back</Button>
              </Link>
              {restaurant ? <StatusTag status={restaurant.status} /> : null}
              {dinerUrl ? (
                <Button
                  icon={<ExportOutlined />}
                  href={dinerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Public page
                </Button>
              ) : null}
              <Button icon={<ReloadOutlined />} onClick={() => void refresh()}>
                Refresh
              </Button>
            </Space>
          }
        />

        {loading && !restaurant ? (
          <Card>
            <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
              <Spin size="large" />
            </div>
          </Card>
        ) : restaurant ? (
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              {
                key: 'overview',
                label: 'Overview',
                children: (
                  <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={8}>
                        <Card size="small">
                          <Text type="secondary">Package</Text>
                          <Title level={4} style={{ margin: '4px 0 0' }}>
                            {restaurant.subscription?.plan
                              ? String(restaurant.subscription.plan).toUpperCase()
                              : 'None'}
                          </Title>
                          <Text type="secondary">
                            {restaurant.subscription?.status
                              ? statusCap(restaurant.subscription.status)
                              : 'No active subscription'}
                            {restaurant.subscription?.monthlyPriceCents != null
                              ? ` · ${money(restaurant.subscription.monthlyPriceCents)}/mo`
                              : ''}
                          </Text>
                        </Card>
                      </Col>
                      <Col xs={24} md={8}>
                        <Card size="small">
                          <Text type="secondary">Menu</Text>
                          <Title level={4} style={{ margin: '4px 0 0' }}>
                            {menuItemCount} items
                          </Title>
                          <Text type="secondary">
                            {(restaurant.menu?.sections ?? []).length} section
                            {(restaurant.menu?.sections ?? []).length === 1 ? '' : 's'}
                          </Text>
                        </Card>
                      </Col>
                      <Col xs={24} md={8}>
                        <Card size="small">
                          <Text type="secondary">Contact</Text>
                          <Title level={5} style={{ margin: '4px 0 0' }}>
                            {restaurant.phone || 'No phone'}
                          </Title>
                          <Text type="secondary">{restaurant.cuisine}</Text>
                        </Card>
                      </Col>
                    </Row>

                    <Card title="Restaurant details">
                      <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
                        <Descriptions.Item label="Name">{restaurant.name}</Descriptions.Item>
                        <Descriptions.Item label="Slug">{restaurant.slug || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Status">
                          <StatusTag status={restaurant.status} />
                        </Descriptions.Item>
                        <Descriptions.Item label="Cuisine">{restaurant.cuisine}</Descriptions.Item>
                        <Descriptions.Item label="Price range">
                          {'$'.repeat(restaurant.priceRange || 1)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Featured">
                          {restaurant.featured ? 'Yes' : 'No'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Phone">{restaurant.phone || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Website">
                          {restaurant.website ? (
                            <Typography.Link href={restaurant.website} target="_blank">
                              {restaurant.website}
                            </Typography.Link>
                          ) : (
                            '—'
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label="Menu URL">
                          {restaurant.menuUrl ? (
                            <Typography.Link href={restaurant.menuUrl} target="_blank">
                              {restaurant.menuUrl}
                            </Typography.Link>
                          ) : (
                            '—'
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label="Address" span={3}>
                          {addressLine || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Description" span={3}>
                          {restaurant.description || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Deposit">
                          {restaurant.depositRequired
                            ? money(restaurant.depositAmountCents)
                            : 'Not required'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Loyalty">
                          {restaurant.loyaltyEnabled
                            ? `${restaurant.loyaltyPointsPerVisit ?? 0} pts / visit`
                            : 'Off'}
                        </Descriptions.Item>
                        <Descriptions.Item label="POS">
                          {restaurant.posEnabled ? 'Enabled' : 'Disabled'}
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>

                    <Space wrap>
                      <Button type="primary" onClick={() => setTab('manage')}>
                        Edit details & package
                      </Button>
                      <Button onClick={() => setTab('menu')}>Manage menu</Button>
                      <Button onClick={() => setTab('reservations')}>Reservations</Button>
                      <Button icon={<FileTextOutlined />} onClick={() => setTab('invoices')}>
                        Invoices
                      </Button>
                      <Button onClick={() => setTab('preview')}>Diner preview</Button>
                    </Space>
                  </Space>
                ),
              },
              {
                key: 'manage',
                label: 'Manage',
                children: (
                  <Card>
                    <AdminManageRestaurant
                      presentation="panel"
                      restaurant={restaurant}
                      open
                      onClose={() => undefined}
                      onSaved={(updated) => {
                        setRestaurantOverride({ ...restaurant, ...updated });
                        void refresh();
                      }}
                    />
                  </Card>
                ),
              },
              {
                key: 'menu',
                label: 'Menu',
                children: (
                  <AdminRestaurantMenuPanel
                    restaurant={restaurant}
                    onSaved={() => void refresh()}
                  />
                ),
              },
              {
                key: 'reservations',
                label: 'Reservations',
                children: <AdminRestaurantReservationsPanel restaurantId={restaurant.id} />,
              },
              {
                key: 'invoices',
                label: 'Invoices',
                children: <AdminRestaurantInvoicesPanel restaurantId={restaurant.id} />,
              },
              {
                key: 'preview',
                label: 'Diner preview',
                children: (
                  <Card
                    styles={{
                      body: {
                        padding: 0,
                        overflow: 'hidden',
                        minHeight: 'calc(100vh - 280px)',
                      },
                    }}
                  >
                    {dinerUrl ? (
                      <iframe
                        key={previewKey}
                        title={`${restaurant.name} diner preview`}
                        src={dinerUrl}
                        style={{
                          display: 'block',
                          width: '100%',
                          height: 'calc(100vh - 280px)',
                          minHeight: 560,
                          border: 0,
                          background: '#fff',
                        }}
                      />
                    ) : (
                      <div style={{ padding: spacing.lg }}>
                        <Text type="secondary">Unable to build diner preview URL.</Text>
                      </div>
                    )}
                  </Card>
                ),
              },
            ]}
          />
        ) : null}
      </Space>
    </div>
  );
}

function statusCap(status: string) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : status;
}
