'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLazyQuery, useMutation, useQuery } from '@/lib/apollo-hooks';
import { Alert, Button, Card, Space, Typography, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import {
  SignaturePad,
  isSignatureComplete,
  PageHeader,
  colors,
  spacing,
  type SignaturePadValue,
} from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import {
  LEGAL_AGREEMENT_PDF,
  MY_SIGNED_LEGAL_AGREEMENT_PDF,
  PARTNER_AGREEMENT_COMPLIANCE,
  SIGN_LEGAL_AGREEMENT,
} from '@/lib/graphql';
import { BrandedAgreementView, downloadBase64Pdf } from '@/components/BrandedAgreementView';
import { getGraphQLErrorMessage } from '@/lib/errors';
import { isPlatformAdmin } from '@/lib/roles';

const { Text, Paragraph } = Typography;

function SignContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const { data, loading, refetch } = useQuery(PARTNER_AGREEMENT_COMPLIANCE, {
    skip: authLoading || !user,
  });
  const [signMutation, { loading: signing }] = useMutation(SIGN_LEGAL_AGREEMENT);
  const [fetchPdf, { loading: downloading }] = useLazyQuery(LEGAL_AGREEMENT_PDF);
  const [fetchSignedPdf, { loading: downloadingSigned }] = useLazyQuery(
    MY_SIGNED_LEGAL_AGREEMENT_PDF,
    { fetchPolicy: 'network-only' },
  );
  const [signature, setSignature] = useState<SignaturePadValue | null>(null);

  const compliance = data?.partnerAgreementCompliance;
  const agreement = compliance?.agreement;
  const isOwner = user?.role === 'restaurant_owner';
  // Platform admins (not impersonating) can open the page to see what owners sign.
  const isPreview = Boolean(user && !isOwner && isPlatformAdmin(user.role));

  useEffect(() => {
    if (authLoading || !user) return;
    if (!isOwner && !isPlatformAdmin(user.role)) {
      router.replace('/overview');
    }
  }, [authLoading, user, isOwner, router]);

  useEffect(() => {
    if (!agreement || search.get('download') !== '1') return;
    void (async () => {
      try {
        const result = await fetchPdf({ variables: { key: 'partner_agreement' } });
        const pdf = result.data?.legalAgreementPdf;
        if (pdf?.content) downloadBase64Pdf(pdf.filename, pdf.content);
      } catch {
        /* ignore auto-download errors */
      }
    })();
  }, [agreement, search, fetchPdf]);

  if (authLoading || loading || !user) return null;

  const suggested = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();

  const onSign = async () => {
    if (!isSignatureComplete(signature)) {
      message.error('Sign by typing your name or drawing your signature');
      return;
    }
    try {
      await signMutation({
        variables: {
          key: 'partner_agreement',
          signature: {
            method: signature!.method,
            fullName: signature!.fullName || undefined,
            signatureDataUrl:
              signature!.method === 'drawn' ? signature!.signatureDataUrl : undefined,
          },
        },
      });
      message.success('Agreement signed. You can download your signed copy below.');
      setSignature(null);
      await refetch();
    } catch (err) {
      message.error(getGraphQLErrorMessage(err, 'Could not save signature'));
    }
  };

  const downloadSignedPdf = async () => {
    try {
      const result = await fetchSignedPdf({ variables: { key: 'partner_agreement' } });
      const pdf = result.data?.mySignedLegalAgreementPdf;
      if (!pdf?.content) {
        message.error(getGraphQLErrorMessage(result.error, 'Could not download signed copy'));
        return;
      }
      downloadBase64Pdf(pdf.filename, pdf.content);
    } catch (err) {
      message.error(getGraphQLErrorMessage(err, 'Could not download signed copy'));
    }
  };

  const downloadPdf = async () => {
    try {
      const result = await fetchPdf({ variables: { key: 'partner_agreement' } });
      const pdf = result.data?.legalAgreementPdf;
      if (!pdf?.content) {
        message.error('Could not download PDF');
        return;
      }
      downloadBase64Pdf(pdf.filename, pdf.content);
    } catch {
      message.error('Could not download PDF');
    }
  };

  const days = compliance?.daysRemaining;
  const status = compliance?.status;
  const acceptedVersion: number | null | undefined = compliance?.acceptedVersion;
  const currentVersion: number | undefined = compliance?.currentVersion;
  // Owners with no signature on file (accounts created before signing existed) can still sign;
  // it is just not enforced until a new version is published.
  const hasSignedCurrent =
    acceptedVersion != null && currentVersion != null && acceptedVersion >= currentVersion;
  const showPad = isPreview || (isOwner && !hasSignedCurrent);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: spacing.lg }}>
      <PageHeader
        title={hasSignedCurrent ? 'Partner Agreement' : 'Sign Partner Agreement'}
        subtitle={
          hasSignedCurrent
            ? 'The agreement you signed. Download the A4 PDF for your records.'
            : 'Review the agreement, download the A4 PDF if you like, then type or draw your signature.'
        }
      />

      {isPreview ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: spacing.lg }}
          message="Preview of the owner signing page"
          description="Restaurant owners sign here. The signature pad is shown for review; admins cannot sign the Partner Agreement."
        />
      ) : null}

      {status === 'grace' && days != null ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: spacing.lg }}
          message={`${days} day${days === 1 ? '' : 's'} left to re-sign`}
          description="After the grace period ends, Partner Hub stays locked until you complete this signature."
        />
      ) : null}
      {status === 'blocked' ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: spacing.lg }}
          message="Access limited until you re-sign"
          description="Your 7-day review window ended. Sign the current Partner Agreement to continue using Partner Hub."
        />
      ) : null}
      {isOwner && hasSignedCurrent ? (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: spacing.lg }}
          message={`You signed version ${acceptedVersion}`}
          description="Your signed copy includes your signature, the date, and the version you signed."
          action={
            <Button
              size="small"
              type="primary"
              icon={<DownloadOutlined />}
              loading={downloadingSigned}
              onClick={downloadSignedPdf}
            >
              Download signed copy
            </Button>
          }
        />
      ) : null}
      {isOwner && acceptedVersion != null && !hasSignedCurrent ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: spacing.lg }}
          message={`Your signed copy of version ${acceptedVersion} is still available`}
          action={
            <Button
              size="small"
              icon={<DownloadOutlined />}
              loading={downloadingSigned}
              onClick={downloadSignedPdf}
            >
              Download signed copy
            </Button>
          }
        />
      ) : null}
      {isOwner && status === 'current' && !hasSignedCurrent ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: spacing.lg }}
          message="You haven't signed the Partner Agreement yet"
          description="Sign below to keep a signed copy on file."
        />
      ) : null}

      {agreement ? (
        <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
          <BrandedAgreementView
            name={agreement.name}
            version={agreement.version}
            bodyHtml={agreement.bodyHtml}
            versionPublishedAt={agreement.versionPublishedAt}
            onDownloadPdf={downloadPdf}
            downloading={downloading}
          />

          {showPad ? (
            <Card title="Your signature">
              <Paragraph type="secondary">
                Type your full legal name or draw your signature. We store version, time, IP, and
                device info with your acceptance.
              </Paragraph>
              <SignaturePad
                value={signature}
                onChange={setSignature}
                suggestedFullName={suggested}
              />
              <Button
                type="primary"
                size="large"
                loading={signing}
                onClick={onSign}
                disabled={isPreview || !isSignatureComplete(signature)}
                style={{
                  marginTop: spacing.md,
                  ...(isPreview || !isSignatureComplete(signature)
                    ? {}
                    : { background: colors.brand[600] }),
                }}
                block
              >
                {isPreview ? 'Sign & continue (owners only)' : 'Sign & continue'}
              </Button>
            </Card>
          ) : (
            <Button type="primary" onClick={() => router.push('/overview')}>
              Back to Partner Hub
            </Button>
          )}
        </Space>
      ) : (
        <Text type="secondary">Loading agreement…</Text>
      )}
    </div>
  );
}

export default function AgreementSignPage() {
  return (
    <Suspense>
      <SignContent />
    </Suspense>
  );
}
