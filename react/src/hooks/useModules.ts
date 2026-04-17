import { useState, useEffect, useCallback } from 'react';
import { useEditorConfig } from '../components/EditorConfig';
import { useEditorStore, deepCloneBlock } from '../store';
import type { Module, ModuleAdapter } from '../modules';
import { localStorageModuleAdapter } from '../modules';

/**
 * Hook for managing modules (saved stripes).
 *
 * Resolution order for the adapter:
 *   1. `config.moduleAdapter` (from PDFBuilderConfig)
 *   2. `localStorageModuleAdapter` (default fallback)
 */
export function useModules() {
  const config = useEditorConfig();
  const addStripe = useEditorStore(s => s.addStripe);

  const adapter: ModuleAdapter = config.moduleAdapter ?? localStorageModuleAdapter;

  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adapter.list();
      setModules(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (err) {
      console.error('[pdf-block] Failed to load modules:', err);
      setModules([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter]);

  useEffect(() => { refresh(); }, [refresh]);

  const saveModule = useCallback(async (name: string, stripeId: string) => {
    const stripe = useEditorStore.getState().document.blocks.find(b => b.id === stripeId);
    if (!stripe) return;
    const saved = await adapter.save({
      name,
      block: JSON.parse(JSON.stringify(stripe)),
    });
    await refresh();
    return saved;
  }, [adapter, refresh]);

  const deleteModule = useCallback(async (id: string) => {
    await adapter.delete(id);
    await refresh();
  }, [adapter, refresh]);

  const applyModule = useCallback((mod: Module, position?: number) => {
    const freshBlock = deepCloneBlock(mod.block);
    addStripe(freshBlock, position);
  }, [addStripe]);

  return {
    modules,
    loading,
    saveModule,
    deleteModule,
    applyModule,
    refresh,
  };
}
