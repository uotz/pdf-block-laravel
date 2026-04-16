import React, { useCallback } from 'react';
import { ChevronUp, ChevronDown, Lock, Unlock } from 'lucide-react';
import { useEditorStore } from '../../store';
import { useCanUnlock } from '../EditorConfig';
import { t } from '../../i18n';
import { Tabs, Accordion, Toggle } from '../ui/Controls';
import { TextProperties } from './TextProperties';
import { ImageProperties } from './ImageProperties';
import { ButtonProperties } from './ButtonProperties';
import { DividerProperties } from './DividerProperties';
import { StripeProperties } from './StripeProperties';
import { StructureProperties } from './StructureProperties';
import { SpacerProperties } from './SpacerProperties';
import { TableProperties } from './TableProperties';
import { CommonStylesPanel } from './CommonStylesPanel';
import { PageSettingsPanel } from './PageSettingsPanel';
import type { RightPanelTab, AnyBlock, StripeBlock, StructureBlock, ContentBlock } from '../../types';

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

function findParentStripeId(blocks: StripeBlock[], blockId: string): string | null {
  for (const stripe of blocks) {
    if (stripe.id === blockId) return stripe.id;
    for (const structure of stripe.children) {
      if (structure.id === blockId) return stripe.id;
      for (const column of structure.columns) {
        for (const content of column.children) {
          if (content.id === blockId) return stripe.id;
        }
      }
    }
  }
  return null;
}

export function RightPanel() {
  // ── All hooks MUST come before any conditional return ──
  const selectedId  = useEditorStore(s => s.selection.blockId);
  const blocks      = useEditorStore(s => s.document.blocks);
  const activeTab   = useEditorStore(s => s.ui.rightPanelTab);
  const setTab      = useEditorStore(s => s.setRightPanelTab);
  const selectBlock = useEditorStore(s => s.selectBlock);

  const goTo = useCallback((id: string | null) => {
    if (!id) return;
    selectBlock(id, []);
    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${id}"]`) as HTMLElement;
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 30);
  }, [selectBlock]);

  // Must be before any early return — hook call order must be stable
  const canUnlock = useCanUnlock(selectedId ?? '');

  // ── Early returns (after all hooks) ──
  if (!selectedId) {
    return (
      <div className="pdfb-right-panel">
        <PageSettingsPanel />
      </div>
    );
  }

  const block = findBlockById(blocks, selectedId);
  if (!block) {
    return (
      <div className="pdfb-right-panel">
        <div className="pdfb-panel-empty">{t('panel.noSelection')}</div>
      </div>
    );
  }

  const stripeId = findParentStripeId(blocks, selectedId) || '';

  // Check if block is effectively locked (own lock OR parent lock)
  const isBlockLocked = (() => {
    if (block.meta.locked) return true;
    for (const stripe of blocks) {
      if (stripe.id === selectedId) return false; // stripe's own lock already checked
      if (stripe.meta.locked) {
        // Check if selectedId is a descendant of this locked stripe
        for (const st of stripe.children) {
          if (st.id === selectedId) return true;
          for (const col of st.columns)
            if (col.children.some(b => b.id === selectedId)) return true;
        }
      }
      for (const st of stripe.children) {
        if (st.meta.locked && st.columns.some(col => col.children.some(b => b.id === selectedId)))
          return true;
      }
    }
    return false;
  })();

  const tabs = [
    { key: 'config', label: t('panel.config') },
    { key: 'styles', label: t('panel.styles') },
    { key: 'data', label: 'Página' },
  ];

  const { upId, downId } = findNavIds(blocks, selectedId);

  return (
    <div className="pdfb-right-panel">
      <div className="pdfb-panel-header" style={{ justifyContent: 'space-between' }}>
        <span>{t(`block.${block.type}`)}</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button type="button" className="pdfb-panel-nav-btn"
            onClick={() => goTo(upId)}
            disabled={!upId}
            title="Ir para o componente pai">
            <ChevronUp size={14} />
          </button>
          <button type="button" className="pdfb-panel-nav-btn"
            onClick={() => goTo(downId)}
            disabled={!downId}
            title="Ir para o primeiro filho">
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
      {isBlockLocked ? (
        /* ── Locked state ── */
        <div className="pdfb-locked-panel">
          <div className="pdfb-locked-panel-icon">
            <Lock size={28} />
          </div>
          <p className="pdfb-locked-panel-msg">
            Este componente está travado.<br />
            Edições estão desabilitadas.
          </p>
          {canUnlock && (
            <button
              type="button"
              className="pdfb-toolbar-btn pdfb-toolbar-btn--primary"
              style={{ marginTop: 12, gap: 6 }}
              onClick={() => useEditorStore.getState().updateBlockMeta(selectedId, { locked: false })}
            >
              <Unlock size={14} />
              Destravar componente
            </button>
          )}
        </div>
      ) : (
        <>
          <Tabs tabs={tabs} active={activeTab} onChange={k => setTab(k as RightPanelTab)} />
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeTab === 'config' && <ConfigPanel block={block} stripeId={stripeId} />}
            {activeTab === 'styles' && <CommonStylesPanel block={block} />}
            {activeTab === 'data' && <PageBreakPanel block={block} />}
          </div>
        </>
      )}
    </div>
  );
}

function ConfigPanel({ block, stripeId }: { block: AnyBlock; stripeId: string }) {
  switch (block.type) {
    case 'stripe': return <StripeProperties stripe={block as StripeBlock} />;
    case 'structure': return <StructureProperties structure={block as StructureBlock} stripeId={stripeId} />;
    case 'text': return <TextProperties block={block as any} />;
    case 'image': return <ImageProperties block={block as any} />;
    case 'button': return <ButtonProperties block={block as any} />;
    case 'divider': return <DividerProperties block={block as any} />;
    case 'spacer': return <SpacerProperties block={block as any} />;
    case 'table': return <TableProperties block={block as any} />;
    default:
      return (
        <div style={{ padding: 16, color: 'var(--pdfb-color-text-secondary)', fontSize: 12 }}>
          Painel de configuração para <strong>{block.type}</strong> em desenvolvimento.
        </div>
      );
  }
}

/**
 * Page break controls panel.
 *
 * Works for all block types (stripes, structures, content blocks).
 * Settings affect both:
 *  - Programmatic PDF export: read from data-* attributes in computeSmartCuts
 *  - Native print (Ctrl+P): mapped to CSS break-before / break-after / break-inside
 */
function PageBreakPanel({ block }: { block: AnyBlock }) {
  const updateBlockMeta = useEditorStore(s => s.updateBlockMeta);
  const m = block.meta;

  return (
    <div>
      <Accordion title="Quebras de página" defaultOpen>
        <div className="pdfb-pagebreak-hint">
          <strong>Como funciona</strong><br />
          Controla onde o PDF deve quebrar a página em relação a este bloco.
          Aplicado tanto na exportação programática quanto na impressão nativa.
        </div>

        <Toggle
          label="Iniciar em nova página"
          value={m.breakBefore}
          onChange={v => updateBlockMeta(block.id, { breakBefore: v })}
        />
        <p className="pdfb-pagebreak-desc">
          Este bloco sempre começa no topo de uma nova página.
        </p>

        <Toggle
          label="Quebrar após"
          value={m.breakAfter}
          onChange={v => updateBlockMeta(block.id, { breakAfter: v })}
        />
        <p className="pdfb-pagebreak-desc">
          Força uma nova página após este bloco.
        </p>
      </Accordion>
    </div>
  );
}


// ─── Navigation helper ────────────────────────────────────────
/**
 * Navigation:
 *  upId   → parent block (stripe has no parent → null)
 *  downId → first child  (stripe → first block of first structure/column;
 *                          structure → first block of first column;
 *                          content block → next sibling)
 */
function findNavIds(
  blocks: StripeBlock[],
  selectedId: string,
): { upId: string | null; downId: string | null } {
  // ── Stripe level ─────────────────────────────────────────────
  const stripe = blocks.find(s => s.id === selectedId);
  if (stripe) {
    const firstBlock = stripe.children[0]?.columns[0]?.children[0]?.id ?? null;
    return { upId: null, downId: firstBlock };
  }

  // ── Structure level ──────────────────────────────────────────
  for (const s of blocks) {
    const st = s.children.find(c => c.id === selectedId);
    if (st) {
      const firstBlock = st.columns[0]?.children[0]?.id ?? null;
      return { upId: s.id, downId: firstBlock };
    }
  }

  // ── Content block level ──────────────────────────────────────
  for (const s of blocks) {
    for (const st of s.children) {
      for (const col of st.columns) {
        const idx = col.children.findIndex(b => b.id === selectedId);
        if (idx !== -1) {
          return {
            upId: st.id,
            downId: col.children[idx + 1]?.id ?? null,
          };
        }
      }
    }
  }

  return { upId: null, downId: null };
}
