import React, { useCallback } from 'react';
import {
  ChevronUp, ChevronDown, Copy, Trash2, Lock, Unlock,
  Puzzle, GripVertical, Clipboard, Eye, EyeOff,
} from 'lucide-react';
import { useEditorStore } from '../store';
import { useModules } from '../hooks/useModules';
import { t } from '../i18n';
import type { BlockType } from '../types';

interface FloatingToolbarProps {
  blockId: string;
  blockType: BlockType | 'stripe' | 'structure';
  stripeId: string;
  /** For content blocks: the structure that contains this block */
  structureId?: string;
  /** For content blocks: the column that contains this block */
  columnId?: string;
  /** DnD listeners + attributes from useSortable — attached only to the grip handle */
  dragListeners?: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragAttributes?: any;
  /** Called when user clicks the copy button */
  onCopy?: () => void;
}

export function FloatingToolbar({
  blockId, blockType, stripeId, structureId, columnId, dragListeners, dragAttributes, onCopy,
}: FloatingToolbarProps) {
  const duplicateStripe       = useEditorStore(s => s.duplicateStripe);
  const removeStripe          = useEditorStore(s => s.removeStripe);
  const moveStripe            = useEditorStore(s => s.moveStripe);
  const moveStructure         = useEditorStore(s => s.moveStructure);
  const moveContentBlock      = useEditorStore(s => s.moveContentBlock);
  const duplicateContentBlock = useEditorStore(s => s.duplicateContentBlock);
  const removeContentBlock    = useEditorStore(s => s.removeContentBlock);
  const removeStructure       = useEditorStore(s => s.removeStructure);
  const updateBlockMeta       = useEditorStore(s => s.updateBlockMeta);
  const blocks                = useEditorStore(s => s.document.blocks);
  const { saveModule }        = useModules();

  const block = (() => {
    for (const stripe of blocks) {
      if (stripe.id === blockId) return stripe;
      for (const structure of stripe.children) {
        if (structure.id === blockId) return structure;
        for (const column of structure.columns)
          for (const content of column.children)
            if (content.id === blockId) return content;
      }
    }
    return null;
  })();

  const isLocked    = block?.meta.locked ?? false;
  const isHidden    = block?.meta.hideOnExport ?? false;
  const isStripe    = blockType === 'stripe';
  const isStructure = blockType === 'structure';
  const isContent   = !isStripe && !isStructure;

  // ── Move up/down ──────────────────────────────────────────────
  const handleMoveUp = useCallback(() => {
    if (isStripe) {
      const idx = blocks.findIndex(b => b.id === blockId);
      if (idx > 0) moveStripe(blockId, idx - 1);
      return;
    }
    if (isStructure) {
      const stripe = blocks.find(b => b.id === stripeId);
      if (!stripe) return;
      const idx = stripe.children.findIndex(c => c.id === blockId);
      if (idx > 0) moveStructure(stripeId, blockId, idx - 1);
      return;
    }
    if (isContent && structureId && columnId) {
      const stripe = blocks.find(b => b.id === stripeId);
      const structure = stripe?.children.find(c => c.id === structureId);
      const column = structure?.columns.find(c => c.id === columnId);
      const idx = column?.children.findIndex(b => b.id === blockId) ?? -1;
      if (idx > 0) moveContentBlock(blockId, stripeId, structureId, columnId, idx - 1);
    }
  }, [blockId, isStripe, isStructure, isContent, blocks, stripeId, structureId, columnId, moveStripe, moveStructure, moveContentBlock]);

  const handleMoveDown = useCallback(() => {
    if (isStripe) {
      const idx = blocks.findIndex(b => b.id === blockId);
      if (idx < blocks.length - 1) moveStripe(blockId, idx + 1);
      return;
    }
    if (isStructure) {
      const stripe = blocks.find(b => b.id === stripeId);
      if (!stripe) return;
      const idx = stripe.children.findIndex(c => c.id === blockId);
      if (idx !== -1 && idx < stripe.children.length - 1) moveStructure(stripeId, blockId, idx + 1);
      return;
    }
    if (isContent && structureId && columnId) {
      const stripe = blocks.find(b => b.id === stripeId);
      const structure = stripe?.children.find(c => c.id === structureId);
      const column = structure?.columns.find(c => c.id === columnId);
      const idx = column?.children.findIndex(b => b.id === blockId) ?? -1;
      if (idx !== -1 && idx < (column?.children.length ?? 0) - 1)
        moveContentBlock(blockId, stripeId, structureId, columnId, idx + 1);
    }
  }, [blockId, isStripe, isStructure, isContent, blocks, stripeId, structureId, columnId, moveStripe, moveStructure, moveContentBlock]);

  const handleDuplicate = useCallback(() => {
    if (isStripe)     { duplicateStripe(blockId); return; }
    if (!isStructure) { duplicateContentBlock(blockId); }
  }, [blockId, isStripe, isStructure, duplicateStripe, duplicateContentBlock]);

  const handleDelete = useCallback(() => {
    if (isLocked) return;
    if (isStripe)     { removeStripe(blockId); return; }
    if (isStructure)  { removeStructure(stripeId, blockId); return; }
    removeContentBlock(blockId);
  }, [blockId, isStripe, isStructure, isLocked, removeStripe, removeStructure, removeContentBlock, stripeId]);

  const handleToggleLock = useCallback(() => {
    updateBlockMeta(blockId, { locked: !isLocked });
  }, [blockId, isLocked, updateBlockMeta]);

  const handleSaveModule = useCallback(() => {
    const name = prompt('Nome do módulo:');
    if (name) saveModule(name, stripeId);
  }, [stripeId, saveModule]);

  return (
    <div className="pdfb-floating-toolbar" onClick={e => e.stopPropagation()}>
      {/* Grip handle — the ONLY element that initiates drag */}
      <button
        className="pdfb-floating-btn pdfb-floating-btn--grip"
        title="Arrastar para mover"
        type="button"
        {...dragListeners}
        {...dragAttributes}
      >
        <GripVertical size={14} />
      </button>

      <span className="pdfb-floating-sep" />

      <button className="pdfb-floating-btn" onClick={handleMoveUp} title={t('float.moveUp')} type="button">
        <ChevronUp size={14} />
      </button>
      <button className="pdfb-floating-btn" onClick={handleMoveDown} title={t('float.moveDown')} type="button">
        <ChevronDown size={14} />
      </button>

      <span className="pdfb-floating-sep" />

      <button
        className={`pdfb-floating-btn ${isLocked ? 'pdfb-floating-btn--locked' : ''}`}
        onClick={handleToggleLock}
        title={isLocked ? 'Desbloquear' : 'Bloquear'}
        type="button"
      >
        {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
      </button>

      {onCopy && (
        <button className="pdfb-floating-btn" onClick={onCopy} title="Copiar (Ctrl+C)" type="button">
          <Clipboard size={14} />
        </button>
      )}

      <button
        className={`pdfb-floating-btn ${isHidden ? 'pdfb-floating-btn--active-warning' : ''}`}
        onClick={() => updateBlockMeta(blockId, { hideOnExport: !isHidden })}
        title={isHidden ? 'Mostrar no PDF' : 'Ocultar do PDF'}
        type="button"
      >
        {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>

      <button className="pdfb-floating-btn" onClick={handleDuplicate} title={t('float.duplicate')} type="button">
        <Copy size={14} />
      </button>

      {isStripe && (
        <button className="pdfb-floating-btn" onClick={handleSaveModule} title={t('float.saveModule')} type="button">
          <Puzzle size={14} />
        </button>
      )}

      <span className="pdfb-floating-sep" />

      <button
        className="pdfb-floating-btn pdfb-floating-btn--danger"
        onClick={handleDelete}
        title={t('float.delete')}
        type="button"
        disabled={isLocked}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
