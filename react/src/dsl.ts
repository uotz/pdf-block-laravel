/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  DSL — Fonte da verdade (source-of-truth) do documento     ║
 * ║                                                             ║
 * ║  Toda serialização, persistência e exportação DEVE usar     ║
 * ║  exclusivamente estes tipos. Nenhuma propriedade aqui é     ║
 * ║  "aspiracional" — tudo que está listado é implementado      ║
 * ║  e funcional nos renderers, painéis e/ou exportação.        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ─── Primitivos reutilizáveis ─────────────────────────────────

export interface EdgeValues {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CornerValues {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
}

export type BorderStyle = 'none' | 'solid' | 'dashed' | 'dotted' | 'double';

export interface BorderSide {
  width: number;
  style: BorderStyle;
  color: string;
}

export interface ShadowValue {
  enabled: boolean;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
}

// ─── Background ───────────────────────────────────────────────

export interface SolidBackground {
  type: 'solid';
  color: string;
}

export interface ImageBackground {
  type: 'image';
  url: string;
  size: 'cover' | 'contain' | 'auto' | 'custom';
  repeat: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  positionX: 'center' | 'top' | 'bottom' | 'left' | 'right';
  positionY: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

export interface GradientStop {
  color: string;
  position: number;
}

export interface GradientBackground {
  type: 'gradient';
  gradientType: 'linear' | 'radial';
  angle: number;
  stops: GradientStop[];
}

export type BackgroundValue = SolidBackground | ImageBackground | GradientBackground;

// ─── Block Styles (compartilhado por todos os blocos) ─────────

export interface BlockStyles {
  padding: EdgeValues;
  margin: EdgeValues;
  border: {
    top: BorderSide;
    right: BorderSide;
    bottom: BorderSide;
    left: BorderSide;
  };
  borderRadius: CornerValues;
  background: BackgroundValue;
  shadow: ShadowValue;
  opacity: number;
}

// ─── Block Meta (compartilhado por todos os blocos) ───────────

export interface BlockMeta {
  /** Ocultar do PDF (exibe semitransparente no editor, removido na exportação) */
  hideOnExport: boolean;
  locked: boolean;
  breakBefore: boolean;
  breakAfter: boolean;
}

// ─── Tipos de bloco ───────────────────────────────────────────

export type BlockType =
  | 'stripe'
  | 'structure'
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'banner'
  | 'table'
  | 'qrcode'
  | 'chart'
  | 'pagebreak';

export type ContentBlockType = Exclude<BlockType, 'stripe' | 'structure' | 'banner'>;

// ─── Alinhamentos ─────────────────────────────────────────────

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type VerticalAlign = 'top' | 'center' | 'bottom';
export type ContentAlign = 'left' | 'center' | 'right';
export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';
export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

// ─── Base ─────────────────────────────────────────────────────

export interface BaseBlock {
  id: string;
  type: BlockType;
  meta: BlockMeta;
  styles: BlockStyles;
}

// ─── Stripe ───────────────────────────────────────────────────

export interface StripeBlock extends BaseBlock {
  type: 'stripe';
  children: StructureBlock[];
  /** Largura máxima do conteúdo em px (0 = sem limite) */
  contentMaxWidth: number;
  /** Alinhamento horizontal do conteúdo dentro da stripe */
  contentAlignment: ContentAlign;
}

// ─── Structure ────────────────────────────────────────────────

export interface Column {
  id: string;
  /** Largura em porcentagem (todas as colunas somam 100) */
  width: number;
  children: ContentBlock[];
  styles: BlockStyles;
}

export interface StructureBlock extends BaseBlock {
  type: 'structure';
  variant?: 'default' | 'banner';
  columns: Column[];
  columnGap: number;
  verticalAlignment: VerticalAlign;
  // ── Banner-specific ──
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: string;
  minHeight?: number;
  overlayColor?: string;
  overlayOpacity?: number;
}

// ─── Text ─────────────────────────────────────────────────────

export interface TextBlock extends BaseBlock {
  type: 'text';
  /** TipTap JSON content */
  content: Record<string, unknown>;
  /** When undefined, inherits from globalStyles.defaultFontSize */
  fontSize?: number;
  fontWeight: FontWeight;
  fontColor: string;
  lineHeight: number;
  letterSpacing: number;
  textAlign: TextAlign;
  textTransform: TextTransform;
}

// ─── Image ────────────────────────────────────────────────────

export interface ImageBlock extends BaseBlock {
  type: 'image';
  src: string;
  alt: string;
  title: string;
  width: number | 'auto' | 'full';
  height: number | 'auto';
  objectFit: 'contain' | 'cover' | 'fill' | 'none';
  alignment: ContentAlign;
}

// ─── Button ───────────────────────────────────────────────────

export interface ButtonBlock extends BaseBlock {
  type: 'button';
  text: string;
  url: string;
  target: '_self' | '_blank';
  fullWidth: boolean;
  fontSize: number;
  fontWeight: FontWeight;
  fontColor: string;
  bgColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: CornerValues;
  paddingH: number;
  paddingV: number;
  alignment: ContentAlign;
}

// ─── Divider ──────────────────────────────────────────────────

export interface DividerBlock extends BaseBlock {
  type: 'divider';
  lineStyle: 'solid' | 'dashed' | 'dotted' | 'double';
  thickness: number;
  color: string;
  widthPercent: number;
  alignment: ContentAlign;
}

// ─── Spacer ───────────────────────────────────────────────────

export interface SpacerBlock extends BaseBlock {
  type: 'spacer';
  height: number;
}

// ─── Table ────────────────────────────────────────────────────

export interface TableBlock extends BaseBlock {
  type: 'table';
  rows: string[][];
  headerRow: boolean;
  headerBgColor: string;
  headerFontColor: string;
  cellPadding: number;
  borderColor: string;
  borderWidth: number;
  fontSize: number;
  fontColor: string;
  stripedRows: boolean;
  stripedColor: string;
}

// ─── QR Code ──────────────────────────────────────────────────

export interface QRCodeBlock extends BaseBlock {
  type: 'qrcode';
  data: string;
  size: number;
  fgColor: string;
  bgColor: string;
  alignment: ContentAlign;
}

// ─── Chart ────────────────────────────────────────────────────

export interface ChartBlock extends BaseBlock {
  type: 'chart';
  chartType: 'bar' | 'line' | 'pie' | 'doughnut';
  data: { label: string; value: number; color?: string }[];
  title: string;
  width: number;
  height: number;
}

// ─── Page Break ───────────────────────────────────────────────

export interface PageBreakBlock extends BaseBlock {
  type: 'pagebreak';
}

// ─── Union types ──────────────────────────────────────────────

export type ContentBlock =
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | DividerBlock
  | SpacerBlock
  | TableBlock
  | QRCodeBlock
  | ChartBlock
  | PageBreakBlock;

export type AnyBlock = StripeBlock | StructureBlock | ContentBlock;

// ─── Global Styles ────────────────────────────────────────────

export interface GlobalStyles {
  /** Cor de fundo da página do PDF */
  pageBackground: string;
  /** Cor de fundo da área de conteúdo */
  contentBackground: string;
  /** Cor padrão do texto */
  defaultFontColor: string;
  /** Largura máxima do conteúdo em px (global fallback) */
  contentWidth?: number;
  /** Família tipográfica padrão (override global) */
  defaultFontFamily?: string;
  /** Tamanho de fonte padrão em px */
  defaultFontSize?: number;
  /** Cor padrão da borda de blockquotes */
  blockquoteBorderColor?: string;
  /** Cor de fundo padrão do banner */
  bannerBackground?: string;
}

// ─── Page Settings ────────────────────────────────────────────

export type PaperPreset = 'a4' | 'letter' | 'legal' | 'a3' | 'a5' | 'custom';
export type Orientation = 'portrait' | 'landscape';

export interface PaperSize {
  preset: PaperPreset;
  width: number;
  height: number;
}

export interface PageSettings {
  paperSize: PaperSize;
  orientation: Orientation;
  margins: EdgeValues;
  defaultFontFamily: string;
}

// ─── Document ─────────────────────────────────────────────────

export interface DocumentMeta {
  title: string;
  description: string;
  locale: string;
  tags: string[];
}

export interface Document {
  id: string;
  version: '2.0.0';
  meta: DocumentMeta;
  pageSettings: PageSettings;
  globalStyles: GlobalStyles;
  blocks: StripeBlock[];
  createdAt?: string;
  updatedAt?: string;
}

// ─── Constantes de papel ──────────────────────────────────────

export const PAPER_SIZES: Record<Exclude<PaperPreset, 'custom'>, { width: number; height: number }> = {
  a3: { width: 297, height: 420 },
  a4: { width: 210, height: 297 },
  a5: { width: 148, height: 210 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 355.6 },
};

// ─── Defaults ─────────────────────────────────────────────────

export const DEFAULT_EDGE: EdgeValues = { top: 0, right: 0, bottom: 0, left: 0 };
export const DEFAULT_CORNERS: CornerValues = { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
export const DEFAULT_BORDER_SIDE: BorderSide = { width: 0, style: 'none', color: '#000000' };
export const DEFAULT_SHADOW: ShadowValue = { enabled: false, offsetX: 0, offsetY: 2, blur: 8, spread: 0, color: 'rgba(0,0,0,0.15)' };

export const DEFAULT_BLOCK_STYLES: BlockStyles = {
  padding: { ...DEFAULT_EDGE },
  margin: { ...DEFAULT_EDGE },
  border: {
    top: { ...DEFAULT_BORDER_SIDE },
    right: { ...DEFAULT_BORDER_SIDE },
    bottom: { ...DEFAULT_BORDER_SIDE },
    left: { ...DEFAULT_BORDER_SIDE },
  },
  borderRadius: { ...DEFAULT_CORNERS },
  background: { type: 'solid', color: 'transparent' },
  shadow: { ...DEFAULT_SHADOW },
  opacity: 1,
};

export const DEFAULT_BLOCK_META: BlockMeta = {
  hideOnExport: false,
  locked: false,
  breakBefore: false,
  breakAfter: false,
};

export const DEFAULT_GLOBAL_STYLES: GlobalStyles = {
  pageBackground: '#ffffff',
  contentBackground: '#ffffff',
  defaultFontColor: '#333333',
  blockquoteBorderColor: '#e0e0e0',
};

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  paperSize: { preset: 'a4', width: 210, height: 297 },
  orientation: 'portrait',
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  defaultFontFamily: 'Inter, sans-serif',
};

// ─── Conversão de unidades ────────────────────────────────────

export const MM_TO_PX = 96 / 25.4;
export const MM_TO_PT = 72 / 25.4;
