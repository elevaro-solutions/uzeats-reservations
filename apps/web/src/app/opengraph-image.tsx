import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Tablevera — Find and book restaurants';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Default Open Graph / Twitter share image. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: 'linear-gradient(145deg, #0b3d2e 0%, #145c45 48%, #1a6b52 100%)',
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: -0.5,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#c8f0a8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0b3d2e',
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            T
          </div>
          Tablevera
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 900 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -1.5,
            }}
          >
            Find your table. Book it in seconds.
          </div>
          <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.82)', lineHeight: 1.35 }}>
            Discover restaurants and reserve with live availability — free for diners.
          </div>
        </div>

        <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)' }}>tablevera.online</div>
      </div>
    ),
    { ...size },
  );
}
