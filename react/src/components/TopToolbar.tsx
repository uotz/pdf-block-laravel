import React, { useCallback, useState } from 'react';
import {
  Undo2, Redo2, Eye, Code, Save, Download,
  ArrowLeft, ZoomIn, ZoomOut, Trash2, Loader2, Printer, Sun, Moon,
} from 'lucide-react';
import { useEditorStore } from '../store';
import { t } from '../i18n';
import { openPrintWindow } from '../export/pdf';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface TopToolbarProps {
  onExportPDF?: () => Promise<void> | void;
  onBack?: () => void;
}

export function TopToolbar({ onExportPDF, onBack }: TopToolbarProps) {
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
  const exporting = useEditorStore(s => s.ui.exporting);
  const setExporting = useEditorStore(s => s.setExporting);
  const blocksCount = useEditorStore(s => s.document.blocks.length);
  const theme = useEditorStore(s => s.ui.theme);
  const setTheme = useEditorStore(s => s.setTheme);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;

  const handleExport = useCallback(async () => {
    if (!onExportPDF || exporting) return;
    setExporting(true);
    try {
      await onExportPDF();
    } finally {
      setExporting(false);
    }
  }, [onExportPDF, exporting, setExporting]);

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
      <div className="pdfb-toolbar-group">
        <button className="pdfb-toolbar-btn" onClick={undo} disabled={!canUndo} title={t('toolbar.undo')} type="button">
          <Undo2 size={18} />
        </button>
        <button className="pdfb-toolbar-btn" onClick={redo} disabled={!canRedo} title={t('toolbar.redo')} type="button">
          <Redo2 size={18} />
        </button>
      </div>

      <div className="pdfb-toolbar-divider" />

      {/* Zoom */}
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

      <div className="pdfb-toolbar-divider" />

      {/* Actions */}
      <div className="pdfb-toolbar-group">
        <button
          className="pdfb-toolbar-btn"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
          type="button"
        >
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>
        <button className="pdfb-toolbar-btn" onClick={handleClear} disabled={blocksCount === 0} title="Limpar canvas" type="button">
          <Trash2 size={18} />
        </button>
        <button className={`pdfb-toolbar-btn ${codeEditorOpen ? 'active' : ''}`} onClick={toggleCodeEditor} title={t('toolbar.code')} type="button">
          <Code size={18} />
        </button>
        <button className={`pdfb-toolbar-btn ${previewOpen ? 'active' : ''}`} onClick={() => setPreviewOpen(!previewOpen)} title={t('toolbar.preview')} type="button">
          <Eye size={18} />
        </button>
        <button className="pdfb-toolbar-btn" onClick={handlePrint} title="Imprimir / Salvar PDF (Ctrl+P)" type="button">
          <Printer size={18} />
        </button>
        <button className="pdfb-toolbar-btn" onClick={save} title={t('toolbar.save')} type="button">
          <Save size={18} />
        </button>
        <button
          className="pdfb-toolbar-btn pdfb-toolbar-btn--primary"
          onClick={handleExport}
          disabled={exporting}
          title={t('toolbar.export')}
          type="button"
        >
          {exporting ? <Loader2 size={18} className="pdfb-spin" /> : <Download size={18} />}
          <span>{exporting ? 'Exportando...' : t('toolbar.export')}</span>
        </button>
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
