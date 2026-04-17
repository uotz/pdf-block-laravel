import React, { useCallback, useState } from 'react';
import {
  Undo2, Redo2, Eye, Code, Save,
  ArrowLeft, ZoomIn, ZoomOut, Trash2, Printer, Sun, Moon,
} from 'lucide-react';
import { useEditorStore } from '../store';
import { t } from '../i18n';
import { openPrintWindow } from '../export/print';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { useEditorConfig } from './EditorConfig';

interface TopToolbarProps {
  onBack?: () => void;
  /** Slot for extra actions (e.g. external export button) */
  toolbarActions?: React.ReactNode;
}

export function TopToolbar({ onBack, toolbarActions }: TopToolbarProps) {
  const config = useEditorConfig();
  const rawBtn = config.toolbarButtons;
  const btn = rawBtn === false ? {} : (rawBtn ?? {});
  const show = rawBtn === false
    ? { theme: false, undoRedo: false, zoom: false, clear: false, code: false, preview: false, print: false, save: false }
    : {
        theme:    btn.theme    !== false,
        undoRedo: btn.undoRedo !== false,
        zoom:     btn.zoom     !== false,
        clear:    btn.clear    !== false,
        code:     btn.code     !== false,
        preview:  btn.preview  !== false,
        print:    btn.print    !== false,
        save:     btn.save     !== false,
      };

  const title = useEditorStore(s => s.document.meta.title);
  const doc = useEditorStore(s => s.document);
  const updateMeta = useEditorStore(s => s.updateMeta);
  const undo = useEditorStore(s => s.undo);
  const redo = useEditorStore(s => s.redo);
  const save = useEditorStore(s => s.save);
  const historyIndex = useEditorStore(s => s._historyIndex);
  const historyLength = useEditorStore(s => s._history.length);
  const codeEditorOpen = useEditorStore(s => s.ui.codeEditorOpen);
  const toggleCodeEditor = useEditorStore(s => s.toggleCodeEditor);
  const previewOpen = useEditorStore(s => s.ui.previewOpen);
  const setPreviewOpen = useEditorStore(s => s.setPreviewOpen);
  const zoom = useEditorStore(s => s.ui.zoom);
  const setZoom = useEditorStore(s => s.setZoom);
  const clearCanvas = useEditorStore(s => s.clearCanvas);
  const blocksCount = useEditorStore(s => s.document.blocks.length);
  const theme = useEditorStore(s => s.ui.theme);
  const setTheme = useEditorStore(s => s.setTheme);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;

  const handlePrint = useCallback(() => {
    const pageEl = window.document.querySelector('.pdfb-page') as HTMLElement;
    if (!pageEl) return;
    openPrintWindow(pageEl, doc);
  }, [doc]);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClear = useCallback(() => {
    if (blocksCount === 0) return;
    setShowClearConfirm(true);
  }, [blocksCount]);

  return (
    <>
      <div className="pdfb-toolbar">
      {/* Left: back + title */}
      <div className="pdfb-toolbar-group">
        {onBack && (
          <button className="pdfb-toolbar-btn" onClick={onBack} title={t('toolbar.back')} type="button">
            <ArrowLeft size={18} />
          </button>
        )}
        <input
          className="pdfb-toolbar-title"
          value={title}
          onChange={e => updateMeta({ title: e.target.value })}
          style={{ background: 'transparent', border: 'none', outline: 'none', width: Math.max(120, title.length * 9), cursor: 'text' }}
        />
      </div>

      <div className="pdfb-toolbar-spacer" />

      {/* Undo / Redo */}
      {show.undoRedo && (
        <div className="pdfb-toolbar-group">
          <button className="pdfb-toolbar-btn" onClick={undo} disabled={!canUndo} title={t('toolbar.undo')} type="button">
            <Undo2 size={18} />
          </button>
          <button className="pdfb-toolbar-btn" onClick={redo} disabled={!canRedo} title={t('toolbar.redo')} type="button">
            <Redo2 size={18} />
          </button>
        </div>
      )}

      {show.undoRedo && <div className="pdfb-toolbar-divider" />}

      {/* Zoom */}
      {show.zoom && (
        <div className="pdfb-toolbar-group">
          <button className="pdfb-toolbar-btn" onClick={() => setZoom(Math.max(50, zoom - 10))} title="Reduzir zoom" type="button">
            <ZoomOut size={16} />
          </button>
          <button
            className="pdfb-toolbar-btn"
            onClick={() => setZoom(100)}
            title="Resetar zoom para 100%"
            type="button"
            style={{ fontSize: 11, minWidth: 38, fontVariantNumeric: 'tabular-nums' }}
          >
            {zoom}%
          </button>
          <button className="pdfb-toolbar-btn" onClick={() => setZoom(Math.min(200, zoom + 10))} title="Aumentar zoom" type="button">
            <ZoomIn size={16} />
          </button>
        </div>
      )}

      {show.zoom && <div className="pdfb-toolbar-divider" />}

      {/* Actions */}
      <div className="pdfb-toolbar-group">
        {show.theme && (
          <button
            className="pdfb-toolbar-btn"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
            type="button"
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        )}
        {show.clear && (
          <button className="pdfb-toolbar-btn" onClick={handleClear} disabled={blocksCount === 0} title="Limpar canvas" type="button">
            <Trash2 size={18} />
          </button>
        )}
        {show.code && (
          <button className={`pdfb-toolbar-btn ${codeEditorOpen ? 'active' : ''}`} onClick={toggleCodeEditor} title={t('toolbar.code')} type="button">
            <Code size={18} />
          </button>
        )}
        {show.preview && (
          <button className={`pdfb-toolbar-btn ${previewOpen ? 'active' : ''}`} onClick={() => setPreviewOpen(!previewOpen)} title={t('toolbar.preview')} type="button">
            <Eye size={18} />
          </button>
        )}
        {show.print && (
          <button className="pdfb-toolbar-btn" onClick={handlePrint} title="Imprimir / Salvar PDF (Ctrl+P)" type="button">
            <Printer size={18} />
          </button>
        )}
        {show.save && (
          <button className="pdfb-toolbar-btn" onClick={save} title={t('toolbar.save')} type="button">
            <Save size={18} />
          </button>
        )}
        {toolbarActions}
      </div>
      </div>
      {showClearConfirm && (
        <ConfirmDialog
          title="Limpar canvas"
          message="Tem certeza que deseja limpar todo o conteúdo do canvas? Esta ação não pode ser desfeita."
          confirmLabel="Limpar"
          danger
          onConfirm={() => { clearCanvas(); setShowClearConfirm(false); }}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </>
  );
}
