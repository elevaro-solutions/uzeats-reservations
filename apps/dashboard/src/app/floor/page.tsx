'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Typography,
  message,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useAuth } from '@/lib/auth';
import { useActiveRestaurant } from '@/lib/useActiveRestaurant';
import {
  MY_RESTAURANTS,
  CREATE_TABLE,
  DELETE_TABLE,
  CREATE_SHIFT,
  DELETE_SHIFT,
  UPDATE_TABLE,
  UPDATE_SHIFT,
} from '@/lib/graphql';

const { Title } = Typography;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function FloorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, refetch } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurantIds = useMemo(
    () => (data?.myRestaurants ?? []).map((r: { id: string }) => r.id),
    [data],
  );
  const { restaurantId, setRestaurantId } = useActiveRestaurant(restaurantIds);
  const [createTable] = useMutation(CREATE_TABLE);
  const [deleteTable] = useMutation(DELETE_TABLE);
  const [createShift] = useMutation(CREATE_SHIFT);
  const [deleteShift] = useMutation(DELETE_SHIFT);
  const [updateTable, { loading: updatingTable }] = useMutation(UPDATE_TABLE);
  const [updateShift, { loading: updatingShift }] = useMutation(UPDATE_SHIFT);

  const [editingTable, setEditingTable] = useState<any>(null);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [tableForm] = Form.useForm();
  const [shiftForm] = Form.useForm();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const restaurant = (data?.myRestaurants ?? []).find((r: any) => r.id === restaurantId);

  return (
    <div component="FloorPage" style={{ display: 'contents' }}><Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Tables & shifts</Title>
      <Select
        style={{ width: 280 }}
        value={restaurantId}
        onChange={setRestaurantId}
        options={(data?.myRestaurants ?? []).map((r: any) => ({ value: r.id, label: r.name }))}
      />

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="Tables">
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={restaurant?.tables ?? []}
              columns={[
                { title: 'Name', dataIndex: 'name' },
                {
                  title: 'Capacity',
                  render: (_: unknown, t: any) => `${t.minCapacity}-${t.maxCapacity}`,
                },
                { title: 'Area', dataIndex: 'floorArea' },
                {
                  title: '',
                  render: (_: unknown, t: any) => (
                    <Space>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setEditingTable(t);
                          tableForm.setFieldsValue({
                            name: t.name,
                            minCapacity: t.minCapacity,
                            maxCapacity: t.maxCapacity,
                            floorArea: t.floorArea,
                            combinable: t.combinable,
                            active: t.active,
                          });
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        danger
                        size="small"
                        onClick={async () => {
                          await deleteTable({ variables: { id: t.id } });
                          refetch();
                        }}
                      >
                        Delete
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />
            <Form
              layout="inline"
              style={{ marginTop: 16 }}
              onFinish={async (values) => {
                if (!restaurantId) return;
                await createTable({
                  variables: {
                    restaurantId,
                    input: {
                      name: values.name,
                      minCapacity: values.minCapacity,
                      maxCapacity: values.maxCapacity,
                      floorArea: values.floorArea ?? 'Main',
                      combinable: values.combinable ?? false,
                      active: true,
                    },
                  },
                });
                message.success('Table added');
                refetch();
              }}
            >
              <Form.Item name="name" rules={[{ required: true }]}>
                <Input placeholder="Name" />
              </Form.Item>
              <Form.Item name="minCapacity" initialValue={2} rules={[{ required: true }]}>
                <InputNumber min={1} placeholder="Min" />
              </Form.Item>
              <Form.Item name="maxCapacity" initialValue={4} rules={[{ required: true }]}>
                <InputNumber min={1} placeholder="Max" />
              </Form.Item>
              <Form.Item name="floorArea" initialValue="Main">
                <Input placeholder="Area" style={{ width: 100 }} />
              </Form.Item>
              <Form.Item name="combinable" valuePropName="checked">
                <Switch checkedChildren="Combine" unCheckedChildren="Solo" />
              </Form.Item>
              <Button type="primary" htmlType="submit">
                Add table
              </Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Shifts">
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={restaurant?.shifts ?? []}
              columns={[
                { title: 'Name', dataIndex: 'name' },
                {
                  title: 'Days',
                  render: (_: unknown, s: any) =>
                    (s.daysOfWeek ?? []).map((d: number) => DAYS[d]).join(', '),
                },
                {
                  title: 'Hours',
                  render: (_: unknown, s: any) => `${s.startTime}–${s.endTime}`,
                },
                {
                  title: 'Turn',
                  dataIndex: 'turnTimeMinutes',
                  render: (v: number) => `${v}m`,
                },
                {
                  title: '',
                  render: (_: unknown, s: any) => (
                    <Space>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setEditingShift(s);
                          shiftForm.setFieldsValue({
                            name: s.name,
                            daysOfWeek: s.daysOfWeek,
                            startTime: s.startTime,
                            endTime: s.endTime,
                            slotIntervalMinutes: s.slotIntervalMinutes,
                            turnTimeMinutes: s.turnTimeMinutes,
                          });
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        danger
                        size="small"
                        onClick={async () => {
                          await deleteShift({ variables: { id: s.id } });
                          refetch();
                        }}
                      >
                        Delete
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />
            <Form
              layout="vertical"
              style={{ marginTop: 16 }}
              onFinish={async (values) => {
                if (!restaurantId) return;
                await createShift({
                  variables: {
                    restaurantId,
                    input: {
                      name: values.name,
                      daysOfWeek: values.daysOfWeek,
                      startTime: values.startTime,
                      endTime: values.endTime,
                      slotIntervalMinutes: values.slotIntervalMinutes ?? 15,
                      turnTimeMinutes: values.turnTimeMinutes ?? 90,
                      active: true,
                    },
                  },
                });
                message.success('Shift added');
                refetch();
              }}
            >
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input placeholder="Dinner" />
              </Form.Item>
              <Form.Item
                name="daysOfWeek"
                label="Days"
                initialValue={[0, 1, 2, 3, 4, 5, 6]}
                rules={[{ required: true }]}
              >
                <Select
                  mode="multiple"
                  options={DAYS.map((d, i) => ({ value: i, label: d }))}
                />
              </Form.Item>
              <Space>
                <Form.Item name="startTime" label="Start" initialValue="17:00" rules={[{ required: true }]}>
                  <Input placeholder="17:00" />
                </Form.Item>
                <Form.Item name="endTime" label="End" initialValue="22:00" rules={[{ required: true }]}>
                  <Input placeholder="22:00" />
                </Form.Item>
                <Form.Item name="turnTimeMinutes" label="Turn (min)" initialValue={90}>
                  <InputNumber min={30} />
                </Form.Item>
              </Space>
              <Button type="primary" htmlType="submit">
                Add shift
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>

      <Modal
        title="Edit table"
        open={!!editingTable}
        onCancel={() => setEditingTable(null)}
        onOk={() => tableForm.submit()}
        confirmLoading={updatingTable}
      >
        <Form
          form={tableForm}
          layout="vertical"
          onFinish={async (values) => {
            await updateTable({
              variables: {
                id: editingTable.id,
                input: {
                  name: values.name,
                  minCapacity: values.minCapacity,
                  maxCapacity: values.maxCapacity,
                  floorArea: values.floorArea ?? 'Main',
                  combinable: values.combinable ?? false,
                  active: values.active ?? true,
                },
              },
            });
            message.success('Table updated');
            setEditingTable(null);
            refetch();
          }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="minCapacity" label="Min capacity" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxCapacity" label="Max capacity" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="floorArea" label="Floor area">
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="combinable" label="Combinable" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="active" label="Active" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="Edit shift"
        open={!!editingShift}
        onCancel={() => setEditingShift(null)}
        onOk={() => shiftForm.submit()}
        confirmLoading={updatingShift}
      >
        <Form
          form={shiftForm}
          layout="vertical"
          onFinish={async (values) => {
            await updateShift({
              variables: {
                id: editingShift.id,
                input: {
                  name: values.name,
                  daysOfWeek: values.daysOfWeek,
                  startTime: values.startTime,
                  endTime: values.endTime,
                  slotIntervalMinutes: values.slotIntervalMinutes ?? 15,
                  turnTimeMinutes: values.turnTimeMinutes ?? 90,
                  active: true,
                },
              },
            });
            message.success('Shift updated');
            setEditingShift(null);
            refetch();
          }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="daysOfWeek" label="Days" rules={[{ required: true }]}>
            <Select mode="multiple" options={DAYS.map((d, i) => ({ value: i, label: d }))} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="startTime" label="Start" rules={[{ required: true }]}>
                <Input placeholder="17:00" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="endTime" label="End" rules={[{ required: true }]}>
                <Input placeholder="22:00" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="turnTimeMinutes" label="Turn (min)">
                <InputNumber min={30} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Space></div>
  );
}
