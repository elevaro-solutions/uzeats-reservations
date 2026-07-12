'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  Upload,
  message,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import { useAuth } from '@/lib/auth';
import { MY_RESTAURANTS, UPSERT_MENU, CREATE_UPLOAD_URL } from '@/lib/graphql';

const { Title } = Typography;

export default function MenuPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>();
  const { data, refetch } = useQuery(MY_RESTAURANTS, { skip: !user });
  const [upsertMenu, { loading }] = useMutation(UPSERT_MENU);
  const [createUploadUrl] = useMutation(CREATE_UPLOAD_URL);
  const [json, setJson] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    const saved = localStorage.getItem('activeRestaurantId');
    const id = saved ?? data?.myRestaurants?.[0]?.id;
    setRestaurantId(id);
  }, [data]);

  useEffect(() => {
    const restaurant = (data?.myRestaurants ?? []).find((r: any) => r.id === restaurantId);
    if (restaurant?.menu) {
      setJson(
        JSON.stringify(
          restaurant.menu.sections.map((s: any) => ({
            name: s.name,
            items: s.items.map((i: any) => ({
              name: i.name,
              description: i.description,
              priceCents: i.priceCents,
              dietary: i.dietary,
              available: i.available,
              photoUrl: i.photoUrl,
            })),
          })),
          null,
          2,
        ),
      );
    } else if (restaurantId) {
      setJson(
        JSON.stringify(
          [
            {
              name: 'Starters',
              items: [
                {
                  name: 'Soup',
                  description: '',
                  priceCents: 1200,
                  dietary: [],
                  available: true,
                },
              ],
            },
          ],
          null,
          2,
        ),
      );
    }
  }, [data, restaurantId]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Menu editor</Title>
      <Select
        style={{ width: 280 }}
        value={restaurantId}
        onChange={(id) => {
          setRestaurantId(id);
          localStorage.setItem('activeRestaurantId', id);
        }}
        options={(data?.myRestaurants ?? []).map((r: any) => ({ value: r.id, label: r.name }))}
      />
      <Card>
        <Form
          layout="vertical"
          onFinish={async () => {
            if (!restaurantId) return;
            try {
              const sections = JSON.parse(json);
              await upsertMenu({ variables: { restaurantId, input: { sections } } });
              message.success('Menu saved');
              refetch();
            } catch {
              message.error('Invalid JSON');
            }
          }}
        >
          <Form.Item label="Menu sections (JSON)">
            <Input.TextArea rows={22} value={json} onChange={(e) => setJson(e.target.value)} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save menu
            </Button>
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={async (file: RcFile) => {
                if (file.size > 5 * 1024 * 1024) {
                  message.error('File exceeds 5MB limit');
                  return false;
                }
                try {
                  const { data: upload } = await createUploadUrl({
                    variables: { filename: file.name, contentType: file.type },
                  });
                  const { uploadUrl, publicUrl } = upload.createUploadUrl;
                  await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': file.type },
                    body: file,
                  });
                  await navigator.clipboard.writeText(publicUrl);
                  message.success('Photo uploaded — URL copied to clipboard');
                } catch (err: any) {
                  message.error(err.message ?? 'Upload failed');
                }
                return false;
              }}
            >
              <Button icon={<UploadOutlined />}>Upload menu photo</Button>
            </Upload>
          </Space>
        </Form>
      </Card>
    </Space>
  );
}
