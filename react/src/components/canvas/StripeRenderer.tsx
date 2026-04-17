import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Lock, Plus, Type, Image, Minus, SquareMousePointer,
  MoveVertical, ImagePlay,
} from 'lucide-react';
import { useEditorStore, createStructure, createContentBlock, createBannerStructure, createStripe } from '../../store';
import { blockStylesToCSS, backgroundToCSS } from '../../utils';
import { FloatingToolbar } from '../FloatingToolbar';
import { t } from '../../i18n';
import { renderContentBlock } from '../../blocks/renderers';
import type { StripeBlock, StructureBlock, Column, ContentBlock } from '../../types';

// ─── Lock context ─────────────────────────────────────────────
// Propagates effective lock state (direct OR inherited from parent).
export const ParentLockedCtx = createContext(false);

// ─── Quick-add popover ────────────────────────────────────────
const QUICK_TYPES: { type: string; label: string; icon: React.ReactNode }[] = [
  { type: 'text',      label: 'Texto',    icon: <Type size={15} /> },
  { type: 'image',     label: 'Imagem',   icon: <Image size={15} /> },
  { type: 'divider',   label: 'Divisor',  icon: <Minus size={15} /> },
  { type: 'button',    label: 'Botão',    icon: <SquareMousePointer size={15} /> },
  { type: 'spacer',    label: 'Espaço',   icon: <MoveVertical size={15} /> },
];

const QUICK_STRUCTURE_TYPES: typeof QUICK_TYPES = [
  ...QUICK_TYPES,
  { type: 'banner',    label: 'Banner',   icon: <ImagePlay size={15} /> },
];

function QuickAddButton({ stripeId, structureId, columnId, insertAtIndex, visible }: {
  stripeId: string; structureId: string; columnId: string;
  insertAtIndex: number; visible: boolean;
}) {
  // ALL hooks must be called unconditionally before any early return.
  const [open, setOpen] = useState(false);
  const addContentBlock = useEditorStore(s => s.addContentBlock);
  const addStructure    = useEditorStore(s => s.addStructure);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  // Early return AFTER all hooks
  if (!visible) return null;

  return (
    <div className="pdfb-quick-add-btn" ref={ref}>
      <button type="button" className="pdfb-quick-add-trigger"
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        title="Adicionar bloco aqui">
        <Plus size={12} />
      </button>
      {open && (
        <div className="pdfb-quick-add-popover" onClick={e => e.stopPropagation()}>
          {QUICK_STRUCTURE_TYPES.map(({ type, label, icon }) => (
            <button key={type} type="button" className="pdfb-quick-add-item"
              onClick={() => {
                if (type === 'banner') {
                  addStructure(stripeId, createBannerStructure());
                } else {
                  addContentBlock(stripeId, structureId, columnId, type as any, insertAtIndex);
                }
                setOpen(false);
              }} title={label}>
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Resize handle ────────────────────────────────────────────
function ResizeHandle({ direction, onDelta, onResizeEnd }: {
  direction: 'right' | 'bottom';
  onDelta: (dx: number, dy: number) => void;
  onResizeEnd?: () => void;
}) {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const onMove = (ev: MouseEvent) => {
      onDelta(ev.clientX - startX, ev.clientY - startY);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      onResizeEnd?.();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onDelta, onResizeEnd]);

  return (
    <div className={`pdfb-resize-handle pdfb-resize-handle--${direction}`}
      onMouseDown={handleMouseDown} />
  );
}

// ─── Quick-add structure between structures ───────────────────
function QuickAddStripeButton({ currentStripeIndex, insertBefore, visible }: {
  currentStripeIndex: number; insertBefore: boolean; visible: boolean;
}) {
  const addStripe = useEditorStore(s => s.addStripe);

  if (!visible) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStripe = createStripe([createStructure([100])]);
    const position = insertBefore ? currentStripeIndex : currentStripeIndex + 1;
    addStripe(newStripe, position);
  };

  return (
    <div className="pdfb-quick-add-btn pdfb-quick-add-structure">
      <button type="button" className="pdfb-quick-add-trigger"
        onClick={handleClick}
        title={insertBefore ? "Adicionar faixa acima" : "Adicionar faixa abaixo"}>
        <Plus size={12} />
      </button>
    </div>
  );
}

// ─── Content Block Wrapper ────────────────────────────────────
function ContentBlockWrapper({ block, stripeId, structureId, columnId, onCopy }: {
  block: ContentBlock; stripeId: string; structureId: string;
  columnId: string; onCopy: (id: string) => void;
}) {
  const parentLocked    = useContext(ParentLockedCtx);
  const selectedId      = useEditorStore(s => s.selection.blockId);
  const selectBlock     = useEditorStore(s => s.selectBlock);
  const updateContentBlock = useEditorStore(s => s.updateContentBlock);
  const isSelected      = selectedId === block.id;
  // Effective lock: own lock OR any ancestor locked
  const effectiveLocked = block.meta.locked || parentLocked;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: effectiveLocked,
    data: { type: 'content-block', stripeId, structureId, columnId, blockType: block.type },
  });

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectBlock(block.id, [stripeId, structureId, columnId, block.id]);
  }, [block.id, stripeId, structureId, columnId, selectBlock]);

  const handleCopy = useCallback(() => onCopy(block.id), [block.id, onCopy]);

  const handleResizeBottom = useCallback((_: number, dy: number) => {
    if (block.type === 'image') {
      const cur = typeof block.height === 'number' ? block.height : 200;
      updateContentBlock(block.id, { height: Math.max(20, cur + dy) } as Partial<ContentBlock>);
    } else if (block.type === 'spacer') {
      updateContentBlock(block.id, { height: Math.max(8, (block as any).height + dy) } as Partial<ContentBlock>);
    }
  }, [block, updateContentBlock]);

  const handleResizeEnd = useCallback(() => {
    selectBlock(block.id, [stripeId, structureId, columnId, block.id]);
  }, [block.id, stripeId, structureId, columnId, selectBlock]);

  const canResizeBottom = isSelected && !effectiveLocked && (block.type === 'image' || block.type === 'spacer');

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
    >
      <div
        className={`pdfb-canvas-block pdfb-content-block
          ${isSelected ? 'selected' : ''}
          ${effectiveLocked ? 'pdfb-locked' : ''}
          ${block.meta.hideOnExport ? 'pdfb-hidden-block' : ''}`}
        onClick={handleClick}
        data-block-id={block.id}
        data-block-type={block.type}
        data-break-before={block.meta.breakBefore ? 'true' : undefined}
        data-break-after={block.meta.breakAfter ? 'true' : undefined}
      >
        {effectiveLocked && (
          <div className="pdfb-lock-overlay" title={parentLocked ? 'Travado pelo componente pai' : 'Bloco travado'}>
            <Lock size={11} />
          </div>
        )}

        {isSelected && (
          effectiveLocked ? (
            // Locked: show unlock only when the block itself (not just parent) owns the lock
            <div className="pdfb-floating-toolbar pdfb-floating-toolbar--locked"
              onClick={e => e.stopPropagation()}>
              {block.meta.locked && (
                <button className="pdfb-floating-btn pdfb-floating-btn--locked"
                  onClick={() => useEditorStore.getState().updateBlockMeta(block.id, { locked: false })}
                  title="Destravar" type="button">
                  <Lock size={14} />
                  <span style={{ fontSize: 11, marginLeft: 4 }}>Destravar</span>
                </button>
              )}
              {parentLocked && !block.meta.locked && (
                <span style={{ fontSize: 11, color: 'var(--pdfb-color-surface)', padding: '2px 8px', opacity: 0.8 }}>
                  Travado pelo pai
                </span>
              )}
            </div>
          ) : (
            <>
              <span className="pdfb-block-label">{t(`block.${block.type}`)}</span>
              <FloatingToolbar
                blockId={block.id} blockType={block.type} stripeId={stripeId}
                structureId={structureId} columnId={columnId}
                dragListeners={listeners as Record<string, unknown>}
                dragAttributes={attributes}
                onCopy={handleCopy}
              />
            </>
          )
        )}

        {!isSelected && (
          <div className="pdfb-hover-label">{t(`block.${block.type}`)}</div>
        )}

        {/* Disable all interactions on locked content */}
        <div style={effectiveLocked ? { pointerEvents: 'none', userSelect: 'none' } : {}}>
          {renderContentBlock(block, effectiveLocked)}
        </div>

        {canResizeBottom && <ResizeHandle direction="bottom" onDelta={handleResizeBottom} onResizeEnd={handleResizeEnd} />}
      </div>
    </div>
  );
}

// ─── Column Renderer ──────────────────────────────────────────
function ColumnRenderer({ column, stripeId, structureId, onCopy }: {
  column: Column; stripeId: string; structureId: string; onCopy: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: 'column', stripeId, structureId, columnId: column.id },
  });
  const selectedId = useEditorStore(s => s.selection.blockId);

  const isActive = (idx: number) => {
    const above = column.children[idx - 1]?.id;
    const below = column.children[idx]?.id;
    return above === selectedId || below === selectedId;
  };

  const colStyle: React.CSSProperties = {
    ...blockStylesToCSS(column.styles),
    width: `${column.width}%`, flexShrink: 0,
    outline: isOver ? '2px dashed var(--pdfb-color-accent)' : undefined,
    outlineOffset: isOver ? '-2px' : undefined,
    transition: 'outline 150ms ease', position: 'relative',
  };

  return (
    <div ref={setNodeRef} className="pdfb-column" style={colStyle}>
      <SortableContext items={column.children.map(b => b.id)} strategy={verticalListSortingStrategy}>
        {column.children.length === 0 ? (
          <div className="pdfb-column-empty">Solte aqui</div>
        ) : (
          <>
            <QuickAddButton stripeId={stripeId} structureId={structureId}
              columnId={column.id} insertAtIndex={0} visible={isActive(0)} />
            {column.children.map((block, idx) => (
              <React.Fragment key={block.id}>
                <ContentBlockWrapper block={block} stripeId={stripeId}
                  structureId={structureId} columnId={column.id} onCopy={onCopy} />
                <QuickAddButton stripeId={stripeId} structureId={structureId}
                  columnId={column.id} insertAtIndex={idx + 1} visible={isActive(idx + 1)} />
              </React.Fragment>
            ))}
          </>
        )}
      </SortableContext>
    </div>
  );
}

// ─── Structure Renderer ───────────────────────────────────────
function StructureRenderer({ structure, stripeId, onCopy }: {
  structure: StructureBlock; stripeId: string; onCopy: (id: string) => void;
}) {
  const parentLocked  = useContext(ParentLockedCtx);
  const selectedId    = useEditorStore(s => s.selection.blockId);
  const selectBlock   = useEditorStore(s => s.selectBlock);
  const isSelected    = selectedId === structure.id;
  const effectiveLocked = structure.meta.locked || parentLocked;
  const isBanner = structure.variant === 'banner';

  const handleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.pdfb-content-block')) return;
    e.stopPropagation();
    selectBlock(structure.id, [stripeId, structure.id]);
  }, [structure.id, stripeId, selectBlock]);

  const { attributes, listeners, setNodeRef: structureRef, transform: structureTransform, transition: structureTransition, isDragging: structureIsDragging } = useSortable({
    id: `structure-${structure.id}`,
    disabled: effectiveLocked,
    data: { type: 'structure', stripeId },
  });

  const bannerBgStyle: React.CSSProperties = isBanner ? {
    backgroundImage: structure.backgroundImage ? `url(${structure.backgroundImage})` : undefined,
    backgroundSize: structure.backgroundSize || 'cover',
    backgroundRepeat: structure.backgroundSize === 'auto' ? 'repeat' : 'no-repeat',
    backgroundPosition: structure.backgroundPosition || 'center center',
    minHeight: structure.minHeight ?? 300,
    position: 'relative',
    overflow: 'hidden',
  } : {};

  return (
    // Propagate effective lock to all children
    <ParentLockedCtx.Provider value={effectiveLocked}>
      <div
        ref={structureRef}
        style={{ transform: CSS.Transform.toString(structureTransform), transition: structureTransition, opacity: structureIsDragging ? 0.35 : 1 }}
      >
      <div
        className={`pdfb-canvas-block pdfb-structure-block${isBanner ? ' pdfb-banner-structure' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
        data-block-id={structure.id}
        data-block-type="structure"
      >
        {isSelected && (
          effectiveLocked ? (
            <div className="pdfb-floating-toolbar pdfb-floating-toolbar--locked"
              onClick={e => e.stopPropagation()}>
              {structure.meta.locked && (
                <button className="pdfb-floating-btn pdfb-floating-btn--locked"
                  onClick={() => useEditorStore.getState().updateBlockMeta(structure.id, { locked: false })}
                  title="Destravar" type="button">
                  <Lock size={14} />
                  <span style={{ fontSize: 11, marginLeft: 4 }}>Destravar</span>
                </button>
              )}
            </div>
          ) : (
            <>
              <span className="pdfb-block-label">{isBanner ? t('block.banner') : t('block.structure')}</span>
              <FloatingToolbar blockId={structure.id} blockType="structure" stripeId={stripeId}
                structureId={structure.id}
                dragListeners={listeners as Record<string, unknown>} dragAttributes={attributes} />
            </>
          )
        )}
        <div className="pdfb-structure" style={{
          ...blockStylesToCSS(structure.styles),
          ...bannerBgStyle,
          gap: isBanner ? 0 : structure.columnGap,
          alignItems: structure.verticalAlignment === 'top' ? 'flex-start'
            : structure.verticalAlignment === 'bottom' ? 'flex-end' : 'center',
        }}>
          {/* Banner overlay */}
          {isBanner && (structure.overlayOpacity ?? 0) > 0 && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundColor: structure.overlayColor || '#000000',
              opacity: structure.overlayOpacity ?? 0,
              zIndex: 0,
            }} />
          )}
          {structure.columns.map(column => (
            <ColumnRenderer key={column.id} column={column}
              stripeId={stripeId} structureId={structure.id} onCopy={onCopy} />
          ))}
        </div>
      </div>
      </div>
    </ParentLockedCtx.Provider>
  );
}

// ─── Stripe Renderer ──────────────────────────────────────────
export function StripeRenderer({ stripe, index, onCopy }: {
  stripe: StripeBlock; index: number; onCopy?: (id: string) => void;
}) {
  const selectedId  = useEditorStore(s => s.selection.blockId);
  const selectBlock = useEditorStore(s => s.selectBlock);
  const isSelected  = selectedId === stripe.id;
  const isLocked    = stripe.meta.locked;

  const { setNodeRef } = useSortable({
    id: stripe.id,
    disabled: true,
    data: { type: 'stripe' },
  });

  const handleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.pdfb-structure-block') ||
        (e.target as HTMLElement).closest('.pdfb-content-block')) return;
    e.stopPropagation();
    selectBlock(stripe.id, [stripe.id]);
  }, [stripe.id, selectBlock]);

  const bgCSS = backgroundToCSS(stripe.styles.background);
  const stripeStyle: React.CSSProperties = {
    ...blockStylesToCSS(stripe.styles), ...bgCSS,
    width: '100%',
    maxWidth: stripe.contentMaxWidth > 0 ? stripe.contentMaxWidth : undefined,
    margin: stripe.contentAlignment === 'center' ? '0 auto'
      : stripe.contentAlignment === 'right' ? '0 0 0 auto' : undefined,
  };

  return (
    <div ref={setNodeRef}>
      {/* Propagate stripe lock to all descendants */}
      <ParentLockedCtx.Provider value={isLocked}>
        <div
          className={`pdfb-stripe pdfb-canvas-block pdfb-stripe-block
            ${isSelected ? 'selected' : ''} ${isLocked ? 'pdfb-locked' : ''}`}
          onClick={handleClick}
          data-block-id={stripe.id}
          data-block-type="stripe"
          data-break-before={stripe.meta.breakBefore ? 'true' : undefined}
          data-break-after={stripe.meta.breakAfter ? 'true' : undefined}
        >
          {isLocked && (
            <div className="pdfb-lock-overlay" title="Faixa travada"><Lock size={11} /></div>
          )}

          {isSelected && (
            isLocked ? (
              <div className="pdfb-floating-toolbar pdfb-floating-toolbar--locked"
                onClick={e => e.stopPropagation()}>
                <button className="pdfb-floating-btn pdfb-floating-btn--locked"
                  onClick={() => useEditorStore.getState().updateBlockMeta(stripe.id, { locked: false })}
                  title="Destravar" type="button">
                  <Lock size={14} />
                  <span style={{ fontSize: 11, marginLeft: 4 }}>Destravar</span>
                </button>
              </div>
            ) : (
              <>
                <span className="pdfb-block-label">{t('block.stripe')}</span>
                <FloatingToolbar blockId={stripe.id} blockType="stripe" stripeId={stripe.id}
                  onCopy={() => onCopy?.(stripe.id)} />
              </>
            )
          )}

          <div style={stripeStyle}>
            <SortableContext items={stripe.children.map(s => `structure-${s.id}`)} strategy={verticalListSortingStrategy}>
              <QuickAddStripeButton currentStripeIndex={index} insertBefore={true}
                visible={!isLocked && isSelected} />
              {stripe.children.map((structure, idx) => (
                <React.Fragment key={structure.id}>
                  <StructureRenderer structure={structure}
                    stripeId={stripe.id} onCopy={id => onCopy?.(id)} />
                </React.Fragment>
              ))}
              <QuickAddStripeButton currentStripeIndex={index} insertBefore={false}
                visible={!isLocked && isSelected} />
            </SortableContext>
          </div>
        </div>
      </ParentLockedCtx.Provider>
    </div>
  );
}
