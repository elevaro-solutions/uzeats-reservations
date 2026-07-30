'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Spin, Typography } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { colors, hasGoogleMapsKey, loadGoogleMaps, radii, typography } from '@reservations/ui';
import { MapMarkerInfoCard } from './MapMarkerInfoCard';

const { Text } = Typography;

export type MapRestaurant = {
  id: string;
  name: string;
  slug: string;
  cuisine: string;
  priceRange?: number;
  averageRating?: number;
  reviewCount?: number;
  photos?: string[];
  location?: { lat: number; lng: number } | null;
  address?: { city?: string; state?: string };
};

type RestaurantDiscoveryMapProps = {
  restaurants: MapRestaurant[];
  center: { lat: number; lng: number };
  selectedId?: string | null;
  date: string;
  partySize: number;
  onSelectRestaurant?: (id: string) => void;
  onCloseRestaurant?: () => void;
  onOpenRestaurant?: (id: string) => void;
  onSelectSlot?: (id: string, time: string) => void;
  height?: number | string;
  fullPage?: boolean;
};

const MAP_STYLES = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const MARKER_GREEN = colors.brand[600];
const MARKER_SELECTED = colors.accent[500];

function truncateLabel(name: string, max = 26): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

function markerDotIcon(maps: any, selected = false) {
  return {
    path: maps.SymbolPath.CIRCLE,
    fillColor: selected ? MARKER_SELECTED : MARKER_GREEN,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: selected ? 3 : 1.5,
    scale: selected ? 9 : 6,
  };
}

export function RestaurantDiscoveryMap({
  restaurants,
  center,
  selectedId,
  date,
  partySize,
  onSelectRestaurant,
  onCloseRestaurant,
  onOpenRestaurant,
  onSelectSlot,
  height = 520,
  fullPage = false,
}: RestaurantDiscoveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mapsApiRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const mappableKeyRef = useRef('');
  const overlayViewRef = useRef<any>(null);
  const cbRef = useRef({ onClose: onCloseRestaurant, onSelect: onSelectRestaurant });
  const suppressCloseRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [unavailable, setUnavailable] = useState(!hasGoogleMapsKey());
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    cbRef.current = { onClose: onCloseRestaurant, onSelect: onSelectRestaurant };
  }, [onCloseRestaurant, onSelectRestaurant]);

  const mappable = useMemo(
    () => restaurants.filter((r) => r.location?.lat != null && r.location?.lng != null),
    [restaurants],
  );

  const selectedRestaurant = useMemo(
    () => (selectedId ? mappable.find((r) => r.id === selectedId) ?? null : null),
    [mappable, selectedId],
  );

  const recalcPositions = useCallback(() => {
    const ov = overlayViewRef.current;
    const maps = mapsApiRef.current;
    if (!ov || !maps) return;
    const proj = ov.getProjection?.();
    if (!proj) return;
    const next: Record<string, { x: number; y: number }> = {};
    for (const r of mappable) {
      const ll = new maps.LatLng(r.location!.lat, r.location!.lng);
      const pt = proj.fromLatLngToContainerPixel?.(ll);
      if (pt) next[r.id] = { x: pt.x, y: pt.y };
    }
    setPositions(next);
  }, [mappable]);

  const handleSelect = useCallback((id: string) => {
    suppressCloseRef.current = true;
    cbRef.current.onSelect?.(id);
    setTimeout(() => { suppressCloseRef.current = false; }, 300);
  }, []);

  const syncMarkers = useCallback(() => {
    const maps = mapsApiRef.current;
    const map = mapRef.current;
    if (!maps || !map) return;

    for (const m of markersRef.current.values()) m.setMap(null);
    markersRef.current.clear();

    const bounds = new maps.LatLngBounds();
    let any = false;
    const key = mappable.map((r) => r.id).join(',');
    const changed = key !== mappableKeyRef.current;
    mappableKeyRef.current = key;

    for (const r of mappable) {
      const pos = { lat: r.location!.lat, lng: r.location!.lng };
      const m = new maps.Marker({ map, position: pos, title: r.name, icon: markerDotIcon(maps, false), zIndex: 1 });
      m.addListener('click', () => handleSelect(r.id));
      markersRef.current.set(r.id, m);
      bounds.extend(pos);
      any = true;
    }

    if (changed) {
      if (any) map.fitBounds(bounds, 56);
      else { map.panTo(center); map.setZoom(12); }
    }
    requestAnimationFrame(recalcPositions);
  }, [mappable, center, recalcPositions, handleSelect]);

  useEffect(() => {
    if (!hasGoogleMapsKey() || !containerRef.current) {
      setLoading(false);
      setUnavailable(true);
      return;
    }
    let dead = false;
    loadGoogleMaps().then((maps) => {
      if (dead || !maps || !containerRef.current) { setLoading(false); if (!maps) setUnavailable(true); return; }
      const api = maps as any;
      mapsApiRef.current = api;

      if (!mapRef.current) {
        mapRef.current = new api.Map(containerRef.current, {
          center, zoom: 12, mapTypeControl: false, streetViewControl: false, fullscreenControl: true, styles: MAP_STYLES,
        });

        const ov = new api.OverlayView();
        ov.onAdd = () => {};
        ov.draw = () => recalcPositions();
        ov.setMap(mapRef.current);
        overlayViewRef.current = ov;

        api.event.addListener(mapRef.current, 'click', () => {
          setTimeout(() => { if (!suppressCloseRef.current) cbRef.current.onClose?.(); }, 0);
        });
        for (const ev of ['bounds_changed', 'zoom_changed', 'dragend', 'idle']) {
          api.event.addListener(mapRef.current, ev, recalcPositions);
        }
      }
      setMapReady(true);
      setLoading(false);
      setUnavailable(false);
    });
    return () => { dead = true; };
  }, [center, recalcPositions]);

  useEffect(() => { if (mapReady) syncMarkers(); }, [mapReady, syncMarkers]);

  useEffect(() => {
    const maps = mapsApiRef.current;
    const map = mapRef.current;
    if (!maps || !map) return;
    for (const [id, m] of markersRef.current.entries()) {
      const sel = id === selectedId;
      m.setIcon(markerDotIcon(maps, sel));
      m.setZIndex(sel ? 2 : 1);
    }
    if (selectedRestaurant?.location) {
      map.panTo({ lat: selectedRestaurant.location.lat, lng: selectedRestaurant.location.lng });
    }
    recalcPositions();
  }, [selectedId, selectedRestaurant, recalcPositions]);

  if (unavailable) {
    return (
      <div style={{ height: fullPage ? '100%' : height, borderRadius: fullPage ? 0 : radii.lg, border: fullPage ? 'none' : `1px solid ${colors.border}`, background: colors.neutral[100], display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <EnvironmentOutlined style={{ fontSize: 36, color: colors.textTertiary, display: 'block', marginBottom: 12 }} />
          <Text strong style={{ display: 'block', fontSize: typography.fontSize.md }}>Map unavailable</Text>
          <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
            Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> with the Maps JavaScript API enabled to browse restaurants on the map.
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div
      className={fullPage ? 'rt-map-page__map' : undefined}
      style={{ position: 'relative', height: fullPage ? '100%' : height, borderRadius: fullPage ? 0 : radii.lg, overflow: 'hidden', border: fullPage ? 'none' : `1px solid ${colors.border}`, background: colors.neutral[100] }}
    >
      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', zIndex: 2 }}>
          <Spin />
        </div>
      )}

      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <div
        ref={overlayRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}
      >
        {mappable.map((r) => {
          const pos = positions[r.id];
          if (!pos) return null;
          const sel = r.id === selectedId;
          return (
            <button
              key={r.id}
              type="button"
              className={sel ? 'rt-map-marker-label rt-map-marker-label--selected' : 'rt-map-marker-label'}
              style={{ position: 'absolute', left: pos.x, top: pos.y, transform: 'translate(8px, -50%)', pointerEvents: 'auto' }}
              onPointerDown={() => { suppressCloseRef.current = true; }}
              onClick={(e) => { e.stopPropagation(); handleSelect(r.id); }}
            >
              {truncateLabel(r.name)}
            </button>
          );
        })}

        {selectedRestaurant && positions[selectedRestaurant.id] ? (
          <div
            className="rt-map-marker-popover"
            style={{
              position: 'absolute',
              left: positions[selectedRestaurant.id].x,
              top: positions[selectedRestaurant.id].y,
              transform: 'translate(-50%, calc(-100% - 20px))',
              pointerEvents: 'auto',
            }}
            onPointerDown={() => { suppressCloseRef.current = true; }}
            onClick={(e) => e.stopPropagation()}
          >
            <MapMarkerInfoCard
              restaurant={selectedRestaurant}
              date={date}
              partySize={partySize}
              onClose={() => cbRef.current.onClose?.()}
              onOpen={() => onOpenRestaurant?.(selectedRestaurant.id)}
              onSelectSlot={(time) => onSelectSlot?.(selectedRestaurant.id, time)}
            />
            <div className="rt-map-marker-card-pointer" aria-hidden />
          </div>
        ) : null}
      </div>
    </div>
  );
}
