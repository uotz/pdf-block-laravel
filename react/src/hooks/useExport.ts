import { useCallback } from 'react';
import { useEditorStore } from '../store';
import { exportToPDF, downloadPDF, openPrintWindow } from '../export/pdf';

/**
 * Hook for PDF export operations.
 */
export function useExport() {
  const document = useEditorStore(s => s.document);

  const exportPDF = useCallback(async (): Promise<Blob> => {
    const pageEl = window.document.querySelector('.pdfb-page') as HTMLElement;
    if (!pageEl) throw new Error('PDF Builder canvas not found');
    return exportToPDF(pageEl, document);
  }, [document]);

  const download = useCallback(async (filename?: string): Promise<void> => {
    const blob = await exportPDF();
    await downloadPDF(blob, filename || `${document.meta.title || 'document'}.pdf`);
  }, [exportPDF, document.meta.title]);

  const print = useCallback(() => {
    const pageEl = window.document.querySelector('.pdfb-page') as HTMLElement;
    if (!pageEl) return;
    openPrintWindow(pageEl, useEditorStore.getState().document);
  }, []);

  return {
    /** Export the current document as a PDF Blob */
    exportPDF,
    /** Export and trigger download */
    download,
    /** Trigger browser print dialog (Ctrl+P) */
    print,
  };
}
