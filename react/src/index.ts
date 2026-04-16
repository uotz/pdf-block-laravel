// ─── @pdf-block/react v1.0.0 ──────────────────────────────────
// A visual, drag-and-drop PDF document builder for React.

// ─── Main Component ───────────────────────────────────────────
export { PDFBuilder } from './components/PDFBuilder';
export type { PDFBuilderProps } from './components/PDFBuilder';

// ─── Public Hooks ─────────────────────────────────────────────
export { useDocument } from './hooks/useDocument';
export { useSelection } from './hooks/useSelection';
export { useEditor } from './hooks/useEditor';
export { useExport } from './hooks/useExport';

// ─── Image Library ────────────────────────────────────────────
export { useImageLibrary, processFile, libraryStore } from './components/ImageLibrary';
export type { LibraryImage, LibraryOpenOptions } from './components/ImageLibrary';

// ─── Store (advanced usage) ───────────────────────────────────
export { useEditorStore, createDefaultDocument, createDefaultPageSettings, createDefaultGlobalStyles } from './store';
export { createStripe, createStructure, createContentBlock } from './store';

// ─── Types ────────────────────────────────────────────────────
export type {
  // Document
  Document,
  DocumentMeta,
  PageSettings,
  GlobalStyles,
  PaperSize,
  PaperPreset,
  Orientation,

  // Blocks
  BlockType,
  ContentBlockType,
  AnyBlock,
  ContentBlock,
  StripeBlock,
  StructureBlock,
  Column,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  DividerBlock,
  SpacerBlock,
  BannerBlock,
  TableBlock,
  QRCodeBlock,
  ChartBlock,
  PageBreakBlock,

  // Styles
  BlockStyles,
  BlockMeta,
  EdgeValues,
  CornerValues,
  BorderSide,
  BorderStyle,
  ShadowValue,
  BackgroundValue,
  SolidBackground,
  ImageBackground,
  GradientBackground,
  GradientStop,
  ContentAlign,
  TextAlign,
  VerticalAlign,
  TextTransform,
  FontWeight,

  // Config
  PDFBuilderConfig,
  PDFBuilderCallbacks,
  PDFBuilderRef,
  PersistenceAdapter,
  PDFBuilderPlugin,
  Locale,
  Theme,
  MinimapConfig,
  MinimapPosition,
  MinimapMode,

  // UI State
  SidebarPanel,
  RightPanelTab,
  SelectionState,
  UIState,

  // Block definitions
  BlockDefinition,
} from './types';

// ─── Constants ────────────────────────────────────────────────
export { PAPER_SIZES, MM_TO_PX, MM_TO_PT } from './types';

// ─── Utils ────────────────────────────────────────────────────
export { getPageDimensionsPx, getContentAreaPx, mmToPx, pxToMm, mmToPt, blockStylesToCSS, uid } from './utils';

// ─── i18n ─────────────────────────────────────────────────────
export { t, setLocale, getLocale, getAvailableLocales } from './i18n';

// ─── Block Registry ───────────────────────────────────────────
export { BLOCK_DEFINITIONS, LAYOUT_PRESETS, CONTENT_BLOCK_TYPES, getBlockDefinition } from './blocks/registry';

// ─── Export Utilities ─────────────────────────────────────────
export { exportToPDF, downloadPDF, openPrintWindow } from './export/pdf';
