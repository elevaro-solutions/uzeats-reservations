'use client';

import { useState } from 'react';
import { useLazyQuery, useQuery } from '@/lib/apollo-hooks';
import { Checkbox, Form, Typography, message } from 'antd';
import {
  AgreementReviewModal,
  SignaturePad,
  isSignatureComplete,
  type SignaturePadValue,
  spacing,
} from '@reservations/ui';
import { LEGAL_AGREEMENT, LEGAL_AGREEMENT_PDF } from '@/lib/graphql';
import { downloadBase64Pdf } from '@/components/BrandedAgreementView';

const { Text } = Typography;

type Props = {
  agreementKey: 'terms_of_use' | 'partner_agreement';
  /** Form field that stores SignaturePadValue */
  name?: string;
  /** Form field for boolean acceptance. Defaults from `name` (`…Signature` → `…Accepted`). */
  acceptedName?: string;
  suggestedFullName?: string;
};

function defaultAcceptedName(signatureName: string) {
  return signatureName.endsWith('Signature')
    ? `${signatureName.slice(0, -'Signature'.length)}Accepted`
    : `${signatureName}Accepted`;
}

export function AgreementAcceptField({
  agreementKey,
  name = 'partnerAgreementSignature',
  acceptedName: acceptedNameProp,
  suggestedFullName,
}: Props) {
  const form = Form.useFormInstance();
  const acceptedName = acceptedNameProp ?? defaultAcceptedName(name);
  const [modalOpen, setModalOpen] = useState(false);
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
        style={{ marginBottom: 0 }}
      >
        <SignaturePad suggestedFullName={suggestedFullName} />
      </Form.Item>

      {agreement ? (
        <>
          <Form.Item
            name={acceptedName}
            valuePropName="checked"
            rules={[
              {
                validator: async (_, value: boolean | undefined) => {
                  if (value) return;
                  throw new Error('Please read and accept the agreement');
                },
              },
            ]}
            getValueFromEvent={(e: { target: { checked: boolean } }) => {
              if (e.target.checked) {
                setModalOpen(true);
                return false;
              }
              return false;
            }}
            style={{ marginBottom: 0 }}
          >
            <Checkbox>
              I have read and accept the {agreement.name} (version {agreement.version})
            </Checkbox>
          </Form.Item>

          <AgreementReviewModal
            open={modalOpen}
            onCancel={() => setModalOpen(false)}
            onConfirm={() => {
              form.setFieldValue(acceptedName, true);
              void form.validateFields([acceptedName]).catch(() => undefined);
              setModalOpen(false);
            }}
            name={agreement.name}
            version={agreement.version}
            bodyHtml={agreement.bodyHtml}
            versionPublishedAt={agreement.versionPublishedAt}
            onDownloadPdf={downloadPdf}
            downloading={downloading}
          />
        </>
      ) : loading ? (
        <Text type="secondary">Loading agreement…</Text>
      ) : null}
    </div>
  );
}
