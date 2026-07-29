'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Spin, Modal, Typography } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { colors, hasGoogleMapsKey, loadGoogleMaps, radii, typography } from '@reservations/ui';
import { MapMarkerInfoCard } from './MapMarkerInfoCard';

const { Text } = Typography;

type GoogleMapInstance = {
  fitBounds: (bounds: { extend: (position: { lat: number; lng: number }) => void; isEmpty: () => boolean }, padding?: number) => void;
  panTo: (position: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
};

type GoogleMarkerInstance = {
  setMap: (map: GoogleMapInstance | null) => void;
  addListener: (event: string, handler: () => void) => void;
};

type GoogleOverlayViewInstance = {
  onAdd?: () => void;
  draw?: () => void;
  onRemove?: () => void;
  setMap: (map: GoogleMapInstance | null) => void;
  getProjection: () => {
    fromLatLngToContainerPixel: (latLng: { lat: () => number; lng: () => number }) => { x: number; y: number } | null;
  } | null;
};

type GoogleMapsApi = NonNullable<Awaited<ReturnType<typeof loadGoogleMaps>>> & {
  OverlayView: new () => GoogleOverlayViewInstance;
  LatLng: new (lat: number, lng: number) => { lat: () => number; lng: () => number };
  event: {
    addListener: (instance: unknown, event: string, handler: () => void) => { remove: () => void };
  };
};

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

function markerDotIcon(maps: GoogleMapsApi, selected = false) {
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
  const overlayLayerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const mapsApiRef = useRef<GoogleMapsApi | null>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const positionOverlayRef = useRef<GoogleOverlayViewInstance | null>(null);
  const onCloseRestaurantRef = useRef(onCloseRestaurant);
  const onSelectRestaurantRef = useRef(onSelectRestaurant);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [overlayMounted, setOverlayMounted] = useState(false);
  const [unavailable, setUnavailable] = useState(!hasGoogleMapsKey());
  const [markerPositions, setMarkerPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [viewModalId, setViewModalId] = useState<string | null>(null);

  const mappable = useMemo(
    () => restaurants.filter((r) => r.location?.lat != null && r.location?.lng != null),
    [restaurants],
  );

  const selectedRestaurant = useMemo(
    () => mappable.find((r) => r.id === selectedId) ?? null,
    [mappable, selectedId],
  );

  useEffect(() => {
    onCloseRestaurantRef.current = onCloseRestaurant;
    onSelectRestaurantRef.current = onSelectRestaurant;
  }, [onCloseRestaurant, onSelectRestaurant]);

  useEffect(() => {
    if (!selectedId) setViewModalId(null);
  }, [selectedId]);

  const updateOverlayPositions = useCallback(() => {
    const overlay = positionOverlayRef.current;
    const maps = mapsApiRef.current;
    if (!overlay || !maps) return;

    const projection = overlay.getProjection();
    if (!projection) return;

    const nextPositions: Record<string, { x: number; y: number }> = {};
    for (const restaurant of mappable) {
      const point = projection.fromLatLngToContainerPixel(
        new maps.LatLng(restaurant.location!.lat, restaurant.location!.lng),
      );
      if (point) nextPositions[restaurant.id] = { x: point.x, y: point.y };
    }
    setMarkerPositions(nextPositions);
  }, [mappable]);

  const syncMarkers = useCallback(() => {
    const maps = mapsApiRef.current;
    const map = mapRef.current;
    if (!maps || !map) return;

    for (const marker of markersRef.current.values()) {
      marker.setMap(null);
    }
    markersRef.current.clear();

    const bounds = new maps.LatLngBounds();
    let hasBounds = false;

    for (const restaurant of mappable) {
      const position = {
        lat: restaurant.location!.lat,
        lng: restaurant.location!.lng,
      };
      const selected = restaurant.id === selectedId;
      const marker = new maps.Marker({
        map,
        position,
        title: restaurant.name,
        icon: markerDotIcon(maps, selected),
        zIndex: selected ? 2 : 1,
      });

      marker.addListener('click', () => {
        onSelectRestaurantRef.current?.(restaurant.id);
      });

      markersRef.current.set(restaurant.id, marker);
      bounds.extend(position);
      hasBounds = true;
    }

    if (hasBounds) {
      map.fitBounds(bounds, 56);
    } else {
      map.panTo(center);
      map.setZoom(12);
    }

    requestAnimationFrame(() => updateOverlayPositions());
  }, [mappable, selectedId, center, updateOverlayPositions]);

  useEffect(() => {
    if (!hasGoogleMapsKey() || !containerRef.current) {
      setLoading(false);
      setUnavailable(true);
      return;
    }

    let cancelled = false;

    loadGoogleMaps().then((maps) => {
      if (cancelled || !maps || !containerRef.current) {
        setLoading(false);
        if (!maps) setUnavailable(true);
        return;
      }

      const api = maps as GoogleMapsApi;
      mapsApiRef.current = api;

      if (!mapRef.current) {
        mapRef.current = new api.Map(containerRef.current, {
          center,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: MAP_STYLES,
        });

        const overlay = new api.OverlayView();
        overlay.onAdd = () => {};
        overlay.draw = () => updateOverlayPositions();
        overlay.setMap(mapRef.current);
        positionOverlayRef.current = overlay;

        api.event.addListener(mapRef.current, 'click', () => {
          onCloseRestaurantRef.current?.();
        });

        const mapEvents = ['bounds_changed', 'zoom_changed', 'dragend', 'idle'];
        for (const event of mapEvents) {
          api.event.addListener(mapRef.current, event, updateOverlayPositions);
        }
      }

      setMapReady(true);
      setLoading(false);
      setUnavailable(false);
    });

    return () => {
      cancelled = true;
    };
  }, [center, updateOverlayPositions]);

  useEffect(() => {
    if (!mapReady) return;
    syncMarkers();
  }, [mapReady, syncMarkers]);

  useEffect(() => {
    const maps = mapsApiRef.current;
    const map = mapRef.current;
    if (!maps || !map || !selectedRestaurant?.location) return;

    for (const [id, marker] of markersRef.current.entries()) {
      const selected = id === selectedId;
      marker.setIcon(markerDotIcon(maps, selected));
      marker.setZIndex(selected ? 2 : 1);
    }

    map.panTo({
      lat: selectedRestaurant.location.lat,
      lng: selectedRestaurant.location.lng,
    });
    updateOverlayPositions();
  }, [selectedId, selectedRestaurant, updateOverlayPositions]);

  if (unavailable) {
    return (
      <div
        style={{
          height: fullPage ? '100%' : height,
          borderRadius: fullPage ? 0 : radii.lg,
          border: fullPage ? 'none' : `1px solid ${colors.border}`,
          background: colors.neutral[100],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div>
          <EnvironmentOutlined
            style={{ fontSize: 36, color: colors.textTertiary, display: 'block', marginBottom: 12 }}
          />
          <Text strong style={{ display: 'block', fontSize: typography.fontSize.md }}>
            Map unavailable
          </Text>
          <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
            Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> with the Maps JavaScript API enabled to
            browse restaurants on the map.
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div
      className={fullPage ? 'rt-map-page__map' : undefined}
      style={{
        position: 'relative',
        height: fullPage ? '100%' : height,
        borderRadius: fullPage ? 0 : radii.lg,
        overflow: 'hidden',
        border: fullPage ? 'none' : `1px solid ${colors.border}`,
        background: colors.neutral[100],
      }}
    >
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.7)',
            zIndex: 2,
          }}
        >
          <Spin />
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div
        ref={(el) => {
          overlayLayerRef.current = el;
          if (el && !overlayMounted) setOverlayMounted(true);
        }}
        className="rt-map-marker-layer"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      >
        {overlayMounted && overlayLayerRef.current
          ? createPortal(
              <>
                {mappable.map((restaurant) => {
                  const position = markerPositions[restaurant.id];
                  if (!position) return null;
                  const selected = restaurant.id === selectedId;
                  return (
                    <button
                      key={restaurant.id}
                      type="button"
                      className={selected ? 'rt-map-marker-label rt-map-marker-label--selected' : 'rt-map-marker-label'}
                      style={{
                        position: 'absolute',
                        left: position.x,
                        top: position.y,
                        transform: 'translate(8px, -50%)',
                        pointerEvents: 'auto',
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onSelectRestaurantRef.current?.(restaurant.id);
                        setViewModalId(restaurant.id);
                      }}
                    >
                      {truncateLabel(restaurant.name)}
                    </button>
                  );
                })}
              </>,
              overlayLayerRef.current,
            )
          : null}
      </div>

      <Modal
        open={!!selectedRestaurant && viewModalId === selectedRestaurant.id}
        onCancel={() => {
          setViewModalId(null);
          onCloseRestaurantRef.current?.();
        }}
        footer={null}
        width={360}
        centered
        destroyOnClose
        className="rt-map-restaurant-modal"
        styles={{ body: { padding: 0 } }}
        closable={false}
      >
        {selectedRestaurant && viewModalId === selectedRestaurant.id ? (
          <MapMarkerInfoCard
            restaurant={selectedRestaurant}
            date={date}
            partySize={partySize}
            onClose={() => {
              setViewModalId(null);
              onCloseRestaurantRef.current?.();
            }}
            onOpen={() => onOpenRestaurant?.(selectedRestaurant.id)}
            onSelectSlot={(time) => onSelectSlot?.(selectedRestaurant.id, time)}
          />
        ) : null}
      </Modal>
    </div>
  );
}
