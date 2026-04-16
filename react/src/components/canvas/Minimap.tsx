import React, {
  RefObject,
  useEffect,
  useRef,
  useState,
  useCallback,
  memo,
} from 'react';
import { useEditorStore } from '../../store';
import { useEditorConfig } from '../EditorConfig';
import type { MinimapConfig, MinimapMode, MinimapPosition, StripeBlock } from '../../types';

// ─── Config normalizer ────────────────────────────────────────

interface NormalizedMinimap {
  enabled: boolean;
  mode: MinimapMode;
  width: number;
  maxHeight: number;
  position: MinimapPosition;
  offsetX: number;
  offsetY: number;
  debounce: number;
}

function normalizeConfig(cfg: boolean | MinimapConfig | undefined): NormalizedMinimap {
  const defaults: NormalizedMinimap = {
    enabled: false,
    mode: 'real',
    width: 160,
    maxHeight: 300,
    position: 'bottom-right',
    offsetX: 16,
    offsetY: 16,
    debounce: 150,
  };
  if (!cfg) return defaults;
  if (cfg === true) return { ...defaults, enabled: true };
  return {
    ...defaults,
    enabled: cfg.enabled ?? true,
    mode: cfg.mode ?? defaults.mode,
    width: cfg.width ?? defaults.width,
    maxHeight: cfg.maxHeight ?? defaults.maxHeight,
    position: cfg.position ?? defaults.position,
    offsetX: cfg.offsetX ?? defaults.offsetX,
    offsetY: cfg.offsetY ?? defaults.offsetY,
    debounce: cfg.debounce ?? defaults.debounce,
  };
}

// ─── Position helpers ─────────────────────────────────────────

function positionStyle(
  position: MinimapPosition,
  offsetX: number,
  offsetY: number,
): React.CSSProperties {
  switch (position) {
    case 'bottom-left': return { bottom: offsetY, left: offsetX };
    case 'top-right':   return { top: offsetY, right: offsetX };
    case 'top-left':    return { top: offsetY, left: offsetX };
    default:            return { bottom: offsetY, right: offsetX };
  }
}

// ─── Stripe color helper (bars mode) ─────────────────────────

function stripeAccentColor(stripe: StripeBlock, index: number): string {
  const bg = stripe.styles?.background;
  if (bg?.type === 'solid' && bg.color && bg.color !== 'transparent') {
    return bg.color + '60';
  }
  return index % 2 === 0
    ? 'var(--pdfb-color-accent-light)'
    : 'var(--pdfb-color-accent-subtle)';
}

// ─── UI elements to strip from clone (real mode) ──────────────

const CLONE_STRIP_SELECTORS = [
  '.pdfb-floating-toolbar',
  '.pdfb-block-label',
  '.pdfb-hover-label',
  '.pdfb-drop-indicator',
  '.pdfb-page-break-line',
  '.pdfb-pagebreak-band',
  '.pdfb-spacing-padding',
  '.pdfb-spacing-margin',
  '.pdfb-lock-overlay',
  '.pdfb-resize-handle',
  '.pdfb-column-empty',
  '.pdfb-quick-add-btn',
  '[data-tippy-root]',
  '.tippy-box',
  '.tippy-content',
].join(',');

// ─── Minimap props ────────────────────────────────────────────

export interface MinimapProps {
  /** Ref to the scrollable canvas container (.pdfb-canvas-area) */
  canvasRef: RefObject<HTMLDivElement>;
  /** Ref to the .pdfb-page element */
  pageRef: RefObject<HTMLDivElement>;
  /** Measured heights per stripe id (same map used by CanvasArea) */
  stripeHeights: Record<string, number>;
  /** Page top margin in px (unscaled) */
  marginTopPx: number;
  /** Page bottom margin in px (unscaled) */
  marginBottomPx: number;
}

// ─── Minimap component ────────────────────────────────────────

export const Minimap = memo(function Minimap({
  canvasRef,
  pageRef,
  stripeHeights,
  marginTopPx,
}: MinimapProps) {
  const config = useEditorConfig();
  const mini = normalizeConfig(config.minimap);

  // Store subscriptions (always called, regardless of mode)
  const blocks = useEditorStore(s => s.document.blocks) as StripeBlock[];
  const zoom = useEditorStore(s => s.ui.zoom) ?? 100;
  const zoomScale = zoom / 100;
  const pageBackground = useEditorStore(s => s.document.globalStyles.pageBackground);

  // ── Scroll state (shared by both modes) ──────────────────────
  const [scroll, setScroll] = useState({ top: 0, height: 0, client: 1 });
  const pageTopRef    = useRef(0);
  const pageHeightRef = useRef(0);
  const [, forceUpdate] = useState(0);

  const readRects = useCallback(() => {
    const canvas = canvasRef.current;
    const page   = pageRef.current;
    if (!canvas || !page) return;

    const canvasRect = canvas.getBoundingClientRect();
    const pageRect   = page.getBoundingClientRect();

    pageTopRef.current    = pageRect.top - canvasRect.top + canvas.scrollTop;
    pageHeightRef.current = pageRect.height;

    setScroll({
      top:    canvas.scrollTop,
      height: canvas.scrollHeight,
      client: canvas.clientHeight,
    });
    forceUpdate(v => v + 1);
  }, [canvasRef, pageRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    readRects();
    canvas.addEventListener('scroll', readRects, { passive: true });
    const ro = new ResizeObserver(readRects);
    ro.observe(canvas);
    if (pageRef.current) ro.observe(pageRef.current);
    return () => {
      canvas.removeEventListener('scroll', readRects);
      ro.disconnect();
    };
  }, [canvasRef, pageRef, readRects]);

  useEffect(() => { readRects(); }, [stripeHeights, zoomScale, readRects]);

  // ── Clone container ref (real mode) ──────────────────────────
  const cloneContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimer     = useRef<ReturnType<typeof setTimeout>>();

  const updateClone = useCallback(() => {
    const page      = pageRef.current;
    const container = cloneContainerRef.current;
    if (!page || !container) return;

    const clone = page.cloneNode(true) as HTMLElement;

    // Remove all editor-only chrome (mirrors cleanClone in pdf.ts)
    clone.querySelectorAll(CLONE_STRIP_SELECTORS).forEach(el => el.remove());

    // Remove selection + locked visual states — do NOT strip boxShadow
    // (it may be an intentional block style from blockStylesToCSS)
    clone.querySelectorAll('.pdfb-canvas-block').forEach(el => {
      el.classList.remove('selected', 'dragging');
      (el as HTMLElement).style.outline = 'none';
    });
    clone.querySelectorAll('.pdfb-locked').forEach(el => el.classList.remove('pdfb-locked'));

    // Remove TipTap contenteditable so the browser doesn't add edit UI
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));

    // Remove hidden blocks
    clone.querySelectorAll('.pdfb-hidden-block').forEach(el => el.remove());

    // Clean spacer/pagebreak backgrounds
    clone.querySelectorAll('.pdfb-block-spacer').forEach(el => {
      (el as HTMLElement).style.background = 'none';
    });

    clone.style.pointerEvents = 'none';
    clone.style.userSelect    = 'none';

    container.innerHTML = '';
    container.appendChild(clone);
  }, [pageRef]);

  const scheduleCloneUpdate = useCallback(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(updateClone, mini.debounce);
  }, [updateClone, mini.debounce]);

  useEffect(() => {
    if (mini.mode !== 'real') return;
    const page = pageRef.current;
    if (!page) return;

    updateClone();

    const mo = new MutationObserver(scheduleCloneUpdate);
    mo.observe(page, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });

    return () => {
      mo.disconnect();
      clearTimeout(debounceTimer.current);
    };
  }, [mini.mode, pageRef, updateClone, scheduleCloneUpdate]);

  // ── Interaction refs / callbacks (ALL before early return) ────
  const draggingRef   = useRef(false);
  const dragStart     = useRef({ y: 0, scrollTop: 0 });
  const hasDraggedRef = useRef(false);

  const MINI_W = mini.width;
  const MINI_H = mini.maxHeight;

  const { top: scrollTop, height: scrollHeight, client: clientHeight } = scroll;
  const scale = scrollHeight > 0 ? MINI_H / scrollHeight : 1;

  const scrollTo = useCallback(
    (miniY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const targetTop = (miniY / MINI_H) * scrollHeight - clientHeight / 2;
      canvas.scrollTop = Math.max(0, Math.min(targetTop, scrollHeight - clientHeight));
    },
    [canvasRef, MINI_H, scrollHeight, clientHeight],
  );

  const handlePanelMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).dataset.minimapHandle) return;
      const rect = e.currentTarget.getBoundingClientRect();
      scrollTo(e.clientY - rect.top);
    },
    [scrollTo],
  );

  const handleHandleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      draggingRef.current   = true;
      hasDraggedRef.current = false;
      dragStart.current = {
        y:         e.clientY,
        scrollTop: canvasRef.current?.scrollTop ?? 0,
      };

      const onMove = (ev: MouseEvent) => {
        hasDraggedRef.current = true;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dy = ev.clientY - dragStart.current.y;
        canvas.scrollTop = Math.max(
          0,
          Math.min(
            dragStart.current.scrollTop + dy / scale,
            canvas.scrollHeight - canvas.clientHeight,
          ),
        );
      };

      const onUp = () => {
        draggingRef.current = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [canvasRef, scale],
  );

  // ── Early return AFTER all hooks ──────────────────────────────
  if (!mini.enabled || scrollHeight <= 0) return null;

  // ── Derived render values ─────────────────────────────────────
  const pageMiniTop = pageTopRef.current * scale;
  const pageMiniH   = Math.max(pageHeightRef.current * scale, 2);
  const viewMiniTop = scrollTop * scale;
  const viewMiniH   = Math.max(clientHeight * scale, 6);

  // Page real dimensions (unscaled) — used to compute clone scale factor.
  // Use the smaller of width-based and height-based scales so the entire
  // visible page fits inside MINI_H without clipping tall content.
  const pageNativeW = pageRef.current?.offsetWidth  ?? MINI_W;
  const pageNativeH = pageRef.current?.scrollHeight ?? MINI_H;
  const scaleByW    = MINI_W / pageNativeW;
  const scaleByH    = MINI_H / pageNativeH;
  const cloneScale  = Math.min(scaleByW, scaleByH * 0.9);

  const posStyle = positionStyle(mini.position, mini.offsetX, mini.offsetY);

  // Clip cloneScale-translated height to avoid blank below the page
  const cloneH = pageNativeH * cloneScale;

  return (
    <div
      className="pdfb-minimap"
      style={{ ...posStyle, width: MINI_W, height: MINI_H }}
      onMouseDown={handlePanelMouseDown}
      aria-hidden="true"
    >
      {/* ── Header label ── */}
      <div className="pdfb-minimap-header">
        <span className="pdfb-minimap-title">Preview</span>
      </div>

      {/* ── Scrollable content area ── */}
      <div className="pdfb-minimap-content">
        {/* ── Real mode: live DOM clone ── */}
        {mini.mode === 'real' && (
          <div
            className="pdfb-minimap-real-wrapper"
            style={{ top: pageMiniTop, width: MINI_W - 12, height: cloneH }}
          >
            <div
              ref={cloneContainerRef}
              className="pdfb-minimap-real-clone"
              style={{
                transform: `scale(${cloneScale})`,
                transformOrigin: 'top left',
                width: pageNativeW,
                pointerEvents: 'none',
              }}
            />
          </div>
        )}

        {/* ── Bars mode: coloured stripe rectangles ── */}
        {mini.mode === 'bars' && (
          <>
            <div
              className="pdfb-minimap-page"
              style={{
                top: pageMiniTop,
                height: pageMiniH,
                background: pageBackground || 'var(--pdfb-color-surface)',
              }}
            />
            {(() => {
              let accumulated = 0;
              return blocks.map((stripe, idx) => {
                const h      = stripeHeights[stripe.id] || 0;
                const top    = (pageTopRef.current + (marginTopPx + accumulated) * zoomScale) * scale;
                const height = Math.max(h * zoomScale * scale, 1);
                accumulated += h;
                return (
                  <div
                    key={stripe.id}
                    className="pdfb-minimap-stripe"
                    style={{ top, height, left: 4, right: 4, background: stripeAccentColor(stripe, idx) }}
                  />
                );
              });
            })()}
          </>
        )}

        {/* ── Viewport indicator: dark overlay above + below the viewport ── */}
        <div className="pdfb-minimap-overlay pdfb-minimap-overlay--top"
          style={{ height: Math.max(0, viewMiniTop) }} />
        <div className="pdfb-minimap-overlay pdfb-minimap-overlay--bottom"
          style={{ top: viewMiniTop + viewMiniH }} />
        <div
          className="pdfb-minimap-viewport"
          style={{ top: viewMiniTop, height: viewMiniH }}
          data-minimap-handle="true"
          onMouseDown={handleHandleMouseDown}
        />
      </div>
    </div>
  );
});
