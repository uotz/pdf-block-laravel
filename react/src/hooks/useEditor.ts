import { useEditorStore } from '../store';
import type { BlockType, ViewMode, SidebarPanel, RightPanelTab } from '../types';

/**
 * Hook to access editor UI state and block manipulation actions.
 */
export function useEditor() {
  const ui = useEditorStore(s => s.ui);
  const blocks = useEditorStore(s => s.document.blocks);
  const undo = useEditorStore(s => s.undo);
  const redo = useEditorStore(s => s.redo);
  const historyIndex = useEditorStore(s => s._historyIndex);
  const historyLength = useEditorStore(s => s._history.length);

  const setViewMode = useEditorStore(s => s.setViewMode);
  const setSidebarPanel = useEditorStore(s => s.setSidebarPanel);
  const setRightPanelTab = useEditorStore(s => s.setRightPanelTab);

  const addStripe = useEditorStore(s => s.addStripe);
  const removeStripe = useEditorStore(s => s.removeStripe);
  const addContentBlock = useEditorStore(s => s.addContentBlock);
  const removeContentBlock = useEditorStore(s => s.removeContentBlock);
  const duplicateContentBlock = useEditorStore(s => s.duplicateContentBlock);
  const updateContentBlock = useEditorStore(s => s.updateContentBlock);

  return {
    // UI state
    viewMode: ui.viewMode,
    sidebarPanel: ui.sidebarPanel,
    rightPanelTab: ui.rightPanelTab,
    isDragging: ui.isDragging,

    // UI actions
    setViewMode: (mode: ViewMode) => setViewMode(mode),
    setSidebarPanel: (panel: SidebarPanel | null) => setSidebarPanel(panel),
    setRightPanelTab: (tab: RightPanelTab) => setRightPanelTab(tab),

    // History
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < historyLength - 1,

    // Block operations
    /** All top-level stripes */
    blocks,
    /** Add a new stripe */
    addStripe,
    /** Remove a stripe by ID */
    removeStripe,
    /** Add a content block to a specific column */
    addContentBlock,
    /** Remove a content block */
    removeContentBlock,
    /** Duplicate a content block */
    duplicateContentBlock,
    /** Update a content block's properties */
    updateContentBlock,
  };
}
