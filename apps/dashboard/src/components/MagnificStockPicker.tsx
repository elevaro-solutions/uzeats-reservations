'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Space, Spin, Tag, Typography, message } from 'antd';
import { PictureOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { searchMagnificStockImage, uploadMagnificStockImage } from '@/lib/magnificStock';

const { Text, Paragraph } = Typography;

type MagnificStockPickerProps = {
  searchTerm: string;
  filenameHint: string;
  onAccept: (publicUrl: string) => void;
  disabled?: boolean;
};

export default function MagnificStockPicker({
  searchTerm,
  filenameHint,
  onAccept,
  disabled,
}: MagnificStockPickerProps) {
  const [customTerm, setCustomTerm] = useState(searchTerm);
  const [page, setPage] = useState(1);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [previewResourceId, setPreviewResourceId] = useState<number>();
  const [previewTitle, setPreviewTitle] = useState<string>();
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setCustomTerm(searchTerm);
    setPage(1);
    setPreviewUrl(undefined);
    setPreviewResourceId(undefined);
    setPreviewTitle(undefined);
  }, [searchTerm]);

  const runSearch = async (nextPage = 1, term = customTerm) => {
    const trimmed = term.trim();
    if (!trimmed) {
      message.warning('Enter a search term first');
      return;
    }

    setSearching(true);
    try {
      const result = await searchMagnificStockImage({ term: trimmed, page: nextPage });
      if (!result.ok || !result.imageUrl) {
        message.error(result.error || 'No Magnific photos found');
        return;
      }
      setPage(nextPage);
      setPreviewUrl(result.imageUrl);
      setPreviewResourceId(result.id);
      setPreviewTitle(result.title);
      setExpanded(true);
    } catch (err: any) {
      message.error(err.message || 'Magnific search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleTryAnother = () => {
    void runSearch(page + 1);
  };

  const handleAccept = async () => {
    if (!previewUrl) return;
    setUploading(true);
    try {
      const publicUrl = await uploadMagnificStockImage({
        resourceId: previewResourceId,
        imageUrl: previewUrl,
        filenameHint,
      });
      onAccept(publicUrl);
      message.success('Magnific image uploaded');
      setExpanded(false);
      setPreviewUrl(undefined);
      setPreviewResourceId(undefined);
      setPreviewTitle(undefined);
      setPage(1);
    } catch (err: any) {
      message.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        border: '1px dashed #d9d9d9',
        borderRadius: 10,
        padding: 12,
        background: '#fafafa',
      }}
    >
      <Space orientation="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text strong style={{ fontSize: 13 }}>
            Magnific stock
          </Text>
          <Button
            size="small"
            icon={<PictureOutlined />}
            loading={searching}
            disabled={disabled || searching}
            onClick={() => void runSearch(1)}
          >
            Generate preview
          </Button>
        </Space>

        <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
          Search Magnific.com for a landscape stock photo. Preview it here, then upload if it fits
          this taxonomy.
        </Paragraph>

        <Input
          size="small"
          value={customTerm}
          disabled={disabled || searching || uploading}
          onChange={(e) => setCustomTerm(e.target.value)}
          placeholder="Search keywords"
          onPressEnter={() => void runSearch(1)}
        />

        {expanded && previewUrl ? (
          <div>
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 320,
                aspectRatio: '16 / 10',
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid #e8e8e8',
                background: '#f5f5f5',
              }}
            >
              <img
                src={previewUrl}
                alt={previewTitle || 'Magnific preview'}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <Tag color="processing" style={{ position: 'absolute', left: 8, bottom: 8, margin: 0 }}>
                Magnific preview
              </Tag>
            </div>

            {previewTitle ? (
              <Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
                {previewTitle}
              </Text>
            ) : null}

            <Space wrap style={{ marginTop: 10 }}>
              <Button
                type="primary"
                size="small"
                icon={<UploadOutlined />}
                loading={uploading}
                disabled={disabled || searching}
                onClick={() => void handleAccept()}
              >
                Use this image
              </Button>
              <Button
                size="small"
                icon={<ReloadOutlined />}
                loading={searching}
                disabled={disabled || uploading}
                onClick={handleTryAnother}
              >
                Try another
              </Button>
              <Button
                size="small"
                type="text"
                disabled={uploading}
                onClick={() => {
                  setExpanded(false);
                  setPreviewUrl(undefined);
                  setPreviewResourceId(undefined);
                  setPreviewTitle(undefined);
                }}
              >
                Dismiss
              </Button>
            </Space>
          </div>
        ) : searching ? (
          <div style={{ padding: '12px 0', textAlign: 'center' }}>
            <Spin size="small" />
            <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
              Searching Magnific…
            </Text>
          </div>
        ) : null}
      </Space>
    </div>
  );
}
