import React, { useCallback, useEffect, useState } from 'react';
import {
  DndContext, DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay,
  closestCenter, pointerWithin,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  Type, Image, Minus, SquareMousePointer, MoveVertical,
  ImagePlay, Table, QrCode, BarChart3, SeparatorHorizontal, X,
} from 'lucide-react';
import { TopToolbar } from './TopToolbar';
import { LeftSidebar } from './LeftSidebar';
import { CanvasArea } from './canvas/CanvasArea';
import { RightPanel } from './panel/RightPanel';
import { ActiveEditorProvider } from './ActiveEditorContext';
import { ImageLibraryProvider } from './ImageLibrary';
import { TextFormatToolbar } from './TextFormatToolbar';
import { useEditorStore, createStripe, createStructure, createContentBlock, createBannerStructure } from '../store';
import { t } from '../i18n';
import type { BlockType } from '../types';
import type { LucideIcon } from 'lucide-react';

const BLOCK_ICON_MAP: Record<string, LucideIcon> = {
  text: Type, image: Image, button: SquareMousePointer, divider: Minus,
  spacer: MoveVertical, banner: ImagePlay, table: Table,
  qrcode: QrCode, chart: BarChart3, pagebreak: SeparatorHorizontal,
};

interface EditorShellProps {
  showToolbar?: boolean;
  showSidebar?: boolean;
  showRightPanel?: boolean;
  onBack?: () => void;
  /** Slot for extra toolbar actions */
  toolbarActions?: React.ReactNode;
}

// ─── Preview Overlay ────────────────────────────────────────────
function PreviewOverlay({ onClose }: { onClose: () => void }) {
  const pageEl = window.document.querySelector('.pdfb-page') as HTMLElement | null;

  const getContentHTML = () => {
    if (!pageEl) return '<p style="text-align:center;color:var(--pdfb-color-text-secondary)">Nenhum conteúdo</p>';
    const c = pageEl.cloneNode(true) as HTMLElement;
    c.querySelectorAll(
      '.pdfb-floating-toolbar,.pdfb-block-label,.pdfb-drop-indicator,' +
      '.pdfb-pagebreak-band,.pdfb-column-empty,.pdfb-lock-overlay,.pdfb-resize-handle'
    ).forEach(el => el.remove());
    c.querySelectorAll('.pdfb-canvas-block').forEach(el => {
      el.classList.remove('selected');
      (el as HTMLElement).style.outline = 'none';
    });
    return c.innerHTML;
  };

  return (
    <div className="pdfb-overlay" onClick={onClose}>
      <div className="pdfb-overlay-inner" onClick={e => e.stopPropagation()}>
        <div className="pdfb-overlay-header">
          <span>Pré-visualização</span>
          <button type="button" className="pdfb-overlay-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="pdfb-overlay-body pdfb-preview-body">
          <div className="pdfb-preview-content" dangerouslySetInnerHTML={{ __html: getContentHTML() }} />
        </div>
      </div>
    </div>
  );
}

// ─── Code Editor Overlay ────────────────────────────────────────
function CodeEditorOverlay({ onClose }: { onClose: () => void }) {
  const document = useEditorStore(s => s.document);
  const setDocument = useEditorStore(s => s.setDocument);
  const [code, setCode] = useState(() => JSON.stringify(document, null, 2));
  const [error, setError] = useState('');

  const handleApply = useCallback(() => {
    try {
      const parsed = JSON.parse(code);
      setDocument(parsed);
      setError('');
      onClose();
    } catch (e) {
      setError(`JSON inválido: ${(e as Error).message}`);
    }
  }, [code, setDocument, onClose]);

  return (
    <div className="pdfb-overlay" onClick={onClose}>
      <div className="pdfb-overlay-inner pdfb-overlay-wide" onClick={e => e.stopPropagation()}>
        <div className="pdfb-overlay-header">
          <span>Editor de Código (JSON)</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" className="pdfb-toolbar-btn pdfb-toolbar-btn--primary"
              style={{ height: 28, fontSize: 12 }} onClick={handleApply}>
              Aplicar
            </button>
            <button type="button" className="pdfb-overlay-close" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        {error && (
          <div style={{ padding: '8px 16px', background: 'var(--pdfb-color-danger-light)', color: 'var(--pdfb-color-danger)', fontSize: 12 }}>
            {error}
          </div>
        )}
        <textarea className="pdfb-code-textarea" value={code}
          onChange={e => setCode(e.target.value)} spellCheck={false} />
      </div>
    </div>
  );
}

// ─── Main Shell ─────────────────────────────────────────────────
export function EditorShell({
  showToolbar = true, showSidebar = true, showRightPanel = true,
  onBack,
  toolbarActions,
}: EditorShellProps) {
  const blocks          = useEditorStore(s => s.document.blocks);
  const addStripe       = useEditorStore(s => s.addStripe);
  const addContentBlock = useEditorStore(s => s.addContentBlock);
  const moveContentBlock = useEditorStore(s => s.moveContentBlock);
  const previewOpen     = useEditorStore(s => s.ui.previewOpen);
  const setPreviewOpen  = useEditorStore(s => s.setPreviewOpen);
  const codeEditorOpen  = useEditorStore(s => s.ui.codeEditorOpen);
  const toggleCodeEditor = useEditorStore(s => s.toggleCodeEditor);

  // clipboard for copy/paste — handled in PDFBuilder keyboard shortcuts via store
  const handleCopy = useCallback((blockId: string) => {
    useEditorStore.getState().copyBlock(blockId);
  }, []);

  // Track what's currently being dragged for the ghost overlay
  const [activeDrag, setActiveDrag] = useState<{
    source: 'sidebar' | 'stripe' | 'content-block';
    blockType?: string;
    blockId?: string;
    blockData?: ReturnType<typeof useEditorStore.getState>['document']['blocks'][number]['children'][number]['columns'][number]['children'][number];
  } | null>(null);

  // Track the last column the pointer was over during drag, for reliable multi-column drops.
  // closestCenter alone can miss side-by-side columns; we complement with pointerWithin.
  const collisionDetection = useCallback(
    (args: Parameters<typeof closestCenter>[0]) => {
      const pointerHits = pointerWithin(args);
      if (pointerHits.length > 0) {
        // Prefer an explicit column droppable over sortable content-blocks
        const colHit = pointerHits.find(c => String(c.id).startsWith('column-'));
        if (colHit) return [colHit];
        return [pointerHits[0]];
      }
      return closestCenter(args);
    },
    [],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.source === 'sidebar') {
      setActiveDrag({ source: 'sidebar', blockType: data.blockType });
    } else if (data?.type === 'content-block') {
      // Capture the block data for a richer ghost preview
      const blockData = findBlockById(blocks, String(event.active.id));
      setActiveDrag({ source: 'content-block', blockType: data.blockType, blockId: String(event.active.id), blockData: blockData ?? undefined });
    } else if (data?.type === 'stripe' || blocks.some(b => b.id === event.active.id)) {
      setActiveDrag({ source: 'stripe', blockId: String(event.active.id) });
    } else {
      setActiveDrag(null);
    }
  }, [blocks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData   = over.data.current;

    // ── 1. Sidebar → canvas ──────────────────────────────────────
    if (activeData?.source === 'sidebar' && activeData?.blockType) {
      const blockType = activeData.blockType as BlockType;

      // Banner creates a stripe with a banner-variant structure (not a content block)
      if (blockType === 'banner') {
        addStripe(createStripe([createBannerStructure()]));
        return;
      }

      if (overData?.type === 'column') {
        const { stripeId, structureId, columnId } = overData;
        addContentBlock(stripeId, structureId, columnId, blockType);
        return;
      }
      if (overData?.type === 'content-block') {
        const { stripeId, structureId, columnId } = overData;
        const col = findColumn(blocks, columnId);
        const pos = col?.children.findIndex(b => b.id === over.id) ?? 0;
        addContentBlock(stripeId, structureId, columnId, blockType, pos);
        return;
      }

      // Drop on canvas / page area → append to last column
      if (blocks.length > 0) {
        const last = blocks[blocks.length - 1];
        const lastStruct = last.children[last.children.length - 1];
        if (lastStruct?.columns.length > 0) {
          const lastCol = lastStruct.columns[lastStruct.columns.length - 1];
          addContentBlock(last.id, lastStruct.id, lastCol.id, blockType);
          return;
        }
      }

      // No stripes — create one
      const stripe    = createStripe();
      const structure = stripe.children[0];
      const column    = structure.columns[0];
      column.children.push(createContentBlock(blockType));
      addStripe(stripe);
      return;
    }

    // ── 2. Content block reorder / cross-column move ─────────────
    if (activeData?.type === 'content-block') {
      const blockId = active.id as string;
      const srcColumnId = activeData.columnId as string;

      if (overData?.type === 'content-block') {
        // Dropped over another block
        const { stripeId, structureId, columnId } = overData;
        const col = findColumn(blocks, columnId);
        const overIdx = col?.children.findIndex(b => b.id === over.id) ?? 0;
        moveContentBlock(blockId, stripeId, structureId, columnId, overIdx);
        return;
      }

      if (overData?.type === 'column') {
        // Dropped on an empty column or the column drop zone
        const { stripeId, structureId, columnId } = overData;
        const col = findColumn(blocks, columnId);
        moveContentBlock(blockId, stripeId, structureId, columnId, col?.children.length ?? 0);
        return;
      }
      return;
    }

    // ── 3. Stripe reorder (disabled — use up/down arrows) ────────
  }, [blocks, addStripe, addContentBlock, moveContentBlock]);

  // Drag ghost
  const renderGhost = () => {
    if (!activeDrag) return null;
    if (activeDrag.source === 'sidebar' && activeDrag.blockType) {
      const Icon = BLOCK_ICON_MAP[activeDrag.blockType];
      return (
        <div className="pdfb-drag-ghost">
          {Icon && <Icon size={16} />}
          <span>{t(`block.${activeDrag.blockType}`)}</span>
        </div>
      );
    }
    if (activeDrag.source === 'content-block') {
      const Icon = activeDrag.blockType ? BLOCK_ICON_MAP[activeDrag.blockType] : null;
      const block = activeDrag.blockData;
      // For text blocks, show a brief preview snippet
      const textSnippet = block?.type === 'text'
        ? extractTextSnippet(block as any)
        : null;
      return (
        <div className="pdfb-drag-ghost pdfb-drag-ghost--block">
          {Icon && <Icon size={16} />}
          <span>{textSnippet || t(`block.${activeDrag.blockType ?? 'text'}`)}</span>
        </div>
      );
    }
    if (activeDrag.source === 'stripe') {
      return (
        <div className="pdfb-drag-ghost pdfb-drag-ghost--stripe">
          <span>Faixa</span>
        </div>
      );
    }
    return null;
  };

  const theme = useEditorStore(s => s.ui.theme);

  // Sync theme attribute to <html> so portals rendered in document.body
  // (outside .pdfb-root) also receive dark-mode CSS variable overrides.
  useEffect(() => {
    document.documentElement.dataset.pdfbTheme = theme;
    return () => { delete document.documentElement.dataset.pdfbTheme; };
  }, [theme]);

  return (
    <ImageLibraryProvider>
    <ActiveEditorProvider>
      <div className="pdfb-root" data-pdfb-theme={theme}>
        {showToolbar && <TopToolbar onBack={onBack} toolbarActions={toolbarActions} />}
        <TextFormatToolbar />
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="pdfb-editor-layout">
            {showSidebar && <LeftSidebar />}
            <CanvasArea onCopy={handleCopy} />
            {showRightPanel && <RightPanel />}
          </div>
          <DragOverlay dropAnimation={null}>
            {renderGhost()}
          </DragOverlay>
        </DndContext>

        {previewOpen    && <PreviewOverlay onClose={() => setPreviewOpen(false)} />}
        {codeEditorOpen && <CodeEditorOverlay onClose={toggleCodeEditor} />}
      </div>
    </ActiveEditorProvider>
    </ImageLibraryProvider>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
function findColumn(blocks: ReturnType<typeof useEditorStore.getState>['document']['blocks'], columnId: string) {
  for (const stripe of blocks)
    for (const structure of stripe.children)
      for (const column of structure.columns)
        if (column.id === columnId) return column;
  return null;
}

function findBlockById(blocks: ReturnType<typeof useEditorStore.getState>['document']['blocks'], blockId: string) {
  for (const stripe of blocks)
    for (const structure of stripe.children)
      for (const column of structure.columns)
        for (const block of column.children)
          if (block.id === blockId) return block;
  return null;
}

/** Extract first ~40 chars of text from a TipTap text block JSON. */
function extractTextSnippet(block: { content?: { content?: Array<{ content?: Array<{ text?: string }> }> } }): string | null {
  try {
    const nodes = block.content?.content ?? [];
    const texts: string[] = [];
    for (const node of nodes) {
      for (const inline of node.content ?? []) {
        if (inline.text) texts.push(inline.text);
      }
      if (texts.join('').length > 40) break;
    }
    const full = texts.join(' ').trim();
    return full ? (full.length > 38 ? full.slice(0, 38) + '…' : full) : null;
  } catch {
    return null;
  }
}
