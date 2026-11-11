'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Spin, Typography } from 'antd';
import { EnvironmentOutlined, StarFilled } from '@ant-design/icons';
import { colors, hasGoogleMapsKey, loadGoogleMaps, radii, typography } from '@reservations/ui';
import { MapMarkerInfoCard } from './MapMarkerInfoCard';
import {
  clusterBubbleSize,
  clusterByPixels,
  placeLabels,
  placePopover,
  type PopoverPlacement,
  zoomToFitBounds,
  type MapCluster,
} from './mapClusters';

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
  availableSlotTimes?: string[];
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

/** Members closer than this (degrees, about 1 m) cannot be split by zooming. */
const SAME_SPOT_SPAN_DEG = 0.00001;
/** At this zoom a cluster opens as a list instead of zooming further. */
const CLUSTER_LIST_ZOOM = 20;
const CLUSTER_FIT_PADDING_PX = 80;
/** Raster maps only animate one zoom level at a time, so deeper zooms are chained. */
const ZOOM_STEP_MS = 120;
const PAN_POLL_MS = 40;
const PAN_MAX_MS = 650;
const PAN_DONE_EPSILON_DEG = 1e-6;
const CAMERA_SETTLE_FALLBACK_MS = 700;

const SELECTED_DOT_RADIUS_PX = 11;
const CLUSTER_RING_PX = 4;
/** Must match the `.rt-map-marker-card-pointer` triangle height. */
const POINTER_HEIGHT_PX = 10;
const POINTER_GAP_PX = 6;
const POPOVER_OFFSET_PX = SELECTED_DOT_RADIUS_PX + POINTER_GAP_PX + POINTER_HEIGHT_PX;
const POPOVER_MARGIN_PX = 12;
const POPOVER_FALLBACK_SIZE = { width: 320, height: 320 };
const CLUSTER_LIST_FALLBACK_SIZE = { width: 260, height: 200 };

type ElementSize = { width: number; height: number };

/** Callback ref that tracks an element's layout size (ignores transforms). */
function useElementSize(): [(node: HTMLElement | null) => void, ElementSize | null] {
  const [size, setSize] = useState<ElementSize | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const ref = useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) {
      setSize(null);
      return;
    }
    const update = () => {
      const width = node.offsetWidth;
      const height = node.offsetHeight;
      setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    observerRef.current = new ResizeObserver(update);
    observerRef.current.observe(node);
  }, []);
  return [ref, size];
}

function placementStyle(placement: PopoverPlacement | null, anchor: { x: number; y: number }): CSSProperties {
  if (!placement) return { left: anchor.x, top: anchor.y, visibility: 'hidden' };
  return { left: placement.left, top: placement.top, '--pointer-x': `${placement.pointerX}px` } as CSSProperties;
}

function truncateLabel(name: string, max = 26): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

/** Idle dot must match `.rt-map-marker-label__dot` so the chip covers it seamlessly. */
const IDLE_DOT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#1a1816" flood-opacity="0.35"/></filter></defs><circle cx="11" cy="11" r="7" fill="#ffffff" filter="url(#s)"/><circle cx="11" cy="11" r="5" fill="${MARKER_GREEN}"/></svg>`;
const SELECTED_DOT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#1a1816" flood-opacity="0.35"/></filter></defs><circle cx="18" cy="18" r="16" fill="${MARKER_SELECTED}" fill-opacity="0.22"/><circle cx="18" cy="18" r="11" fill="#ffffff" filter="url(#s)"/><circle cx="18" cy="18" r="8" fill="${MARKER_SELECTED}"/></svg>`;

function markerDotIcon(maps: any, selected = false) {
  const svg = selected ? SELECTED_DOT_SVG : IDLE_DOT_SVG;
  const size = selected ? 36 : 22;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(size, size),
    anchor: new maps.Point(size / 2, size / 2),
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
  const [overlayRef, overlaySize] = useElementSize();
  const [popoverRef, popoverSize] = useElementSize();
  const [clusterListRef, clusterListSize] = useElementSize();
  const mapRef = useRef<any>(null);
  const mapsApiRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const mappableKeyRef = useRef('');
  const hiddenMarkersKeyRef = useRef<string | null>(null);
  const overlayViewRef = useRef<any>(null);
  const cbRef = useRef({ onClose: onCloseRestaurant, onSelect: onSelectRestaurant });
  const recalcRef = useRef<() => void>(() => {});
  const suppressCloseRef = useRef(false);
  const cameraAnimatingRef = useRef(false);
  const cameraTokenRef = useRef(0);
  const lastPopoverHeightRef = useRef(POPOVER_FALLBACK_SIZE.height);

  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [unavailable, setUnavailable] = useState(!hasGoogleMapsKey());
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [openClusterId, setOpenClusterId] = useState<string | null>(null);
  const [cameraMoving, setCameraMoving] = useState(false);

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

  useEffect(() => {
    recalcRef.current = recalcPositions;
  }, [recalcPositions]);

  const { clusters, clusteredIds, labelIds } = useMemo(() => {
    const ids = mappable.map((r) => r.id);
    const exclude = new Set(selectedId ? [selectedId] : []);
    const nextClusters = clusterByPixels(ids, positions, { excludeIds: exclude });
    const nextClustered = new Set(nextClusters.flatMap((c) => c.memberIds));
    const labels: Record<string, string> = {};
    for (const r of mappable) labels[r.id] = truncateLabel(r.name);
    const labelOrder = [
      ...(selectedId && positions[selectedId] ? [selectedId] : []),
      ...ids.filter((id) => id !== selectedId && !nextClustered.has(id)),
    ];
    return {
      clusters: nextClusters,
      clusteredIds: nextClustered,
      labelIds: placeLabels(labelOrder, positions, labels, nextClusters),
    };
  }, [mappable, positions, selectedId]);

  const openCluster = useMemo(
    () => (openClusterId ? clusters.find((c) => c.id === openClusterId) ?? null : null),
    [clusters, openClusterId],
  );

  const selectedPos = selectedRestaurant ? positions[selectedRestaurant.id] : undefined;
  const popoverPlacement = useMemo(() => {
    if (!selectedPos || !overlaySize) return null;
    return placePopover(selectedPos, popoverSize ?? POPOVER_FALLBACK_SIZE, overlaySize, POPOVER_OFFSET_PX, {
      marginPx: POPOVER_MARGIN_PX,
    });
  }, [selectedPos, popoverSize, overlaySize]);

  useEffect(() => {
    if (popoverSize) lastPopoverHeightRef.current = popoverSize.height;
  }, [popoverSize]);

  const clusterListPlacement = useMemo(() => {
    if (!openCluster || !overlaySize) return null;
    const radius = clusterBubbleSize(openCluster.memberIds.length) / 2 + CLUSTER_RING_PX;
    return placePopover(
      openCluster,
      clusterListSize ?? CLUSTER_LIST_FALLBACK_SIZE,
      overlaySize,
      radius + POINTER_GAP_PX + POINTER_HEIGHT_PX,
      { marginPx: POPOVER_MARGIN_PX },
    );
  }, [openCluster, clusterListSize, overlaySize]);

  useEffect(() => {
    const key = [...clusteredIds].sort().join(',');
    if (key === hiddenMarkersKeyRef.current) return;
    hiddenMarkersKeyRef.current = key;
    for (const [id, m] of markersRef.current.entries()) m.setVisible(!clusteredIds.has(id));
  }, [clusteredIds]);

  const suppressMapClose = useCallback(() => {
    suppressCloseRef.current = true;
    setTimeout(() => { suppressCloseRef.current = false; }, 300);
  }, []);

  const handleSelect = useCallback((id: string) => {
    suppressMapClose();
    setOpenClusterId(null);
    cbRef.current.onSelect?.(id);
  }, [suppressMapClose]);

  const finishCameraAnimation = useCallback((token: number) => {
    if (token !== cameraTokenRef.current || !cameraAnimatingRef.current) return;
    cameraAnimatingRef.current = false;
    recalcRef.current();
    setCameraMoving(false);
  }, []);

  /** Glide to `center`, then zoom one level per step so the raster map animates every level. */
  const animateCamera = useCallback((center: { lat: number; lng: number }, targetZoom: number) => {
    const maps = mapsApiRef.current;
    const map = mapRef.current;
    if (!maps || !map) return;
    const token = ++cameraTokenRef.current;
    cameraAnimatingRef.current = true;
    setCameraMoving(true);
    map.panTo(center);

    const settle = () => {
      maps.event.addListenerOnce(map, 'idle', () => finishCameraAnimation(token));
      setTimeout(() => finishCameraAnimation(token), CAMERA_SETTLE_FALLBACK_MS);
    };
    const step = () => {
      if (token !== cameraTokenRef.current) return;
      const zoom = map.getZoom() ?? targetZoom;
      if (zoom >= targetZoom) {
        settle();
        return;
      }
      map.setZoom(zoom + 1);
      setTimeout(step, ZOOM_STEP_MS);
    };
    // Zooming mid-glide cancels Google's pan animation, so wait until the center lands.
    const panStartedAt = performance.now();
    const waitForPan = () => {
      if (token !== cameraTokenRef.current) return;
      const c = map.getCenter();
      const landed =
        !c ||
        (Math.abs(c.lat() - center.lat) < PAN_DONE_EPSILON_DEG &&
          Math.abs(c.lng() - center.lng) < PAN_DONE_EPSILON_DEG);
      if (landed || performance.now() - panStartedAt > PAN_MAX_MS) step();
      else setTimeout(waitForPan, PAN_POLL_MS);
    };
    setTimeout(waitForPan, PAN_POLL_MS);
  }, [finishCameraAnimation]);

  const handleClusterClick = useCallback((cluster: MapCluster) => {
    suppressMapClose();
    const maps = mapsApiRef.current;
    const map = mapRef.current;
    if (!maps || !map) return;
    const memberIds = new Set(cluster.memberIds);
    const bounds = new maps.LatLngBounds();
    for (const r of mappable) {
      if (memberIds.has(r.id)) bounds.extend({ lat: r.location!.lat, lng: r.location!.lng });
    }
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const span = Math.max(Math.abs(ne.lat() - sw.lat()), Math.abs(ne.lng() - sw.lng()));
    const currentZoom = map.getZoom() ?? 12;
    if (span < SAME_SPOT_SPAN_DEG || currentZoom >= CLUSTER_LIST_ZOOM) {
      cbRef.current.onClose?.();
      setOpenClusterId(cluster.id);
      return;
    }
    setOpenClusterId(null);
    const div = map.getDiv() as HTMLElement;
    const fitZoom = zoomToFitBounds(
      { north: ne.lat(), south: sw.lat(), east: ne.lng(), west: sw.lng() },
      { width: div.clientWidth, height: div.clientHeight },
      CLUSTER_FIT_PADDING_PX,
    );
    const targetZoom = Math.min(CLUSTER_LIST_ZOOM, Math.max(currentZoom + 1, fitZoom));
    const center = bounds.getCenter();
    animateCamera({ lat: center.lat(), lng: center.lng() }, targetZoom);
  }, [mappable, suppressMapClose, animateCamera]);

  const syncMarkers = useCallback(() => {
    const maps = mapsApiRef.current;
    const map = mapRef.current;
    if (!maps || !map) return;

    for (const m of markersRef.current.values()) m.setMap(null);
    markersRef.current.clear();
    hiddenMarkersKeyRef.current = null;

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
        ov.draw = () => { if (!cameraAnimatingRef.current) recalcRef.current(); };
        ov.setMap(mapRef.current);
        overlayViewRef.current = ov;

        api.event.addListener(mapRef.current, 'click', () => {
          setTimeout(() => {
            if (suppressCloseRef.current) return;
            setOpenClusterId(null);
            cbRef.current.onClose?.();
          }, 0);
        });
        // Labels live outside Google's panes and can't follow its zoom animation, so fade them until idle.
        api.event.addListener(mapRef.current, 'zoom_changed', () => {
          setOpenClusterId(null);
          setCameraMoving(true);
        });
        api.event.addListener(mapRef.current, 'idle', () => {
          if (!cameraAnimatingRef.current) setCameraMoving(false);
        });
        api.event.addListener(mapRef.current, 'dragstart', () => {
          if (!cameraAnimatingRef.current) return;
          cameraTokenRef.current += 1;
          cameraAnimatingRef.current = false;
        });
        for (const ev of ['bounds_changed', 'zoom_changed', 'dragend', 'idle']) {
          api.event.addListener(mapRef.current, ev, () => {
            if (!cameraAnimatingRef.current) recalcRef.current();
          });
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
      const target = { lat: selectedRestaurant.location.lat, lng: selectedRestaurant.location.lng };
      // Centering leaves no room for a tall card on short maps, so drop the marker until the card fits above it.
      const mapHeight = (map.getDiv() as HTMLElement).clientHeight;
      const neededY = POPOVER_MARGIN_PX + POPOVER_OFFSET_PX + lastPopoverHeightRef.current;
      const markerY = Math.min(Math.max(mapHeight / 2, neededY), mapHeight - POPOVER_MARGIN_PX - SELECTED_DOT_RADIUS_PX);
      const shift = markerY - mapHeight / 2;
      const proj = overlayViewRef.current?.getProjection?.();
      if (proj && shift > 0) {
        const pt = proj.fromLatLngToDivPixel(new maps.LatLng(target.lat, target.lng));
        map.panTo(proj.fromDivPixelToLatLng(new maps.Point(pt.x, pt.y - shift)));
      } else {
        map.panTo(target);
      }
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
        className={cameraMoving ? 'rt-map-overlay rt-map-overlay--moving' : 'rt-map-overlay'}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}
      >
        {mappable.map((r) => {
          const pos = positions[r.id];
          if (!pos || !labelIds.has(r.id) || r.id === selectedId) return null;
          return (
            <button
              key={r.id}
              type="button"
              className="rt-map-marker-label"
              style={{ left: pos.x, top: pos.y }}
              title={r.name}
              onPointerDown={() => { suppressCloseRef.current = true; }}
              onClick={(e) => { e.stopPropagation(); handleSelect(r.id); }}
            >
              <span className="rt-map-marker-label__dot" aria-hidden />
              <span className="rt-map-marker-label__text">{truncateLabel(r.name)}</span>
            </button>
          );
        })}

        {clusters.map((c) => {
          const size = clusterBubbleSize(c.memberIds.length);
          return (
            <button
              key={c.id}
              type="button"
              className={c.id === openCluster?.id ? 'rt-map-cluster rt-map-cluster--open' : 'rt-map-cluster'}
              style={{ left: c.x, top: c.y, width: size, height: size }}
              aria-label={`${c.memberIds.length} restaurants here`}
              onPointerDown={() => { suppressCloseRef.current = true; }}
              onClick={(e) => { e.stopPropagation(); handleClusterClick(c); }}
            >
              {c.memberIds.length}
            </button>
          );
        })}

        {openCluster ? (
          <div
            key={openCluster.id}
            ref={clusterListRef}
            className={clusterListPlacement?.below ? 'rt-map-cluster-list rt-map-popover--below' : 'rt-map-cluster-list'}
            style={placementStyle(clusterListPlacement, openCluster)}
            onPointerDown={() => { suppressCloseRef.current = true; }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rt-map-cluster-list__header">
              {openCluster.memberIds.length} restaurants here
            </div>
            <ul className="rt-map-cluster-list__items">
              {mappable
                .filter((r) => openCluster.memberIds.includes(r.id))
                .map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="rt-map-cluster-list__item"
                      onClick={() => handleSelect(r.id)}
                    >
                      <span className="rt-map-cluster-list__name">{r.name}</span>
                      <span className="rt-map-cluster-list__meta">
                        {r.cuisine}
                        {r.averageRating ? (
                          <>
                            {' · '}
                            <StarFilled style={{ color: colors.accent[500] }} />{' '}
                            {r.averageRating.toFixed(1)}
                          </>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
            <div className="rt-map-marker-card-pointer" aria-hidden />
          </div>
        ) : null}

        {selectedRestaurant && selectedPos ? (
          <div
            key={selectedRestaurant.id}
            ref={popoverRef}
            className={popoverPlacement?.below ? 'rt-map-marker-popover rt-map-popover--below' : 'rt-map-marker-popover'}
            style={placementStyle(popoverPlacement, selectedPos)}
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
