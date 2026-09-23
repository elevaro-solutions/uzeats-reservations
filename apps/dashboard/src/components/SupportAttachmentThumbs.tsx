'use client';

import { Image, Typography } from 'antd';
import { browserMediaUrl } from '@reservations/shared';
import { colors } from '@reservations/ui';

export type SupportAttachmentThumb = {
  id: string;
  url: string;
  filename: string;
};

export function SupportAttachmentThumbs({
  items,
  showFilename = false,
}: {
  items: SupportAttachmentThumb[];
  showFilename?: boolean;
}) {
  if (!items.length) return null;
  return (
    <Image.PreviewGroup>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {items.map((item) => (
          <div key={item.id} style={{ width: 96 }}>
            <Image
              src={browserMediaUrl(item.url)}
              alt={item.filename}
              width={96}
              height={96}
              style={{
                objectFit: 'cover',
                borderRadius: 8,
                border: `1px solid ${colors.bordersubtle}`,
              }}
            />
            {showFilename ? (
              <Typography.Text
                ellipsis
                type="secondary"
                style={{ display: 'block', fontSize: 12, marginTop: 4 }}
                title={item.filename}
              >
                {item.filename}
              </Typography.Text>
            ) : null}
          </div>
        ))}
      </div>
    </Image.PreviewGroup>
  );
}
