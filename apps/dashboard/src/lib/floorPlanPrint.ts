import type { FloorPlanScale, FloorRoom } from '@reservations/shared';
import { formatCellLength, tableShapeLabel } from '@reservations/shared';
import type { FloorFixture, FloorTable } from './floorPlanEditor';
import { roomPathD } from './floorPlanEditor';
import {
  floorGridLineColor,
  resolveFloorBackgroundColor,
  shapeAccent,
  shapeBorderRadius,
} from './floorPlanCanvas';

type PrintArgs = {
  restaurantName: string;
  areaFilter?: string;
  tables: FloorTable[];
  fixtures: FloorFixture[];
  rooms: FloorRoom[];
  backgroundUrl: string | null;
  backgroundColor?: string | null;
  scale: FloorPlanScale;
};

export function printFloorPlanLayout(args: PrintArgs) {
  const {
    restaurantName,
    areaFilter,
    tables,
    fixtures,
    rooms,
    backgroundUrl,
    backgroundColor,
    scale,
  } = args;

  const visibleTables = tables.filter(
    (t) => t.active && (!areaFilter || t.floorArea === areaFilter),
  );
  const visibleFixtures = fixtures.filter(
    (f) => !areaFilter || f.floorArea === areaFilter,
  );
  const visibleRooms = rooms.filter(
    (r) => !areaFilter || r.floorArea === areaFilter,
  );

  if (!visibleTables.length && !visibleFixtures.length && !visibleRooms.length) {
    throw new Error('Nothing to print in this area');
  }

  let maxX = 8;
  let maxY = 6;
  for (const t of visibleTables) {
    maxX = Math.max(maxX, t.posX + t.width);
    maxY = Math.max(maxY, t.posY + t.height);
  }
  for (const f of visibleFixtures) {
    maxX = Math.max(maxX, f.posX + f.width);
    maxY = Math.max(maxY, f.posY + f.height);
  }
  for (const r of visibleRooms) {
    for (const p of r.points) {
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }

  const cell = 36;
  const width = Math.ceil(maxX) * cell;
  const height = Math.ceil(maxY) * cell;
  const title = `${restaurantName}${areaFilter ? ` · ${areaFilter}` : ''} — Floor plan`;
  const bgUrlCss = backgroundUrl ? cssUrl(backgroundUrl) : null;
  const bgColor = resolveFloorBackgroundColor(backgroundColor);
  const gridLine = floorGridLineColor(backgroundColor);

  const roomSvg = visibleRooms
    .map((r) => {
      if (!r.points.length) return '';
      const d = roomPathD(r.points, cell);
      const labelX = r.points[0]!.x * cell + 8;
      const labelY = r.points[0]!.y * cell + 18;
      return `<path d="${d}" fill="rgba(11,61,46,0.08)" stroke="#0b3d2e" stroke-width="2" stroke-dasharray="6 4"></path>
        <text x="${labelX}" y="${labelY}" fill="#0b3d2e" font-size="12" font-family="system-ui,sans-serif">${escapeHtml(r.name)}</text>`;
    })
    .join('');

  const fixtureHtml = visibleFixtures
    .map((f) => {
      return `<div style="position:absolute;left:${f.posX * cell}px;top:${f.posY * cell}px;width:${f.width * cell}px;height:${f.height * cell}px;transform:rotate(${f.rotation || 0}deg);border:1px dashed #78716c;background:rgba(120,113,108,0.2);display:flex;align-items:center;justify-content:center;font:11px system-ui,sans-serif;color:#444;box-sizing:border-box;">${escapeHtml(f.name)}</div>`;
    })
    .join('');

  const tableHtml = visibleTables
    .map((t) => {
      const radius = shapeBorderRadius(t.shape);
      const radiusCss = typeof radius === 'number' ? `${radius}px` : radius;
      const accent = shapeAccent(t.shape);
      const shadowCss = accent ? `box-shadow:${accent};` : '';
      const sizeLabel = `${formatCellLength(scale, t.width)} × ${formatCellLength(scale, t.height)}`;
      return `<div style="position:absolute;left:${t.posX * cell}px;top:${t.posY * cell}px;width:${t.width * cell}px;height:${t.height * cell}px;transform:rotate(${t.rotation || 0}deg);border:2px solid #0b3d2e;background:#f4faf7;border-radius:${radiusCss};${shadowCss}display:flex;flex-direction:column;align-items:center;justify-content:center;font:12px system-ui,sans-serif;box-sizing:border-box;padding:4px;text-align:center;overflow:hidden;">
        <strong>${escapeHtml(t.name)}</strong>
        <span style="font-size:10px;color:#555">${t.minCapacity}–${t.maxCapacity} · ${escapeHtml(tableShapeLabel(t.shape))}</span>
        <span style="font-size:9px;color:#777">${escapeHtml(sizeLabel)}</span>
      </div>`;
    })
    .join('');

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { margin: 12mm; }
    body { font-family: system-ui, -apple-system, sans-serif; color: #111; margin: 0; padding: 16px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .meta { color: #555; font-size: 12px; margin-bottom: 12px; }
    .canvas {
      position: relative;
      width: ${width}px;
      height: ${height}px;
      max-width: 100%;
      border: 1px solid #ccc;
      background-color: ${bgColor};
      background-image:
        linear-gradient(to right, ${gridLine} 1px, transparent 1px),
        linear-gradient(to bottom, ${gridLine} 1px, transparent 1px)
        ${bgUrlCss ? `, url(${bgUrlCss})` : ''};
      background-size: ${cell}px ${cell}px, ${cell}px ${cell}px${bgUrlCss ? ', cover' : ''};
      background-repeat: repeat, repeat${bgUrlCss ? ', no-repeat' : ''};
      overflow: hidden;
    }
    .legend { margin-top: 12px; font-size: 11px; color: #444; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">
    Scale: 1 cell = ${formatCellLength(scale, 1)} ·
    ${visibleTables.length} tables ·
    ${visibleFixtures.length} fixtures ·
    ${visibleRooms.length} rooms ·
    Printed ${new Date().toLocaleString()}
  </div>
  <div class="canvas">
    <svg width="${width}" height="${height}" style="position:absolute;inset:0;pointer-events:none">${roomSvg}</svg>
    ${fixtureHtml}
    ${tableHtml}
  </div>
  <div class="legend">Tablevera floor plan</div>
</body>
</html>`;

  // Prefer a blob URL so we don't rely on document.write / noopener quirks.
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  // Do not pass "noopener" — modern browsers then return null from window.open.
  const win = window.open(url, '_blank', 'width=1000,height=800');
  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error('Pop-up blocked — allow pop-ups for this site to print the layout');
  }
  win.opener = null;
  win.focus();

  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      // User can still use the browser print command in the opened tab.
    } finally {
      // Keep the blob alive briefly so the tab can finish loading images.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  };

  // Print once the new tab has painted the layout.
  if (win.document.readyState === 'complete') {
    window.setTimeout(triggerPrint, 200);
  } else {
    win.addEventListener('load', () => window.setTimeout(triggerPrint, 200), { once: true });
    // Fallback if load never fires (some browsers with blob URLs).
    window.setTimeout(triggerPrint, 800);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Safe CSS url(...) token for background-image. */
function cssUrl(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
