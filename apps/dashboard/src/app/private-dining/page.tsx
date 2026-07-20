'use client';

import { Suspense, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '@/lib/auth';
import { MY_RESTAURANTS } from '@/lib/graphql';
import { useUrlPagination } from '@/lib/useUrlPagination';
import { gql } from '@apollo/client';

const { Title, Text } = Typography;
const { TextArea } = Input;

const PRIVATE_DINING_SPACES = gql`
  query PrivateDiningSpaces($restaurantId: ID!) {
    privateDiningSpaces(restaurantId: $restaurantId) {
      id name description minGuests maxGuests rentalFeeCents minimumSpendCents photoUrl amenities active
    }
  }
`;

const PRIVATE_DINING_INQUIRIES = gql`
  query PrivateDiningInquiries($restaurantId: ID!, $limit: Int, $offset: Int) {
    privateDiningInquiries(restaurantId: $restaurantId, limit: $limit, offset: $offset) {
      total
      items {
        id eventDate guestCount eventType budget specialRequests contactPhone status restaurantResponse createdAt
        space { name }
        diner { firstName lastName email phone }
      }
    }
  }
`;

const CREATE_SPACE = gql`
  mutation CreatePrivateDiningSpace($restaurantId: ID!, $input: PrivateDiningSpaceInput!) {
    createPrivateDiningSpace(restaurantId: $restaurantId, input: $input) {
      id name
    }
  }
`;

const UPDATE_SPACE = gql`
  mutation UpdatePrivateDiningSpace($id: ID!, $input: PrivateDiningSpaceInput!) {
    updatePrivateDiningSpace(id: $id, input: $input) {
      id name
    }
  }
`;

const RESPOND_TO_INQUIRY = gql`
  mutation RespondToInquiry($id: ID!, $status: InquiryStatus!, $response: String) {
    respondToInquiry(id: $id, status: $status, response: $response) {
      id status
    }
  }
`;

const inquiryStatusColors: Record<string, string> = {
  pending: 'gold',
  responded: 'blue',
  confirmed: 'green',
  declined: 'red',
  cancelled: 'default',
};

function PrivateDiningPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>();
  const [spaceModalOpen, setSpaceModalOpen] = useState(false);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [respondModalOpen, setRespondModalOpen] = useState(false);
  const [respondingInquiry, setRespondingInquiry] = useState<any>(null);
  const [spaceForm] = Form.useForm();
  const [respondForm] = Form.useForm();
  const { limit, offset, tablePagination } = useUrlPagination({ defaultPageSize: 10 });

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const { data: spacesData, refetch: refetchSpaces, loading: spacesLoading } = useQuery(
    PRIVATE_DINING_SPACES,
    { skip: !restaurantId, variables: { restaurantId: restaurantId! } },
  );
  const { data: inquiriesData, refetch: refetchInquiries, loading: inquiriesLoading } = useQuery(
    PRIVATE_DINING_INQUIRIES,
    { skip: !restaurantId, variables: { restaurantId: restaurantId!, limit, offset } },
  );
  const [createSpace, { loading: creatingSpace }] = useMutation(CREATE_SPACE);
  const [updateSpace, { loading: updatingSpace }] = useMutation(UPDATE_SPACE);
  const [respondToInquiry, { loading: responding }] = useMutation(RESPOND_TO_INQUIRY);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    const saved = localStorage.getItem('activeRestaurantId');
    const first = restData?.myRestaurants?.[0]?.id;
    setRestaurantId(saved ?? first);
  }, [restData]);

  const handleSpaceSubmit = async () => {
    try {
      const values = await spaceForm.validateFields();
      const input = {
        name: values.name,
        description: values.description || undefined,
        minGuests: values.minGuests,
        maxGuests: values.maxGuests,
        rentalFeeCents: Math.round((values.rentalFee ?? 0) * 100),
        minimumSpendCents: Math.round((values.minimumSpend ?? 0) * 100),
        photoUrl: values.photoUrl || undefined,
        amenities: values.amenities?.split(',').map((a: string) => a.trim()).filter(Boolean) ?? [],
        active: true,
      };

      if (editingSpaceId) {
        await updateSpace({ variables: { id: editingSpaceId, input } });
        message.success('Space updated');
      } else {
        await createSpace({ variables: { restaurantId, input } });
        message.success('Space created');
      }
      setSpaceModalOpen(false);
      setEditingSpaceId(null);
      spaceForm.resetFields();
      refetchSpaces();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to save space');
    }
  };

  const handleRespond = async () => {
    try {
      const values = await respondForm.validateFields();
      await respondToInquiry({
        variables: { id: respondingInquiry.id, status: values.status, response: values.response },
      });
      message.success('Response sent');
      setRespondModalOpen(false);
      setRespondingInquiry(null);
      respondForm.resetFields();
      refetchInquiries();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to respond');
    }
  };

  const openEditSpace = (record: any) => {
    setEditingSpaceId(record.id);
    spaceForm.setFieldsValue({
      name: record.name,
      description: record.description,
      minGuests: record.minGuests,
      maxGuests: record.maxGuests,
      rentalFee: record.rentalFeeCents / 100,
      minimumSpend: record.minimumSpendCents / 100,
      photoUrl: record.photoUrl,
      amenities: record.amenities?.join(', '),
    });
    setSpaceModalOpen(true);
  };

  const spaceColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Capacity',
      key: 'capacity',
      render: (_: any, r: any) => `${r.minGuests}–${r.maxGuests} guests`,
    },
    {
      title: 'Rental Fee',
      dataIndex: 'rentalFeeCents',
      key: 'rentalFee',
      render: (v: number) => v ? `$${(v / 100).toFixed(2)}` : 'None',
    },
    {
      title: 'Min. Spend',
      dataIndex: 'minimumSpendCents',
      key: 'minimumSpend',
      render: (v: number) => v ? `$${(v / 100).toFixed(2)}` : 'None',
    },
    {
      title: 'Amenities',
      dataIndex: 'amenities',
      key: 'amenities',
      render: (a: string[]) => a?.slice(0, 3).map((x) => <Tag key={x}>{x}</Tag>),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: any) => (
        <Button size="small" onClick={() => openEditSpace(r)}>Edit</Button>
      ),
    },
  ];

  const inquiryColumns = [
    {
      title: 'Contact',
      key: 'contact',
      render: (_: any, r: any) => (
        <div>
          <Text strong>{r.diner?.firstName} {r.diner?.lastName}</Text>
          <br />
          <Text type="secondary">{r.diner?.email}</Text>
        </div>
      ),
    },
    {
      title: 'Event Date',
      dataIndex: 'eventDate',
      key: 'eventDate',
      render: (d: string) => dayjs(d).format('MMM D, YYYY'),
    },
    { title: 'Guests', dataIndex: 'guestCount', key: 'guestCount' },
    {
      title: 'Type',
      dataIndex: 'eventType',
      key: 'eventType',
      render: (t: string) => <Tag>{t}</Tag>,
    },
    {
      title: 'Space',
      key: 'space',
      render: (_: any, r: any) => r.space?.name ?? '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={inquiryStatusColors[s]}>{s}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: any) => (
        <Button
          size="small"
          type="primary"
          onClick={() => { setRespondingInquiry(r); respondForm.resetFields(); setRespondModalOpen(true); }}
        >
          Respond
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Private Dining</Title>

      <Select
        style={{ width: 260 }}
        value={restaurantId}
        onChange={(id) => {
          setRestaurantId(id);
          localStorage.setItem('activeRestaurantId', id);
        }}
        options={(restData?.myRestaurants ?? []).map((r: any) => ({
          value: r.id,
          label: r.name,
        }))}
      />

      <Tabs
        items={[
          {
            key: 'spaces',
            label: 'Spaces',
            children: (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => { setEditingSpaceId(null); spaceForm.resetFields(); setSpaceModalOpen(true); }}
                  >
                    Add Space
                  </Button>
                </div>
                <Table
                  dataSource={spacesData?.privateDiningSpaces ?? []}
                  columns={spaceColumns}
                  rowKey="id"
                  loading={spacesLoading}
                  pagination={false}
                />
              </Space>
            ),
          },
          {
            key: 'inquiries',
            label: 'Inquiries',
            children: (
              <Table
                dataSource={inquiriesData?.privateDiningInquiries?.items ?? []}
                columns={inquiryColumns}
                rowKey="id"
                loading={inquiriesLoading}
                pagination={tablePagination(inquiriesData?.privateDiningInquiries?.total ?? 0)}
                expandable={{
                  expandedRowRender: (record: any) => (
                    <Descriptions size="small" column={2}>
                      {record.budget && <Descriptions.Item label="Budget">{record.budget}</Descriptions.Item>}
                      {record.specialRequests && <Descriptions.Item label="Special Requests">{record.specialRequests}</Descriptions.Item>}
                      {record.contactPhone && <Descriptions.Item label="Phone">{record.contactPhone}</Descriptions.Item>}
                      {record.restaurantResponse && <Descriptions.Item label="Your Response">{record.restaurantResponse}</Descriptions.Item>}
                    </Descriptions>
                  ),
                }}
              />
            ),
          },
        ]}
      />

      <Modal
        title={editingSpaceId ? 'Edit Space' : 'Add Private Dining Space'}
        open={spaceModalOpen}
        onCancel={() => { setSpaceModalOpen(false); setEditingSpaceId(null); }}
        onOk={handleSpaceSubmit}
        confirmLoading={creatingSpace || updatingSpace}
        width={520}
      >
        <Form form={spaceForm} layout="vertical">
          <Form.Item name="name" label="Space Name" rules={[{ required: true }]}>
            <Input placeholder="The Cellar Room" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={2} />
          </Form.Item>
          <Space>
            <Form.Item name="minGuests" label="Min Guests" rules={[{ required: true }]}>
              <InputNumber min={1} />
            </Form.Item>
            <Form.Item name="maxGuests" label="Max Guests" rules={[{ required: true }]}>
              <InputNumber min={1} />
            </Form.Item>
          </Space>
          <Space>
            <Form.Item name="rentalFee" label="Rental Fee ($)">
              <InputNumber min={0} step={1} />
            </Form.Item>
            <Form.Item name="minimumSpend" label="Minimum Spend ($)">
              <InputNumber min={0} step={1} />
            </Form.Item>
          </Space>
          <Form.Item name="photoUrl" label="Photo URL">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="amenities" label="Amenities (comma-separated)">
            <Input placeholder="AV equipment, Private bar, Dance floor" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Respond to Inquiry"
        open={respondModalOpen}
        onCancel={() => { setRespondModalOpen(false); setRespondingInquiry(null); }}
        onOk={handleRespond}
        confirmLoading={responding}
      >
        {respondingInquiry && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              {respondingInquiry.diner?.firstName} {respondingInquiry.diner?.lastName} —{' '}
              {dayjs(respondingInquiry.eventDate).format('MMM D, YYYY')} —{' '}
              {respondingInquiry.guestCount} guests — {respondingInquiry.eventType}
            </Text>
          </div>
        )}
        <Form form={respondForm} layout="vertical">
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'responded', label: 'Responded' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'declined', label: 'Declined' },
              ]}
            />
          </Form.Item>
          <Form.Item name="response" label="Message to Diner">
            <TextArea rows={4} placeholder="Thank you for your inquiry..." />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

export default function PrivateDiningPage() {
  return (
    <Suspense fallback={null}>
      <PrivateDiningPageContent />
    </Suspense>
  );
}
