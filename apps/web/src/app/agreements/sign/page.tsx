'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import { Alert, Button, Card, Typography, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import {
  SignaturePad,
  TableveraBrand,
  colors,
  isSignatureComplete,
  radii,
  spacing,
  typography,
  type SignaturePadValue,
} from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import {
  LEGAL_AGREEMENT_PDF,
  MY_AGREEMENT_COMPLIANCE,
  MY_SIGNED_LEGAL_AGREEMENT_PDF,
  SIGN_LEGAL_AGREEMENT,
} from '@/lib/graphql';
import { getGraphQLErrorMessage } from '@/lib/errors';

const { Title, Text, Paragraph } = Typography;

type Compliance = {
  status: 'current' | 'grace' | 'blocked';
  currentVersion: number;
  acceptedVersion?: number | null;
  daysRemaining?: number | null;
  agreement: { name: string; bodyHtml: string; version: number; versionPublishedAt?: string | null };
};

function downloadBase64Pdf(filename: string, base64: string) {
  const link = document.createElement('a');
  link.href = `data:application/pdf;base64,${base64}`;
  link.download = filename;
  link.click();
}

function SignTermsContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [signature, setSignature] = useState<SignaturePadValue | null>(null);
  const { data, loading, refetch } = useQuery(MY_AGREEMENT_COMPLIANCE, {
    variables: { key: 'terms_of_use' },
    skip: authLoading || !user,
  });
  const [signMutation, { loading: signing }] = useMutation(SIGN_LEGAL_AGREEMENT);
  const [fetchPdf, { loading: downloading }] = useLazyQuery(LEGAL_AGREEMENT_PDF);
  const [fetchSignedPdf, { loading: downloadingSigned }] = useLazyQuery(
    MY_SIGNED_LEGAL_AGREEMENT_PDF,
    { fetchPolicy: 'network-only' },
  );

  const compliance = (data as { myAgreementCompliance?: Compliance } | undefined)
    ?.myAgreementCompliance;
  const agreement = compliance?.agreement;

  useEffect(() => {
    if (authLoading || user) return;
    const next = `/agreements/sign${search.get('download') === '1' ? '?download=1' : ''}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [authLoading, user, router, search]);

  const downloadPdf = async () => {
    try {
      const result = await fetchPdf({ variables: { key: 'terms_of_use' } });
      const pdf = (result.data as { legalAgreementPdf?: { filename: string; content: string } })
        ?.legalAgreementPdf;
      if (!pdf?.content) throw new Error('empty');
      downloadBase64Pdf(pdf.filename, pdf.content);
    } catch {
      message.error('Could not download PDF');
    }
  };

  useEffect(() => {
    if (!agreement || search.get('download') !== '1') return;
    void downloadPdf();
    // Auto-download once when arriving from the reminder email link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreement]);

  if (authLoading || loading || !user) return null;

  const onSign = async () => {
    if (!signature || !isSignatureComplete(signature)) {
      message.error('Sign by typing your name or drawing your signature');
      return;
    }
    try {
      await signMutation({
        variables: {
          key: 'terms_of_use',
          signature: {
            method: signature.method,
            fullName: signature.fullName || undefined,
            signatureDataUrl: signature.method === 'drawn' ? signature.signatureDataUrl : undefined,
          },
        },
      });
      message.success('Terms of Use signed. You can download your signed copy below.');
      setSignature(null);
      await refetch();
    } catch (err) {
      message.error(getGraphQLErrorMessage(err, 'Could not save signature'));
    }
  };

  const downloadSignedPdf = async () => {
    try {
      const result = await fetchSignedPdf({ variables: { key: 'terms_of_use' } });
      const pdf = (
        result.data as { mySignedLegalAgreementPdf?: { filename: string; content: string } }
      )?.mySignedLegalAgreementPdf;
      if (!pdf?.content) throw new Error('empty');
      downloadBase64Pdf(pdf.filename, pdf.content);
    } catch {
      message.error('Could not download signed copy');
    }
  };

  const days = compliance?.daysRemaining ?? 0;
  const acceptedVersion = compliance?.acceptedVersion ?? null;
  const hasSignedCurrent =
    acceptedVersion != null && compliance != null && acceptedVersion >= compliance.currentVersion;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: spacing.lg }}>
      <Title level={2}>Terms of Use</Title>

      {compliance?.status === 'grace' ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: spacing.lg }}
          message={`${days} day${days === 1 ? '' : 's'} left to re-sign the updated Terms of Use`}
        />
      ) : null}
      {acceptedVersion != null ? (
        <Alert
          type={hasSignedCurrent ? 'success' : 'info'}
          showIcon
          style={{ marginBottom: spacing.lg }}
          message={
            hasSignedCurrent
              ? `You signed version ${acceptedVersion}`
              : `Your signed copy of version ${acceptedVersion} is still available`
          }
          action={
            <Button
              size="small"
              type={hasSignedCurrent ? 'primary' : 'default'}
              icon={<DownloadOutlined />}
              loading={downloadingSigned}
              onClick={downloadSignedPdf}
            >
              Download signed copy
            </Button>
          }
        />
      ) : null}

      {agreement ? (
        <div
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: radii.lg,
            overflow: 'hidden',
            background: colors.surface,
            marginBottom: spacing.lg,
          }}
        >
          <div
            style={{
              background: colors.brand[800],
              padding: `${spacing.md}px ${spacing.lg}px`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: `3px solid ${colors.accent[500]}`,
            }}
          >
            <TableveraBrand surface="dark" iconSize={28} />
            <Text style={{ color: colors.accent[400], fontSize: 12, letterSpacing: '0.06em' }}>
              LEGAL AGREEMENT
            </Text>
          </div>
          <div style={{ padding: spacing.lg }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: spacing.md,
                flexWrap: 'wrap',
                marginBottom: spacing.md,
              }}
            >
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {agreement.name}
                </Title>
                <Text type="secondary">Version {agreement.version}</Text>
              </div>
              <Button icon={<DownloadOutlined />} loading={downloading} onClick={downloadPdf}>
                Download PDF (A4)
              </Button>
            </div>
            <div
              style={{
                maxHeight: 360,
                overflow: 'auto',
                padding: spacing.md,
                background: colors.background,
                borderRadius: radii.md,
                fontSize: typography.fontSize.base,
              }}
              dangerouslySetInnerHTML={{ __html: agreement.bodyHtml }}
            />
          </div>
        </div>
      ) : null}

      {compliance && !hasSignedCurrent ? (
        <Card title="Your signature">
          <Paragraph type="secondary">
            Type your full legal name or draw your signature. We store the version, time, IP
            address, and device info with your acceptance.
          </Paragraph>
          <SignaturePad
            value={signature}
            onChange={setSignature}
            suggestedFullName={`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()}
          />
          <Button
            type="primary"
            size="large"
            block
            loading={signing}
            disabled={!isSignatureComplete(signature)}
            onClick={onSign}
            style={{
              marginTop: spacing.md,
              ...(isSignatureComplete(signature) ? { background: colors.brand[600] } : {}),
            }}
          >
            Sign Terms of Use
          </Button>
        </Card>
      ) : null}
    </div>
  );
}

export default function SignTermsPage() {
  return (
    <Suspense>
      <SignTermsContent />
    </Suspense>
  );
}
