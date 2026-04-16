import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';

interface ActiveEditorContextValue {
  activeEditor: Editor | null;
  activeBlockId: string | null;
  /** Call when a text editor receives focus. Cancels any pending deactivation timer. */
  registerEditor: (editor: Editor, blockId: string) => void;
  /** Call when a text editor loses focus. Deactivates after 150 ms unless focus moved to toolbar. */
  unregisterEditor: () => void;
}

export const ActiveEditorCtx = createContext<ActiveEditorContextValue>({
  activeEditor: null,
  activeBlockId: null,
  registerEditor: () => {},
  unregisterEditor: () => {},
});

export function ActiveEditorProvider({ children }: { children: React.ReactNode }) {
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerEditor = useCallback((editor: Editor, blockId: string) => {
    // Cancel any pending deactivation (e.g. user switched from one text block to another)
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setActiveEditor(editor);
    setActiveBlockId(blockId);
  }, []);

  const unregisterEditor = useCallback(() => {
    // Delay so that clicking a toolbar button (which briefly blurs the editor before the
    // mousedown preventDefault kicks in) or moving focus to the link input inside the
    // toolbar doesn't immediately hide it.
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const toolbar = document.getElementById('pdfb-text-format-toolbar');
      // If focus is now inside the toolbar (e.g. font-size widget), keep it alive.
      if (toolbar?.contains(document.activeElement)) return;
      // If a color picker portal is open and has focus, keep it alive.
      if (document.querySelector('.pdfb-color-popover')?.contains(document.activeElement)) return;
      // If the link popover is open and has focus, keep it alive.
      if (document.querySelector('.pdfb-link-popover')?.contains(document.activeElement)) return;
      setActiveEditor(null);
      setActiveBlockId(null);
    }, 150);
  }, []);

  return (
    <ActiveEditorCtx.Provider value={{ activeEditor, activeBlockId, registerEditor, unregisterEditor }}>
      {children}
    </ActiveEditorCtx.Provider>
  );
}

export function useActiveEditor() {
  return useContext(ActiveEditorCtx);
}
