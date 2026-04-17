// ╔══════════════════════════════════════════════════════════════╗
// ║  Re-export: tudo que é DSL/persistência vem de ./dsl.ts    ║
// ╚══════════════════════════════════════════════════════════════╝
import type {
  Document, PageSettings, GlobalStyles, AnyBlock, BlockType,
} from './dsl';

export {
  // Constants
  MM_TO_PX, MM_TO_PT, PAPER_SIZES,
  DEFAULT_EDGE, DEFAULT_CORNERS, DEFAULT_BORDER_SIDE, DEFAULT_SHADOW,
  DEFAULT_BLOCK_STYLES, DEFAULT_BLOCK_META,
  DEFAULT_GLOBAL_STYLES, DEFAULT_PAGE_SETTINGS,
} from './dsl';

export type {
  // Primitives
  EdgeValues, CornerValues, BorderStyle, BorderSide, ShadowValue,
  SolidBackground, ImageBackground, GradientStop, GradientBackground, BackgroundValue,

  // Block styles & meta
  BlockStyles, BlockMeta,

  // Block types
  BlockType, ContentBlockType,
  BaseBlock, StripeBlock, Column, StructureBlock,
  TextBlock, ImageBlock, ButtonBlock, DividerBlock, SpacerBlock,
  TableBlock, QRCodeBlock, ChartBlock, PageBreakBlock,
  ContentBlock, AnyBlock,

  // Alignment & typography
  TextAlign, VerticalAlign, ContentAlign, TextTransform, FontWeight,

  // Document
  PaperPreset, Orientation, PaperSize,
  PageSettings, GlobalStyles, DocumentMeta, Document,
} from './dsl';

// ─── Editor-only types (não fazem parte da DSL) ───────────────

export type ViewMode = 'desktop';

// ─── Minimap Config ───────────────────────────────────────────
export type MinimapPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
/**
 * `'real'`  — live DOM clone scaled down via CSS transform (default).
 *             Updates with a ~150 ms debounce via MutationObserver.
 * `'bars'`  — lightweight coloured stripe bars, zero clone cost.
 */
export type MinimapMode = 'real' | 'bars';

export interface MinimapConfig {
  /** Show or hide the minimap. Default: true */
  enabled?: boolean;
  /**
   * Rendering mode.
   * - `'real'`  live DOM clone (default)
   * - `'bars'`  coloured stripe bars, lightest weight
   */
  mode?: MinimapMode;
  /** Minimap panel width in px. Default: 160 */
  width?: number;
  /** Minimap panel max height in px. Default: 220 */
  maxHeight?: number;
  /** Corner of the canvas area where the minimap is anchored. Default: 'bottom-right' */
  position?: MinimapPosition;
  /** Distance from the canvas edge in px. Default: 16 */
  offsetX?: number;
  /** Distance from the canvas edge in px. Default: 16 */
  offsetY?: number;
  /**
   * Debounce delay in ms for the 'real' mode MutationObserver update.
   * Lower = more responsive, higher = cheaper. Default: 150
   */
  debounce?: number;
}

// ─── Editor Config ────────────────────────────────────────────
export type Locale = 'pt-BR' | 'en';
export type Theme = 'dark' | 'light';

export interface PDFBuilderConfig {
  locale?: Locale;
  theme?: Theme;
  availableBlocks?: BlockType[];
  showToolbar?: boolean;
  showSidebar?: boolean;
  showRightPanel?: boolean;
  readOnly?: boolean;
  canvasWidth?: number;
  /**
   * Default page settings used when creating a new document or clearing the canvas.
   * Merged (deep) on top of the built-in defaults — you only need to specify the
   * keys you want to override (e.g. just `margins` or just `paginationMode`).
   */
  defaultPageSettings?: Partial<PageSettings>;
  /**
   * Default global styles used when creating a new document or clearing the canvas.
   * Merged on top of the built-in defaults.
   */
  defaultGlobalStyles?: Partial<GlobalStyles>;
  /**
   * Custom image upload handler. Receives a File and should return a Promise
   * resolving to the final URL (e.g. after uploading to your CDN/storage).
   * If not provided, the editor falls back to a base64 data URL.
   */
  onUploadImage?: (file: File) => Promise<string>;
  /**
   * Called when the UI is about to render an unlock button for a locked block.
   * Return false to hide all unlock controls (e.g. user does not have permission).
   * Defaults to () => true (always show unlock button).
   */
  canUnlock?: (blockId: string) => boolean;
  /**
   * Minimap configuration. Pass `true` to enable with defaults, `false` to disable,
   * or a `MinimapConfig` object for fine-grained control.
   *
   * @example
   * minimap: true
   * minimap: { position: 'bottom-left', width: 140 }
   */
  minimap?: boolean | MinimapConfig;
  /**
   * Built-in templates shown in the templates panel.
   * These are read-only and cannot be deleted by the user.
   */
  templates?: import('./templates').Template[];
  /**
   * Custom adapter for persisting user templates.
   * Defaults to `localStorageTemplateAdapter`.
   *
   * @see packages/react/docs/templates.md
   */
  templateAdapter?: import('./templates').TemplateAdapter;
  /**
   * Custom adapter for persisting saved modules (stripe blocks).
   * Defaults to `localStorageModuleAdapter`.
   */
  moduleAdapter?: import('./modules').ModuleAdapter;
  /**
   * Custom adapter for persisting the image library.
   * Defaults to `localStorageImageLibraryAdapter`.
   */
  imageLibraryAdapter?: import('./imageLibrary').ImageLibraryAdapter;
}

export interface PDFBuilderCallbacks {
  onDocumentChange?: (doc: Document) => void;
  onBlockSelect?: (blockId: string | null) => void;
  onSave?: (doc: Document) => void;
}

export interface PersistenceAdapter {
  save(doc: Document): Promise<void> | void;
  load(): Promise<Document | null> | Document | null;
}

// ─── Editor State (used by store) ─────────────────────────────
export type SidebarPanel =
  | 'layouts'
  | 'modules'
  | 'styles'
  | 'templates'
  | 'tree';

export type RightPanelTab = 'config' | 'styles' | 'data';

export interface SelectionState {
  blockId: string | null;
  /** Path from root to selected block, e.g. ['stripe-1', 'structure-2', 'column-0', 'text-3'] */
  path: string[];
}

export interface UIState {
  sidebarPanel: SidebarPanel | null;
  rightPanelTab: RightPanelTab;
  viewMode: ViewMode;
  codeEditorOpen: boolean;
  previewOpen: boolean;
  templateGalleryOpen: boolean;
  isDragging: boolean;
  dragSource: 'sidebar' | 'canvas' | null;
  zoom: number;
  theme: 'light' | 'dark';
}

// ─── Plugin ───────────────────────────────────────────────────
export interface PDFBuilderPlugin {
  name: string;
  onMount?: (store: unknown) => void;
  onDocumentChange?: (doc: Document) => void;
  renderBlock?: (block: AnyBlock, defaultRender: () => React.ReactNode) => React.ReactNode | null;
}

// ─── Block Definition (for registry) ──────────────────────────
export interface BlockDefinition {
  type: BlockType;
  labelKey: string;
  icon: string;
  category: 'layout' | 'content' | 'media' | 'advanced';
  defaultProps: () => Partial<AnyBlock>;
  draggable: boolean;
}

// ─── Ref API (imperative handle) ──────────────────────────────
export interface PDFBuilderRef {
  print(): void;
  getDocument(): Document;
  setDocument(doc: Document): void;
  undo(): void;
  redo(): void;
  addBlock(type: BlockType, stripeId?: string, position?: number): void;
  selectBlock(id: string | null): void;
  toJSON(): string;
  fromJSON(json: string): void;
}
