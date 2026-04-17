import { useCallback } from 'react';
import { useEditorStore } from '../store';
import { openPrintWindow } from '../export/print';

/**
 * Hook for print operations.
 * PDF export is handled externally (e.g. via a server-side endpoint).
 */
export function useExport() {
  const print = useCallback(() => {
    const pageEl = window.document.querySelector('.pdfb-page') as HTMLElement;
    if (!pageEl) return;
    openPrintWindow(pageEl, useEditorStore.getState().document);
  }, []);

  return {
    /** Trigger browser print dialog (Ctrl+P) */
    print,
  };
}
