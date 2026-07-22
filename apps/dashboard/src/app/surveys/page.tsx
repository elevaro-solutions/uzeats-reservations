'use client';

import { Suspense, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Card,
  Col,
  List,
  Rate,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  SURVEY_CONFIG,
  SURVEY_STATS,
  RESTAURANT_SURVEYS,
  UPDATE_SURVEY_CONFIG,
} from '@/lib/graphql';
import { useUrlPagination } from '@/lib/useUrlPagination';

const { Title, Text, Paragraph } = Typography;

const QUESTION_TOGGLES = [
  { key: 'includeFood', label: 'Food quality' },
  { key: 'includeService', label: 'Service' },
  { key: 'includeAmbience', label: 'Ambience' },
  { key: 'includeValue', label: 'Value for money' },
  { key: 'includeRecommend', label: 'Would recommend' },
] as const;

function SurveysPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>();
  const { page, pageSize, limit, offset, setPagination } = useUrlPagination({
    defaultPageSize: 20,
  });

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const { data: configData, refetch: refetchConfig } = useQuery(SURVEY_CONFIG, {
    skip: !restaurantId,
    variables: { restaurantId },
  });
  const { data: statsData } = useQuery(SURVEY_STATS, {
    skip: !restaurantId,
    variables: { restaurantId },
  });
  const { data: responsesData, loading } = useQuery(RESTAURANT_SURVEYS, {
    skip: !restaurantId,
    variables: { restaurantId, limit, offset },
  });
  const [updateConfig] = useMutation(UPDATE_SURVEY_CONFIG);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    setRestaurantId(
      localStorage.getItem('activeRestaurantId') ?? restData?.myRestaurants?.[0]?.id,
    );
  }, [restData]);

  const config = configData?.surveyConfig;
  const stats = statsData?.surveyStats;

  const handleToggle = async (key: string, value: boolean) => {
    try {
      await updateConfig({ variables: { restaurantId, input: { [key]: value } } });
      refetchConfig();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to update');
    }
  };

  return (
    <div component="SurveysPageContent" style={{ display: 'contents' }}><Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Post-dining surveys</Title>
      <Text type="secondary">
        When enabled, guests automatically receive a survey invitation after each completed
        visit. Requires the Pro plan.
      </Text>
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

      <Row gutter={16}>
        <Col xs={24} lg={8}>
          <Card title="Survey builder">
            <Space orientation="vertical" style={{ width: '100%' }} size={12}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong>Surveys enabled</Text>
                <Switch
                  checked={config?.enabled ?? false}
                  onChange={(v) => handleToggle('enabled', v)}
                />
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Overall rating is always included. Choose which extra questions to ask:
              </Text>
              {QUESTION_TOGGLES.map((q) => (
                <div key={q.key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>{q.label}</Text>
                  <Switch
                    size="small"
                    checked={config?.[q.key] ?? true}
                    onChange={(v) => handleToggle(q.key, v)}
                  />
                </div>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="Results">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="Responses" value={stats?.totalResponses ?? 0} />
              </Col>
              <Col span={8}>
                <Statistic title="Avg overall" value={stats?.avgOverall ?? 0} suffix="/ 5" />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Would recommend"
                  value={stats?.recommendPercent ?? 0}
                  suffix="%"
                />
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={6}>
                <Statistic title="Food" value={stats?.avgFood ?? 0} precision={1} />
              </Col>
              <Col span={6}>
                <Statistic title="Service" value={stats?.avgService ?? 0} precision={1} />
              </Col>
              <Col span={6}>
                <Statistic title="Ambience" value={stats?.avgAmbience ?? 0} precision={1} />
              </Col>
              <Col span={6}>
                <Statistic title="Value" value={stats?.avgValue ?? 0} precision={1} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Card title="Recent responses">
        <List
          loading={loading}
          dataSource={responsesData?.restaurantSurveys?.items ?? []}
          pagination={{
            current: page,
            pageSize,
            total: responsesData?.restaurantSurveys?.total ?? 0,
            onChange: (p) => setPagination(p),
          }}
          renderItem={(s: any) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space>
                    <Rate disabled value={s.overallRating} style={{ fontSize: 14 }} />
                    <Text strong>
                      {s.diner ? `${s.diner.firstName} ${s.diner.lastName}` : 'Guest'}
                    </Text>
                    <Text type="secondary">
                      {new Date(s.submittedAt).toLocaleDateString()}
                    </Text>
                    {s.wouldRecommend != null && (
                      <Tag color={s.wouldRecommend ? 'green' : 'red'}>
                        {s.wouldRecommend ? 'Would recommend' : 'Would not recommend'}
                      </Tag>
                    )}
                  </Space>
                }
                description={
                  <>
                    <Space size={16} style={{ fontSize: 12 }}>
                      {s.foodRating != null && <span>Food {s.foodRating}/5</span>}
                      {s.serviceRating != null && <span>Service {s.serviceRating}/5</span>}
                      {s.ambienceRating != null && <span>Ambience {s.ambienceRating}/5</span>}
                      {s.valueRating != null && <span>Value {s.valueRating}/5</span>}
                    </Space>
                    {s.feedback && <Paragraph style={{ marginTop: 4 }}>{s.feedback}</Paragraph>}
                  </>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </Space></div>
  );
}

export default function SurveysPage() {
  return (
    <div component="SurveysPage" style={{ display: 'contents' }}><Suspense fallback={null}>
      <SurveysPageContent />
    </Suspense></div>
  );
}
