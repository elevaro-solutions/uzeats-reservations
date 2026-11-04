'use client';

import { useState } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client/react';
import { Button, Form, Typography, message } from 'antd';
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
import { LEGAL_AGREEMENT, LEGAL_AGREEMENT_PDF } from '@/lib/graphql';

const { Text, Title } = Typography;

type Props = {
  agreementKey?: 'terms_of_use' | 'partner_agreement';
  name?: string;
  suggestedFullName?: string;
};

function downloadBase64Pdf(filename: string, base64: string) {
  const link = document.createElement('a');
  link.href = `data:application/pdf;base64,${base64}`;
  link.download = filename;
  link.click();
}

export function AgreementAcceptField({
  agreementKey = 'terms_of_use',
  name = 'termsOfUseSignature',
  suggestedFullName,
}: Props) {
  const { data, loading } = useQuery(LEGAL_AGREEMENT, {
    variables: { key: agreementKey },
  });
  const [fetchPdf, { loading: downloading }] = useLazyQuery(LEGAL_AGREEMENT_PDF);
  const agreement = (
    data as
      | {
          legalAgreement?: {
            name: string;
            bodyHtml: string;
            version: number;
            versionPublishedAt?: string | null;
          };
        }
      | undefined
  )?.legalAgreement;

  const downloadPdf = async () => {
    try {
      const result = await fetchPdf({ variables: { key: agreementKey } });
      const pdf = (result.data as { legalAgreementPdf?: { filename: string; content: string } })
        ?.legalAgreementPdf;
      if (!pdf?.content) {
        message.error('Could not download PDF');
        return;
      }
      downloadBase64Pdf(pdf.filename, pdf.content);
    } catch {
      message.error('Could not download PDF');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, marginBottom: 8 }}>
      {agreement ? (
        <div
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: radii.lg,
            overflow: 'hidden',
            background: colors.surface,
          }}
        >
          <div
            style={{
              background: colors.brand[800],
              padding: `${spacing.sm}px ${spacing.md}px`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: `3px solid ${colors.accent[500]}`,
            }}
          >
            <TableveraBrand surface="dark" iconSize={24} />
            <Text style={{ color: colors.accent[400], fontSize: 11, letterSpacing: '0.06em' }}>
              LEGAL AGREEMENT
            </Text>
          </div>
          <div style={{ padding: spacing.md }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap',
                marginBottom: 8,
              }}
            >
              <div>
                <Title level={5} style={{ margin: 0 }}>
                  {agreement.name}
                </Title>
                <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
                  Version {agreement.version}
                </Text>
              </div>
              <Button
                size="small"
                icon={<DownloadOutlined />}
                loading={downloading}
                onClick={downloadPdf}
              >
                PDF (A4)
              </Button>
            </div>
            <div
              style={{
                maxHeight: 200,
                overflow: 'auto',
                padding: spacing.sm,
                background: colors.background,
                borderRadius: radii.md,
                fontSize: typography.fontSize.sm,
              }}
              dangerouslySetInnerHTML={{ __html: agreement.bodyHtml }}
            />
          </div>
        </div>
      ) : loading ? (
        <Text type="secondary">Loading agreement…</Text>
      ) : null}

      <Text strong>Sign to create your account</Text>
      <Form.Item
        name={name}
        rules={[
          {
            validator: async (_, value: SignaturePadValue | undefined) => {
              if (isSignatureComplete(value)) return;
              throw new Error('Sign by typing your name or drawing your signature');
            },
          },
        ]}
        style={{ marginBottom: 0 }}
      >
        <SignaturePad suggestedFullName={suggestedFullName} />
      </Form.Item>
    </div>
  );
}
