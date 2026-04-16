import React, { useCallback, useRef, useMemo, useState, useEffect, memo } from 'react';
import { Minimap } from './Minimap';
import { useEditorConfig } from '../EditorConfig';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEditorStore } from '../../store';
import { StripeRenderer } from './StripeRenderer';
import { getPageDimensionsPx, getContentAreaPx, mmToPx } from '../../utils';
import { computePageBreaks } from '../../export/pageBreaks';
import { LayoutGrid } from 'lucide-react';
import { createStripe, createStructure } from '../../store';
import type { StripeBlock } from '../../types';

// ─── Page break band ─────────────────────────────────────────
// Shows exactly where the PDF engine will slice the content.
// The hatched zones represent the margin dead-zone on each side
// of the cut (bottom margin of page N + top margin of page N+1).
function PageBreakBand({
  cutY,
  marginAbovePx,
  marginBelowPx,
  pageNum,
}: {
  cutY: number;
  marginAbovePx: number;
  marginBelowPx: number;
  pageNum: number;
}) {
  return (
    <div
      className="pdfb-pagebreak-band"
      style={{ top: cutY - marginAbovePx }}
      aria-hidden="true"
    >
      <div
        className="pdfb-pagebreak-margin pdfb-pagebreak-margin--bottom"
        style={{ height: marginAbovePx }}
      >
        <span className="pdfb-pagebreak-tag pdfb-pagebreak-tag--top">
          Página {pageNum}
        </span>
      </div>

      <div className="pdfb-pagebreak-cutline">
        <span className="pdfb-pagebreak-scissors">✂</span>
      </div>

      <div
        className="pdfb-pagebreak-margin pdfb-pagebreak-margin--top"
        style={{ height: marginBelowPx }}
      >
        <span className="pdfb-pagebreak-tag pdfb-pagebreak-tag--bottom">
          Página {pageNum + 1}
        </span>
      </div>
    </div>
  );
}

// ─── Stripe height tracker ────────────────────────────────────
// Wraps each stripe with a ResizeObserver so we know its exact
// rendered height in the canvas. This is used to compute page-cut
// positions with the same algorithm used in the PDF export.
const StripeHeightTracker = memo(function StripeHeightTracker({
  stripe, index, onHeight, onCopy,
}: {
  stripe: StripeBlock;
  index: number;
  onHeight: (id: string, h: number) => void;
  onCopy?: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    onHeight(stripe.id, el.offsetHeight);
    const ro = new ResizeObserver(() => onHeight(stripe.id, el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [stripe.id, onHeight]);

  return (
    <div ref={ref}>
      <StripeRenderer stripe={stripe} index={index} onCopy={onCopy} />
    </div>
  );
});

// (calcCutPositions moved to src/export/pageBreaks.ts as computePageBreaks)

// ─── Canvas area ──────────────────────────────────────────────
export function CanvasArea({ onCopy }: { onCopy?: (blockId: string) => void }) {
  const doc         = useEditorStore(s => s.document);
  const zoom        = useEditorStore(s => s.ui.zoom);
  const deselectBlock = useEditorStore(s => s.deselectBlock);
  const addStripe   = useEditorStore(s => s.addStripe);
  const pageRef          = useRef<HTMLDivElement>(null);
  const canvasScrollRef  = useRef<HTMLDivElement>(null);
  const editorConfig     = useEditorConfig();
  const showMinimap      = !!editorConfig.minimap;

  const pageDims    = getPageDimensionsPx(doc.pageSettings);
  const contentArea = getContentAreaPx(doc.pageSettings);
  const isPaginated = false;

  const marginTopPx    = mmToPx(doc.pageSettings.margins.top);
  const marginRightPx  = mmToPx(doc.pageSettings.margins.right);
  const marginBottomPx = mmToPx(doc.pageSettings.margins.bottom);
  const marginLeftPx   = mmToPx(doc.pageSettings.margins.left);

  // Track measured heights of every stripe
  const [stripeHeights, setStripeHeights] = useState<Record<string, number>>({});

  const handleHeight = useCallback((id: string, h: number) => {
    setStripeHeights(prev => prev[id] === h ? prev : { ...prev, [id]: h });
  }, []);

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: 'canvas-drop-area',
    data: { type: 'canvas' },
  });

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (
      e.target === e.currentTarget ||
      (e.target as HTMLElement).classList.contains('pdfb-page-content')
    ) deselectBlock();
  }, [deselectBlock]);

  // Compute page-cut positions from measured heights using the shared
  // algorithm — guarantees the visual indicator matches PDF output exactly.
  const pageBreaks = useMemo(() => {
    if (!isPaginated || doc.blocks.length === 0) return [];
    return computePageBreaks(doc.blocks, stripeHeights, contentArea.height);
  }, [isPaginated, doc.blocks, stripeHeights, contentArea.height]);

  const zoomScale = (zoom ?? 100) / 100;

  return (
    <div className="pdfb-canvas-outer">
    <div ref={canvasScrollRef} className="pdfb-canvas-area" onClick={handleCanvasClick}>
      <div
        style={{
          transform: zoomScale !== 1 ? `scale(${zoomScale})` : undefined,
          transformOrigin: 'top center',
          transition: 'transform 150ms ease',
        }}
      >
        <div
          ref={pageRef}
          className="pdfb-page"
          style={{
            width: pageDims.width,
            minHeight: pageDims.height,
            background: doc.globalStyles.pageBackground || 'transparent',
          }}
        >
          <div
            ref={setDropRef}
            className="pdfb-page-content"
            style={{
              padding: `${marginTopPx}px ${marginRightPx}px ${marginBottomPx}px ${marginLeftPx}px`,
              background: doc.globalStyles.contentBackground || undefined,
              color: doc.globalStyles.defaultFontColor || undefined,
              outline: isOver ? '2px dashed var(--pdfb-color-accent)' : undefined,
              minHeight: '100%',
            }}
          >
            <SortableContext
              items={doc.blocks.map(b => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {doc.blocks.length === 0 ? (
                <div className="pdfb-canvas-empty">
                  <LayoutGrid size={48} />
                  <div>
                    <strong>Comece arrastando um layout</strong>
                    <br />
                    <span style={{ fontSize: 12 }}>
                      Use a barra lateral para adicionar faixas e blocos ao documento
                    </span>
                  </div>
                  <button
                    type="button"
                    className="pdfb-toolbar-btn pdfb-toolbar-btn--primary"
                    style={{ marginTop: 8 }}
                    onClick={() => addStripe(createStripe([createStructure([100])]))}
                  >
                    + Adicionar faixa
                  </button>
                </div>
              ) : (
                doc.blocks.map((stripe, index) => (
                  <StripeHeightTracker
                    key={stripe.id}
                    stripe={stripe}
                    index={index}
                    onHeight={handleHeight}
                    onCopy={onCopy}
                  />
                ))
              )}
            </SortableContext>
          </div>

          {/* Page-break indicators — positioned exactly where cuts will happen.
              cutY is in content-space (0 = content start); add marginTopPx
              to convert to page coordinates for absolute positioning. */}
          {isPaginated && pageBreaks.map((pb, i) => (
            <PageBreakBand
              key={i}
              cutY={marginTopPx + pb.cutY}
              marginAbovePx={marginBottomPx}
              marginBelowPx={marginTopPx}
              pageNum={pb.pageNum}
            />
          ))}
        </div>
      </div>
    </div>
    {showMinimap && (
      <Minimap
        canvasRef={canvasScrollRef}
        pageRef={pageRef}
        stripeHeights={stripeHeights}
        marginTopPx={marginTopPx}
        marginBottomPx={marginBottomPx}
      />
    )}
  </div>
  );
}
