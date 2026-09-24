'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Modal } from 'antd';
import { CloseOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { DEFAULT_RESTAURANT_PHOTO } from '@reservations/ui';
import { canUseNextImage } from '@/lib/canUseNextImage';

type Props = {
  photos: string[];
  name: string;
};

export type RestaurantPhotoGalleryHandle = {
  openBrowser: (index?: number) => void;
};

function photoCountLabel(count: number) {
  return count === 1 ? '1 photo' : `${count} photos`;
}

function GalleryImage({
  src,
  alt,
  priority,
  sizes,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  sizes: string;
}) {
  if (canUseNextImage(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        style={{ objectFit: 'cover' }}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} />;
}

export const RestaurantPhotoGallery = forwardRef<RestaurantPhotoGalleryHandle, Props>(
  function RestaurantPhotoGallery({ photos, name }, ref) {
    const [browserOpen, setBrowserOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [mounted, setMounted] = useState(false);
    const gallery = photos.length > 0 ? photos : [DEFAULT_RESTAURANT_PHOTO];
    const photoCount = photos.length;
    const single = gallery.length === 1;
    const mosaicClass =
      gallery.length >= 5
        ? 'rt-restaurant-gallery--mosaic-5'
        : gallery.length >= 3
          ? 'rt-restaurant-gallery--mosaic-3'
          : gallery.length === 2
            ? 'rt-restaurant-gallery--mosaic-2'
            : 'rt-restaurant-gallery--single';

    const openBrowser = useCallback((index?: number) => {
      setBrowserOpen(true);
      if (typeof index === 'number' && index >= 0) {
        setLightboxIndex(index);
      } else {
        setLightboxIndex(null);
      }
    }, []);

    const closeBrowser = () => {
      setBrowserOpen(false);
      setLightboxIndex(null);
    };

    const openLightbox = (index: number) => {
      setBrowserOpen(true);
      setLightboxIndex(index);
    };

    const closeLightbox = () => setLightboxIndex(null);

    const prev = useCallback(() => {
      setLightboxIndex((i) =>
        i === null ? null : (i - 1 + gallery.length) % gallery.length,
      );
    }, [gallery.length]);

    const next = useCallback(() => {
      setLightboxIndex((i) => (i === null ? null : (i + 1) % gallery.length));
    }, [gallery.length]);

    useImperativeHandle(ref, () => ({ openBrowser }), [openBrowser]);

    useEffect(() => {
      setMounted(true);
    }, []);

    useEffect(() => {
      if (lightboxIndex === null && !browserOpen) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (lightboxIndex !== null) closeLightbox();
          else closeBrowser();
          return;
        }
        if (lightboxIndex === null) return;
        if (e.key === 'ArrowLeft') prev();
        if (e.key === 'ArrowRight') next();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [lightboxIndex, browserOpen, prev, next]);

    useEffect(() => {
      if (lightboxIndex === null) return;
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }, [lightboxIndex]);

    const sideSlots =
      gallery.length >= 5
        ? gallery.slice(1, 5)
        : gallery.length >= 3
          ? gallery.slice(1, 3)
          : [];

    const seeAllLabel =
      photoCount > 0 ? `See all ${photoCountLabel(photoCount)}` : `See photo of ${name}`;

    const lightbox =
      mounted && lightboxIndex !== null
        ? createPortal(
            <div
              className="rt-restaurant-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label={`${name} photo ${lightboxIndex + 1}`}
              onClick={(e) => {
                if (e.target === e.currentTarget) closeLightbox();
              }}
            >
              <button
                type="button"
                className="rt-restaurant-lightbox__close"
                onClick={closeLightbox}
                aria-label="Close"
              >
                <CloseOutlined />
              </button>
              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    className="rt-restaurant-lightbox__nav rt-restaurant-lightbox__nav--prev"
                    onClick={prev}
                    aria-label="Previous photo"
                  >
                    <LeftOutlined />
                  </button>
                  <button
                    type="button"
                    className="rt-restaurant-lightbox__nav rt-restaurant-lightbox__nav--next"
                    onClick={next}
                    aria-label="Next photo"
                  >
                    <RightOutlined />
                  </button>
                </>
              )}
              {/* Lightbox stays raw <img> so arbitrary CDN hosts still work without blur placeholders. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="rt-restaurant-lightbox__img"
                src={gallery[lightboxIndex]}
                alt={`${name} photo ${lightboxIndex + 1}`}
              />
              <span className="rt-restaurant-lightbox__counter">
                {lightboxIndex + 1} / {gallery.length}
              </span>
            </div>,
            document.body,
          )
        : null;

    return (
      <>
        <div className={`rt-restaurant-gallery ${mosaicClass}`}>
          <button
            type="button"
            className="rt-restaurant-gallery__hero"
            onClick={() => openLightbox(0)}
            aria-label={seeAllLabel}
          >
            <GalleryImage
              src={gallery[0]}
              alt={name}
              priority
              sizes={
                single
                  ? '100vw'
                  : '(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 720px'
              }
            />
          </button>

          {gallery.length === 2 && (
            <button
              type="button"
              className="rt-restaurant-gallery__hero rt-restaurant-gallery__hero--second"
              onClick={() => openLightbox(1)}
              aria-label="View photo 2 of 2"
            >
              <GalleryImage
                src={gallery[1]}
                alt={`${name} photo 2`}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </button>
          )}

          {sideSlots.length > 0 && (
            <div className="rt-restaurant-gallery__side">
              {sideSlots.map((url, i) => (
                <button
                  key={url + i}
                  type="button"
                  className="rt-restaurant-gallery__thumb"
                  onClick={() => openLightbox(i + 1)}
                  aria-label={`View photo ${i + 2} of ${gallery.length}`}
                >
                  <GalleryImage
                    src={url}
                    alt={`${name} photo ${i + 2}`}
                    sizes="(max-width: 768px) 50vw, 20vw"
                  />
                </button>
              ))}
            </div>
          )}

          {photoCount > 0 && (
            <button
              type="button"
              className="rt-restaurant-gallery__see-all"
              onClick={() => openBrowser()}
            >
              {seeAllLabel}
            </button>
          )}
        </div>

        <Modal
          open={browserOpen && lightboxIndex === null}
          onCancel={closeBrowser}
          footer={null}
          width={920}
          centered
          closable={false}
          destroyOnClose={false}
          className="rt-restaurant-photos-browser"
          styles={{
            body: { padding: 0 },
            mask: { backdropFilter: 'blur(2px)' },
          }}
        >
          <div className="rt-restaurant-photos-browser__header">
            <div>
              <h2 className="rt-restaurant-photos-browser__title">
                {photoCountLabel(Math.max(photoCount, gallery.length))}
              </h2>
              <p className="rt-restaurant-photos-browser__subtitle">
                Explore photos from {name}.
              </p>
            </div>
            <button
              type="button"
              className="rt-restaurant-photos-browser__close"
              onClick={closeBrowser}
              aria-label="Close"
            >
              <CloseOutlined />
            </button>
          </div>
          <div className="rt-restaurant-photos-browser__grid">
            {gallery.map((url, i) => (
              <button
                key={url + i}
                type="button"
                className={`rt-restaurant-photos-browser__cell${
                  i % 5 === 0 ? ' rt-restaurant-photos-browser__cell--wide' : ''
                }`}
                onClick={() => setLightboxIndex(i)}
                aria-label={`View photo ${i + 1} of ${gallery.length}`}
              >
                <GalleryImage
                  src={url}
                  alt={`${name} photo ${i + 1}`}
                  sizes="(max-width: 768px) 50vw, 280px"
                />
              </button>
            ))}
          </div>
        </Modal>

        {lightbox}
      </>
    );
  },
);
