'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Button, Segmented, Space, Typography } from 'antd';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VIRTUAL_ROOM_OVERALL_VIEW, browserMediaUrl } from '@reservations/shared';
import { colors } from './tokens';
import {
  SEAT_CLEARANCE_M,
  fitRoomToFurniture,
  openingsForOutline,
  rotatedRectCorners,
  type XZ,
} from './virtualRoomLayout';

export { VIRTUAL_ROOM_OVERALL_VIEW };

export type VirtualRoomTableData = {
  id: string;
  name: string;
  shape: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
  minCapacity: number;
  maxCapacity: number;
  photoUrl?: string | null;
  /** Default true — when false, guests cannot pick this table in 3D. */
  virtualRoomSelectable?: boolean | null;
  virtualRoomSelectionFeeEnabled?: boolean | null;
  virtualRoomSelectionFeeCents?: number | null;
};

export type VirtualRoomAreaPlacement = {
  floorArea: string;
  offsetXM: number;
  offsetYM: number;
  offsetZM: number;
};

export type VirtualRoomFixtureData = {
  id: string;
  name: string;
  kind: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
};

export type VirtualRoomAreaData = {
  name: string;
  wallHeightM: number;
  wallColor?: string | null;
  floorColor?: string | null;
  floorImageUrl?: string | null;
  panoramaUrl?: string | null;
  wallPhotoUrls: string[];
  /** World-space meters for overall multi-area placement. */
  offsetXM?: number;
  offsetYM?: number;
  offsetZM?: number;
  guestSelectable?: boolean | null;
  selectionFeeCharged?: boolean | null;
  selectionFeeCents?: number | null;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  tables: VirtualRoomTableData[];
  fixtures: VirtualRoomFixtureData[];
  rooms: Array<{ id: string; name: string; points: Array<{ x: number; y: number }> }>;
};

export type VirtualRoomSceneData = {
  metersPerCell: number;
  areaLayoutMode?: 'stack' | 'adjacent' | 'custom' | null;
  modelUrl?: string | null;
  modelTransform?: {
    scale: number;
    rotationDeg: number;
    offsetXM: number;
    offsetZM: number;
  } | null;
  areas: VirtualRoomAreaData[];
  /** Platform: who pays the 3D selection fee. */
  selectionFeePayer?: 'restaurant' | 'diner' | 'combined' | 'diner_share' | null;
  selectionFeeEnabled?: boolean | null;
  selectionFeeMode?: 'per_guest' | 'per_table' | null;
  selectionFeeUnitCents?: number | null;
  platformSelectionFeeUnitCents?: number | null;
  restaurantSelectionFeeUnitCents?: number | null;
  selectionFeeApplyTo?: 'all' | 'selected' | null;
};

export type VirtualRoomViewerProps = {
  scene: VirtualRoomSceneData;
  /** Controlled area name; falls back to the first area. */
  areaName?: string | null;
  onAreaChange?: (name: string) => void;
  /** `null` → no availability info (all tables neutral and clickable when `onSelectTable` is set). */
  availableTableIds?: string[] | null;
  /**
   * Per-table fill colors (e.g. live-floor status). When set, overrides the
   * available/taken palette. Selected tables keep their status color with a stronger glow.
   */
  tableColors?: Record<string, string> | null;
  /**
   * Ops / staff mode: any table is clickable when `onSelectTable` is set (ignores
   * guest-selectable policy and availability).
   */
  opsSelectMode?: boolean;
  /** Bottom-left legend chips. Defaults from availability when that mode is active. */
  statusLegend?: Array<{ color: string; label: string }> | null;
  /** Extra hover line under capacity (e.g. "Reserved · Jane"). */
  tableHoverDetails?: Record<string, string> | null;
  selectedTableId?: string | null;
  onSelectTable?: (tableId: string) => void;
  /**
   * Partner overall-view editing: drag floors to place them (sideways by default,
   * hold Shift to move up/down as stack levels).
   */
  placementEditable?: boolean;
  onAreaPlacementChange?: (placements: VirtualRoomAreaPlacement[]) => void;
  /** Show the reconstructed scan when the scene has one (first area only). */
  showModel?: boolean;
  /**
   * Floating name + capacity sprites above tables. Hover still shows details when off.
   * Defaults on for partner/ops; diners often turn this off when the room is crowded.
   */
  showTableLabels?: boolean;
  /** When set, shows a Names control in the viewer chrome (controlled via `showTableLabels`). */
  onShowTableLabelsChange?: (show: boolean) => void;
  height?: number | string;
  style?: CSSProperties;
  className?: string;
};

type TableVisual = {
  id: string;
  materials: THREE.MeshStandardMaterial[];
  hitMeshes: THREE.Object3D[];
};

type CameraPreset = 'overview' | 'top' | 'eye';

/** Partners often flip ft→m without changing the number; chairs and heights are fixed in meters. */
const MIN_METERS_PER_CELL = 0.25;
const MAX_METERS_PER_CELL = 1.2;

const WOOD = '#b08968';
const UNAVAILABLE = '#b9b4ab';
const CHAIR = '#5a554d';
const DEFAULT_WALL = '#ece6dc';
const DEFAULT_FLOOR = '#d9cfc1';

function resolveUrl(url: string) {
  return browserMediaUrl(url);
}

function hasWebGL() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    const list = Array.isArray(material) ? material : material ? [material] : [];
    for (const m of list) {
      for (const value of Object.values(m)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      m.dispose();
    }
  });
}

function labelSprite(title: string, subtitle: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 112;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(26, 24, 22, 0.78)';
  const r = 24;
  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 96, r);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '600 40px system-ui, -apple-system, sans-serif';
  ctx.fillText(title.slice(0, 12), 128, 52);
  ctx.font = '400 26px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(subtitle, 128, 88);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      depthWrite: false,
      transparent: true,
      sizeAttenuation: false,
    }),
  );
  sprite.scale.set(0.115, 0.05, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/** Seat positions in table-local space (meters, origin at table center). */
function seatPositions(shape: string, w: number, d: number, seats: number) {
  const out: Array<{ x: number; z: number }> = [];
  const gap = 0.32;
  if (shape === 'round') {
    const radius = Math.min(w, d) / 2 + gap;
    for (let i = 0; i < seats; i += 1) {
      const a = (i / seats) * Math.PI * 2;
      out.push({ x: Math.cos(a) * radius, z: Math.sin(a) * radius });
    }
    return out;
  }
  if (shape === 'bar') {
    for (let i = 0; i < seats; i += 1) {
      out.push({ x: -w / 2 + (w * (i + 0.5)) / seats, z: d / 2 + gap });
    }
    return out;
  }
  const square = Math.max(w, d) / Math.min(w, d) < 1.4;
  if (square && seats <= 4) {
    const sides = [
      { x: 0, z: -d / 2 - gap },
      { x: 0, z: d / 2 + gap },
      { x: -w / 2 - gap, z: 0 },
      { x: w / 2 + gap, z: 0 },
    ];
    return sides.slice(0, seats);
  }
  const alongX = w >= d;
  const len = alongX ? w : d;
  const half = alongX ? d / 2 : w / 2;
  const sideA = Math.ceil(seats / 2);
  const sideB = seats - sideA;
  const place = (count: number, sign: number) => {
    for (let i = 0; i < count; i += 1) {
      const t = -len / 2 + (len * (i + 0.5)) / count;
      out.push(alongX ? { x: t, z: sign * (half + gap) } : { x: sign * (half + gap), z: t });
    }
  };
  place(sideA, -1);
  place(sideB, 1);
  return out;
}

function buildChair(tall: boolean, material: THREE.Material) {
  const group = new THREE.Group();
  const seatH = tall ? 0.75 : 0.45;
  if (tall) {
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 20), material);
    stool.position.y = seatH;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, seatH, 10), material);
    leg.position.y = seatH / 2;
    group.add(stool, leg);
  } else {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), material);
    seat.position.y = seatH;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.05), material);
    back.position.set(0, seatH + 0.21, 0.19);
    group.add(seat, back);
    for (const [lx, lz] of [
      [-0.17, -0.17],
      [0.17, -0.17],
      [-0.17, 0.17],
      [0.17, 0.17],
    ] as const) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, seatH, 0.04), material);
      leg.position.set(lx, seatH / 2, lz);
      group.add(leg);
    }
  }
  group.traverse((o) => {
    o.castShadow = true;
  });
  return group;
}

function buildTable(
  table: VirtualRoomTableData,
  m: number,
  markersOnly: boolean,
  showLabel = true,
): { group: THREE.Group; visual: TableVisual } {
  const w = Math.max(0.4, table.width * m);
  const d = Math.max(0.4, table.height * m);
  const group = new THREE.Group();
  group.position.set((table.posX + table.width / 2) * m, 0, (table.posY + table.height / 2) * m);
  group.rotation.y = -THREE.MathUtils.degToRad(table.rotation || 0);
  group.userData.tableId = table.id;

  const shape = table.shape || 'rect';
  const round = shape === 'round';
  const tall = shape === 'high_top' || shape === 'bar';
  const topY = tall ? 1.05 : 0.75;
  const materials: THREE.MeshStandardMaterial[] = [];
  const hitMeshes: THREE.Object3D[] = [];

  if (markersOnly) {
    const mat = new THREE.MeshStandardMaterial({
      color: WOOD,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    materials.push(mat);
    const marker = round
      ? new THREE.Mesh(new THREE.CylinderGeometry(Math.min(w, d) / 2 + 0.3, Math.min(w, d) / 2 + 0.3, 0.06, 40), mat)
      : new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.06, d + 0.6), mat);
    marker.position.y = 0.04;
    marker.userData.tableId = table.id;
    hitMeshes.push(marker);
    group.add(marker);
  } else {
    const topMat = new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.6 });
    materials.push(topMat);
    const top = round
      ? new THREE.Mesh(new THREE.CylinderGeometry(Math.min(w, d) / 2, Math.min(w, d) / 2, 0.05, 40), topMat)
      : new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), topMat);
    top.position.y = topY;
    top.castShadow = true;
    top.receiveShadow = true;
    top.userData.tableId = table.id;
    hitMeshes.push(top);

    const legMat = new THREE.MeshStandardMaterial({ color: '#3d3a35', roughness: 0.5 });
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, topY, 12), legMat);
    leg.position.y = topY / 2;
    leg.castShadow = true;
    leg.userData.tableId = table.id;
    hitMeshes.push(leg);
    group.add(top, leg);

    const seatMat = new THREE.MeshStandardMaterial({ color: CHAIR, roughness: 0.8 });
    const seats = Math.max(1, Math.min(24, table.maxCapacity || 2));
    if (shape === 'booth' || shape === 'banquette') {
      const alongX = w >= d;
      const benchLen = alongX ? w : d;
      const sides = shape === 'booth' ? [-1, 1] : [-1];
      for (const sign of sides) {
        const bench = new THREE.Group();
        const seat = new THREE.Mesh(new THREE.BoxGeometry(benchLen, 0.45, 0.5), seatMat);
        seat.position.y = 0.225;
        const back = new THREE.Mesh(new THREE.BoxGeometry(benchLen, 0.6, 0.12), seatMat);
        back.position.set(0, 0.75, 0.25);
        bench.add(seat, back);
        const off = (alongX ? d : w) / 2 + 0.3;
        if (alongX) {
          bench.position.z = sign * off;
          bench.rotation.y = sign > 0 ? 0 : Math.PI;
        } else {
          bench.position.x = sign * off;
          bench.rotation.y = sign > 0 ? Math.PI / 2 : -Math.PI / 2;
        }
        bench.traverse((o) => {
          o.castShadow = true;
          o.userData.tableId = table.id;
        });
        hitMeshes.push(seat);
        group.add(bench);
      }
      if (shape === 'banquette') {
        const remaining = Math.max(0, seats - Math.ceil(seats / 2));
        for (let i = 0; i < remaining; i += 1) {
          const chair = buildChair(false, seatMat);
          const t = -benchLen / 2 + (benchLen * (i + 0.5)) / remaining;
          const pos = alongX ? { x: t, z: d / 2 + 0.32 } : { x: w / 2 + 0.32, z: t };
          chair.position.set(pos.x, 0, pos.z);
          chair.rotation.y = Math.atan2(pos.x, pos.z);
          group.add(chair);
        }
      }
    } else {
      for (const pos of seatPositions(shape, w, d, seats)) {
        const chair = buildChair(tall, seatMat);
        chair.position.set(pos.x, 0, pos.z);
        chair.rotation.y = Math.atan2(pos.x, pos.z);
        group.add(chair);
      }
    }
  }

  if (showLabel) {
    const label = labelSprite(
      table.name,
      table.minCapacity === table.maxCapacity
        ? `${table.maxCapacity} seats`
        : `${table.minCapacity}–${table.maxCapacity} seats`,
    );
    label.position.y = (markersOnly ? 0.9 : topY) + 0.6;
    label.userData.tableId = table.id;
    hitMeshes.push(label);
    group.add(label);
  }

  return { group, visual: { id: table.id, materials, hitMeshes } };
}

const DOOR_HEIGHT_M = 2.15;
const WINDOW_SILL_M = 0.92;
const WINDOW_HEIGHT_M = 1.15;
const TRIM = '#5c5148';
const DOOR_WOOD = '#8d6a45';

/** Doorway or window in local space: opening runs along X, inside of the room is +Z. */
function addOpeningPortal(
  parent: THREE.Group,
  kind: 'door' | 'window',
  openW: number,
  wallHeight: number,
) {
  const frameMat = new THREE.MeshStandardMaterial({ color: TRIM, roughness: 0.55 });
  const y0 = kind === 'door' ? 0 : Math.min(WINDOW_SILL_M, wallHeight * 0.45);
  const y1 =
    kind === 'door'
      ? Math.min(DOOR_HEIGHT_M, Math.max(1.6, wallHeight - 0.2))
      : Math.min(y0 + WINDOW_HEIGHT_M, wallHeight - 0.2);
  const h = Math.max(0.4, y1 - y0);
  const jamb = (x: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.07, h, 0.1), frameMat);
    mesh.position.set(x, y0 + h / 2, 0.02);
    mesh.castShadow = true;
    return mesh;
  };
  parent.add(jamb(-openW / 2), jamb(openW / 2));
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(openW + 0.07, 0.08, 0.1), frameMat);
  lintel.position.set(0, y1, 0.02);
  parent.add(lintel);
  if (kind === 'window') {
    const sill = lintel.clone();
    sill.position.y = y0;
    parent.add(sill);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.max(0.2, openW - 0.12), Math.max(0.2, h - 0.1)),
      new THREE.MeshStandardMaterial({
        color: '#c5dcea',
        transparent: true,
        opacity: 0.42,
        roughness: 0.05,
        metalness: 0.12,
        side: THREE.DoubleSide,
      }),
    );
    glass.position.set(0, y0 + h / 2, 0.02);
    const muntin = new THREE.Mesh(new THREE.BoxGeometry(0.035, h - 0.14, 0.04), frameMat);
    muntin.position.set(0, y0 + h / 2, 0.03);
    parent.add(glass, muntin);
    return;
  }
  const hinge = new THREE.Group();
  hinge.position.set(-openW / 2 + 0.04, y1 / 2, 0.02);
  hinge.rotation.y = -0.55;
  const panelW = Math.max(0.4, openW - 0.1);
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(panelW, h - 0.08, 0.04),
    new THREE.MeshStandardMaterial({ color: DOOR_WOOD, roughness: 0.5 }),
  );
  panel.position.set(panelW / 2, -0.02, 0);
  panel.castShadow = true;
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 12, 12),
    new THREE.MeshStandardMaterial({ color: '#e6d7b8', metalness: 0.35, roughness: 0.4 }),
  );
  knob.position.set(panelW - 0.14, 0, 0.04);
  panel.add(knob);
  hinge.add(panel);
  parent.add(hinge);
}

function buildFixture(f: VirtualRoomFixtureData, m: number, wallHeight: number, wallColor: string) {
  const w = Math.max(0.2, f.width * m);
  const d = Math.max(0.1, f.height * m);
  const group = new THREE.Group();
  group.position.set((f.posX + f.width / 2) * m, 0, (f.posY + f.height / 2) * m);
  group.rotation.y = -THREE.MathUtils.degToRad(f.rotation || 0);

  const box = (h: number, color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...opts }),
    );
    mesh.position.y = h / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  switch (f.kind) {
    case 'bar':
      group.add(box(1.1, '#6b4f3a'));
      break;
    case 'host_stand':
      group.add(box(1.1, '#433f39'));
      break;
    case 'kitchen':
      group.add(box(Math.min(2.4, wallHeight), '#c9c3b8'));
      break;
    case 'wall': {
      group.add(box(wallHeight, wallColor));
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.06, 0.14, d + 0.06),
        new THREE.MeshStandardMaterial({ color: '#b7aea3', roughness: 0.8 }),
      );
      base.position.y = 0.07;
      base.castShadow = true;
      group.add(base);
      break;
    }
    case 'door':
    case 'window': {
      const portal = new THREE.Group();
      const alongDepth = d > w;
      if (alongDepth) portal.rotation.y = Math.PI / 2;
      addOpeningPortal(portal, f.kind, Math.max(w, d), wallHeight);
      group.add(portal);
      break;
    }
    case 'plant': {
      const r = Math.min(w, d) / 2;
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.6, r * 0.45, 0.45, 16),
        new THREE.MeshStandardMaterial({ color: '#a0603a' }),
      );
      pot.position.y = 0.225;
      const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 12),
        new THREE.MeshStandardMaterial({ color: '#3f7d4e', roughness: 0.9 }),
      );
      leaves.position.y = 0.45 + r * 0.8;
      pot.castShadow = true;
      leaves.castShadow = true;
      group.add(pot, leaves);
      break;
    }
    default:
      group.add(box(0.9, '#a39e94'));
  }
  return group;
}

function addWallSpan(
  parent: THREE.Group,
  origin: XZ,
  dir: XZ,
  angle: number,
  span: { s0: number; s1: number; y0: number; y1: number },
  material: THREE.Material,
) {
  const width = span.s1 - span.s0;
  const height = span.y1 - span.y0;
  if (width < 0.04 || height < 0.04) return;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  const mid = span.s0 + width / 2;
  mesh.position.set(origin.x + dir.x * mid, span.y0 + height / 2, origin.z + dir.z * mid);
  mesh.rotation.y = angle;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

/** Wall planes facing inward. Doors and windows near an edge become openings. */
function buildWalls(
  outline: Array<{ x: number; z: number }>,
  height: number,
  color: string,
  photos: THREE.Texture[],
  fixtures: VirtualRoomFixtureData[],
  m: number,
) {
  const group = new THREE.Group();
  const usedIds = new Set<string>();
  const cx = outline.reduce((s, p) => s + p.x, 0) / outline.length;
  const cz = outline.reduce((s, p) => s + p.z, 0) / outline.length;
  const openings = openingsForOutline(
    outline,
    fixtures
      .filter((f) => f.kind === 'door' || f.kind === 'window')
      .map((f) => ({
        id: f.id,
        kind: f.kind as 'door' | 'window',
        center: { x: (f.posX + f.width / 2) * m, z: (f.posY + f.height / 2) * m },
        halfW: Math.max(0.2, f.width * m) / 2,
        halfD: Math.max(0.15, f.height * m) / 2,
        rotationDeg: f.rotation || 0,
      })),
  );
  outline.forEach((a, i) => {
    const b = outline[(i + 1) % outline.length]!;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 0.05) return;
    const dir = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
    const photo = photos.length ? photos[i % photos.length] : null;
    const mat = new THREE.MeshStandardMaterial({
      color: photo ? '#ffffff' : color,
      map: photo ?? null,
      roughness: 0.9,
      side: THREE.FrontSide,
    });
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    let angle = Math.atan2(b.x - a.x, b.z - a.z) - Math.PI / 2;
    const normal = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    if (normal.dot(new THREE.Vector3(cx - mx, 0, cz - mz)) < 0) angle += Math.PI;
    const cuts = openings[i] ?? [];
    const doorTop = Math.min(DOOR_HEIGHT_M, Math.max(1.6, height - 0.2));
    const winSill = Math.min(WINDOW_SILL_M, height * 0.45);
    const winTop = Math.min(winSill + WINDOW_HEIGHT_M, height - 0.2);
    const spans: Array<{ s0: number; s1: number; y0: number; y1: number }> = [];
    let cursor = 0;
    for (const cut of cuts) {
      const s0 = cut.along - cut.width / 2;
      const s1 = cut.along + cut.width / 2;
      if (s0 > cursor + 0.02) spans.push({ s0: cursor, s1: s0, y0: 0, y1: height });
      if (cut.kind === 'door') {
        if (height - doorTop > 0.05) spans.push({ s0, s1, y0: doorTop, y1: height });
      } else {
        spans.push({ s0, s1, y0: 0, y1: winSill });
        if (height - winTop > 0.05) spans.push({ s0, s1, y0: winTop, y1: height });
      }
      cursor = s1;
      usedIds.add(cut.id);
      const portal = new THREE.Group();
      portal.position.set(a.x + dir.x * cut.along, 0, a.z + dir.z * cut.along);
      portal.rotation.y = angle;
      addOpeningPortal(portal, cut.kind, cut.width, height);
      group.add(portal);
    }
    if (len - cursor > 0.02) spans.push({ s0: cursor, s1: len, y0: 0, y1: height });
    for (const span of spans) addWallSpan(group, a, dir, angle, span, mat);
  });
  return { group, usedIds };
}

export function VirtualRoomViewer({
  scene: data,
  areaName,
  onAreaChange,
  availableTableIds = null,
  tableColors = null,
  opsSelectMode = false,
  statusLegend = null,
  tableHoverDetails = null,
  selectedTableId = null,
  onSelectTable,
  placementEditable = false,
  onAreaPlacementChange,
  showModel = true,
  showTableLabels = true,
  onShowTableLabelsChange,
  height = 480,
  style,
  className,
}: VirtualRoomViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const tablesRef = useRef<Map<string, TableVisual>>(new Map());
  const hitListRef = useRef<THREE.Object3D[]>([]);
  const areaDragTargetsRef = useRef<THREE.Object3D[]>([]);
  const areaWrappersRef = useRef<Map<string, THREE.Group>>(new Map());
  const campusRootRef = useRef<THREE.Group | null>(null);
  const extentRef = useRef({ w: 10, d: 8, h: 4, midY: 0 });
  const placementEditableRef = useRef(placementEditable);
  placementEditableRef.current = placementEditable;
  const onPlacementChangeRef = useRef(onAreaPlacementChange);
  onPlacementChangeRef.current = onAreaPlacementChange;
  const [webglOk] = useState(hasWebGL);
  const [hovered, setHovered] = useState<{ id: string; x: number; y: number } | null>(null);
  const [preset, setPreset] = useState<CameraPreset>('overview');
  const [modelState, setModelState] = useState<'none' | 'loading' | 'ready'>('none');
  const [failedModelUrl, setFailedModelUrl] = useState<string | null>(null);
  const presetRef = useRef<CameraPreset>('overview');
  presetRef.current = preset;
  const modelRef = useRef<{ holder: THREE.Group; fit: number; cx: number; cz: number } | null>(
    null,
  );
  const transformRef = useRef(data.modelTransform);
  transformRef.current = data.modelTransform;

  const areas = data.areas;
  const defaultArea =
    areas.length > 1 ? VIRTUAL_ROOM_OVERALL_VIEW : (areas[0]?.name ?? null);
  const [localArea, setLocalArea] = useState<string | null>(null);
  const activeAreaName = areaName ?? localArea ?? defaultArea;
  const isOverall =
    activeAreaName === VIRTUAL_ROOM_OVERALL_VIEW ||
    (areas.length > 1 && activeAreaName == null);
  const area = isOverall
    ? null
    : (areas.find((a) => a.name === activeAreaName) ?? areas[0] ?? null);
  const visibleAreas = useMemo(
    () => (isOverall ? areas : area ? [area] : []),
    [isOverall, areas, area],
  );
  const available = useMemo(
    () => (availableTableIds ? new Set(availableTableIds) : null),
    [availableTableIds],
  );
  // Serialize so status flips always re-paint even if the parent reuses the object identity.
  const tableColorsKey = tableColors ? JSON.stringify(tableColors) : '';
  const colorByTable = useMemo(
    () => (tableColorsKey ? new Map(Object.entries(JSON.parse(tableColorsKey) as Record<string, string>)) : null),
    [tableColorsKey],
  );
  const colorByTableRef = useRef(colorByTable);
  colorByTableRef.current = colorByTable;
  const selectableByPolicy = useMemo(() => {
    const allowed = new Set<string>();
    for (const a of areas) {
      if (a.guestSelectable === false) continue;
      for (const t of a.tables) {
        if (t.virtualRoomSelectable === false) continue;
        allowed.add(t.id);
      }
    }
    return allowed;
  }, [areas]);
  const stateRef = useRef({
    available,
    selectedTableId,
    onSelectTable,
    selectableByPolicy,
    opsSelectMode,
  });
  stateRef.current = {
    available,
    selectedTableId,
    onSelectTable,
    selectableByPolicy,
    opsSelectMode,
  };

  const isSelectable = useCallback(
    (id: string) => {
      if (!onSelectTable) return false;
      if (opsSelectMode) return true;
      return selectableByPolicy.has(id) && (!available || available.has(id));
    },
    [available, onSelectTable, opsSelectMode, selectableByPolicy],
  );
  const isModelArea = Boolean(
    !isOverall && area && areas[0] && area.name === areas[0].name,
  );
  const requestedModelUrl = showModel && isModelArea && data.modelUrl ? data.modelUrl : null;
  const modelUrl = requestedModelUrl && requestedModelUrl !== failedModelUrl ? requestedModelUrl : null;
  const modelFailed = Boolean(requestedModelUrl && requestedModelUrl === failedModelUrl);

  const applyModelTransform = useCallback(() => {
    const entry = modelRef.current;
    if (!entry) return;
    const t = transformRef.current;
    entry.holder.scale.setScalar(entry.fit * (t?.scale ?? 1));
    entry.holder.rotation.y = THREE.MathUtils.degToRad(t?.rotationDeg ?? 0);
    entry.holder.position.set(entry.cx + (t?.offsetXM ?? 0), 0, entry.cz + (t?.offsetZM ?? 0));
  }, []);

  const applyCamera = useCallback((which: CameraPreset) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const { w, d, h, midY } = extentRef.current;
    const span = Math.max(w, d, h, 4);
    const targetY = which === 'eye' ? midY + 0.9 : midY;
    controls.target.set(0, targetY, 0);
    if (which === 'top') camera.position.set(0, midY + span * 1.45, 0.01);
    else if (which === 'eye')
      camera.position.set(0, midY + 1.6, Math.max(d / 2 + 1, 4.5));
    else camera.position.set(span * 0.6, midY + span * 0.55, span * 0.9);
    controls.maxDistance = Math.max(120, span * 4);
    controls.update();
  }, []);

  // Renderer / camera / controls lifecycle.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !webglOk) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(mount.clientWidth || 1, mount.clientHeight || 1);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.neutral[50]);
    const camera = new THREE.PerspectiveCamera(
      50,
      (mount.clientWidth || 1) / (mount.clientHeight || 1),
      0.05,
      500,
    );
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    // Allow looking slightly past horizontal so stacked floors stay reachable.
    controls.maxPolarAngle = Math.PI * 0.92;
    controls.minPolarAngle = 0.05;
    controls.screenSpacePanning = true;
    controls.enablePan = true;
    controls.panSpeed = 1.1;
    controls.minDistance = 0.3;
    controls.maxDistance = 400;

    scene.add(new THREE.HemisphereLight('#ffffff', '#c8bfb2', 1.6));
    const sun = new THREE.DirectionalLight('#fff6e8', 1.6);
    sun.position.set(8, 16, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    scene.add(sun);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    const resize = new ResizeObserver(() => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resize.observe(mount);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const setPointer = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return rect;
    };
    const pickTable = (ev: PointerEvent) => {
      const rect = setPointer(ev);
      const hit = raycaster.intersectObjects(hitListRef.current, false)[0];
      let obj: THREE.Object3D | null = hit?.object ?? null;
      while (obj && !obj.userData.tableId) obj = obj.parent;
      return {
        id: (obj?.userData.tableId as string | undefined) ?? null,
        x: ev.clientX - rect.left,
        y: ev.clientY - rect.top,
      };
    };
    const pickAreaWrapper = (ev: PointerEvent) => {
      setPointer(ev);
      const hit = raycaster.intersectObjects(areaDragTargetsRef.current, true)[0];
      let obj: THREE.Object3D | null = hit?.object ?? null;
      while (obj && !obj.userData.areaWrapper) obj = obj.parent;
      return (obj as THREE.Group | null) ?? null;
    };

    let downAt: { x: number; y: number } | null = null;
    let moveFrame = 0;
    let drag:
      | {
          wrapper: THREE.Group;
          floorArea: string;
          mode: 'xz' | 'y';
          plane: THREE.Plane;
          offset: THREE.Vector3;
        }
      | null = null;
    const dragPlanePoint = new THREE.Vector3();
    const localPoint = new THREE.Vector3();

    const toLocal = (world: THREE.Vector3) => {
      const root = campusRootRef.current;
      if (!root) return world.clone();
      return root.worldToLocal(world.clone());
    };

    const onDown = (ev: PointerEvent) => {
      downAt = { x: ev.clientX, y: ev.clientY };
      if (!placementEditableRef.current || ev.button !== 0) return;
      const wrapper = pickAreaWrapper(ev);
      if (!wrapper?.userData.floorArea) return;
      const mode: 'xz' | 'y' = ev.shiftKey ? 'y' : 'xz';
      const worldPos = wrapper.getWorldPosition(new THREE.Vector3());
      const plane =
        mode === 'y'
          ? new THREE.Plane(new THREE.Vector3(0, 0, 1), -worldPos.z)
          : new THREE.Plane(new THREE.Vector3(0, 1, 0), -worldPos.y);
      setPointer(ev);
      if (!raycaster.ray.intersectPlane(plane, dragPlanePoint)) return;
      const localHit = toLocal(dragPlanePoint);
      drag = {
        wrapper,
        floorArea: String(wrapper.userData.floorArea),
        mode,
        plane,
        offset: localHit.sub(wrapper.position),
      };
      controls.enabled = false;
      renderer.domElement.style.cursor = 'move';
      ev.preventDefault();
    };
    const onUp = (ev: PointerEvent) => {
      if (drag) {
        const placements = [...areaWrappersRef.current.entries()].map(([floorArea, group]) => ({
          floorArea,
          offsetXM: Math.round(group.position.x * 20) / 20,
          offsetYM: Math.max(0, Math.round(group.position.y * 20) / 20),
          offsetZM: Math.round(group.position.z * 20) / 20,
        }));
        onPlacementChangeRef.current?.(placements);
        drag = null;
        controls.enabled = true;
        downAt = null;
        return;
      }
      if (!downAt) return;
      const moved = Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y);
      downAt = null;
      if (moved > 6) return;
      const { id } = pickTable(ev);
      const {
        available: avail,
        onSelectTable: select,
        selectableByPolicy: policy,
        opsSelectMode: opsMode,
      } = stateRef.current;
      const canPick = Boolean(
        id && select && (opsMode || (policy.has(id) && (!avail || avail.has(id)))),
      );
      if (canPick && id) select?.(id);
    };
    const onMove = (ev: PointerEvent) => {
      if (drag) {
        setPointer(ev);
        if (raycaster.ray.intersectPlane(drag.plane, dragPlanePoint)) {
          localPoint.copy(toLocal(dragPlanePoint)).sub(drag.offset);
          if (drag.mode === 'y') {
            drag.wrapper.position.y = Math.max(0, localPoint.y);
          } else {
            drag.wrapper.position.x = localPoint.x;
            drag.wrapper.position.z = localPoint.z;
          }
        }
        renderer.domElement.style.cursor = 'move';
        return;
      }
      if (moveFrame) return;
      moveFrame = requestAnimationFrame(() => {
        moveFrame = 0;
        const { id, x, y } = pickTable(ev);
        const {
          available: avail,
          onSelectTable: select,
          selectableByPolicy: policy,
          opsSelectMode: opsMode,
        } = stateRef.current;
        const canPick = Boolean(
          id && select && (opsMode || (policy.has(id) && (!avail || avail.has(id)))),
        );
        const canDrag =
          placementEditableRef.current && Boolean(pickAreaWrapper(ev)?.userData.floorArea);
        renderer.domElement.style.cursor = canPick ? 'pointer' : canDrag ? 'move' : 'grab';
        setHovered((prev) => {
          if (!id) return prev ? null : prev;
          if (prev?.id === id && Math.abs(prev.x - x) < 4 && Math.abs(prev.y - y) < 4) return prev;
          return { id, x, y };
        });
      });
    };
    const onLeave = () => {
      if (drag) {
        drag = null;
        controls.enabled = true;
      }
      setHovered(null);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerleave', onLeave);

    return () => {
      cancelAnimationFrame(moveFrame);
      resize.disconnect();
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      controls.dispose();
      if (scene.background instanceof THREE.Texture) scene.background.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, [webglOk]);

  // Area content (rebuilt when the scene or area selection changes).
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || visibleAreas.length === 0) return;
    let cancelled = false;
    const m = THREE.MathUtils.clamp(
      data.metersPerCell || 0.6,
      MIN_METERS_PER_CELL,
      MAX_METERS_PER_CELL,
    );
    const root = new THREE.Group();
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const loadTexture = (url: string, onLoad?: (t: THREE.Texture) => void) => {
      const tex = loader.load(resolveUrl(url), (t) => {
        if (cancelled) return;
        onLoad?.(t);
      });
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const visuals = new Map<string, TableVisual>();
    const hits: THREE.Object3D[] = [];
    const dragTargets: THREE.Object3D[] = [];
    const wrappers = new Map<string, THREE.Group>();
    let worldMinX = Infinity;
    let worldMaxX = -Infinity;
    let worldMinY = Infinity;
    let worldMaxY = -Infinity;
    let worldMinZ = Infinity;
    let worldMaxZ = -Infinity;
    let panorama: THREE.Texture | null = null;
    const singlePanorama = !isOverall && visibleAreas[0]?.panoramaUrl;

    for (const current of visibleAreas) {
      const group = new THREE.Group();
      const pad = 1;
      let minX = (current.bounds.minX - pad) * m;
      let minZ = (current.bounds.minY - pad) * m;
      let maxX = (current.bounds.maxX + pad) * m;
      let maxZ = (current.bounds.maxY + pad) * m;
      const markersOnly = Boolean(modelUrl) && areas[0]?.name === current.name && !isOverall;

      const roomItems = [
        ...current.tables.map((t) => ({
          id: t.id,
          center: { x: (t.posX + t.width / 2) * m, z: (t.posY + t.height / 2) * m },
          corners: rotatedRectCorners(
            (t.posX + t.width / 2) * m,
            (t.posY + t.height / 2) * m,
            Math.max(0.4, t.width * m) / 2,
            Math.max(0.4, t.height * m) / 2,
            t.rotation || 0,
            SEAT_CLEARANCE_M,
          ),
        })),
        ...current.fixtures
          .filter((f) => f.kind !== 'wall' && f.kind !== 'door' && f.kind !== 'window')
          .map((f) => ({
            id: f.id,
            center: { x: (f.posX + f.width / 2) * m, z: (f.posY + f.height / 2) * m },
            corners: rotatedRectCorners(
              (f.posX + f.width / 2) * m,
              (f.posY + f.height / 2) * m,
              Math.max(0.2, f.width * m) / 2,
              Math.max(0.1, f.height * m) / 2,
              f.rotation || 0,
              0.05,
            ),
          })),
      ];
      const drawnOutlines: XZ[][] = current.rooms
        .filter((r) => r.points.length >= 3)
        .map((r) => r.points.map((p) => ({ x: p.x * m, z: p.y * m })));
      const fitted = markersOnly
        ? null
        : fitRoomToFurniture({ minX, minZ, maxX, maxZ, outlines: drawnOutlines, items: roomItems });
      if (fitted) {
        minX = fitted.minX;
        minZ = fitted.minZ;
        maxX = fitted.maxX;
        maxZ = fitted.maxZ;
      }
      const w = Math.max(2, maxX - minX);
      const d = Math.max(2, maxZ - minZ);
      const cx = (minX + maxX) / 2;
      const cz = (minZ + maxZ) / 2;
      group.position.set(-cx, 0, -cz);

      const wallColor = current.wallColor || DEFAULT_WALL;
      const usedOpeningIds = new Set<string>();
      const wallHeight = current.wallHeightM || 3;

      if (!markersOnly) {
        const floorMat = new THREE.MeshStandardMaterial({
          color: current.floorImageUrl ? '#ffffff' : current.floorColor || DEFAULT_FLOOR,
          roughness: 0.95,
          map: current.floorImageUrl ? loadTexture(current.floorImageUrl) : null,
        });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(cx, 0, cz);
        floor.receiveShadow = true;
        floor.userData.areaDrag = true;
        group.add(floor);
        dragTargets.push(floor);

        if (!singlePanorama || isOverall) {
          const photos = current.wallPhotoUrls.slice(0, 8).map((u) => loadTexture(u));
          const outlines = fitted?.outlines.length
            ? fitted.outlines
            : [
                [
                  { x: minX, z: minZ },
                  { x: maxX, z: minZ },
                  { x: maxX, z: maxZ },
                  { x: minX, z: maxZ },
                ],
              ];
          for (const outline of outlines) {
            const built = buildWalls(outline, wallHeight, wallColor, photos, current.fixtures, m);
            built.usedIds.forEach((id) => usedOpeningIds.add(id));
            group.add(built.group);
          }
        }
      } else {
        const shadowFloor = new THREE.Mesh(
          new THREE.PlaneGeometry(w, d),
          new THREE.ShadowMaterial({ opacity: 0.18 }),
        );
        shadowFloor.rotation.x = -Math.PI / 2;
        shadowFloor.position.set(cx, 0.001, cz);
        shadowFloor.receiveShadow = true;
        group.add(shadowFloor);
      }

      for (const f of current.fixtures) {
        if (usedOpeningIds.has(f.id)) continue;
        if (markersOnly && f.kind !== 'door' && f.kind !== 'window') continue;
        group.add(buildFixture(f, m, wallHeight, wallColor));
      }

      for (const t of current.tables) {
        const built = buildTable(t, m, markersOnly, showTableLabels);
        visuals.set(t.id, built.visual);
        hits.push(...built.visual.hitMeshes);
        group.add(built.group);
      }

      if (!isOverall && current.name === areas[0]?.name && modelUrl) {
        setModelState('loading');
        new GLTFLoader()
          .loadAsync(resolveUrl(modelUrl))
          .then((gltf) => {
            if (cancelled) {
              disposeObject(gltf.scene);
              return;
            }
            const gltfRoot = gltf.scene;
            const box = new THREE.Box3().setFromObject(gltfRoot);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const holder = new THREE.Group();
            gltfRoot.position.set(-center.x, -box.min.y, -center.z);
            gltfRoot.traverse((o) => {
              o.receiveShadow = true;
            });
            holder.add(gltfRoot);
            group.add(holder);
            modelRef.current = {
              holder,
              fit: Math.max(w, d) / Math.max(size.x, size.z, 0.001),
              cx,
              cz,
            };
            applyModelTransform();
            setModelState('ready');
          })
          .catch(() => {
            if (cancelled) return;
            setModelState('none');
            setFailedModelUrl(modelUrl);
          });
      }

      // Area label in overall view so guests can tell floors / wings apart.
      if (isOverall) {
        const tag = labelSprite(current.name, 'area');
        tag.position.set(cx, wallHeight + 0.4, cz);
        group.add(tag);
      }

      const ox = current.offsetXM ?? 0;
      const oy = current.offsetYM ?? 0;
      const oz = current.offsetZM ?? 0;
      const wrapper = new THREE.Group();
      wrapper.position.set(ox, oy, oz);
      wrapper.userData.areaWrapper = true;
      wrapper.userData.floorArea = current.name;
      wrapper.add(group);
      root.add(wrapper);
      wrappers.set(current.name, wrapper);

      worldMinX = Math.min(worldMinX, ox - w / 2);
      worldMaxX = Math.max(worldMaxX, ox + w / 2);
      worldMinY = Math.min(worldMinY, oy);
      worldMaxY = Math.max(worldMaxY, oy + wallHeight);
      worldMinZ = Math.min(worldMinZ, oz - d / 2);
      worldMaxZ = Math.max(worldMaxZ, oz + d / 2);
    }

    const spanW = Math.max(2, worldMaxX - worldMinX);
    const spanD = Math.max(2, worldMaxZ - worldMinZ);
    const spanH = Math.max(2, worldMaxY - worldMinY);
    const midX = (worldMinX + worldMaxX) / 2;
    const midY = (worldMinY + worldMaxY) / 2;
    const midZ = (worldMinZ + worldMaxZ) / 2;
    // Center XZ so orbit stays on the campus; keep absolute Y so placement offsets stay meters.
    // Camera presets aim at midY so tall stacks stay in frame.
    extentRef.current = {
      w: Math.max(spanW, 2),
      d: Math.max(spanD, 2),
      h: Math.max(spanH, 2),
      midY,
    };
    root.position.set(-midX, 0, -midZ);

    if (singlePanorama && visibleAreas[0]?.panoramaUrl) {
      panorama = loadTexture(visibleAreas[0].panoramaUrl, (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        if (scene.background instanceof THREE.Texture) scene.background.dispose();
        scene.background = tex;
      });
    } else {
      if (scene.background instanceof THREE.Texture) scene.background.dispose();
      scene.background = new THREE.Color(colors.neutral[50]);
    }

    if (!modelUrl) setModelState('none');

    scene.add(root);
    campusRootRef.current = root;
    tablesRef.current = visuals;
    hitListRef.current = hits;
    areaDragTargetsRef.current = dragTargets;
    areaWrappersRef.current = wrappers;
    // Paint status colors immediately — the color effect can run before tablesRef is set.
    const statusMap = colorByTableRef.current;
    if (statusMap) {
      for (const [id, visual] of visuals) {
        const statusColor = statusMap.get(id);
        if (!statusColor) continue;
        for (const mat of visual.materials) {
          mat.color.set(statusColor);
          mat.needsUpdate = true;
        }
      }
    }
    applyCamera(presetRef.current);
    setHovered(null);

    return () => {
      cancelled = true;
      scene.remove(root);
      disposeObject(root);
      if (panorama && scene.background !== panorama) panorama.dispose();
      modelRef.current = null;
      tablesRef.current = new Map();
      hitListRef.current = [];
      areaDragTargetsRef.current = [];
      areaWrappersRef.current = new Map();
      campusRootRef.current = null;
    };
  }, [
    visibleAreas,
    isOverall,
    areas,
    data.metersPerCell,
    modelUrl,
    showTableLabels,
    applyCamera,
    applyModelTransform,
  ]);

  useEffect(() => {
    applyModelTransform();
  }, [data.modelTransform, applyModelTransform]);

  const paintTables = useCallback(() => {
    const statusMap = colorByTableRef.current;
    for (const [id, visual] of tablesRef.current) {
      const selected = id === selectedTableId;
      const statusColor = statusMap?.get(id);
      const isAvailable = !available || available.has(id);
      const color = statusColor
        ? statusColor
        : selected
          ? colors.accent[500]
          : available
            ? isAvailable
              ? colors.success
              : UNAVAILABLE
            : WOOD;
      for (const mat of visual.materials) {
        mat.color.set(color);
        mat.emissive.set(selected || hovered?.id === id ? color : '#000000');
        mat.emissiveIntensity = selected
          ? statusColor
            ? 0.45
            : 0.35
          : hovered?.id === id && isSelectable(id)
            ? 0.2
            : 0;
        mat.needsUpdate = true;
      }
    }
  }, [available, hovered, isSelectable, selectedTableId]);

  // Table colors follow status / availability / selection / hover without rebuilding the scene.
  useEffect(() => {
    paintTables();
  }, [paintTables, tableColorsKey, visibleAreas, modelState]);

  const hoveredTable = hovered
    ? visibleAreas.flatMap((a) => a.tables).find((t) => t.id === hovered.id)
    : null;

  if (!webglOk) {
    return (
      <div
        className={className}
        style={{
          height,
          display: 'grid',
          placeItems: 'center',
          background: colors.neutral[50],
          borderRadius: 12,
          ...style,
        }}
      >
        <Typography.Text type="secondary">
          Your browser can&apos;t show 3D views. Pick a table from the list instead.
        </Typography.Text>
      </div>
    );
  }

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      <div
        ref={mountRef}
        style={{
          height,
          width: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          background: colors.neutral[50],
        }}
        aria-label="3D view of the dining room"
        role="img"
      />

      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          {areas.length > 1 ? (
            <Segmented
              size="small"
              value={isOverall ? VIRTUAL_ROOM_OVERALL_VIEW : (area?.name ?? areas[0]?.name)}
              options={[
                { value: VIRTUAL_ROOM_OVERALL_VIEW, label: 'Overall' },
                ...areas.map((a) => ({ value: a.name, label: a.name })),
              ]}
              onChange={(v) => {
                const next = String(v);
                setLocalArea(next);
                onAreaChange?.(next);
              }}
            />
          ) : null}
        </div>
        <Space size={4} style={{ pointerEvents: 'auto' }} wrap>
          {onShowTableLabelsChange ? (
            <Button
              size="small"
              type={showTableLabels ? 'primary' : 'default'}
              onClick={() => onShowTableLabelsChange(!showTableLabels)}
              aria-pressed={showTableLabels}
            >
              Names
            </Button>
          ) : null}
          {(
            [
              ['overview', 'Overview'],
              ['top', 'Top'],
              ['eye', 'Eye level'],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              size="small"
              type={preset === key ? 'primary' : 'default'}
              onClick={() => {
                setPreset(key);
                applyCamera(key);
              }}
            >
              {label}
            </Button>
          ))}
        </Space>
      </div>

      {statusLegend?.length || available || placementEditable ? (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            display: 'flex',
            gap: 12,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.9)',
            fontSize: 12,
            flexWrap: 'wrap',
            maxWidth: '70%',
          }}
        >
          {statusLegend?.length
            ? statusLegend.map(({ color: c, label }) => (
                <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                  {label}
                </span>
              ))
            : available
              ? [
                  [colors.success, 'Available — click to select'],
                  [UNAVAILABLE, 'Taken'],
                  [colors.accent[500], 'Selected'],
                ].map(([c, label]) => (
                  <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                    {label}
                  </span>
                ))
              : null}
          {placementEditable ? (
            <span style={{ color: colors.neutral[700] }}>
              Drag floors to place · Shift+drag for up/down · right-drag to pan
            </span>
          ) : null}
        </div>
      ) : null}

      {modelState === 'loading' ? (
        <div style={{ position: 'absolute', bottom: 12, right: 12, fontSize: 12 }}>
          <Typography.Text type="secondary">Loading 3D scan…</Typography.Text>
        </div>
      ) : modelFailed ? (
        <div style={{ position: 'absolute', bottom: 12, right: 12, fontSize: 12 }}>
          <Typography.Text type="warning">3D scan unavailable — showing floor plan</Typography.Text>
        </div>
      ) : null}

      {hovered && hoveredTable ? (
        <div
          style={{
            position: 'absolute',
            left: hovered.x + 14,
            top: hovered.y + 14,
            pointerEvents: 'none',
            padding: '6px 10px',
            borderRadius: 8,
            background: 'rgba(26,24,22,0.88)',
            color: '#fff',
            fontSize: 12,
            whiteSpace: 'nowrap',
          }}
        >
          <strong>{hoveredTable.name}</strong> · {hoveredTable.minCapacity}–{hoveredTable.maxCapacity}{' '}
          guests
          {tableHoverDetails?.[hoveredTable.id]
            ? ` · ${tableHoverDetails[hoveredTable.id]}`
            : available && !available.has(hoveredTable.id)
              ? ' · not available'
              : ''}
        </div>
      ) : null}
    </div>
  );
}

export default VirtualRoomViewer;
