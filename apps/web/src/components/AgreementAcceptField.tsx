'use client';

import { useState } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client/react';
import { Checkbox, Form, Typography, message } from 'antd';
import {
  AgreementReviewModal,
  SignaturePad,
  downloadBase64File,
  isSignatureComplete,
  spacing,
  typography,
  type SignaturePadValue,
} from '@reservations/ui';
import { LEGAL_AGREEMENT, LEGAL_AGREEMENT_PDF } from '@/lib/graphql';

const { Text } = Typography;

type Props = {
  agreementKey?: 'terms_of_use' | 'partner_agreement';
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
  agreementKey = 'terms_of_use',
  name = 'termsOfUseSignature',
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
      downloadBase64File(pdf.filename, pdf.content);
    } catch {
      message.error('Could not download PDF');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, marginBottom: 8 }}>
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
      ) : (
        <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
          Agreement unavailable — try refreshing.
        </Text>
      )}
    </div>
  );
}
