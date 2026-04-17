import { getContentAreaPx } from '../utils';
import { computePageBreaks, measureStripeHeights } from './pageBreaks';
import type { Document } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// print.ts — Geração de PDF single-page via Ctrl+P do navegador
// ═══════════════════════════════════════════════════════════════════════════════
//
// ARQUITETURA:
//
// O modo contínuo (isContinuous = true) gera uma ÚNICA página cuja altura
// é exatamente o tamanho do conteúdo. O Chrome nunca precisa paginar.
//
// Fluxo:
//   1. Clona o conteúdo do canvas e remove artefatos do editor (cleanClone)
//   2. Cria o mount (#pdfb-print-mount) com os mesmos CSS de impressão
//   3. Posiciona off-screen (position:fixed, left:-9999px) para medir
//   4. Mede scrollHeight no mount — com os CSS de impressão já aplicados
//   5. Define @page { size: larguraMm alturaMedidaMm } com margin:0
//   6. As margens do documento são aplicadas como padding no mount
//   7. Chama window.print() → o Chrome renderiza tudo em uma página
//
// POR QUE MEDIR NO MOUNT E NÃO NO CANVAS:
//
// O canvas (editor.css) e o print usam CSS diferentes para ProseMirror:
//   - Canvas: headings com margin:0, <li> sem margin
//   - Print: h1-h3 com margin:0.5em 0 0.2em, <li> com margin:0.15em 0
//
// Medir no canvas e imprimir com CSS diferente gerava páginas menores que
// o conteúdo real → Chrome criava uma segunda página. A solução é medir
// no mount com os mesmos CSS que serão usados na impressão.
//
// POR QUE @page { margin: 0 } NO MODO CONTÍNUO:
//
// O Chrome subtrai as margens do @page da altura total para calcular
// a área de conteúdo. Se @page tem margin:15mm e a página mede
// conteúdo+4mm, a área útil fica conteúdo-26mm → estouro → 2ª página.
// Com margin:0, a área útil = página inteira. As margens visuais são
// aplicadas como padding no #pdfb-print-mount.
//
// POR QUE break-inside:auto + break-before/after:avoid:
//
// Sem essas regras, o Chrome pode honrar break-inside:avoid de elementos
// (ex: .pdfb-canvas-block do print.css) e criar uma nova página para
// acomodar um bloco que não cabe no espaço restante.
// ═══════════════════════════════════════════════════════════════════════════════

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
 * Abre o diálogo de impressão nativo do browser (Ctrl+P).
 *
 * Modo contínuo (single-page): gera uma única página com altura = scrollHeight
 * do conteúdo renderizado com CSS de impressão. Não há paginação.
 *
 * Modo paginado (não usado atualmente): usa computePageBreaks() para inserir
 * quebras explícitas via CSS break-before:page nos stripes calculados.
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
  const errorMarginMM = 2;
  const fontFamily = doc.pageSettings.defaultFontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const fontSize = doc.globalStyles.defaultFontSize || 16;
  const fontColor = doc.globalStyles.defaultFontColor || '#333333';

  // ── 1. Clone the full page and clean editor artefacts ─────────
  const pageClone = pageElement.cloneNode(true) as HTMLElement;
  cleanClone(pageClone);

  const pageContentEl = pageClone.querySelector('.pdfb-page-content');
  const innerHtml = pageContentEl ? pageContentEl.innerHTML : pageClone.innerHTML;

  // ── 2. Tear down any previous print session ────────────────────
  document.getElementById('pdfb-print-style')?.remove();
  document.getElementById('pdfb-print-layout-style')?.remove();
  document.getElementById('pdfb-print-mount')?.remove();

  // ── 3. Strip page-break elements for continuous mode ───────────
  let finalInnerHtml = innerHtml;
  let finalPageHeightMm = pageH;

  if (isContinuous) {
    const stripTemp = document.createElement('div');
    stripTemp.innerHTML = innerHtml;
    stripTemp.querySelectorAll('.pdfb-block-pagebreak').forEach(el => el.remove());
    finalInnerHtml = stripTemp.innerHTML;
  }

  // ── 4. Compute explicit page-break CSS for paginated mode ─────
  const explicitBreakCSS = isContinuous
    ? ''
    : buildExplicitBreakCSS(pageElement, doc, contentArea.height);

  // ── 5. Layout CSS (sempre ativo — compartilhado entre medição e impressão)
  //
  // Este <style> fica FORA de @media print para que os mesmos CSS que afetam
  // a altura do conteúdo (margins de ProseMirror, display de blocos, etc.)
  // estejam ativos tanto na medição off-screen (passo 7) quanto na impressão.
  // Se esses estilos estivessem dentro de @media print, a medição off-screen
  // usaria os CSS do canvas (margin:0 nos headings) e a impressão usaria
  // CSS diferentes (margin:0.5em) — gerando discrepância de altura.
  const layoutStyle = document.createElement('style');
  layoutStyle.id = 'pdfb-print-layout-style';
  layoutStyle.textContent = `
    #pdfb-print-mount {
      font-family: ${fontFamily};
      font-size: ${fontSize}px;
      color: ${fontColor};
      background: ${bg};
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

    #pdfb-print-mount img { max-width: 100% !important; }
    #pdfb-print-mount .pdfb-block-spacer { background: none !important; }
    #pdfb-print-mount .pdfb-block-button-wrapper a { text-decoration: none; }
    #pdfb-print-mount .pdfb-block-divider { display: flex; padding: 4px 0; }
    #pdfb-print-mount .pdfb-block-image { display: flex; }
    #pdfb-print-mount .pdfb-block-button-wrapper { display: flex; }
    #pdfb-print-mount .pdfb-block-pagebreak { display: none !important; }
    #pdfb-print-mount .pdfb-hidden-block { display: none !important; }
    #pdfb-print-mount .pdfb-column-empty { display: none !important; }
  `;

  // ── 6. Monta o print mount off-screen para medição ─────────────
  //
  // O mount é posicionado fora da tela com position:fixed + left:-9999px
  // para não afetar o layout visível. A largura é definida em mm para
  // corresponder exatamente à largura do papel. O padding simula as
  // margens do documento (que no @page são 0 no modo contínuo).
  // Na hora do print, @media print sobrescreve para position:static.
  const printMount = document.createElement('div');
  printMount.id = 'pdfb-print-mount';
  printMount.innerHTML = finalInnerHtml;
  printMount.style.cssText = [
    'position:fixed', 'left:-9999px', 'top:0', 'visibility:hidden',
    `width:${pageW}mm`, 'box-sizing:border-box',
    `padding:${isContinuous ? `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm` : '0'}`,
  ].join(';');

  // ── 7. Mede a altura real com os CSS de impressão aplicados ────
  //
  // CRÍTICO: a medição acontece DEPOIS de inserir o layoutStyle e o mount
  // no DOM. O scrollHeight já inclui o padding (margens do documento) e
  // os margins de ProseMirror (headings, listas, blockquotes). O resultado
  // é a altura exata que o Chrome vai precisar para renderizar tudo.
  //
  // Arredondamos para cima com granularidade de 0.5mm e adicionamos 2mm
  // de buffer para absorver diferenças de sub-pixel entre a medição no
  // DOM e o compositor de PDF do Chrome.
  document.head.appendChild(layoutStyle);
  document.body.appendChild(printMount);

  if (isContinuous) {
    const measuredH = printMount.scrollHeight;
    finalPageHeightMm = Math.ceil((measuredH / MM_TO_PX) * 2) / 2 + 2;
  }

  // ── 8. Stylesheet exclusivo para @media print ─────────────────
  //
  // Este <style> contém regras que só se aplicam durante a impressão:
  //   - @page { size, margin:0 } para definir o tamanho exato da página
  //   - Esconde todo o resto do DOM exceto #pdfb-print-mount
  //   - Sobrescreve position:fixed do mount para position:static
  //   - Desabilita todas as propriedades de quebra de página (modo contínuo)
  //   - overflow:hidden no mount para clipar qualquer estouro residual
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
      margin: ${isContinuous ? '0' : `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`};
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
        left: auto !important;
        visibility: visible !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        margin: 0 !important;
        padding: ${isContinuous ? `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm` : '0'} !important;
      }

      .pdfb-floating-toolbar, .pdfb-block-label, .pdfb-drop-indicator,
      .pdfb-page-break-line, .pdfb-pagebreak-band,
      .pdfb-spacing-padding, .pdfb-spacing-margin,
      .pdfb-column-empty, .pdfb-lock-overlay, .pdfb-resize-handle,
      .pdfb-hover-label, .pdfb-quick-add-btn,
      .pdfb-hidden-block { display: none !important; }

      .pdfb-locked { pointer-events: auto !important; opacity: 1 !important; cursor: auto !important; }

      ${isContinuous
        ? `* { break-after: avoid !important; page-break-after: avoid !important;
               break-before: avoid !important; page-break-before: avoid !important;
               break-inside: auto !important; page-break-inside: auto !important; }
           .pdfb-block-pagebreak { display: none !important; }
           #pdfb-print-mount { overflow: hidden !important; }`
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
    }
  `;

  document.head.appendChild(printStyle);

  // ── 9. Print then clean up ─────────────────────────────────────
  const cleanup = () => {
    document.getElementById('pdfb-print-style')?.remove();
    document.getElementById('pdfb-print-layout-style')?.remove();
    document.getElementById('pdfb-print-mount')?.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}
