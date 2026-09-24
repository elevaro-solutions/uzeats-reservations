'use client';

import { Suspense, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  TimePicker,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, CheckOutlined, FileAddOutlined, EditOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useAuth } from '@/lib/auth';
import { MY_RESTAURANTS } from '@/lib/graphql';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import PhotoUpload from '@/components/PhotoUpload';
import { useUrlPagination } from '@/lib/useUrlPagination';
import { useFormDirty } from '@/lib/useFormDirty';
import { gql } from '@apollo/client';

const { Title } = Typography;
const { TextArea } = Input;

const EXPERIENCES = gql`
  query Experiences($restaurantId: ID, $limit: Int, $offset: Int) {
    experiences(restaurantId: $restaurantId, limit: $limit, offset: $offset) {
      total
      items {
        id title type date endDate startTime endTime minGuests maxGuests ticketPriceCents ticketsSold status description photoUrl requiresManualApproval
      }
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

const DELETE_EXPERIENCE = gql`
  mutation DeleteExperience($id: ID!) {
    deleteExperience(id: $id)
  }
`;

const PUBLISH_EXPERIENCE = gql`
  mutation PublishExperience($id: ID!) {
    publishExperience(id: $id) {
      id status
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

function parseClock(value?: string | null) {
  if (!value) return undefined;
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return undefined;
  return dayjs().hour(hours).minute(minutes).second(0).millisecond(0);
}

function formatClock(value?: Dayjs | null) {
  return value ? value.format('HH:mm') : undefined;
}

function ExperiencesPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const { dirty, clearDirty, onValuesChange } = useFormDirty();
  const { limit, offset, tablePagination } = useUrlPagination({ defaultPageSize: 10 });

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId, restaurantSelectProps } = usePartnerRestaurant(restaurants);

  const { data, refetch, loading } = useQuery(EXPERIENCES, {
    skip: !activeRestaurantId,
    variables: { restaurantId: activeRestaurantId, limit, offset },
  });
  const [createExperience, { loading: creating }] = useMutation(CREATE_EXPERIENCE);
  const [updateExperience, { loading: updating }] = useMutation(UPDATE_EXPERIENCE);
  const [publishExperience] = useMutation(PUBLISH_EXPERIENCE);
  const [deleteExperience] = useMutation(DELETE_EXPERIENCE);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const handleSubmit = async () => {
    if (!dirty) return;
    try {
      const values = await form.validateFields();
      const [rangeStart, rangeEnd] = values.dateRange ?? [];
      if (!rangeStart || !rangeEnd) {
        message.error('Select a date range');
        return;
      }
      const startTime = formatClock(values.startTime);
      const endTime = formatClock(values.endTime);
      if (!startTime || !endTime) {
        message.error('Select start and end times');
        return;
      }
      if (values.minGuests > values.maxGuests) {
        message.error('Min guests cannot exceed max guests');
        return;
      }
      const input = {
        title: values.title,
        description: values.description,
        type: values.type,
        photoUrl: values.photoUrls?.[0] || values.photoUrl || undefined,
        date: rangeStart.startOf('day').toISOString(),
        endDate: rangeEnd.startOf('day').toISOString(),
        startTime,
        endTime,
        minGuests: values.minGuests,
        maxGuests: values.maxGuests,
        ticketPriceCents: Math.round(values.ticketPrice * 100),
        includes: values.includes?.split('\n').filter(Boolean) ?? [],
        tags: values.tags?.split(',').map((t: string) => t.trim()).filter(Boolean) ?? [],
        requiresManualApproval: values.requiresManualApproval ?? false,
      };

      if (editingId) {
        await updateExperience({ variables: { id: editingId, input } });
        message.success('Experience updated');
      } else {
        await createExperience({ variables: { restaurantId: activeRestaurantId, input } });
        message.success('Experience created');
      }
      setModalOpen(false);
      setEditingId(null);
      form.resetFields();
      clearDirty();
      refetch();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to save experience');
    }
  };

  const handlePublish = async (id: string) => {
    await publishExperience({ variables: { id } });
    refetch();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExperience({ variables: { id } });
      message.success('Experience deleted');
      refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to delete experience');
    }
  };

  const openEdit = (record: {
    id: string;
    title: string;
    description?: string;
    type: string;
    date: string;
    endDate?: string;
    startTime: string;
    endTime: string;
    minGuests?: number;
    maxGuests: number;
    ticketPriceCents: number;
    photoUrl?: string;
    requiresManualApproval?: boolean;
    includes?: string[];
    tags?: string[];
  }) => {
    setEditingId(record.id);
    form.setFieldsValue({
      title: record.title,
      description: record.description,
      type: record.type,
      dateRange: [dayjs(record.date), dayjs(record.endDate ?? record.date)],
      startTime: parseClock(record.startTime),
      endTime: parseClock(record.endTime),
      minGuests: record.minGuests ?? 1,
      maxGuests: record.maxGuests,
      ticketPrice: record.ticketPriceCents / 100,
      photoUrls: record.photoUrl ? [record.photoUrl] : [],
      photoUrl: record.photoUrl,
      includes: record.includes?.join('\n'),
      tags: record.tags?.join(', '),
      requiresManualApproval: record.requiresManualApproval ?? false,
    });
    setModalOpen(true);
    clearDirty();
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    clearDirty();
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
      title: 'Dates',
      key: 'dates',
      render: (_: unknown, r: { date: string; endDate?: string }) => {
        const start = dayjs(r.date);
        const end = dayjs(r.endDate ?? r.date);
        if (start.isSame(end, 'day')) return start.format('MMM D, YYYY');
        return `${start.format('MMM D')} – ${end.format('MMM D, YYYY')}`;
      },
    },
    {
      title: 'Time',
      key: 'time',
      render: (_: any, r: any) => `${r.startTime} – ${r.endTime}`,
    },
    {
      title: 'Guests',
      key: 'guests',
      render: (_: any, r: any) => {
        const min = r.minGuests ?? 1;
        return `${r.ticketsSold} sold · ${min}–${r.maxGuests}`;
      },
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
          <Button size="small" onClick={() => openEdit(r)}>
            Edit
          </Button>
          <Button
            size="small"
            type={r.status === 'published' ? 'default' : 'primary'}
            onClick={() => handlePublish(r.id)}
          >
            {r.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
          <Button size="small" danger onClick={() => handleDelete(r.id)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div component="ExperiencesPageContent" style={{ display: 'contents' }}><Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>Experiences</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingId(null);
            form.resetFields();
            form.setFieldsValue({ minGuests: 1 });
            clearDirty();
            setModalOpen(true);
          }}
        >
          Create Experience
        </Button>
      </div>

      <Select style={{ width: 320 }} {...restaurantSelectProps} />

      <Card>
        <Table
          dataSource={data?.experiences?.items ?? []}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={tablePagination(data?.experiences?.total ?? 0)}
        />
      </Card>

      <Modal
        title={
          <span className="rt-experience-modal__title">
            {editingId ? (
              <EditOutlined className="rt-experience-modal__title-icon" aria-hidden />
            ) : (
              <FileAddOutlined className="rt-experience-modal__title-icon" aria-hidden />
            )}
            <span>{editingId ? 'Edit Experience' : 'Add New Experience'}</span>
          </span>
        }
        open={modalOpen}
        onCancel={closeModal}
        width={560}
        centered
        wrapClassName="rt-mobile-modal rt-experience-modal"
        destroyOnHidden
        maskClosable={!dirty}
        footer={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              width: '100%',
              flexWrap: 'wrap',
            }}
          >
            <Button onClick={closeModal}>Cancel</Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={creating || updating}
              disabled={!dirty}
              onClick={() => void handleSubmit()}
            >
              {editingId ? 'Save changes' : 'Create experience'}
            </Button>
          </div>
        }
        styles={{
          body: { maxHeight: 'min(70vh, 560px)', overflowY: 'auto', overflowX: 'hidden' },
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={onValuesChange}
          style={{ marginBottom: 0 }}
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Enter a title' }]}
            style={{ marginBottom: 12 }}
          >
            <Input placeholder="Winter tasting night" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Enter a description' }]}
            style={{ marginBottom: 12 }}
          >
            <TextArea rows={2} placeholder="Short overview guests will see" />
          </Form.Item>
          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true, message: 'Select a type' }]}
            style={{ marginBottom: 12 }}
          >
            <Select
              options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Date range"
            rules={[{ required: true, message: 'Select dates' }]}
            style={{ marginBottom: 12 }}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="startTime"
                label="Start time"
                rules={[{ required: true, message: 'Select start time' }]}
                style={{ marginBottom: 12 }}
              >
                <TimePicker
                  format="h:mm A"
                  use12Hours
                  minuteStep={15}
                  needConfirm={false}
                  style={{ width: '100%' }}
                  placeholder="6:00 PM"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endTime"
                label="End time"
                rules={[{ required: true, message: 'Select end time' }]}
                style={{ marginBottom: 12 }}
              >
                <TimePicker
                  format="h:mm A"
                  use12Hours
                  minuteStep={15}
                  needConfirm={false}
                  style={{ width: '100%' }}
                  placeholder="9:00 PM"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="minGuests"
                label="Min guests"
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 12 }}
                initialValue={1}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="maxGuests"
                label="Max guests"
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 12 }}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="ticketPrice"
                label="Ticket ($)"
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 12 }}
              >
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="photoUrls" label="Cover photo" style={{ marginBottom: 12 }}>
            <PhotoUpload maxCount={1} />
          </Form.Item>
          <Form.Item name="photoUrl" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="includes" label="What's included (one per line)" style={{ marginBottom: 12 }}>
            <TextArea rows={2} placeholder="5-course tasting menu&#10;Wine pairings&#10;Meet the chef" />
          </Form.Item>
          <Form.Item name="tags" label="Tags (comma-separated)" style={{ marginBottom: 12 }}>
            <Input placeholder="wine, tasting, special" />
          </Form.Item>
          <Form.Item
            name="requiresManualApproval"
            label="Require manual approval"
            valuePropName="checked"
            extra="Bookings stay pending until staff confirms"
            style={{ marginBottom: 0 }}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space></div>
  );
}

export default function ExperiencesPage() {
  return (
    <div component="ExperiencesPage" style={{ display: 'contents' }}><Suspense fallback={null}>
      <ExperiencesPageContent />
    </Suspense></div>
  );
}
