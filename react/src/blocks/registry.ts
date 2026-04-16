import type { BlockType, BlockDefinition } from '../types';

/** Block types compatible with PDF output */
export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  { type: 'text', labelKey: 'block.text', icon: 'Type', category: 'content', defaultProps: () => ({}), draggable: true },
  { type: 'image', labelKey: 'block.image', icon: 'Image', category: 'media', defaultProps: () => ({}), draggable: true },
  { type: 'button', labelKey: 'block.button', icon: 'SquareMousePointer', category: 'content', defaultProps: () => ({}), draggable: true },
  { type: 'divider', labelKey: 'block.divider', icon: 'Minus', category: 'content', defaultProps: () => ({}), draggable: true },
  { type: 'spacer', labelKey: 'block.spacer', icon: 'MoveVertical', category: 'content', defaultProps: () => ({}), draggable: true },
  { type: 'banner', labelKey: 'block.banner', icon: 'ImagePlay', category: 'media', defaultProps: () => ({}), draggable: true },
  { type: 'table', labelKey: 'block.table', icon: 'Table', category: 'content', defaultProps: () => ({}), draggable: true },
  { type: 'qrcode', labelKey: 'block.qrcode', icon: 'QrCode', category: 'advanced', defaultProps: () => ({}), draggable: true },
  { type: 'chart', labelKey: 'block.chart', icon: 'BarChart3', category: 'advanced', defaultProps: () => ({}), draggable: true },
  { type: 'pagebreak', labelKey: 'block.pagebreak', icon: 'SeparatorHorizontal', category: 'layout', defaultProps: () => ({}), draggable: true },
];

export const LAYOUT_PRESETS: { label: string; widths: number[] }[] = [
  { label: '1 coluna', widths: [100] },
  { label: '2 colunas', widths: [50, 50] },
  { label: '2 colunas (33/66)', widths: [33, 67] },
  { label: '2 colunas (66/33)', widths: [67, 33] },
  { label: '3 colunas', widths: [33, 34, 33] },
  { label: '3 colunas (25/50/25)', widths: [25, 50, 25] },
  { label: '4 colunas', widths: [25, 25, 25, 25] },
  { label: '1+2 colunas', widths: [50, 25, 25] },
  { label: '2+1 colunas', widths: [25, 25, 50] },
  { label: '5 colunas', widths: [20, 20, 20, 20, 20] },
  { label: '1/4 + 3/4', widths: [25, 75] },
  { label: '3/4 + 1/4', widths: [75, 25] },
];

export function getBlockDefinition(type: BlockType): BlockDefinition | undefined {
  return BLOCK_DEFINITIONS.find(d => d.type === type);
}

/** Types that can be placed inside columns as content blocks */
export const CONTENT_BLOCK_TYPES: BlockType[] = [
  'text', 'image', 'button', 'divider', 'spacer',
  'table', 'qrcode', 'chart', 'pagebreak',
];

/**
 * Sidebar items.
 * - 'layouts', 'modules', 'styles' open expandable panels.
 * - Everything else is a direct-add block type (click=add, drag=drag to canvas).
 */
export type SidebarItemAction = 'panel' | 'block';

export interface SidebarItem {
  key: string;
  icon: string;
  labelKey: string;
  action: SidebarItemAction;
  /** When action='block', which block type to create */
  blockType?: BlockType;
  /** When action='panel', which panel to show */
  panel?: string;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: 'layouts', icon: 'LayoutGrid', labelKey: 'sidebar.layouts', action: 'panel', panel: 'layouts' },
  { key: 'text', icon: 'Type', labelKey: 'sidebar.text', action: 'block', blockType: 'text' },
  { key: 'image', icon: 'Image', labelKey: 'sidebar.image', action: 'block', blockType: 'image' },
  { key: 'button', icon: 'SquareMousePointer', labelKey: 'sidebar.button', action: 'block', blockType: 'button' },
  { key: 'divider', icon: 'Minus', labelKey: 'sidebar.divider', action: 'block', blockType: 'divider' },
  { key: 'spacer', icon: 'MoveVertical', labelKey: 'sidebar.spacer', action: 'block', blockType: 'spacer' },
  { key: 'banner', icon: 'ImagePlay', labelKey: 'sidebar.banner', action: 'block', blockType: 'banner' },
  { key: 'table', icon: 'Table', labelKey: 'sidebar.table', action: 'block', blockType: 'table' },
  { key: 'qrcode', icon: 'QrCode', labelKey: 'sidebar.qrcode', action: 'block', blockType: 'qrcode' },
  { key: 'chart', icon: 'BarChart3', labelKey: 'sidebar.chart', action: 'block', blockType: 'chart' },
  { key: 'pagebreak', icon: 'SeparatorHorizontal', labelKey: 'sidebar.pagebreak', action: 'block', blockType: 'pagebreak' },
  { key: 'modules', icon: 'Puzzle', labelKey: 'sidebar.modules', action: 'panel', panel: 'modules' },
  { key: 'tree',    icon: 'Layers', labelKey: 'sidebar.tree',    action: 'panel', panel: 'tree'    },
];
