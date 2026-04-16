import { useEditorStore } from '../store';
import type { AnyBlock, StripeBlock } from '../types';

function findBlockById(blocks: StripeBlock[], id: string): AnyBlock | null {
  for (const stripe of blocks) {
    if (stripe.id === id) return stripe;
    for (const structure of stripe.children) {
      if (structure.id === id) return structure;
      for (const column of structure.columns) {
        for (const content of column.children) {
          if (content.id === id) return content;
        }
      }
    }
  }
  return null;
}

/**
 * Hook to manage block selection state.
 */
export function useSelection() {
  const selection = useEditorStore(s => s.selection);
  const blocks = useEditorStore(s => s.document.blocks);
  const selectBlock = useEditorStore(s => s.selectBlock);
  const deselectBlock = useEditorStore(s => s.deselectBlock);

  const selectedBlock = selection.blockId
    ? findBlockById(blocks, selection.blockId)
    : null;

  return {
    /** Currently selected block ID */
    selectedId: selection.blockId,
    /** Path to the selected block */
    path: selection.path,
    /** The selected block data (or null) */
    selectedBlock,
    /** Select a block by ID */
    select: (id: string, path?: string[]) => selectBlock(id, path),
    /** Clear selection */
    deselect: deselectBlock,
    /** Whether anything is selected */
    hasSelection: selection.blockId !== null,
  };
}
