'use client';

import { useLazyQuery, useQuery } from '@/lib/apollo-hooks';
import { Form, Typography, message } from 'antd';
import {
  SignaturePad,
  isSignatureComplete,
  type SignaturePadValue,
  spacing,
} from '@reservations/ui';
import { LEGAL_AGREEMENT, LEGAL_AGREEMENT_PDF } from '@/lib/graphql';
import { BrandedAgreementView, downloadBase64Pdf } from '@/components/BrandedAgreementView';

const { Text } = Typography;

type Props = {
  agreementKey: 'terms_of_use' | 'partner_agreement';
  /** Form field that stores SignaturePadValue */
  name?: string;
  suggestedFullName?: string;
};

export function AgreementAcceptField({
  agreementKey,
  name = 'partnerAgreementSignature',
  suggestedFullName,
}: Props) {
  const { data, loading } = useQuery(LEGAL_AGREEMENT, {
    variables: { key: agreementKey },
  });
  const [fetchPdf, { loading: downloading }] = useLazyQuery(LEGAL_AGREEMENT_PDF);
  const agreement = data?.legalAgreement;

  const downloadPdf = async () => {
    try {
      const result = await fetchPdf({ variables: { key: agreementKey } });
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, marginTop: spacing.sm }}>
      {agreement ? (
        <BrandedAgreementView
          name={agreement.name}
          version={agreement.version}
          bodyHtml={agreement.bodyHtml}
          versionPublishedAt={agreement.versionPublishedAt}
          onDownloadPdf={downloadPdf}
          downloading={downloading}
        />
      ) : loading ? (
        <Text type="secondary">Loading agreement…</Text>
      ) : null}

      <Text strong>Sign to continue</Text>
      <Text type="secondary" style={{ marginTop: -8 }}>
        Type your full legal name or draw your signature. Required before your account is created.
      </Text>

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
        getValueFromEvent={(v: SignaturePadValue) => v}
        trigger="onChange"
        validateTrigger={['onChange', 'onBlur']}
      >
        <SignaturePad suggestedFullName={suggestedFullName} />
      </Form.Item>
    </div>
  );
}
