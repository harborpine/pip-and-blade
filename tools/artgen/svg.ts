/** Tiny deterministic SVG string helpers. Numbers are rounded to 2 decimals so output is stable. */

export type Attrs = Record<string, string | number | undefined>;
export type Pt = readonly [number, number];

export const n = (v: number): string => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
};

export function attrs(a: Attrs = {}): string {
  return Object.entries(a)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ` ${k}="${typeof v === 'number' ? n(v) : String(v)}"`)
    .join('');
}

export const el = (tag: string, a: Attrs = {}, body?: string): string =>
  body === undefined ? `<${tag}${attrs(a)}/>` : `<${tag}${attrs(a)}>${body}</${tag}>`;

export const circle = (cx: number, cy: number, r: number, a: Attrs = {}): string => el('circle', { cx, cy, r, ...a });
export const ellipse = (cx: number, cy: number, rx: number, ry: number, a: Attrs = {}): string => el('ellipse', { cx, cy, rx, ry, ...a });
export const rect = (x: number, y: number, w: number, h: number, rx = 0, a: Attrs = {}): string =>
  el('rect', { x, y, width: w, height: h, rx: rx || undefined, ...a });
export const path = (d: string, a: Attrs = {}): string => el('path', { d, ...a });
export const g = (a: Attrs, body: string): string => el('g', a, body);

/** A stroked line shape (the family's "linear part"): round caps and joins, no fill. */
export const line = (d: string, width: number, a: Attrs = {}): string =>
  path(d, { fill: 'none', stroke: 'currentColor', 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...a });

/**
 * Path data for a polygon whose corners are rounded with radius r (one value, or one per corner).
 * Works for convex and concave corners alike, so every icon shares the same corner rule.
 */
export function roundPoly(pts: readonly Pt[], r: number | readonly number[]): string {
  const k = pts.length;
  const rad = (i: number): number => (typeof r === 'number' ? r : (r[i] ?? 0));
  const parts: string[] = [];
  const corner = (i: number): { a: Pt; p: Pt; b: Pt } => {
    const p = pts[i]!;
    const prev = pts[(i - 1 + k) % k]!;
    const next = pts[(i + 1) % k]!;
    const toward = (q: Pt): Pt => {
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const len = Math.hypot(dx, dy) || 1;
      const t = Math.min(rad(i), len / 2) / len;
      return [p[0] + dx * t, p[1] + dy * t];
    };
    return { a: toward(prev), p, b: toward(next) };
  };
  const c0 = corner(0);
  parts.push(`M${n(c0.b[0])} ${n(c0.b[1])}`);
  for (let j = 1; j <= k; j++) {
    const cj = corner(j % k);
    parts.push(`L${n(cj.a[0])} ${n(cj.a[1])}`);
    if (rad(j % k) > 0) parts.push(`Q${n(cj.p[0])} ${n(cj.p[1])} ${n(cj.b[0])} ${n(cj.b[1])}`);
  }
  return `${parts.join('')}Z`;
}

/**
 * Path data for a circle, as four absolute cubic curves (so circles can be holes inside an
 * evenodd path, and can be moved by scaleD / rotateD, which only understand coordinate pairs).
 */
export function circleD(cx: number, cy: number, r: number): string {
  const k = 0.5523 * r;
  return `M${n(cx + r)} ${n(cy)}C${n(cx + r)} ${n(cy + k)} ${n(cx + k)} ${n(cy + r)} ${n(cx)} ${n(cy + r)}` +
    `C${n(cx - k)} ${n(cy + r)} ${n(cx - r)} ${n(cy + k)} ${n(cx - r)} ${n(cy)}` +
    `C${n(cx - r)} ${n(cy - k)} ${n(cx - k)} ${n(cy - r)} ${n(cx)} ${n(cy - r)}` +
    `C${n(cx + k)} ${n(cy - r)} ${n(cx + r)} ${n(cy - k)} ${n(cx + r)} ${n(cy)}Z`;
}

/** Path data for a rounded rectangle. */
export const rectD = (x: number, y: number, w: number, h: number, r: number): string =>
  roundPoly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], r);

/** Rotate / scale points about a centre (used to lay shapes out at angles without transforms). */
export function xform(pts: readonly Pt[], deg: number, s = 1, cx = 12, cy = 12, dx = 0, dy = 0): Pt[] {
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return pts.map(([x, y]) => {
    const u = (x - cx) * s;
    const v = (y - cy) * s;
    return [cx + dx + u * cos - v * sin, cy + dy + u * sin + v * cos] as const;
  });
}

export function svgDoc(w: number, h: number, body: string, extra: Attrs = {}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"${attrs(extra)}>${body}</svg>\n`;
}

/** Collect every hex colour literal used in an SVG string (for the palette-only test). */
export const colorsIn = (svg: string): string[] => [...new Set((svg.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((s) => s.toLowerCase()))];
