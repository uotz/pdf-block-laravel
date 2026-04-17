import { getContentAreaPx } from '../utils';
import { computePageBreaks, measureStripeHeights } from './pageBreaks';
import type { Document } from '../types';

/**
 * Strip editor-only UI artifacts from a cloned page element.
 */
function cleanClone(clone: HTMLElement): void {
  clone.querySelectorAll(
    '.pdfb-floating-toolbar, .pdfb-block-label, .pdfb-drop-indicator, ' +
    '.pdfb-page-break-line, .pdfb-pagebreak-band, ' +
    '.pdfb-spacing-padding, .pdfb-spacing-margin, ' +
    '.pdfb-lock-overlay, .pdfb-resize-handle, .pdfb-hover-label, .pdfb-quick-add-btn'
  ).forEach(el => el.remove());

  clone.querySelectorAll('.pdfb-locked').forEach(el => el.classList.remove('pdfb-locked'));

  clone.querySelectorAll('.pdfb-canvas-block').forEach(el => {
    el.classList.remove('selected');
    (el as HTMLElement).style.outline = 'none';
  });

  clone.querySelectorAll('[contenteditable]').forEach(el => {
    el.removeAttribute('contenteditable');
  });

  clone.querySelectorAll('[data-tippy-root], .tippy-box, .tippy-content').forEach(el => el.remove());
  clone.querySelectorAll('.pdfb-column-empty').forEach(el => el.remove());
  clone.querySelectorAll('.pdfb-hidden-block').forEach(el => el.remove());

  clone.querySelectorAll('.pdfb-block-pagebreak').forEach(el => {
    (el as HTMLElement).style.height = '0';
    (el as HTMLElement).style.background = 'none';
    (el as HTMLElement).style.margin = '0';
  });

  clone.querySelectorAll('.pdfb-block-spacer').forEach(el => {
    (el as HTMLElement).style.background = 'none';
  });
}

/**
 * Return CSS rules that force explicit page breaks at the same positions
 * computed by computePageBreaks.
 */
function buildExplicitBreakCSS(
  pageElement: HTMLElement,
  doc: Document,
  contentHeightPx: number,
): string {
  const heights = measureStripeHeights(pageElement, doc.blocks);
  const breaks  = computePageBreaks(doc.blocks, heights, contentHeightPx);

  return breaks
    .map(pb => {
      if (!pb.stripeId) return '';
      return `[data-block-id="${pb.stripeId}"] { break-before: page !important; page-break-before: always !important; }`;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Trigger the browser native print dialog.
 *
 * Extracts ONLY the rendered content blocks (the stripes) and injects them
 * into a plain <div>. The browser's layout engine paginates freely.
 * @page sets the paper size + margins.
 */
export function openPrintWindow(pageElement: HTMLElement, doc: Document): void {
  const { pageSettings } = doc;
  const isLandscape = pageSettings.orientation === 'landscape';
  const m = pageSettings.margins;
  const ps = pageSettings.paperSize;
  const pageW = isLandscape ? ps.height : ps.width;   // mm
  const pageH = isLandscape ? ps.width  : ps.height;  // mm
  const isContinuous = true;
  const bg = doc.globalStyles.pageBackground || doc.globalStyles.contentBackground || '#ffffff';
  const contentArea = getContentAreaPx(pageSettings);

  const MM_TO_PX = 96 / 25.4;
  const errorMarginMM = 10;

  // ── 1. Clone the full page and clean editor artefacts ─────────
  const pageClone = pageElement.cloneNode(true) as HTMLElement;
  cleanClone(pageClone);

  const pageContentEl = pageClone.querySelector('.pdfb-page-content');
  const innerHtml = pageContentEl ? pageContentEl.innerHTML : pageClone.innerHTML;

  // ── 2. Tear down any previous print session ────────────────────
  document.getElementById('pdfb-print-style')?.remove();
  document.getElementById('pdfb-print-mount')?.remove();
  document.getElementById('pdfb-print-measure')?.remove();

  // ── 3. For continuous mode: strip page-break elements & measure height ─
  let finalInnerHtml = innerHtml;
  let finalPageHeightMm = pageH;

  if (isContinuous) {
    const stripTemp = document.createElement('div');
    stripTemp.innerHTML = innerHtml;
    stripTemp.querySelectorAll('.pdfb-block-pagebreak').forEach(el => el.remove());
    finalInnerHtml = stripTemp.innerHTML;

    const livePageContent = pageElement.querySelector('.pdfb-page-content') as HTMLElement;
    const scrollH = livePageContent ? livePageContent.scrollHeight : pageElement.scrollHeight;
    finalPageHeightMm = Math.ceil((scrollH / MM_TO_PX) * 2) / 2;
  }

  // ── 4. Compute explicit page-break CSS for paginated mode ─────
  const explicitBreakCSS = isContinuous
    ? ''
    : buildExplicitBreakCSS(pageElement, doc, contentArea.height);

  // ── 5. Build the print stylesheet ─────────────────────────────
  const printStyle = document.createElement('style');
  printStyle.id = 'pdfb-print-style';
  printStyle.textContent = `
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box;
    }

    @page {
      size: ${pageW}mm ${finalPageHeightMm + errorMarginMM}mm;
      margin: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;
    }

    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

      html, body {
        height: auto !important;
        min-height: 0 !important;
        overflow: visible !important;
        margin: 0 !important;
        padding: 0 !important;
        background: ${bg} !important;
      }

      body > *:not(#pdfb-print-mount) {
        display: none !important;
        visibility: hidden !important;
      }

      #pdfb-print-mount {
        display: block !important;
        position: static !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        background: ${bg} !important;
        margin: 0 !important;
        padding: 0 !important;
        font-family: ${doc.pageSettings.defaultFontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'};
        font-size: ${doc.globalStyles.defaultFontSize || 16}px;
        color: ${doc.globalStyles.defaultFontColor || '#333333'};
      }

      #pdfb-print-mount .pdfb-page,
      #pdfb-print-mount .pdfb-page-content {
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
      }

      #pdfb-print-mount,
      #pdfb-print-mount *,
      #pdfb-print-mount *::before,
      #pdfb-print-mount *::after {
        box-sizing: border-box !important;
      }

      #pdfb-print-mount .pdfb-stripe {
        display: block !important;
        width: 100% !important;
        position: static !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }
      #pdfb-print-mount .pdfb-structure {
        display: flex !important;
        width: 100% !important;
        flex-wrap: nowrap !important;
      }
      #pdfb-print-mount .pdfb-column {
        overflow: visible !important;
        flex-shrink: 0 !important;
        padding: 0 !important;
        min-height: 0 !important;
      }

      #pdfb-print-mount .pdfb-canvas-block {
        outline: none !important;
        box-shadow: none !important;
      }
      #pdfb-print-mount .pdfb-canvas-block.selected {
        box-shadow: none !important;
      }

      #pdfb-print-mount .ProseMirror        { outline: none; }
      #pdfb-print-mount .ProseMirror p      { margin: 0; }
      #pdfb-print-mount .ProseMirror ul,
      #pdfb-print-mount .ProseMirror ol     { padding-left: 1.5em; margin: 0.4em 0; }
      #pdfb-print-mount .ProseMirror li     { margin: 0.15em 0; }
      #pdfb-print-mount .ProseMirror blockquote {
        border-left: 3px solid #5b8cff; padding-left: 1em;
        margin: 0.4em 0; color: #6b6b80; font-style: italic;
      }
      #pdfb-print-mount .ProseMirror a,
      #pdfb-print-mount .pdfb-link { color: #5b8cff; text-decoration: underline; }
      #pdfb-print-mount .ProseMirror h1 { font-size: 2em;    font-weight: 700; margin: 0.5em 0 0.2em; line-height: 1.2; }
      #pdfb-print-mount .ProseMirror h2 { font-size: 1.5em;  font-weight: 700; margin: 0.5em 0 0.2em; line-height: 1.3; }
      #pdfb-print-mount .ProseMirror h3 { font-size: 1.17em; font-weight: 600; margin: 0.5em 0 0.2em; }
      #pdfb-print-mount .ProseMirror strong { font-weight: 700; }
      #pdfb-print-mount .ProseMirror em     { font-style: italic; }
      #pdfb-print-mount .ProseMirror u      { text-decoration: underline; }
      #pdfb-print-mount .ProseMirror s      { text-decoration: line-through; }

      .pdfb-floating-toolbar, .pdfb-block-label, .pdfb-drop-indicator,
      .pdfb-page-break-line, .pdfb-pagebreak-band,
      .pdfb-spacing-padding, .pdfb-spacing-margin,
      .pdfb-column-empty, .pdfb-lock-overlay, .pdfb-resize-handle,
      .pdfb-hover-label, .pdfb-quick-add-btn,
      .pdfb-hidden-block { display: none !important; }

      .pdfb-locked { pointer-events: auto !important; opacity: 1 !important; cursor: auto !important; }

      ${isContinuous
        ? `* { break-after: avoid !important; page-break-after: avoid !important;
               break-before: avoid !important; page-break-before: avoid !important; }
           .pdfb-block-pagebreak { display: none !important; }`
        : `.pdfb-block-pagebreak {
             break-after: page; page-break-after: always;
             height: 0 !important; background: none !important; margin: 0 !important;
           }
           .pdfb-block-pagebreak::after { display: none !important; }
           [data-keep-together="true"] {
             break-inside: avoid !important; page-break-inside: avoid !important;
           }
           ${explicitBreakCSS}`
      }

      .pdfb-block-spacer { background: none !important; }
      #pdfb-print-mount img { max-width: 100% !important; }
      .pdfb-block-button-wrapper a { text-decoration: none; }
      .pdfb-block-divider { display: flex; padding: 4px 0; }
      .pdfb-block-image { display: flex; }
      .pdfb-block-button-wrapper { display: flex; }
    }
  `;

  // ── 6. Build the print mount ───────────────────────────────────
  const printMount = document.createElement('div');
  printMount.id = 'pdfb-print-mount';
  printMount.innerHTML = finalInnerHtml;

  document.head.appendChild(printStyle);
  document.body.appendChild(printMount);

  // ── 7. Print then clean up ─────────────────────────────────────
  const cleanup = () => {
    document.getElementById('pdfb-print-style')?.remove();
    document.getElementById('pdfb-print-mount')?.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}
