'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Button,
  Card,
  Input,
  Radio,
  Rate,
  Result,
  Space,
  Typography,
  message,
} from 'antd';
import { useAuth } from '@/lib/auth';
import { RESERVATION_FOR_SURVEY, SURVEY_CONFIG, SUBMIT_SURVEY } from '@/lib/graphql';

const { Title, Text } = Typography;

export default function SurveyPage() {
  const params = useParams<{ reservationId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [overallRating, setOverallRating] = useState(0);
  const [foodRating, setFoodRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [ambienceRating, setAmbienceRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data, loading } = useQuery(RESERVATION_FOR_SURVEY, {
    variables: { reservationId: params.reservationId },
    skip: !user,
  });
  const reservation = (data as any)?.reservationForSurvey;

  // The surveyConfig resolver is restricted to restaurant staff, so this query
  // may error for diners; in that case we fall back to showing all questions.
  const { data: configData } = useQuery(SURVEY_CONFIG, {
    variables: { restaurantId: reservation?.restaurantId },
    skip: !reservation?.restaurantId,
    errorPolicy: 'all',
  });
  const config = (configData as any)?.surveyConfig ?? null;
  const includeFood = config?.includeFood ?? true;
  const includeService = config?.includeService ?? true;
  const includeAmbience = config?.includeAmbience ?? true;
  const includeValue = config?.includeValue ?? true;
  const includeRecommend = config?.includeRecommend ?? true;

  const [submitSurvey, { loading: submitting }] = useMutation(SUBMIT_SURVEY);

  if (!authLoading && !user) {
    router.replace(`/login?next=/survey/${params.reservationId}`);
    return null;
  }

  if (authLoading || loading) return <Card loading style={{ maxWidth: 560, margin: '40px auto' }} />;

  if (user && !loading && !reservation) {
    return (
      <Card style={{ maxWidth: 560, margin: '40px auto' }}>
        <Result
          status="warning"
          title="Survey unavailable"
          subTitle="This survey link is invalid, or the reservation doesn't belong to your account."
          extra={
            <Button type="primary" onClick={() => router.push('/reservations')}>
              My reservations
            </Button>
          }
        />
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card style={{ maxWidth: 560, margin: '40px auto' }}>
        <Result
          status="success"
          title="Thanks for your feedback!"
          subTitle={`Your responses help ${reservation.restaurant?.name ?? 'the restaurant'} keep improving.`}
          extra={
            <Button type="primary" onClick={() => router.push('/reservations')}>
              My reservations
            </Button>
          }
        />
      </Card>
    );
  }

  const submit = async () => {
    if (overallRating === 0) {
      message.warning('Please give an overall rating');
      return;
    }
    setSubmitError(null);
    try {
      await submitSurvey({
        variables: {
          input: {
            reservationId: params.reservationId,
            overallRating,
            ...(includeFood && foodRating > 0 ? { foodRating } : {}),
            ...(includeService && serviceRating > 0 ? { serviceRating } : {}),
            ...(includeAmbience && ambienceRating > 0 ? { ambienceRating } : {}),
            ...(includeValue && valueRating > 0 ? { valueRating } : {}),
            ...(includeRecommend && wouldRecommend !== null ? { wouldRecommend } : {}),
            ...(feedback.trim() ? { feedback: feedback.trim() } : {}),
          },
        },
      });
      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not submit survey';
      setSubmitError(msg);
    }
  };

  const categoryRow = (label: string, value: number, onChange: (v: number) => void) => (
    <div>
      <Text strong style={{ display: 'block', marginBottom: 4 }}>
        {label}
      </Text>
      <Rate value={value} onChange={onChange} />
    </div>
  );

  return (
    <Card style={{ maxWidth: 560, margin: '40px auto' }}>
      <Title level={3} style={{ marginTop: 0 }}>
        How was your visit?
      </Title>
      <Text type="secondary">
        {reservation.restaurant?.name} · {new Date(reservation.slotStart).toLocaleString()} ·{' '}
        {reservation.partySize} guests
      </Text>

      <Space orientation="vertical" size={20} style={{ width: '100%', marginTop: 24 }}>
        <div>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>
            Overall experience
          </Text>
          <Rate value={overallRating} onChange={setOverallRating} style={{ fontSize: 28 }} />
        </div>

        {includeFood && categoryRow('Food', foodRating, setFoodRating)}
        {includeService && categoryRow('Service', serviceRating, setServiceRating)}
        {includeAmbience && categoryRow('Ambience', ambienceRating, setAmbienceRating)}
        {includeValue && categoryRow('Value', valueRating, setValueRating)}

        {includeRecommend && (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              Would you recommend this restaurant?
            </Text>
            <Radio.Group
              value={wouldRecommend}
              onChange={(e) => setWouldRecommend(e.target.value)}
              options={[
                { value: true, label: 'Yes' },
                { value: false, label: 'No' },
              ]}
              optionType="button"
            />
          </div>
        )}

        <div>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>
            Anything else you&apos;d like to share?
          </Text>
          <Input.TextArea
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us about your experience..."
          />
        </div>

        {submitError && (
          <Alert
            type="error"
            showIcon
            message={
              submitError.toLowerCase().includes('already')
                ? 'You have already submitted a survey for this visit.'
                : submitError
            }
          />
        )}

        <Button type="primary" size="large" block loading={submitting} onClick={submit}>
          Submit feedback
        </Button>
      </Space>
    </Card>
  );
}
