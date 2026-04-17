import { useState, useEffect, useCallback } from 'react';
import { useEditorConfig } from '../components/EditorConfig';
import { useEditorStore } from '../store';
import type { Template, TemplateAdapter } from '../templates';
import { localStorageTemplateAdapter } from '../templates';
import { BUILTIN_TEMPLATES } from '../templates/index';

/**
 * Hook for managing templates.
 *
 * Resolution order for the adapter:
 *   1. `config.templateAdapter` (from PDFBuilderConfig)
 *   2. `localStorageTemplateAdapter` (default fallback)
 *
 * Built-in templates come from two sources:
 *   1. `BUILTIN_TEMPLATES` (system templates, always present)
 *   2. `config.templates` (developer-provided via config)
 * All are marked as `builtIn: true` so they can't be deleted.
 */
export function useTemplates() {
  const config = useEditorConfig();
  const setDocument = useEditorStore(s => s.setDocument);

  const adapter: TemplateAdapter = config.templateAdapter ?? localStorageTemplateAdapter;
  const builtInTemplates: Template[] = [
    ...BUILTIN_TEMPLATES.map(t => ({ ...t, builtIn: true as const })),
    ...(config.templates ?? []).map(t => ({ ...t, builtIn: true as const })),
  ];

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const userTemplates = await adapter.list();
      // Built-in first, then user templates sorted by most recent
      setTemplates([
        ...builtInTemplates,
        ...userTemplates.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ]);
    } catch (err) {
      console.error('[pdf-block] Failed to load templates:', err);
      setTemplates([...builtInTemplates]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter]);

  useEffect(() => { refresh(); }, [refresh]);

  const saveTemplate = useCallback(async (name: string, description?: string) => {
    const doc = useEditorStore.getState().document;
    const saved = await adapter.save({
      name,
      description,
      document: JSON.parse(JSON.stringify(doc)),
    });
    await refresh();
    return saved;
  }, [adapter, refresh]);

  const deleteTemplate = useCallback(async (id: string) => {
    await adapter.delete(id);
    await refresh();
  }, [adapter, refresh]);

  const applyTemplate = useCallback((template: Template) => {
    const docCopy = JSON.parse(JSON.stringify(template.document));
    setDocument(docCopy);
  }, [setDocument]);

  return {
    templates,
    loading,
    saveTemplate,
    deleteTemplate,
    applyTemplate,
    refresh,
  };
}
