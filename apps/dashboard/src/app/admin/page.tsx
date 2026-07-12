'use client';

import { useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { Button, Card, Col, Row, Space, Statistic, Table, Typography, message } from 'antd';
import { StatusTag } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { ADMIN_STATS, ADMIN_RESTAURANTS, SET_RESTAURANT_STATUS } from '@/lib/graphql';

const { Title } = Typography;

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data: stats } = useQuery(ADMIN_STATS, { skip: user?.role !== 'admin' });
  const { data, refetch } = useQuery(ADMIN_RESTAURANTS, { skip: user?.role !== 'admin' });
  const [setStatus] = useMutation(SET_RESTAURANT_STATUS);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) router.replace('/');
  }, [authLoading, user, router]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Platform admin</Title>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="Users" value={stats?.adminStats?.users ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Restaurants" value={stats?.adminStats?.restaurants ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Reservations" value={stats?.adminStats?.reservations ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Pending" value={stats?.adminStats?.pendingRestaurants ?? 0} />
          </Card>
        </Col>
      </Row>
      <Card title="Restaurant approvals">
        <Table
          rowKey="id"
          dataSource={data?.adminRestaurants ?? []}
          columns={[
            { title: 'Name', dataIndex: 'name' },
            { title: 'Cuisine', dataIndex: 'cuisine' },
            {
              title: 'Location',
              render: (_: unknown, r: any) => `${r.address.city}, ${r.address.state}`,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (s: string) => <StatusTag status={s} />,
            },
            {
              title: 'Actions',
              render: (_: unknown, r: any) => (
                <Space>
                  {r.status !== 'approved' && (
                    <Button
                      type="primary"
                      size="small"
                      onClick={async () => {
                        await setStatus({ variables: { id: r.id, status: 'approved' } });
                        message.success('Approved');
                        refetch();
                      }}
                    >
                      Approve
                    </Button>
                  )}
                  {r.status !== 'rejected' && (
                    <Button
                      danger
                      size="small"
                      onClick={async () => {
                        await setStatus({ variables: { id: r.id, status: 'rejected' } });
                        refetch();
                      }}
                    >
                      Reject
                    </Button>
                  )}
                  {r.status === 'approved' && (
                    <Button
                      size="small"
                      onClick={async () => {
                        await setStatus({ variables: { id: r.id, status: 'suspended' } });
                        refetch();
                      }}
                    >
                      Suspend
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
