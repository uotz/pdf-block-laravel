import React, { useState, useCallback } from 'react';
import {
  ChevronDown, ChevronRight, Eye, EyeOff, Lock, Unlock,
  Type, Image, Minus, SquareMousePointer, MoveVertical,
  ImagePlay, Table, QrCode, BarChart3, SeparatorHorizontal,
  Layers, AlignJustify,
} from 'lucide-react';
import { useEditorStore } from '../store';
import { t } from '../i18n';
import type { StripeBlock, StructureBlock, Column, ContentBlock } from '../types';
import type { LucideIcon } from 'lucide-react';

const BLOCK_ICONS: Record<string, LucideIcon> = {
  text: Type, image: Image, button: SquareMousePointer, divider: Minus,
  spacer: MoveVertical, banner: ImagePlay, table: Table,
  qrcode: QrCode, chart: BarChart3, pagebreak: SeparatorHorizontal,
};

// ─── Generic tree row ────────────────────────────────────────
function TreeItem({
  label, depth, isSelected, isLocked, isHidden,
  icon: Icon, onSelect, onToggleLock, onToggleHide, hasChildren, expanded,
  onToggleExpand,
}: {
  label: string; depth: number;
  isSelected: boolean; isLocked: boolean; isHidden: boolean;
  icon?: LucideIcon;
  onSelect: () => void;
  onToggleLock: () => void;
  onToggleHide: () => void;
  hasChildren?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  return (
    <div
      className={`pdfb-tree-row ${isSelected ? 'selected' : ''} ${isHidden ? 'hidden' : ''}`}
      style={{ paddingLeft: 8 + depth * 14 }}
      onClick={onSelect}
    >
      {/* Expand chevron — only for nodes with children */}
      {hasChildren ? (
        <button
          type="button"
          className="pdfb-tree-collapse"
          style={{ padding: 0, height: 'auto', width: 16, marginRight: -4 }}
          onClick={e => { e.stopPropagation(); onToggleExpand?.(); }}
        >
          {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
      ) : (
        <span style={{ width: 12, flexShrink: 0 }} />
      )}

      {Icon
        ? <Icon size={12} className="pdfb-tree-icon" />
        : <Layers size={12} className="pdfb-tree-icon" />
      }

      <span className="pdfb-tree-label" title={label}>{label}</span>

      <div className="pdfb-tree-actions" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          className={`pdfb-tree-btn ${isHidden ? 'active' : ''}`}
          onClick={onToggleHide}
          title={isHidden ? 'Mostrar' : 'Ocultar'}
        >
          {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
        </button>
        <button
          type="button"
          className={`pdfb-tree-btn ${isLocked ? 'active' : ''}`}
          onClick={onToggleLock}
          title={isLocked ? 'Destravar' : 'Travar'}
        >
          {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>
      </div>
    </div>
  );
}

// ─── Scroll block into view ───────────────────────────────────
function scrollToBlock(blockId: string) {
  setTimeout(() => {
    const el = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
}

// ─── Content block leaf ───────────────────────────────────────
function BlockLeaf({
  block, path, depth,
}: {
  block: ContentBlock;
  path: [string, string, string, string];
  depth: number;
}) {
  const selectedId      = useEditorStore(s => s.selection.blockId);
  const selectBlock     = useEditorStore(s => s.selectBlock);
  const updateBlockMeta = useEditorStore(s => s.updateBlockMeta);

  const Icon = BLOCK_ICONS[block.type];

  return (
    <TreeItem
      label={t(`block.${block.type}`)}
      depth={depth}
      isSelected={selectedId === block.id}
      isLocked={block.meta.locked}
      isHidden={block.meta.hideOnExport}
      icon={Icon}
      onSelect={() => {
        selectBlock(block.id, [...path]);
        scrollToBlock(block.id);
      }}
      onToggleLock={() => updateBlockMeta(block.id, { locked: !block.meta.locked })}
      onToggleHide={() => updateBlockMeta(block.id, { hideOnExport: !block.meta.hideOnExport })}
    />
  );
}

// ─── Column branch ────────────────────────────────────────────
function ColumnBranch({
  column, stripeId, structId, depth,
}: {
  column: Column; stripeId: string; structId: string; depth: number;
}) {
  const [open, setOpen] = useState(true);

  if (column.children.length === 0) return null;

  return (
    <>
      <TreeItem
        label={`Coluna (${Math.round(column.width)}%)`}
        depth={depth}
        isSelected={false}
        isLocked={false}
        isHidden={false}
        icon={AlignJustify}
        onSelect={() => {}}
        onToggleLock={() => {}}
        onToggleHide={() => {}}
        hasChildren
        expanded={open}
        onToggleExpand={() => setOpen(o => !o)}
      />
      {open && column.children.map(block => (
        <BlockLeaf
          key={block.id}
          block={block}
          path={[stripeId, structId, column.id, block.id]}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

// ─── Structure branch ─────────────────────────────────────────
function StructureBranch({
  structure, stripeId, index, depth,
}: {
  structure: StructureBlock; stripeId: string; index: number; depth: number;
}) {
  const [open, setOpen] = useState(true);
  const selectedId      = useEditorStore(s => s.selection.blockId);
  const selectBlock     = useEditorStore(s => s.selectBlock);
  const updateBlockMeta = useEditorStore(s => s.updateBlockMeta);

  const colCount = structure.columns.length;
  const label = colCount === 1 ? 'Estrutura' : `Estrutura ${colCount} col.`;

  return (
    <>
      <TreeItem
        label={label}
        depth={depth}
        isSelected={selectedId === structure.id}
        isLocked={structure.meta.locked}
        isHidden={structure.meta.hideOnExport}
        onSelect={() => { selectBlock(structure.id, [stripeId, structure.id]); scrollToBlock(structure.id); }}
        onToggleLock={() => updateBlockMeta(structure.id, { locked: !structure.meta.locked })}
        onToggleHide={() => updateBlockMeta(structure.id, { hideOnExport: !structure.meta.hideOnExport })}
        hasChildren
        expanded={open}
        onToggleExpand={() => setOpen(o => !o)}
      />
      {open && structure.columns.map(col => (
        <ColumnBranch
          key={col.id}
          column={col}
          stripeId={stripeId}
          structId={structure.id}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

// ─── Stripe branch ────────────────────────────────────────────
function StripeBranch({ stripe, idx }: { stripe: StripeBlock; idx: number }) {
  const [open, setOpen] = useState(true);
  const selectedId      = useEditorStore(s => s.selection.blockId);
  const selectBlock     = useEditorStore(s => s.selectBlock);
  const updateBlockMeta = useEditorStore(s => s.updateBlockMeta);

  const label = `Faixa ${idx + 1}`;

  return (
    <div className="pdfb-tree-stripe">
      <TreeItem
        label={label}
        depth={0}
        isSelected={selectedId === stripe.id}
        isLocked={stripe.meta.locked}
        isHidden={stripe.meta.hideOnExport}
        onSelect={() => { selectBlock(stripe.id, [stripe.id]); scrollToBlock(stripe.id); }}
        onToggleLock={() => updateBlockMeta(stripe.id, { locked: !stripe.meta.locked })}
        onToggleHide={() => updateBlockMeta(stripe.id, { hideOnExport: !stripe.meta.hideOnExport })}
        hasChildren
        expanded={open}
        onToggleExpand={() => setOpen(o => !o)}
      />
      {open && stripe.children.map((structure, si) => (
        <StructureBranch
          key={structure.id}
          structure={structure}
          stripeId={stripe.id}
          index={si}
          depth={1}
        />
      ))}
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────
export function ComponentTree({ inPanel = false }: { inPanel?: boolean }) {
  const blocks = useEditorStore(s => s.document.blocks);

  return (
    <div className="pdfb-tree-panel">
      <div className="pdfb-sidebar-panel-header" style={{ fontSize: 13 }}>
        Árvore de componentes
      </div>
      <div className="pdfb-tree-body">
        {blocks.length === 0 ? (
          <div className="pdfb-tree-empty">Nenhum componente no documento</div>
        ) : (
          blocks.map((stripe, i) => (
            <StripeBranch key={stripe.id} stripe={stripe} idx={i} />
          ))
        )}
      </div>
    </div>
  );
}
