import { useEditorStore } from '../store';
import type { Document, PageSettings, GlobalStyles, DocumentMeta } from '../types';

/**
 * Hook to access and modify the document.
 * Use this in consumer applications to read/write the document state.
 */
export function useDocument() {
  const document = useEditorStore(s => s.document);
  const setDocument = useEditorStore(s => s.setDocument);
  const updateMeta = useEditorStore(s => s.updateMeta);
  const updatePageSettings = useEditorStore(s => s.updatePageSettings);
  const updateGlobalStyles = useEditorStore(s => s.updateGlobalStyles);
  const save = useEditorStore(s => s.save);

  return {
    /** The current document */
    document,
    /** Replace the entire document */
    setDocument,
    /** Update document metadata */
    updateMeta: (meta: Partial<DocumentMeta>) => updateMeta(meta),
    /** Update page settings */
    updatePageSettings: (settings: Partial<PageSettings>) => updatePageSettings(settings),
    /** Update global styles */
    updateGlobalStyles: (styles: Partial<GlobalStyles>) => updateGlobalStyles(styles),
    /** Trigger save (via persistence adapter) */
    save,
    /** Get document as JSON string */
    toJSON: () => JSON.stringify(document, null, 2),
  };
}
