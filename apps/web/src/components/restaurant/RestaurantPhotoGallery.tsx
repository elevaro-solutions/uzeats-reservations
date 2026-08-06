'use client';

import { useState } from 'react';
import { Modal } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { DEFAULT_RESTAURANT_PHOTO } from '@reservations/ui';

type Props = {
  photos: string[];
  name: string;
};

export function RestaurantPhotoGallery({ photos, name }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const gallery = photos.length > 0 ? photos : [DEFAULT_RESTAURANT_PHOTO];

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prev = () =>
    setLightboxIndex((i) => (i === null ? null : (i - 1 + gallery.length) % gallery.length));
  const next = () =>
    setLightboxIndex((i) => (i === null ? null : (i + 1) % gallery.length));

  if (gallery.length === 1) {
    return (
      <div className="rt-restaurant-gallery rt-restaurant-gallery--single">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={gallery[0]}
          alt={name}
          onClick={() => openLightbox(0)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && openLightbox(0)}
        />
      </div>
    );
  }

  const [hero, ...rest] = gallery;

  return (
    <>
      <div className="rt-restaurant-gallery">
        <button
          type="button"
          className="rt-restaurant-gallery__hero"
          onClick={() => openLightbox(0)}
          aria-label={`View photo 1 of ${gallery.length}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero} alt={name} />
        </button>
        <div className="rt-restaurant-gallery__side">
          {rest.slice(0, 2).map((url, i) => (
            <button
              key={url + i}
              type="button"
              className="rt-restaurant-gallery__thumb"
              onClick={() => openLightbox(i + 1)}
              aria-label={`View photo ${i + 2} of ${gallery.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${name} photo ${i + 2}`} />
              {i === 1 && gallery.length > 3 && (
                <span className="rt-restaurant-gallery__more">+{gallery.length - 3} photos</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <Modal
        open={lightboxIndex !== null}
        onCancel={closeLightbox}
        footer={null}
        width="90vw"
        centered
        className="rt-restaurant-lightbox"
        styles={{ body: { padding: 0, background: '#000' } }}
      >
        {lightboxIndex !== null && (
          <div className="rt-restaurant-lightbox__inner">
            <button type="button" className="rt-restaurant-lightbox__nav rt-restaurant-lightbox__nav--prev" onClick={prev} aria-label="Previous photo">
              <LeftOutlined />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gallery[lightboxIndex]} alt={`${name} photo ${lightboxIndex + 1}`} />
            <button type="button" className="rt-restaurant-lightbox__nav rt-restaurant-lightbox__nav--next" onClick={next} aria-label="Next photo">
              <RightOutlined />
            </button>
            <span className="rt-restaurant-lightbox__counter">
              {lightboxIndex + 1} / {gallery.length}
            </span>
          </div>
        )}
      </Modal>
    </>
  );
}
