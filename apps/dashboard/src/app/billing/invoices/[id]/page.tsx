'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@/lib/apollo-hooks';
import { Button, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { PageHeader, spacing } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { RESTAURANT_INVOICE } from '@/lib/graphql';
import { PartnerInvoiceDetail } from '@/components/PartnerInvoiceDetail';

export default function PartnerInvoicePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = String(params?.id ?? '');
  const restaurant = searchParams.get('restaurant');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const { data, loading } = useQuery(RESTAURANT_INVOICE, {
    variables: { id },
    skip: !user || !id,
  });

  const invoice = data?.restaurantInvoice ?? null;
  const backHref = restaurant
    ? `/billing?restaurant=${encodeURIComponent(restaurant)}`
    : '/billing';

  return (
    <div style={{ display: 'contents' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <PageHeader
          title={invoice ? `Invoice ${invoice.number}` : 'Invoice'}
          subtitle={
            invoice
              ? `${invoice.restaurantName || 'Restaurant'} · billing detail`
              : 'Billing detail'
          }
          extra={
            <Link href={backHref}>
              <Button icon={<ArrowLeftOutlined />}>Back to Billing</Button>
            </Link>
          }
        />
        <div style={{ marginTop: spacing.lg }}>
          {loading && !invoice ? (
            <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />
          ) : (
            <PartnerInvoiceDetail invoice={invoice} />
          )}
        </div>
      </div>
    </div>
  );
}
