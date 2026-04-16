import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { produce } from 'immer';
import { uid } from './utils';
import type {
  Document, AnyBlock, StripeBlock, StructureBlock, ContentBlock, Column,
  BlockType, SelectionState, UIState, SidebarPanel, RightPanelTab,
  PageSettings, GlobalStyles, PersistenceAdapter,
  PDFBuilderCallbacks, BlockStyles, BlockMeta, ViewMode,
} from './types';

// ─── Default Document Factory ─────────────────────────────────
export function createDefaultGlobalStyles(): GlobalStyles {
  return {
    pageBackground: '#ffffff',
    contentBackground: '#ffffff',
    defaultFontColor: '#333333',
  };
}

export function createDefaultPageSettings(): PageSettings {
  return {
    paperSize: { preset: 'a4', width: 210, height: 297 },
    orientation: 'portrait',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    defaultFontFamily: 'Inter, sans-serif',
  };
}

export function createDefaultDocument(): Document {
  return {
    id: uid(),
    version: '2.0.0',
    meta: { title: 'Novo Documento', description: '', locale: 'pt-BR', tags: [] },
    pageSettings: createDefaultPageSettings(),
    globalStyles: createDefaultGlobalStyles(),
    blocks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Block Factories ──────────────────────────────────────────
function defaultStyles(): BlockStyles {
  return JSON.parse(JSON.stringify({
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    border: {
      top: { width: 0, style: 'none' as const, color: '#000000' },
      right: { width: 0, style: 'none' as const, color: '#000000' },
      bottom: { width: 0, style: 'none' as const, color: '#000000' },
      left: { width: 0, style: 'none' as const, color: '#000000' },
    },
    borderRadius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
    background: { type: 'solid' as const, color: 'transparent' },
    shadow: { enabled: false, offsetX: 0, offsetY: 2, blur: 8, spread: 0, color: 'rgba(0,0,0,0.15)' },
    opacity: 1,
  }));
}

function defaultMeta(): BlockMeta {
  return {
    hideOnExport: false, locked: false,
    breakBefore: false, breakAfter: false,
  };
}

export function createStripe(children?: StructureBlock[]): StripeBlock {
  return {
    id: uid(), type: 'stripe', meta: defaultMeta(), styles: { ...defaultStyles(), padding: { top: 0, right: 0, bottom: 0, left: 0 } },
    children: children || [createStructure()],
    contentMaxWidth: 0,    // 0 = unlimited, fills available width
    contentAlignment: 'center',
  };
}

export function createStructure(columnWidths?: number[]): StructureBlock {
  const widths = columnWidths || [100];
  return {
    id: uid(), type: 'structure', meta: defaultMeta(), styles: defaultStyles(),
    columns: widths.map(w => ({
      id: uid(), width: w, children: [], styles: defaultStyles(),
    })),
    columnGap: 0, verticalAlignment: 'top',
  };
}

export function createBannerStructure(): StructureBlock {
  return {
    ...createStructure([100]),
    variant: 'banner',
    verticalAlignment: 'center',
    backgroundImage: '',
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    minHeight: 300,
    overlayColor: '#000000',
    overlayOpacity: 0,
  };
}

export function createContentBlock(type: BlockType): ContentBlock {
  const base = { id: uid(), meta: defaultMeta(), styles: defaultStyles() };

  switch (type) {
    case 'text':
      return {
        ...base, type: 'text',
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Digite seu texto aqui...' }] }] },
        fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 400, fontColor: '#333333',
        lineHeight: 1.6, letterSpacing: 0, textAlign: 'left', textTransform: 'none',
      };
    case 'image':
      return {
        ...base, type: 'image',
        styles: { ...defaultStyles(), margin: { top: 15, right: 0, bottom: 15, left: 0 } },
        src: '', alt: '', title: '',
        width: 'auto', height: 'auto', objectFit: 'contain', alignment: 'center',
      };
    case 'button':
      return {
        ...base, type: 'button',
        styles: { ...defaultStyles(), margin: { top: 15, right: 0, bottom: 15, left: 0 } },
        text: 'Clique aqui', url: '#', target: '_blank', fullWidth: false,
        fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, fontColor: '#ffffff',
        bgColor: '#5b8cff', borderColor: '#5b8cff', borderWidth: 0,
        borderRadius: { topLeft: 6, topRight: 6, bottomRight: 6, bottomLeft: 6 },
        paddingH: 24, paddingV: 12,
        alignment: 'center',
      };
    case 'divider':
      return {
        ...base, type: 'divider',
        styles: { ...defaultStyles(), margin: { top: 15, right: 0, bottom: 15, left: 0 } },
        lineStyle: 'solid', thickness: 1, color: '#e0e0ec', widthPercent: 100, alignment: 'center',
      };
    case 'spacer':
      return { ...base, type: 'spacer', height: 24 };
    case 'banner':
      return {
        ...base, type: 'banner',
        imageUrl: '', overlayColor: 'rgba(0,0,0,0.4)', overlayOpacity: 0.4,
        title: 'Título do Banner', subtitle: 'Subtítulo',
        titleFontSize: 32, titleColor: '#ffffff',
        subtitleFontSize: 16, subtitleColor: '#ffffff',
        height: 300, alignment: 'center',
      };
    case 'table':
      return {
        ...base, type: 'table',
        rows: [
          ['Cabeçalho 1', 'Cabeçalho 2', 'Cabeçalho 3'],
          ['Dado 1',      'Dado 2',      'Dado 3'],
          ['Dado 4',      'Dado 5',      'Dado 6'],
          ['Dado 7',      'Dado 8',      'Dado 9'],
        ],
        headerRow: true, headerBgColor: '#f0f0f5', headerFontColor: '#1a1a2e',
        cellPadding: 10, borderColor: '#e0e0ec', borderWidth: 1,
        fontFamily: 'Inter, sans-serif', fontSize: 13, fontColor: '#333333',
        stripedRows: false, stripedColor: '#f8f9fd',
      };
    case 'qrcode':
      return {
        ...base, type: 'qrcode',
        data: 'https://example.com', size: 128, fgColor: '#000000', bgColor: '#ffffff', alignment: 'center',
      };
    case 'chart':
      return {
        ...base, type: 'chart',
        chartType: 'bar',
        data: [
          { label: 'A', value: 30, color: '#5b8cff' },
          { label: 'B', value: 50, color: '#22c55e' },
          { label: 'C', value: 20, color: '#f59e0b' },
        ],
        title: 'Gráfico', width: 400, height: 300,
      };
    case 'pagebreak':
      return { ...base, type: 'pagebreak' };
    default:
      return { ...base, type: 'text', content: {}, fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 400, fontColor: '#333333', lineHeight: 1.6, letterSpacing: 0, textAlign: 'left', textTransform: 'none' } as ContentBlock;
  }
}

// ─── Store Types ──────────────────────────────────────────────
interface HistoryEntry {
  blocks: StripeBlock[];
  pageSettings: PageSettings;
  globalStyles: GlobalStyles;
}

export interface EditorStore {
  // Document
  document: Document;

  // Selection
  selection: SelectionState;

  // UI
  ui: UIState;

  // History
  _history: HistoryEntry[];
  _historyIndex: number;
  _maxHistory: number;

  // Saved modules
  modules: { id: string; name: string; block: StripeBlock }[];

  // Callbacks (injected)
  _callbacks: PDFBuilderCallbacks;
  _persistence: PersistenceAdapter | null;
  /** Resolved defaults used by clearCanvas() — owned by init() */
  _defaultPageSettings: PageSettings;
  _defaultGlobalStyles: GlobalStyles;

  // ─── Actions ─────────────────
  // Init
  init(doc?: Document, callbacks?: PDFBuilderCallbacks, persistence?: PersistenceAdapter, config?: import('./types').PDFBuilderConfig): void;
  setCallbacks(cb: PDFBuilderCallbacks): void;

  // Document
  setDocument(doc: Document): void;
  updateMeta(meta: Partial<Document['meta']>): void;
  updatePageSettings(settings: Partial<PageSettings>): void;
  updateGlobalStyles(styles: Partial<GlobalStyles>): void;
  clearCanvas(): void;

  // Selection
  selectBlock(blockId: string | null, path?: string[]): void;
  deselectBlock(): void;

  // UI
  setSidebarPanel(panel: SidebarPanel | null): void;
  setRightPanelTab(tab: RightPanelTab): void;
  setViewMode(mode: ViewMode): void;
  toggleCodeEditor(): void;
  setPreviewOpen(open: boolean): void;
  setTemplateGalleryOpen(open: boolean): void;
  setDragging(dragging: boolean, source?: 'sidebar' | 'canvas' | null): void;
  setZoom(zoom: number): void;
  setExporting(exporting: boolean): void;
  setTheme(theme: 'light' | 'dark'): void;

  // Block mutations
  addStripe(stripe?: StripeBlock, position?: number): void;
  removeStripe(stripeId: string): void;
  updateStripe(stripeId: string, updates: Partial<StripeBlock>): void;
  moveStripe(stripeId: string, newIndex: number): void;
  duplicateStripe(stripeId: string): void;

  addStructure(stripeId: string, structure?: StructureBlock, position?: number): void;
  updateStructure(stripeId: string, structureId: string, updates: Partial<StructureBlock>): void;
  moveStructure(stripeId: string, structureId: string, newIndex: number): void;

  addContentBlock(stripeId: string, structureId: string, columnId: string, type: BlockType, position?: number): string;
  updateContentBlock(blockId: string, updates: Partial<ContentBlock>): void;
  removeContentBlock(blockId: string): void;
  moveContentBlock(blockId: string, targetStripeId: string, targetStructureId: string, targetColumnId: string, position: number): void;
  duplicateContentBlock(blockId: string): void;

  updateBlockStyles(blockId: string, styles: Partial<BlockStyles>): void;
  updateBlockMeta(blockId: string, meta: Partial<BlockMeta>): void;

  // Column operations
  addColumn(stripeId: string, structureId: string): void;
  removeColumn(stripeId: string, structureId: string, columnId: string): void;
  updateColumnWidth(stripeId: string, structureId: string, columnId: string, width: number): void;

  // History
  undo(): void;
  redo(): void;
  _pushHistory(): void;

  // Persistence
  save(): void;

  // Modules
  saveAsModule(stripeId: string, name: string): void;
  removeModule(moduleId: string): void;
  addFromModule(moduleId: string, position?: number): void;

  // Clipboard (copy / paste)
  _clipboard: { blockId: string } | null;
  copyBlock(blockId: string): void;
  pasteBlock(): void;
}

// ─── Helpers ──────────────────────────────────────────────────
function findBlock(blocks: StripeBlock[], blockId: string): { block: AnyBlock; path: string[] } | null {
  for (const stripe of blocks) {
    if (stripe.id === blockId) return { block: stripe, path: [stripe.id] };
    for (const structure of stripe.children) {
      if (structure.id === blockId) return { block: structure, path: [stripe.id, structure.id] };
      for (const column of structure.columns) {
        for (const content of column.children) {
          if (content.id === blockId) return { block: content, path: [stripe.id, structure.id, column.id, content.id] };
        }
      }
    }
  }
  return null;
}

function deepCloneBlock<T extends AnyBlock>(block: T): T {
  const clone = JSON.parse(JSON.stringify(block)) as T;
  clone.id = uid();
  if ('children' in clone && Array.isArray((clone as StripeBlock).children)) {
    (clone as StripeBlock).children = (clone as StripeBlock).children.map(s => {
      const sc = { ...s, id: uid() };
      sc.columns = sc.columns.map(c => ({
        ...c, id: uid(),
        children: c.children.map(b => ({ ...b, id: uid() })),
      }));
      return sc;
    });
  }
  if ('columns' in clone && Array.isArray((clone as StructureBlock).columns)) {
    (clone as StructureBlock).columns = (clone as StructureBlock).columns.map(c => ({
      ...c, id: uid(),
      children: c.children.map(b => ({ ...b, id: uid() })),
    }));
  }
  return clone;
}

// ─── Create Store ─────────────────────────────────────────────
export const useEditorStore = create<EditorStore>()(
  subscribeWithSelector((set, get) => ({
    document: createDefaultDocument(),
    selection: { blockId: null, path: [] },
    ui: {
      sidebarPanel: null,
      rightPanelTab: 'config',
      viewMode: 'desktop',
      codeEditorOpen: false,
      previewOpen: false,
      templateGalleryOpen: false,
      isDragging: false,
      dragSource: null,
      zoom: 100,
      exporting: false,
      theme: 'light',
    },
    _history: [],
    _historyIndex: -1,
    _maxHistory: 50,
    modules: [],
    _callbacks: {},
    _persistence: null,
    _defaultPageSettings: createDefaultPageSettings(),
    _defaultGlobalStyles: createDefaultGlobalStyles(),
    _clipboard: null,

    // ─── Init ──────────────────
    init(doc, callbacks, persistence, config) {
      // Build the effective defaults: built-in base merged with any dev overrides
      const defaultPageSettings: PageSettings = {
        ...createDefaultPageSettings(),
        ...(config?.defaultPageSettings ?? {}),
      };
      const defaultGlobalStyles: GlobalStyles = {
        ...createDefaultGlobalStyles(),
        ...(config?.defaultGlobalStyles ?? {}),
      };

      const document = doc || {
        ...createDefaultDocument(),
        pageSettings: { ...defaultPageSettings },
        globalStyles: { ...defaultGlobalStyles },
      };
      set({
        document,
        _callbacks: callbacks || {},
        _persistence: persistence || null,
        _defaultPageSettings: defaultPageSettings,
        _defaultGlobalStyles: defaultGlobalStyles,
        _history: [{ blocks: JSON.parse(JSON.stringify(document.blocks)), pageSettings: JSON.parse(JSON.stringify(document.pageSettings)), globalStyles: JSON.parse(JSON.stringify(document.globalStyles)) }],
        _historyIndex: 0,
      });
    },

    setCallbacks(cb) {
      set({ _callbacks: cb });
    },

    // ─── Document ──────────────
    setDocument(doc) {
      set({ document: doc });
      get()._pushHistory();
    },

    updateMeta(meta) {
      set(produce((s: EditorStore) => {
        Object.assign(s.document.meta, meta);
        s.document.updatedAt = new Date().toISOString();
      }));
      get()._callbacks.onDocumentChange?.(get().document);
    },

    updatePageSettings(settings) {
      set(produce((s: EditorStore) => {
        Object.assign(s.document.pageSettings, settings);
        s.document.updatedAt = new Date().toISOString();
      }));
      get()._pushHistory();
      get()._callbacks.onDocumentChange?.(get().document);
    },

    updateGlobalStyles(styles) {
      set(produce((s: EditorStore) => {
        Object.assign(s.document.globalStyles, styles);
        s.document.updatedAt = new Date().toISOString();
      }));
      get()._pushHistory();
      get()._callbacks.onDocumentChange?.(get().document);
    },

    // ─── Selection ─────────────
    selectBlock(blockId, path) {
      set({ selection: { blockId, path: path || [] } });
      get()._callbacks.onBlockSelect?.(blockId);
    },

    deselectBlock() {
      set({ selection: { blockId: null, path: [] } });
      get()._callbacks.onBlockSelect?.(null);
    },

    // ─── UI ────────────────────
    setSidebarPanel(panel) {
      set(produce((s: EditorStore) => {
        s.ui.sidebarPanel = s.ui.sidebarPanel === panel ? null : panel;
      }));
    },

    setRightPanelTab(tab) {
      set(produce((s: EditorStore) => { s.ui.rightPanelTab = tab; }));
    },

    setViewMode(mode) {
      set(produce((s: EditorStore) => { s.ui.viewMode = mode; }));
    },

    toggleCodeEditor() {
      set(produce((s: EditorStore) => { s.ui.codeEditorOpen = !s.ui.codeEditorOpen; }));
    },

    setPreviewOpen(open) {
      set(produce((s: EditorStore) => { s.ui.previewOpen = open; }));
    },

    setTemplateGalleryOpen(open) {
      set(produce((s: EditorStore) => { s.ui.templateGalleryOpen = open; }));
    },

    setDragging(dragging, source) {
      set(produce((s: EditorStore) => { s.ui.isDragging = dragging; s.ui.dragSource = source || null; }));
    },

    setZoom(zoom) {
      set(produce((s: EditorStore) => { s.ui.zoom = zoom; }));
    },

    setExporting(exporting) {
      set(produce((s: EditorStore) => { s.ui.exporting = exporting; }));
    },

    setTheme(theme) {
      set(produce((s: EditorStore) => { s.ui.theme = theme; }));
    },

    clearCanvas() {
      set(produce((s: EditorStore) => {
        s.document.blocks = [];
        s.document.pageSettings = JSON.parse(JSON.stringify(s._defaultPageSettings));
        s.document.globalStyles = JSON.parse(JSON.stringify(s._defaultGlobalStyles));
        s.selection = { blockId: null, path: [] };
        s.document.updatedAt = new Date().toISOString();
      }));
      get()._pushHistory();
      get()._callbacks.onDocumentChange?.(get().document);
    },

    // ─── Stripe Operations ────
    addStripe(stripe, position) {
      const newStripe = stripe || createStripe();
      set(produce((s: EditorStore) => {
        const idx = position != null ? position : s.document.blocks.length;
        s.document.blocks.splice(idx, 0, newStripe);
        s.document.updatedAt = new Date().toISOString();
      }));
      get()._pushHistory();
      get()._callbacks.onDocumentChange?.(get().document);
    },

    removeStripe(stripeId) {
      set(produce((s: EditorStore) => {
        s.document.blocks = s.document.blocks.filter(b => b.id !== stripeId);
        if (s.selection.blockId === stripeId) { s.selection = { blockId: null, path: [] }; }
        s.document.updatedAt = new Date().toISOString();
      }));
      get()._pushHistory();
      get()._callbacks.onDocumentChange?.(get().document);
    },

    updateStripe(stripeId, updates) {
      set(produce((s: EditorStore) => {
        const stripe = s.document.blocks.find(b => b.id === stripeId);
        if (stripe) Object.assign(stripe, updates);
        s.document.updatedAt = new Date().toISOString();
      }));
      get()._pushHistory();
      get()._callbacks.onDocumentChange?.(get().document);
    },

    moveStripe(stripeId, newIndex) {
      set(produce((s: EditorStore) => {
        const idx = s.document.blocks.findIndex(b => b.id === stripeId);
        if (idx === -1) return;
        const [stripe] = s.document.blocks.splice(idx, 1);
        s.document.blocks.splice(newIndex, 0, stripe);
        s.document.updatedAt = new Date().toISOString();
      }));
      get()._pushHistory();
      get()._callbacks.onDocumentChange?.(get().document);
    },

    duplicateStripe(stripeId) {
      set(produce((s: EditorStore) => {
        const idx = s.document.blocks.findIndex(b => b.id === stripeId);
        if (idx === -1) return;
        const clone = deepCloneBlock(s.document.blocks[idx]);
        s.document.blocks.splice(idx + 1, 0, clone);
        s.document.updatedAt = new Date().toISOString();
      }));
      get()._pushHistory();
      get()._callbacks.onDocumentChange?.(get().document);
    },

    // ─── Structure Operations ──
    addStructure(stripeId, structure, position) {
      const newStructure = structure || createStructure();
      set(produce((s: EditorStore) => {
        const stripe = s.document.blocks.find(b => b.id === stripeId);
        if (!stripe) return;
        const idx = position != null ? position : stripe.children.length;
        stripe.children.splice(idx, 0, newStructure);
        s.document.updatedAt = new Date().toISOString();
      }));
      get()._pushHistory();
      get()._callbacks.onDocumentChange?.(get().document);
    },

    updateStructure(stripeId, structureId, updates) {
      set(produce((s: EditorStore) => {
        const stripe = s.document.blocks.find(b => b.id === stripeId);
        if (!stripe) return;
        const structure = stripe.children.find(c => c.id === structureId);
        if (structure) Object.assign(structure, updates);
        s.document.updatedAt = new Date().toISOString();
      }));
      get()._pushHistory();
      get()._callbacks.onDocumentChange?.(get().document);
    },

    moveStructure(stripeId, structureId, newIndex) {
      set(produce((s: EditorStore) => {
        const stripe = s.document.blocks.find(b => b.id === stripeId);
        if (!stripe) return;
        const idx = stripe.children.findIndex(c => c.id === structureId);
        if (idx === -1) return;
        const [structure] = stripe.children.splice(idx, 1);
        stripe.children.splice(newIndex, 0, structure);
        s.document.updatedAt = new Date().toISOString();
      }));
      get()._pushHistory();
      get()._callbacks.onDocumentChange?.(get().document);
    },

    // ─── Content Block Operations ──
    addContentBlock(stripeId, structureId, columnId, type, position) {
      const block = createContentBlock(type);
      set(produce((s: EditorStore) => {
        const stripe = s.document.blocks.find(b => b.id === stripeId);
        if (!stripe) return;
        const structure = stripe.children.find(c => c.id === structureId);
        if (!structure) return;
        const column = structure.columns.find(c => c.id === columnId);
        if (!column) return;
        const idx = position != null ? position : column.children.length;
        column.children.splice(idx, 0, block);
        s.document.updatedAt = new Date().toISOString();
      }));
      get()._pushHistory();
      get()._callbacks.onDocumentChange?.(get().document);
      return block.id;
    },

    updateContentBlock(blockId, updates) {
      set(produce((s: EditorStore) => {
        for (const stripe of s.document.blocks) {
          for (const structure of stripe.children) {
            for (const column of structure.columns) {
              const idx = column.children.findIndex(b => b.id === blockId);
              if (idx !== -1) {
                Object.assign(column.children[idx], updates);
                s.document.updatedAt = new Date().toISOString();
                return;
              }
            }
          }
        }
      }));
      get()._pushHistory();
      get()._callbacks.onDocumentChange?.(get().document);
    },

    removeContentBlock(blockId) {
      set(produce((s: EditorStore) => {
        for (const stripe of s.document.blocks) {
          for (const structure of stripe.children) {
            for (const column of structure.columns) {
              const idx = column.children.findIndex(b => b.id === blockId);
              if (idx !== -1) {
                column.children.splice(idx, 1);
                if (s.selection.blockId === blockId) {
                  s.selection = { blockId: null, path: [] };
                }
                s.document.updatedAt = new Date().toISOString();
                return;
              }
            }
          }
        }
      }));
      get()._pushHistory();
      get()._callbacks.onDocumentChange?.(get().document);
    },

    moveContentBlock(blockId, targetStripeId, targetStructureId, targetColumnId, position) {
      set(produce((s: EditorStore) => {
        let block: ContentBlock | null = null;
        // Find and remove
        for (const stripe of s.document.blocks) {
          for (const structure of stripe.children) {
            for (const column of structure.columns) {
              const idx = column.children.findIndex(b => b.id === blockId);
              if (idx !== -1) {
                [block] = column.children.splice(idx, 1);
                break;
              }
            }
            if (block) break;
          }
          if (block) break;
        }
        if (!block) return;
        // Insert
        const targetStripe = s.document.blocks.find(b => b.id === targetStripeId);
        if (!targetStripe) return;
        const targetStructure = targetStripe.children.find(c => c.id === targetStructureId);
        if (!targetStructure) return;
        const targetColumn = targetStructure.columns.find(c => c.id === targetColumnId);
        if (!targetColumn) return;
        targetColumn.children.splice(position, 0, block);
        s.document.updatedAt = new Date().toISOString();
      }));
      get()._pushHistory();
      get()._callbacks.onDocumentChange?.(get().document);
    },

    duplicateContentBlock(blockId) {
      set(produce((s: EditorStore) => {
        for (const stripe of s.document.blocks) {
          for (const structure of stripe.children) {
            for (const column of structure.columns) {
              const idx = column.children.findIndex(b => b.id === blockId);
              if (idx !== -1) {
                const clone = deepCloneBlock(column.children[idx]);
                column.children.splice(idx + 1, 0, clone);
                s.document.updatedAt = new Date().toISOString();
                return;
              }
            }
          }
        }
      }));
      get()._pushHistory();
      get()._callbacks.onDocumentChange?.(get().document);
    },

    updateBlockStyles(blockId, styles) {
      set(produce((s: EditorStore) => {
        const result = findBlock(s.document.blocks, blockId);
        if (result) {
          Object.assign(result.block.styles, styles);
          s.document.updatedAt = new Date().toISOString();
        }
      }));
      get()._callbacks.onDocumentChange?.(get().document);
    },

    updateBlockMeta(blockId, meta) {
      set(produce((s: EditorStore) => {
        const result = findBlock(s.document.blocks, blockId);
        if (result) {
          Object.assign(result.block.meta, meta);
          s.document.updatedAt = new Date().toISOString();
        }
      }));
      get()._callbacks.onDocumentChange?.(get().document);
    },

    // ─── Column Operations ──────
    addColumn(stripeId, structureId) {
      set(produce((s: EditorStore) => {
        const stripe = s.document.blocks.find(b => b.id === stripeId);
        if (!stripe) return;
        const structure = stripe.children.find(c => c.id === structureId);
        if (!structure) return;
        const newWidth = Math.floor(100 / (structure.columns.length + 1));
        const remainder = 100 - newWidth * (structure.columns.length + 1);
        structure.columns.forEach((c, i) => {
          c.width = newWidth + (i === 0 ? remainder : 0);
        });
        structure.columns.push({
          id: uid(), width: newWidth, children: [],
          styles: defaultStyles(),
        });
        s.document.updatedAt = new Date().toISOString();
      }));
      get()._pushHistory();
      get()._callbacks.onDocumentChange?.(get().document);
    },

    removeColumn(stripeId, structureId, columnId) {
      set(produce((s: EditorStore) => {
        const stripe = s.document.blocks.find(b => b.id === stripeId);
        if (!stripe) return;
        const structure = stripe.children.find(c => c.id === structureId);
        if (!structure || structure.columns.length <= 1) return;
        structure.columns = structure.columns.filter(c => c.id !== columnId);
        const totalWidth = 100;
        const perCol = Math.floor(totalWidth / structure.columns.length);
        structure.columns.forEach((c, i) => {
          c.width = perCol + (i === 0 ? totalWidth - perCol * structure.columns.length : 0);
        });
        s.document.updatedAt = new Date().toISOString();
      }));
      get()._pushHistory();
      get()._callbacks.onDocumentChange?.(get().document);
    },

    updateColumnWidth(stripeId, structureId, columnId, newWidth) {
      set(produce((s: EditorStore) => {
        const stripe = s.document.blocks.find(b => b.id === stripeId);
        if (!stripe) return;
        const structure = stripe.children.find(c => c.id === structureId);
        if (!structure) return;
        const cols = structure.columns;
        const others = cols.filter(c => c.id !== columnId);

        if (others.length === 0) {
          // Single column: always 100%
          const col = cols.find(c => c.id === columnId);
          if (col) col.width = 100;
          s.document.updatedAt = new Date().toISOString();
          return;
        }

        // Each other column keeps at least 5%
        const minPerOther = 5;
        const maxWidth = 100 - others.length * minPerOther;
        const clampedWidth = Math.min(Math.max(newWidth, minPerOther), maxWidth);
        const remaining = 100 - clampedWidth;

        const col = cols.find(c => c.id === columnId);
        if (col) col.width = clampedWidth;

        // Redistribute remaining proportionally among other columns
        const totalOthers = others.reduce((sum, c) => sum + c.width, 0);
        if (totalOthers > 0) {
          others.forEach(c => { c.width = Math.max(minPerOther, (c.width / totalOthers) * remaining); });
        } else {
          others.forEach(c => { c.width = remaining / others.length; });
        }

        s.document.updatedAt = new Date().toISOString();
      }));
      get()._callbacks.onDocumentChange?.(get().document);
    },

    // ─── History ───────────────
    _pushHistory() {
      const { document, _history, _historyIndex, _maxHistory } = get();
      const entry: HistoryEntry = {
        blocks: JSON.parse(JSON.stringify(document.blocks)),
        pageSettings: JSON.parse(JSON.stringify(document.pageSettings)),
        globalStyles: JSON.parse(JSON.stringify(document.globalStyles)),
      };
      const newHistory = _history.slice(0, _historyIndex + 1);
      newHistory.push(entry);
      if (newHistory.length > _maxHistory) newHistory.shift();
      set({ _history: newHistory, _historyIndex: newHistory.length - 1 });
    },

    undo() {
      const { _history, _historyIndex } = get();
      if (_historyIndex <= 0) return;
      const newIndex = _historyIndex - 1;
      const entry = _history[newIndex];
      set(produce((s: EditorStore) => {
        s.document.blocks = JSON.parse(JSON.stringify(entry.blocks));
        s.document.pageSettings = JSON.parse(JSON.stringify(entry.pageSettings));
        s.document.globalStyles = JSON.parse(JSON.stringify(entry.globalStyles));
        s.document.updatedAt = new Date().toISOString();
        s._historyIndex = newIndex;
      }));
      get()._callbacks.onDocumentChange?.(get().document);
    },

    redo() {
      const { _history, _historyIndex } = get();
      if (_historyIndex >= _history.length - 1) return;
      const newIndex = _historyIndex + 1;
      const entry = _history[newIndex];
      set(produce((s: EditorStore) => {
        s.document.blocks = JSON.parse(JSON.stringify(entry.blocks));
        s.document.pageSettings = JSON.parse(JSON.stringify(entry.pageSettings));
        s.document.globalStyles = JSON.parse(JSON.stringify(entry.globalStyles));
        s.document.updatedAt = new Date().toISOString();
        s._historyIndex = newIndex;
      }));
      get()._callbacks.onDocumentChange?.(get().document);
    },

    // ─── Persistence ───────────
    save() {
      const doc = get().document;
      get()._persistence?.save(doc);
      get()._callbacks.onSave?.(doc);
    },

    // ─── Modules ───────────────
    saveAsModule(stripeId, name) {
      const stripe = get().document.blocks.find(b => b.id === stripeId);
      if (!stripe) return;
      set(produce((s: EditorStore) => {
        s.modules.push({
          id: uid(),
          name,
          block: JSON.parse(JSON.stringify(stripe)),
        });
      }));
    },

    removeModule(moduleId) {
      set(produce((s: EditorStore) => {
        s.modules = s.modules.filter(m => m.id !== moduleId);
      }));
    },

    addFromModule(moduleId, position) {
      const mod = get().modules.find(m => m.id === moduleId);
      if (!mod) return;
      const clone = deepCloneBlock(mod.block);
      get().addStripe(clone, position);
    },

    // ─── Clipboard ──────────────
    copyBlock(blockId) {
      set({ _clipboard: { blockId } });
    },

    pasteBlock() {
      const { _clipboard, selection, document: doc } = get();
      if (!_clipboard) return;

      const sourceId  = _clipboard.blockId;
      const selectedId = selection.blockId;

      // ── Helper: is this block a stripe? ──
      const isStripe = doc.blocks.some(s => s.id === sourceId);
      if (isStripe) {
        get().duplicateStripe(sourceId);
        return;
      }

      // ── Find the source block's column ──
      let srcColId = '', srcStripeId = '', srcStructId = '';
      let srcIdx = -1;
      outer: for (const stripe of doc.blocks) {
        for (const structure of stripe.children) {
          for (const column of structure.columns) {
            const i = column.children.findIndex(b => b.id === sourceId);
            if (i !== -1) {
              srcStripeId = stripe.id;
              srcStructId = structure.id;
              srcColId    = column.id;
              srcIdx      = i;
              break outer;
            }
          }
        }
      }
      if (srcIdx === -1) return;

      // ── If something is selected, paste after the selected block
      //    in the same column (mirrors duplicate behaviour) ──
      if (selectedId) {
        for (const stripe of doc.blocks) {
          for (const structure of stripe.children) {
            for (const column of structure.columns) {
              const selIdx = column.children.findIndex(b => b.id === selectedId);
              if (selIdx !== -1) {
                // Find and clone the source block
                for (const s2 of doc.blocks) {
                  for (const st2 of s2.children) {
                    for (const col2 of st2.columns) {
                      const si = col2.children.findIndex(b => b.id === sourceId);
                      if (si !== -1) {
                        const copy = deepCloneBlock(col2.children[si]);
                        set(produce((s: EditorStore) => {
                          const tStripe = s.document.blocks.find(b => b.id === stripe.id);
                          const tStruct = tStripe?.children.find(c => c.id === structure.id);
                          const tCol    = tStruct?.columns.find(c => c.id === column.id);
                          if (tCol) tCol.children.splice(selIdx + 1, 0, copy);
                        }));
                        get()._pushHistory();
                        get()._callbacks.onDocumentChange?.(get().document);
                        return;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      // ── No selection → append to last column of last stripe ──
      const lastStripe = doc.blocks[doc.blocks.length - 1];
      if (lastStripe) {
        const lastStruct = lastStripe.children[lastStripe.children.length - 1];
        if (lastStruct) {
          const lastCol = lastStruct.columns[lastStruct.columns.length - 1];
          if (lastCol) {
            for (const stripe of doc.blocks) {
              for (const structure of stripe.children) {
                for (const column of structure.columns) {
                  const si = column.children.findIndex(b => b.id === sourceId);
                  if (si !== -1) {
                    const copy = deepCloneBlock(column.children[si]);
                    set(produce((s: EditorStore) => {
                      const tStripe = s.document.blocks.find(b => b.id === lastStripe.id);
                      const tStruct = tStripe?.children.find(c => c.id === lastStruct.id);
                      const tCol    = tStruct?.columns.find(c => c.id === lastCol.id);
                      if (tCol) tCol.children.push(copy);
                    }));
                    get()._pushHistory();
                    get()._callbacks.onDocumentChange?.(get().document);
                    return;
                  }
                }
              }
            }
          }
        }
      }
    },
  }))
);
