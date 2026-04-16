/**
 * EditorConfigContext — provides developer-facing configuration to deep
 * components without prop-drilling.  Wrap your component tree with
 * <EditorConfigContext.Provider value={config}> if you use EditorShell
 * directly; PDFBuilder does this automatically via its `config` prop.
 */
import { createContext, useContext } from 'react';
import type { PDFBuilderConfig } from '../types';

export const EditorConfigContext = createContext<PDFBuilderConfig>({});

export function useEditorConfig(): PDFBuilderConfig {
  return useContext(EditorConfigContext);
}

/** Returns whether the current user may unlock the given block. */
export function useCanUnlock(blockId: string): boolean {
  const config = useEditorConfig();
  if (!config.canUnlock) return true;   // default: always allowed
  return config.canUnlock(blockId);
}
