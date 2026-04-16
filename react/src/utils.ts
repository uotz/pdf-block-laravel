import { v4 as uuidv4 } from 'uuid';
import type {
  EdgeValues, BackgroundValue, BlockStyles, ShadowValue, CornerValues, BorderSide,
  MM_TO_PX, PaperSize, Orientation, PageSettings,
} from './types';

export function uid(): string {
  return uuidv4();
}

// ─── Unit Conversions ─────────────────────────────────────────
const _MM_TO_PX = 96 / 25.4;

export function mmToPx(mm: number): number {
  return Math.round(mm * _MM_TO_PX * 100) / 100;
}

export function pxToMm(px: number): number {
  return Math.round(px / _MM_TO_PX * 100) / 100;
}

export function mmToPt(mm: number): number {
  return Math.round(mm * (72 / 25.4) * 100) / 100;
}

// ─── Page Dimension Helpers ───────────────────────────────────
export function getPageDimensionsPx(settings: PageSettings): { width: number; height: number } {
  const { paperSize, orientation } = settings;
  let w = mmToPx(paperSize.width);
  let h = mmToPx(paperSize.height);
  if (orientation === 'landscape') [w, h] = [h, w];
  return { width: Math.round(w), height: Math.round(h) };
}

export function getContentAreaPx(settings: PageSettings): { width: number; height: number; offsetX: number; offsetY: number } {
  const page = getPageDimensionsPx(settings);
  const m = settings.margins;
  const offsetX = mmToPx(m.left);
  const offsetY = mmToPx(m.top);
  return {
    width: page.width - mmToPx(m.left) - mmToPx(m.right),
    height: page.height - mmToPx(m.top) - mmToPx(m.bottom),
    offsetX,
    offsetY,
  };
}

// ─── CSS Helpers ──────────────────────────────────────────────
export function edgeToCSS(edge: EdgeValues, unit = 'px'): string {
  return `${edge.top}${unit} ${edge.right}${unit} ${edge.bottom}${unit} ${edge.left}${unit}`;
}

export function cornersToCSS(c: CornerValues): string {
  return `${c.topLeft}px ${c.topRight}px ${c.bottomRight}px ${c.bottomLeft}px`;
}

export function borderSideToCSS(b: BorderSide): string {
  if (b.style === 'none' || b.width === 0) return 'none';
  return `${b.width}px ${b.style} ${b.color}`;
}

export function shadowToCSS(s: ShadowValue): string {
  if (!s.enabled) return 'none';
  return `${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px ${s.color}`;
}

export function backgroundToCSS(bg: BackgroundValue): Record<string, string> {
  if (bg.type === 'solid') {
    return { backgroundColor: bg.color };
  }
  if (bg.type === 'image') {
    return {
      backgroundImage: `url(${bg.url})`,
      backgroundSize: bg.size === 'custom' ? 'auto' : bg.size,
      backgroundRepeat: bg.repeat,
      backgroundPosition: `${bg.positionX} ${bg.positionY}`,
    };
  }
  if (bg.type === 'gradient') {
    const stops = bg.stops.map(s => `${s.color} ${s.position}%`).join(', ');
    const gradient = bg.gradientType === 'linear'
      ? `linear-gradient(${bg.angle}deg, ${stops})`
      : `radial-gradient(circle, ${stops})`;
    return { backgroundImage: gradient };
  }
  return {};
}

export function blockStylesToCSS(styles: BlockStyles): React.CSSProperties {
  const css: React.CSSProperties = {
    padding: edgeToCSS(styles.padding),
    margin: edgeToCSS(styles.margin),
    borderTop: borderSideToCSS(styles.border.top),
    borderRight: borderSideToCSS(styles.border.right),
    borderBottom: borderSideToCSS(styles.border.bottom),
    borderLeft: borderSideToCSS(styles.border.left),
    borderRadius: cornersToCSS(styles.borderRadius),
    boxShadow: shadowToCSS(styles.shadow),
    opacity: styles.opacity,
    ...backgroundToCSS(styles.background),
  };
  return css;
}

// ─── Deep Merge ───────────────────────────────────────────────
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const val = source[key];
    if (val && typeof val === 'object' && !Array.isArray(val) && typeof target[key] === 'object') {
      result[key] = deepMerge(target[key] as Record<string, unknown>, val as Record<string, unknown>) as T[keyof T];
    } else if (val !== undefined) {
      result[key] = val as T[keyof T];
    }
  }
  return result;
}

// ─── Clamp ────────────────────────────────────────────────────
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
