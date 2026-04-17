import { useState, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  LayoutGrid, Type, Image, Minus, SquareMousePointer, MoveVertical,
  ImagePlay, Table, QrCode, BarChart3, SeparatorHorizontal, Puzzle, Layers,
} from 'lucide-react';
import { useEditorStore } from '../store';
import { createStripe, createStructure, createContentBlock, createBannerStructure } from '../store';
import { LAYOUT_PRESETS, SIDEBAR_ITEMS } from '../blocks/registry';
import { ComponentTree } from './ComponentTree';
import type { SidebarItem } from '../blocks/registry';
import { t } from '../i18n';
import type { SidebarPanel, BlockType } from '../types';
import type { LucideIcon } from 'lucide-react';
import { FontPicker } from './ui/FontPicker';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutGrid, Type, Image, Minus, SquareMousePointer, MoveVertical,
  ImagePlay, Table, QrCode, BarChart3, SeparatorHorizontal, Puzzle, Layers,
};

// ─── Draggable Block Icon ────────────────────────────────────
function DraggableBlockIcon({ item, isActive }: { item: SidebarItem; isActive: boolean }) {
  const blocks = useEditorStore(s => s.document.blocks);
  const selection = useEditorStore(s => s.selection);
  const addStripe = useEditorStore(s => s.addStripe);
  const addContentBlock = useEditorStore(s => s.addContentBlock);
  const [hovered, setHovered] = useState(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar-block-${item.key}`,
    data: { source: 'sidebar', blockType: item.blockType },
  });

  const IconComp = ICON_MAP[item.icon];

  const handleClick = useCallback(() => {
    const type = item.blockType as BlockType;

    // Banner → creates a stripe containing a banner-variant structure (not a content block)
    if (type === 'banner') {
      const stripe = createStripe([createBannerStructure()]);
      addStripe(stripe);
      return;
    }

    // Prefer the currently focused stripe (path[0] is always the stripe id)
    const focusedStripeId = selection.path.length > 0 ? selection.path[0] : null;
    const targetStripe = focusedStripeId
      ? blocks.find(s => s.id === focusedStripeId) ?? null
      : null;

    const stripeToUse = targetStripe ?? (blocks.length > 0 ? blocks[blocks.length - 1] : null);

    if (stripeToUse && stripeToUse.children.length > 0) {
      const lastStructure = stripeToUse.children[stripeToUse.children.length - 1];
      if (lastStructure.columns.length > 0) {
        const lastColumn = lastStructure.columns[lastStructure.columns.length - 1];
        addContentBlock(stripeToUse.id, lastStructure.id, lastColumn.id, type);
        return;
      }
    }

    // No eligible stripe → create a new one
    const stripe = createStripe();
    const structure = stripe.children[0];
    const column = structure.columns[0];
    const block = createContentBlock(type);
    column.children.push(block);
    addStripe(stripe);
  }, [blocks, selection, addStripe, addContentBlock, item.blockType]);

  return (
    <button
      ref={setNodeRef}
      className={`pdfb-sidebar-icon ${isActive ? 'active' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={t(item.labelKey)}
      type="button"
      style={{ opacity: isDragging ? 0.4 : 1, cursor: 'grab' }}
      {...listeners}
      {...attributes}
    >
      {IconComp && <IconComp size={20} />}
      {hovered && !isDragging && (
        <span className="pdfb-sidebar-tooltip">{t(item.labelKey)}</span>
      )}
    </button>
  );
}

// ─── Icon Rail ────────────────────────────────────────────────
function IconRail() {
  const activePanel = useEditorStore(s => s.ui.sidebarPanel);
  const setSidebarPanel = useEditorStore(s => s.setSidebarPanel);
  const [hoveredPanel, setHoveredPanel] = useState<string | null>(null);

  return (
    <div className="pdfb-sidebar-rail">
      {SIDEBAR_ITEMS.map(item => {
        // Panel items (layouts, modules, styles) toggle expandable panels
        if (item.action === 'panel') {
          const IconComp = ICON_MAP[item.icon];
          const isActive = activePanel === item.panel;
          return (
            <button
              key={item.key}
              className={`pdfb-sidebar-icon ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarPanel(item.panel as SidebarPanel)}
              onMouseEnter={() => setHoveredPanel(item.key)}
              onMouseLeave={() => setHoveredPanel(null)}
              title={t(item.labelKey)}
              type="button"
            >
              {IconComp && <IconComp size={20} />}
              {hoveredPanel === item.key && (
                <span className="pdfb-sidebar-tooltip">{t(item.labelKey)}</span>
              )}
            </button>
          );
        }

        // Block items are click-to-add + draggable
        return (
          <DraggableBlockIcon
            key={item.key}
            item={item}
            isActive={false}
          />
        );
      })}
    </div>
  );
}

// ─── Layouts Panel ────────────────────────────────────────────
function LayoutsPanel() {
  const addStripe = useEditorStore(s => s.addStripe);

  const handleAddLayout = useCallback((widths: number[]) => {
    const stripe = createStripe([createStructure(widths)]);
    addStripe(stripe);
  }, [addStripe]);

  return (
    <div>
      <div className="pdfb-sidebar-panel-header">{t('sidebar.layouts')}</div>
      <div className="pdfb-layout-grid">
        {LAYOUT_PRESETS.map((preset, i) => (
          <button
            key={i}
            className="pdfb-layout-thumb"
            onClick={() => handleAddLayout(preset.widths)}
            title={preset.label}
            type="button"
          >
            {preset.widths.map((w, j) => (
              <div key={j} className="pdfb-layout-thumb-col" style={{ flex: w }} />
            ))}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Modules Panel ────────────────────────────────────────────
function ModulesPanel() {
  const modules = useEditorStore(s => s.modules);
  const addFromModule = useEditorStore(s => s.addFromModule);
  const removeModule = useEditorStore(s => s.removeModule);

  return (
    <div>
      <div className="pdfb-sidebar-panel-header">{t('sidebar.modules')}</div>
      {modules.length === 0 ? (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--pdfb-color-text-secondary)', fontSize: 12 }}>
          Nenhum módulo salvo. Selecione uma faixa e salve como módulo.
        </div>
      ) : (
        <div style={{ padding: 8 }}>
          {modules.map(mod => (
            <div key={mod.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid var(--pdfb-border-color)', gap: 8 }}>
              <span style={{ flex: 1, fontSize: 13 }}>{mod.name}</span>
              <button
                className="pdfb-toolbar-btn"
                style={{ color: 'var(--pdfb-color-accent)', fontSize: 11, padding: '2px 8px', height: 'auto' }}
                onClick={() => addFromModule(mod.id)}
                type="button"
              >
                Usar
              </button>
              <button
                className="pdfb-toolbar-btn"
                style={{ color: 'var(--pdfb-color-danger)', fontSize: 11, padding: '2px 4px', height: 'auto' }}
                onClick={() => removeModule(mod.id)}
                type="button"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Global Styles Panel ──────────────────────────────────────
function GlobalStylesPanel() {
  const globalStyles = useEditorStore(s => s.document.globalStyles);
  const updateGlobalStyles = useEditorStore(s => s.updateGlobalStyles);

  return (
    <div>
      <div className="pdfb-sidebar-panel-header">{t('sidebar.styles')}</div>
      <div style={{ padding: 12 }}>
        <div className="pdfb-field">
          <span className="pdfb-label">{t('global.contentWidth')}</span>
          <input
            className="pdfb-input"
            type="number"
            value={globalStyles.contentWidth}
            onChange={e => updateGlobalStyles({ contentWidth: Number(e.target.value) })}
          />
        </div>
        <div className="pdfb-field">
          <span className="pdfb-label">{t('global.pageBackground')}</span>
          <input
            className="pdfb-input"
            value={globalStyles.pageBackground}
            onChange={e => updateGlobalStyles({ pageBackground: e.target.value })}
          />
        </div>
        <div className="pdfb-field">
          <span className="pdfb-label">{t('global.contentBackground')}</span>
          <input
            className="pdfb-input"
            value={globalStyles.contentBackground}
            onChange={e => updateGlobalStyles({ contentBackground: e.target.value })}
          />
        </div>
        <div className="pdfb-field">
          <span className="pdfb-label">{t('global.primaryFont')}</span>
          <FontPicker
            value={globalStyles.defaultFontFamily}
            onChange={v => updateGlobalStyles({ defaultFontFamily: v })}
          />
        </div>
        <div className="pdfb-field">
          <span className="pdfb-label">{t('props.fontSize')}</span>
          <input
            className="pdfb-input"
            type="number"
            value={globalStyles.defaultFontSize}
            onChange={e => updateGlobalStyles({ defaultFontSize: Number(e.target.value) })}
          />
        </div>
        <div className="pdfb-field">
          <span className="pdfb-label">{t('props.fontColor')}</span>
          <input
            className="pdfb-input"
            value={globalStyles.defaultFontColor}
            onChange={e => updateGlobalStyles({ defaultFontColor: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Panel Content Router ─────────────────────────────────────
function PanelContent({ panel }: { panel: SidebarPanel }) {
  switch (panel) {
    case 'layouts': return <LayoutsPanel />;
    case 'modules': return <ModulesPanel />;
    case 'styles':  return <GlobalStylesPanel />;
    case 'tree':    return <ComponentTree inPanel />;
    default:        return null;
  }
}

// ─── Main Sidebar Component ──────────────────────────────────
export function LeftSidebar() {
  const activePanel = useEditorStore(s => s.ui.sidebarPanel);

  return (
    <div className="pdfb-sidebar">
      <IconRail />
      {activePanel && (
        <div className="pdfb-sidebar-panel">
          <PanelContent panel={activePanel} />
        </div>
      )}
    </div>
  );
}
