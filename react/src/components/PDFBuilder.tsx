import React, { useEffect, useImperativeHandle, forwardRef, useCallback, useRef } from 'react';
import { EditorShell } from './EditorShell';
import { EditorConfigContext } from './EditorConfig';
import { useEditorStore } from '../store';
import { openPrintWindow } from '../export/print';
import { setLocale } from '../i18n';
import '../styles/editor.css';
import '../styles/print.css';
import type {
  Document, PDFBuilderConfig, PDFBuilderCallbacks,
  PersistenceAdapter, PDFBuilderRef, BlockType,
} from '../types';

export interface PDFBuilderProps {
  /** Initial document to load */
  initialDocument?: Document;
  /** Editor configuration */
  config?: PDFBuilderConfig;
  /** Event callbacks */
  callbacks?: PDFBuilderCallbacks;
  /** Persistence adapter */
  persistenceAdapter?: PersistenceAdapter;
  /** Back button callback */
  onBack?: () => void;
  /** Custom CSS class */
  className?: string;
  /** Custom inline style */
  style?: React.CSSProperties;
  /**
   * Slot for extra toolbar actions (rendered at the end of the toolbar).
   * Receives getDocument() for convenience.
   */
  toolbarActions?: (getDocument: () => Document) => React.ReactNode;
}

export const PDFBuilder = forwardRef<PDFBuilderRef, PDFBuilderProps>(function PDFBuilder(
  { initialDocument, config, callbacks, persistenceAdapter, onBack, className, style, toolbarActions },
  ref
) {
  const init = useEditorStore(s => s.init);
  const setCallbacks = useEditorStore(s => s.setCallbacks);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Initialize store on mount
  useEffect(() => {
    if (config?.locale) setLocale(config.locale);
    init(initialDocument, callbacks, persistenceAdapter, config);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update callbacks when they change
  useEffect(() => {
    if (callbacks) setCallbacks(callbacks);
  }, [callbacks, setCallbacks]);

  // Print handler (native browser print dialog in clean window)
  const handlePrint = useCallback(() => {
    const pageEl = document.querySelector('.pdfb-page') as HTMLElement;
    if (!pageEl) return;
    const doc = useEditorStore.getState().document;
    openPrintWindow(pageEl, doc);
  }, []);

  // Get document helper for toolbar slot
  const getDocument = useCallback(() => useEditorStore.getState().document, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const store = useEditorStore.getState();
      const isInput = (e.target as HTMLElement).tagName === 'INPUT'
        || (e.target as HTMLElement).tagName === 'TEXTAREA'
        || (e.target as HTMLElement).isContentEditable;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); }
        if (e.key === 'z' && e.shiftKey)  { e.preventDefault(); store.redo(); }
        if (e.key === 'y')  { e.preventDefault(); store.redo(); }
        if (e.key === 's')  { e.preventDefault(); store.save(); }
        if (e.key === 'p')  { e.preventDefault(); handlePrint(); }
        if (e.key === 'c' && store.selection.blockId) {
          // Only intercept Ctrl+C if no text is selected in a rich-text editor.
          // If text IS selected (e.g. inside TipTap), let the browser handle native copy.
          const sel = window.getSelection();
          const hasTextSelected = sel && sel.toString().length > 0;
          if (!hasTextSelected) {
            e.preventDefault();
            store.copyBlock(store.selection.blockId);
          }
        }
        // Ctrl+V is handled entirely by the 'paste' event listener below
        // to allow detecting clipboard image data before deciding what to paste.
        if (e.key === 'd' && !isInput && store.selection.blockId) {
          e.preventDefault();
          store.duplicateContentBlock(store.selection.blockId);
        }
      }
      if (e.key === 'Escape') {
        store.deselectBlock();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput && store.selection.blockId) {
        store.removeContentBlock(store.selection.blockId);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handlePrint]);

  // Unified paste handler — covers both image paste and block paste.
  // Lives here so we can inspect clipboard data before deciding the action.
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      const isNativeInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Let the browser handle paste inside native text inputs / rich-text editors
      if (isNativeInput) return;

      const store = useEditorStore.getState();
      const selectedId = store.selection.blockId;
      const items = Array.from(e.clipboardData?.items ?? []);
      const imgItem = items.find(i => i.type.startsWith('image/'));

      // ── Case 1: clipboard has an image ────────────────────────
      if (imgItem) {
        // If an image block is focused, paste into it
        if (selectedId) {
          for (const stripe of store.document.blocks) {
            for (const structure of stripe.children) {
              for (const column of structure.columns) {
                const block = column.children.find(b => b.id === selectedId);
                if (block?.type === 'image') {
                  e.preventDefault();
                  const file = imgItem.getAsFile();
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () =>
                    store.updateContentBlock(selectedId, { src: reader.result as string } as any);
                  reader.readAsDataURL(file);
                  return;
                }
              }
            }
          }
        }
        // No image block focused — fall through to block paste below
      }

      // ── Case 2: paste a copied block ──────────────────────────
      if (store._clipboard) {
        e.preventDefault();
        store.pasteBlock();
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  // Imperative handle
  useImperativeHandle(ref, () => ({
    print() {
      const pageEl = document.querySelector('.pdfb-page') as HTMLElement;
      if (!pageEl) return;
      openPrintWindow(pageEl, useEditorStore.getState().document);
    },
    getDocument() {
      return useEditorStore.getState().document;
    },
    setDocument(doc) {
      useEditorStore.getState().setDocument(doc);
    },
    undo() {
      useEditorStore.getState().undo();
    },
    redo() {
      useEditorStore.getState().redo();
    },
    addBlock(type: BlockType, stripeId?: string, position?: number) {
      const store = useEditorStore.getState();
      const blocks = store.document.blocks;
      if (stripeId) {
        const stripe = blocks.find(b => b.id === stripeId);
        if (stripe && stripe.children.length > 0) {
          const structure = stripe.children[0];
          if (structure.columns.length > 0) {
            store.addContentBlock(stripeId, structure.id, structure.columns[0].id, type, position);
          }
        }
      } else if (blocks.length > 0) {
        const lastStripe = blocks[blocks.length - 1];
        const lastStructure = lastStripe.children[lastStripe.children.length - 1];
        if (lastStructure?.columns.length > 0) {
          store.addContentBlock(lastStripe.id, lastStructure.id, lastStructure.columns[0].id, type, position);
        }
      }
    },
    selectBlock(id) {
      useEditorStore.getState().selectBlock(id);
    },
    toJSON() {
      return JSON.stringify(useEditorStore.getState().document, null, 2);
    },
    fromJSON(json) {
      useEditorStore.getState().setDocument(JSON.parse(json));
    },
    setTheme(theme) {
      useEditorStore.getState().setTheme(theme);
    },
    getTheme() {
      return useEditorStore.getState().ui.theme;
    },
  }));

  return (
    <EditorConfigContext.Provider value={config ?? {}}>
    <div ref={canvasRef} className={className} style={{ width: '100%', height: '100%', ...style }}>
      <EditorShell
        showToolbar={config?.showToolbar !== false}
        showSidebar={config?.showSidebar !== false}
        showRightPanel={config?.showRightPanel !== false}
        onBack={onBack}
        toolbarActions={toolbarActions ? toolbarActions(getDocument) : undefined}
      />
    </div>
    </EditorConfigContext.Provider>
  );
});
