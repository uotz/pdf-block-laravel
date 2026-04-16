import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getPageDimensionsPx, getContentAreaPx, mmToPx } from '../utils';
import { computePageBreaks, measureStripeHeights } from './pageBreaks';
import type { Document } from '../types';

/**
 * Strip editor-only UI artifacts from a cloned page element.
 * Preserves block-level styles (including box-shadow from blockStylesToCSS).
 */
function cleanClone(clone: HTMLElement): void {
  // Remove ALL editor-only visual chrome
  clone.querySelectorAll(
    '.pdfb-floating-toolbar, .pdfb-block-label, .pdfb-drop-indicator, ' +
    '.pdfb-page-break-line, .pdfb-pagebreak-band, ' +
    '.pdfb-spacing-padding, .pdfb-spacing-margin, ' +
    '.pdfb-lock-overlay, .pdfb-resize-handle, .pdfb-hover-label, .pdfb-quick-add-btn'
  ).forEach(el => el.remove());

  // Remove locked / editor state classes so no visual styles bleed into PDF
  clone.querySelectorAll('.pdfb-locked').forEach(el => el.classList.remove('pdfb-locked'));

  // Remove selection outlines — do NOT remove boxShadow (it may be a block style)
  clone.querySelectorAll('.pdfb-canvas-block').forEach(el => {
    el.classList.remove('selected');
    (el as HTMLElement).style.outline = 'none';
  });

  // Remove contenteditable — prevents browser from adding edit controls in print
  clone.querySelectorAll('[contenteditable]').forEach(el => {
    el.removeAttribute('contenteditable');
  });

  // Remove Tippy/floating-ui portals that TipTap might attach
  clone.querySelectorAll('[data-tippy-root], .tippy-box, .tippy-content').forEach(el => el.remove());

  // Remove empty-column placeholders
  clone.querySelectorAll('.pdfb-column-empty').forEach(el => el.remove());

  // Remove blocks marked as hidden (hideOnExport = true → exclude from PDF)
  clone.querySelectorAll('.pdfb-hidden-block').forEach(el => el.remove());

  // Clean page break blocks
  clone.querySelectorAll('.pdfb-block-pagebreak').forEach(el => {
    (el as HTMLElement).style.height = '0';
    (el as HTMLElement).style.background = 'none';
    (el as HTMLElement).style.margin = '0';
  });

  // Clean spacer blocks (no dashed bg in output)
  clone.querySelectorAll('.pdfb-block-spacer').forEach(el => {
    (el as HTMLElement).style.background = 'none';
  });
}

/**
 * Inline styles for TipTap/ProseMirror content that won't be available
 * in the offscreen clone (since it's outside .pdfb-root).
 */
const CONTENT_STYLES = `
  .ProseMirror { outline: none; }
  .ProseMirror p { margin: 0; }
  .ProseMirror ul, .ProseMirror ol { padding-left: 1.5em; margin: 0.4em 0; }
  .ProseMirror li { margin: 0.15em 0; }
  .ProseMirror blockquote {
    border-left: 3px solid #5b8cff;
    padding-left: 1em;
    margin: 0.4em 0;
    color: #6b6b80;
    font-style: italic;
  }
  .ProseMirror a, .pdfb-link { color: #5b8cff; text-decoration: underline; }
  .ProseMirror h1 { font-size: 2em; font-weight: 700; margin: 0.5em 0 0.2em; line-height: 1.2; }
  .ProseMirror h2 { font-size: 1.5em; font-weight: 700; margin: 0.5em 0 0.2em; line-height: 1.3; }
  .ProseMirror h3 { font-size: 1.17em; font-weight: 600; margin: 0.5em 0 0.2em; line-height: 1.3; }
  .ProseMirror h4 { font-size: 1em; font-weight: 600; margin: 0.4em 0 0.2em; }
  .ProseMirror strong { font-weight: 700; }
  .ProseMirror em { font-style: italic; }
  .ProseMirror u { text-decoration: underline; }
  .ProseMirror s { text-decoration: line-through; }
  .ProseMirror code { font-family: monospace; background: rgba(0,0,0,0.06); padding: 0.1em 0.3em; border-radius: 3px; }
  .pdfb-block-divider { display: flex; padding: 4px 0; }
  .pdfb-block-divider-line { flex-shrink: 0; }
  .pdfb-block-button-wrapper { display: flex; }
  .pdfb-block-button, .pdfb-block-button-wrapper a {
    display: inline-block; text-decoration: none; text-align: center;
  }
  .pdfb-block-image { display: flex; }
  .pdfb-block-image img { max-width: 100%; display: block; }
  .pdfb-structure { display: flex; width: 100%; }
  .pdfb-stripe { position: relative; width: 100%; }
  .pdfb-block-table table { width: 100%; border-collapse: collapse; }
  .pdfb-block-table td, .pdfb-block-table th {
    border: 1px solid #e0e0ec; padding: 8px; font-size: 13px; text-align: left;
  }
  .pdfb-block-table th { font-weight: 600; }
`;

/**
 * Build CSS text from all document stylesheets (for injection into iframe/clone).
 */
function collectPageCSS(): string {
  let css = '';
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      css += Array.from(sheet.cssRules).map(r => r.cssText).join('\n');
    } catch {
      if (sheet.href) css += `@import url("${sheet.href}");\n`;
    }
  }
  return css;
}

/**
 * Export the canvas page element to a PDF Blob (continuous single-page mode).
 *
 * Continuous mode:
 *   Renders all content as one tall page.
 */
export async function exportToPDF(pageElement: HTMLElement, doc: Document): Promise<Blob> {
  const { pageSettings } = doc;
  const contentArea = getContentAreaPx(pageSettings);

  const isLandscape  = pageSettings.orientation === 'landscape';
  const pdfWidthMm   = isLandscape ? pageSettings.paperSize.height : pageSettings.paperSize.width;
  const margins      = pageSettings.margins;
  const contentWidthMm  = pdfWidthMm  - margins.left - margins.right;
  const bg = doc.globalStyles.pageBackground || doc.globalStyles.contentBackground || '#ffffff';

  // ── 1. Build offscreen clone ───────────────────────────────────
  const offscreen = document.createElement('div');
  offscreen.className = 'pdfb-root';
  offscreen.style.cssText = [
    'position:fixed', 'left:-99999px', 'top:0', 'z-index:-1',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(offscreen);

  const styleEl = document.createElement('style');
  styleEl.textContent = CONTENT_STYLES;
  offscreen.appendChild(styleEl);

  const clone = pageElement.cloneNode(true) as HTMLElement;
  cleanClone(clone);

  // Remove page-content padding — PDF engine provides margins per page
  const pageContentEl = clone.querySelector('.pdfb-page-content') as HTMLElement;
  if (pageContentEl) {
    pageContentEl.style.padding = '0';
    if (doc.globalStyles.defaultFontColor)
      pageContentEl.style.color = doc.globalStyles.defaultFontColor;
  }

  clone.style.cssText = [
    `width:${contentArea.width}px`,
    'box-shadow:none', 'border-radius:0',
    'min-height:auto', 'overflow:visible', 'padding:0',
  ].join(';');

  offscreen.appendChild(clone);

  // ── 2. Capture the full content at 2× resolution ─────────────────
  const scale = 2;
  const totalContentH = clone.scrollHeight;

  const canvas = await html2canvas(clone, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: bg,
    width:  contentArea.width,
    height: totalContentH,
    logging: false,
    removeContainer: true,
  });

  document.body.removeChild(offscreen);

  // ── 3. Build the PDF — single tall page ───────────────────────────
  const contentHeightPx  = canvas.height / scale;
  const pdfContentHeightMm = (contentHeightPx / contentArea.width) * contentWidthMm;
  const totalHeightMm    = pdfContentHeightMm + margins.top + margins.bottom;

  const tallPdf = new jsPDF({
    orientation: 'p', unit: 'mm',
    format: [pdfWidthMm, Math.max(totalHeightMm, 10)],
    compress: true,
  });

  // Fill page background before placing content
  const pageBg = doc.globalStyles.pageBackground;
  if (pageBg && pageBg !== 'transparent') {
    tallPdf.setFillColor(pageBg);
    tallPdf.rect(0, 0, pdfWidthMm, Math.max(totalHeightMm, 10), 'F');
  }

  tallPdf.addImage(
    canvas.toDataURL('image/png'), 'PNG',
    margins.left, margins.top, contentWidthMm, pdfContentHeightMm,
  );
  return tallPdf.output('blob') as unknown as Blob;
}

/**
 * Download a PDF blob as a file.
 */
export async function downloadPDF(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Trigger the browser native print dialog.
 *
 * Key insight: instead of injecting the .pdfb-page wrapper (which carries
 * all sorts of fixed-height / position / overflow CSS), we extract ONLY
 * the rendered content blocks (the stripes) and inject them into a plain
 * <div>.  This lets the browser's layout engine treat the content as a
 * normal block-flow document that paginates freely.
 *
 * @page sets the paper size + margins; the browser handles page breaks.
 */
/**
 * Return CSS rules that force explicit page breaks at the same positions
 * computed by computePageBreaks — so the native browser print matches
 * the canvas indicator and the programmatic PDF.
 */
function buildExplicitBreakCSS(
  pageElement: HTMLElement,
  doc: Document,
  contentHeightPx: number,
): string {
  const heights = measureStripeHeights(pageElement, doc.blocks);
  const breaks  = computePageBreaks(doc.blocks, heights, contentHeightPx);

  // For each break, inject break-before: page on the stripe that starts a new page
  return breaks
    .map(pb => {
      if (!pb.stripeId) return '';
      // The stripe element has data-block-id on the inner .pdfb-stripe div
      return `[data-block-id="${pb.stripeId}"] { break-before: page !important; page-break-before: always !important; }`;
    })
    .filter(Boolean)
    .join('\n');
}

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

  // CSS pixel-per-mm at 96 dpi (CSS reference pixels)
  const MM_TO_PX = 96 / 25.4;
  const errorMarginMM = 10; // Add small margin to prevent sub-pixel overflow causing extra blank page
  // ── 1. Clone the full page and clean editor artefacts ─────────
  const pageClone = pageElement.cloneNode(true) as HTMLElement;
  cleanClone(pageClone);

  // Extract ONLY the inner content blocks — skip the .pdfb-page wrapper
  // that carries fixed min-height, position:relative, overflow, etc.
  const pageContentEl = pageClone.querySelector('.pdfb-page-content');
  const innerHtml = pageContentEl ? pageContentEl.innerHTML : pageClone.innerHTML;

  // ── 2. Tear down any previous print session ────────────────────
  document.getElementById('pdfb-print-style')?.remove();
  document.getElementById('pdfb-print-mount')?.remove();
  document.getElementById('pdfb-print-measure')?.remove();

  // ── 3. For continuous mode: strip page-break elements & measure height ─
  //
  // In continuous mode there must be NO forced page breaks — even a zero-height
  // .pdfb-block-pagebreak element with `break-after: page` in CSS will force a
  // blank trailing page.  Remove those elements entirely from the mount's HTML.
  //
  // For paginated mode the browser auto-paginates using the @page paper size.
  let finalInnerHtml = innerHtml;
  let finalPageHeightMm = pageH;

  if (isContinuous) {
    // Strip ALL page-break elements from the continuous-mode HTML so no
    // `break-after: page` CSS can ever create a trailing blank page.
    const stripTemp = document.createElement('div');
    stripTemp.innerHTML = innerHtml;
    stripTemp.querySelectorAll('.pdfb-block-pagebreak').forEach(el => el.remove());
    finalInnerHtml = stripTemp.innerHTML;

    // ── Measure total page height from the live DOM ───────────────
    //
    // The live .pdfb-page-content has:
    //   scrollHeight = paddingTop + contentH + paddingBottom
    //                = mmToPx(m.top) + contentH + mmToPx(m.bottom)
    //
    // Converting to mm:   scrollHeight / MM_TO_PX
    //   = (mmToPx(m.top) + contentH + mmToPx(m.bottom)) / MM_TO_PX
    //   = m.top + contentH/MM_TO_PX + m.bottom
    //   = total page height in mm  ✓
    //
    // Using the live DOM is more reliable than a separate off-screen element
    // because all fonts, images and CSS have already been computed and applied.
    const livePageContent = pageElement.querySelector('.pdfb-page-content') as HTMLElement;
    const scrollH = livePageContent ? livePageContent.scrollHeight : pageElement.scrollHeight;
    console.log({scrollH})
    // Round up to the nearest 0.5 mm to prevent sub-pixel overflow that
    // would generate an extra blank page in the browser print engine.
    finalPageHeightMm = Math.ceil((scrollH / MM_TO_PX) * 2) / 2;
  }

  // ── 4. Compute explicit page-break CSS for paginated mode ─────────
  //
  // Instead of relying on the browser's own pagination algorithm (which
  // differs from our canvas indicator and PDF export), we inject explicit
  // break-before: page rules for the exact stripes that computePageBreaks
  // determined should start a new page.  All three views now agree.
  const explicitBreakCSS = isContinuous
    ? ''
    : buildExplicitBreakCSS(pageElement, doc, contentArea.height);
  console.log({finalPageHeightMm});
  // ── 5. Build the print stylesheet ─────────────────────────────
  const printStyle = document.createElement('style');
  printStyle.id = 'pdfb-print-style';
  printStyle.textContent = `

    /* ── @page ────────────────────────────────────────────────────
       Paginated : exact paper size → browser auto-breaks to next page.
       Continuous: calculated total height → single unbroken page.
       Appended last, so overrides the editor's own @page{margin:0}. */
    /* ── Base reset (applies to both screen and print contexts) ──
       Resets any browser-default body margin/padding so the print
       layout starts from a clean, symmetric slate.                 */
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box;
    }

    @page {
      size: ${pageW}mm ${finalPageHeightMm + errorMarginMM}mm;
      margin: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;
    }

    /* ── @media print ─────────────────────────────────────────── */
    @media print {

      /* Colour fidelity */
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

      /* html + body must NOT constrain height — the content can be
         taller than one page; the browser's pagination handles splits. */
      html, body {
        height: auto !important;
        min-height: 0 !important;
        overflow: visible !important;
        margin: 0 !important;
        padding: 0 !important;
        background: ${bg} !important;
      }

      /* Hide everything at body level except the print mount */
      body > *:not(#pdfb-print-mount) {
        display: none !important;
        visibility: hidden !important;
      }

      /* The mount itself: full-width block, zero constraints.
         Explicit margins=0 on the mount and its wrapper prevent any
         browser-default indentation that would cause left≠right asymmetry. */
      #pdfb-print-mount {
        display: block !important;
        position: static !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        background: ${bg} !important;
        margin: 0 !important;
        padding: 0 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      /* Also zero out any pdfb-page or pdfb-page-content padding that
         may survive from the editor's stylesheet — @page margin provides
         the real margins, so no extra padding must exist. */
      #pdfb-print-mount .pdfb-page,
      #pdfb-print-mount .pdfb-page-content {
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
      }

      /* Box-sizing: the canvas uses .pdfb-root * { border-box } so every
         element with padding counts it inside its declared width/height.
         The print mount lives OUTSIDE .pdfb-root, so without this rule
         columns with padding would exceed their width: N% and overflow,
         making the layout taller than what the canvas measured. */
      #pdfb-print-mount,
      #pdfb-print-mount *,
      #pdfb-print-mount *::before,
      #pdfb-print-mount *::after {
        box-sizing: border-box !important;
      }

      /* ── Stripe / Structure / Column layout ── */
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
        /* Column padding has no UI control — zero it to match canvas measurement.
           Existing documents may have 8px default baked into inline styles. */
        padding: 0 !important;
        min-height: 0 !important;
      }

      /* ── Content blocks ── */
      #pdfb-print-mount .pdfb-canvas-block {
        outline: none !important;
        box-shadow: none !important;
      }
      #pdfb-print-mount .pdfb-canvas-block.selected {
        box-shadow: none !important;
      }

      /* ── ProseMirror content ── */
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

      /* ── Hide ALL editor-only chrome ── */
      .pdfb-floating-toolbar, .pdfb-block-label, .pdfb-drop-indicator,
      .pdfb-page-break-line, .pdfb-pagebreak-band,
      .pdfb-spacing-padding, .pdfb-spacing-margin,
      .pdfb-column-empty, .pdfb-lock-overlay, .pdfb-resize-handle,
      .pdfb-hover-label, .pdfb-quick-add-btn,
      .pdfb-hidden-block { display: none !important; }

      /* Remove locked-block visual state */
      .pdfb-locked { pointer-events: auto !important; opacity: 1 !important; cursor: auto !important; }

      /* ── Page breaks ── */
      ${isContinuous
        ? `/* Continuous mode: suppress ALL page breaks */
           * { break-after: avoid !important; page-break-after: avoid !important;
               break-before: avoid !important; page-break-before: avoid !important; }
           .pdfb-block-pagebreak { display: none !important; }`
        : `/* Paginated mode: explicit block breaks */
           .pdfb-block-pagebreak {
             break-after: page; page-break-after: always;
             height: 0 !important; background: none !important; margin: 0 !important;
           }
           .pdfb-block-pagebreak::after { display: none !important; }
           [data-keep-together="true"] {
             break-inside: avoid !important; page-break-inside: avoid !important;
           }
           /* Explicit per-stripe page breaks matching canvas + PDF export */
           ${explicitBreakCSS}`
      }

      /* ── Misc ── */
      .pdfb-block-spacer { background: none !important; }
      /* max-width prevents horizontal overflow; do NOT set height:auto —
         inline height styles (from user-controlled image dimensions) must
         be preserved so the print layout matches the canvas scrollHeight
         measurement used to calculate @page size. */
      #pdfb-print-mount img { max-width: 100% !important; }
      .pdfb-block-button-wrapper a { text-decoration: none; }
      .pdfb-block-divider { display: flex; padding: 4px 0; }
      .pdfb-block-image { display: flex; }
      .pdfb-block-button-wrapper { display: flex; }
    }
  `;

  // ── 4. Build the print mount ───────────────────────────────────
  const printMount = document.createElement('div');
  printMount.id = 'pdfb-print-mount';
  printMount.innerHTML = finalInnerHtml;

  document.head.appendChild(printStyle);
  document.body.appendChild(printMount);

  // ── 5. Print then clean up ─────────────────────────────────────
  const cleanup = () => {
    document.getElementById('pdfb-print-style')?.remove();
    document.getElementById('pdfb-print-mount')?.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}
