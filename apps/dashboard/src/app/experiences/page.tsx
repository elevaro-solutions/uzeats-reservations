'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '@/lib/auth';
import { MY_RESTAURANTS } from '@/lib/graphql';
import { gql } from '@apollo/client';

const { Title, Text } = Typography;
const { TextArea } = Input;

const EXPERIENCES = gql`
  query Experiences($restaurantId: ID) {
    experiences(restaurantId: $restaurantId) {
      id title type date startTime endTime maxGuests ticketPriceCents ticketsSold status
    }
  }
`;

const CREATE_EXPERIENCE = gql`
  mutation CreateExperience($restaurantId: ID!, $input: ExperienceInput!) {
    createExperience(restaurantId: $restaurantId, input: $input) {
      id title
    }
  }
`;

const UPDATE_EXPERIENCE = gql`
  mutation UpdateExperience($id: ID!, $input: ExperienceInput!) {
    updateExperience(id: $id, input: $input) {
      id title status
    }
  }
`;

const PUBLISH_EXPERIENCE = gql`
  mutation PublishExperience($id: ID!) {
    publishExperience(id: $id) {
      id status
    }
  }
`;

const EXPERIENCE_TICKETS = gql`
  query ExperienceTickets($restaurantId: ID) {
    experiences(restaurantId: $restaurantId) {
      id title
    }
  }
`;

const typeLabels: Record<string, string> = {
  tasting: 'Tasting Menu',
  class: 'Cooking Class',
  special_menu: 'Special Menu',
  wine_pairing: 'Wine Pairing',
  chef_table: "Chef's Table",
  holiday: 'Holiday Event',
  other: 'Other',
};

const statusColors: Record<string, string> = {
  draft: 'default',
  published: 'blue',
  sold_out: 'orange',
  completed: 'green',
  cancelled: 'red',
};

export default function ExperiencesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const { data, refetch, loading } = useQuery(EXPERIENCES, {
    skip: !restaurantId,
    variables: { restaurantId },
  });
  const [createExperience, { loading: creating }] = useMutation(CREATE_EXPERIENCE);
  const [updateExperience, { loading: updating }] = useMutation(UPDATE_EXPERIENCE);
  const [publishExperience] = useMutation(PUBLISH_EXPERIENCE);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    const saved = localStorage.getItem('activeRestaurantId');
    const first = restData?.myRestaurants?.[0]?.id;
    setRestaurantId(saved ?? first);
  }, [restData]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const input = {
        title: values.title,
        description: values.description,
        type: values.type,
        photoUrl: values.photoUrl || undefined,
        date: values.date.toISOString(),
        startTime: values.startTime,
        endTime: values.endTime,
        maxGuests: values.maxGuests,
        ticketPriceCents: Math.round(values.ticketPrice * 100),
        includes: values.includes?.split('\n').filter(Boolean) ?? [],
        tags: values.tags?.split(',').map((t: string) => t.trim()).filter(Boolean) ?? [],
      };

      if (editingId) {
        await updateExperience({ variables: { id: editingId, input } });
        message.success('Experience updated');
      } else {
        await createExperience({ variables: { restaurantId, input } });
        message.success('Experience created');
      }
      setModalOpen(false);
      setEditingId(null);
      form.resetFields();
      refetch();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to save experience');
    }
  };

  const handlePublish = async (id: string) => {
    await publishExperience({ variables: { id } });
    refetch();
  };

  const openEdit = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue({
      title: record.title,
      description: record.description,
      type: record.type,
      date: dayjs(record.date),
      startTime: record.startTime,
      endTime: record.endTime,
      maxGuests: record.maxGuests,
      ticketPrice: record.ticketPriceCents / 100,
    });
    setModalOpen(true);
  };

  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title' },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => typeLabels[t] ?? t,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (d: string) => dayjs(d).format('MMM D, YYYY'),
    },
    {
      title: 'Time',
      key: 'time',
      render: (_: any, r: any) => `${r.startTime} – ${r.endTime}`,
    },
    {
      title: 'Tickets',
      key: 'tickets',
      render: (_: any, r: any) => `${r.ticketsSold} / ${r.maxGuests}`,
    },
    {
      title: 'Price',
      dataIndex: 'ticketPriceCents',
      key: 'price',
      render: (v: number) => `$${(v / 100).toFixed(2)}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={statusColors[s]}>{s.replace('_', ' ')}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => openEdit(r)}>Edit</Button>
          <Button
            size="small"
            type={r.status === 'published' ? 'default' : 'primary'}
            onClick={() => handlePublish(r.id)}
          >
            {r.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>Experiences</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true); }}
        >
          Create Experience
        </Button>
      </div>

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

      <Card>
        <Table
          dataSource={data?.experiences ?? []}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingId ? 'Edit Experience' : 'Create Experience'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingId(null); }}
        onOk={handleSubmit}
        confirmLoading={creating || updating}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select
              options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>
          <Space>
            <Form.Item name="date" label="Date" rules={[{ required: true }]}>
              <DatePicker />
            </Form.Item>
            <Form.Item name="startTime" label="Start Time" rules={[{ required: true }]}>
              <Input placeholder="18:00" />
            </Form.Item>
            <Form.Item name="endTime" label="End Time" rules={[{ required: true }]}>
              <Input placeholder="21:00" />
            </Form.Item>
          </Space>
          <Space>
            <Form.Item name="maxGuests" label="Max Guests" rules={[{ required: true }]}>
              <InputNumber min={1} />
            </Form.Item>
            <Form.Item name="ticketPrice" label="Ticket Price ($)" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.01} />
            </Form.Item>
          </Space>
          <Form.Item name="photoUrl" label="Photo URL">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="includes" label="What's Included (one per line)">
            <TextArea rows={3} placeholder="5-course tasting menu&#10;Wine pairings&#10;Meet the chef" />
          </Form.Item>
          <Form.Item name="tags" label="Tags (comma-separated)">
            <Input placeholder="wine, tasting, special" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
