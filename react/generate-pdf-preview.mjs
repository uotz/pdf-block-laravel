/**
 * PDF preview generator
 */

import { createDefaultDocument } from '../packages/schema/src/index.ts';
import {
  generatePaginatedCSS,
  generateSingleLongPageCSS,
  generateSingleLongPageScript,
  renderNodeForPdf,
} from '../packages/renderer-pdf/src/index.ts';
import { makeNode, parseArgs, writeHtml } from './preview-utils.ts';

// ── CLI ────────────────────────────────────────────────────

const cli = parseArgs();
const outputFile = cli.output ?? 'dist/pdf-preview.html';
const isLandscape = cli.get('--orientation') === 'landscape';
const isSingleLong = cli.has('--single-long-page');

// ── Document ───────────────────────────────────────────────

const doc = createDefaultDocument('pdf', 'pdf-preview');
doc.meta.title = 'DocBuilder — Preview PDF'; 
doc.pageSettings!.orientation = isLandscape ? 'landscape' : 'portrait';
doc.pageSettings!.paginationMode = isSingleLong ? 'single-long-page' : 'paginated';

doc.children = [
  makeNode('heading', { content: '📄 DocBuilder — Preview PDF', level: 1 }, 'h1'),
  makeNode('text', { content: 'Este documento foi gerado pelo script generate-pdf-preview.ts para validação manual do output PDF.' }, 't1'),
  makeNode('divider', { thickness: 1, color: '#e2e8f0' }, 'div1'),
  makeNode('heading', { content: 'Seção 1 — Texto e Links', level: 2 }, 'h2'),
  makeNode('text', { content: 'O texto é renderizado como conteúdo real selecionável — não como imagem ou canvas.' }, 't2'),
  makeNode('button', { text: 'Visite o site', url: 'https://example.com', target: '_blank' }, 'btn1'),
  makeNode('spacer', { height: 24 }, 'sp1'),
  makeNode('heading', { content: 'Seção 2 — Emoji e Caracteres Especiais', level: 2 }, 'h3'),
  makeNode('text', { content: '✅ Suporte a emoji: 🎉 🚀 💡 🔥 ❤️ — renderizados via font-face fallback.' }, 't3'),
  makeNode('text', { content: 'Especiais: & < > " \' — escapados corretamente.' }, 't4'),
  makeNode('spacer', { height: 24 }, 'sp2'),
  makeNode('heading', { content: 'Seção 3 — Nó oculto (não deve aparecer)', level: 2 }, 'h4'),
  (() => {
    const n = makeNode('text', { content: 'ERRO: este nó está oculto e não deveria aparecer.' }, 'hidden1');
    n.visible = false;
    return n;
  })(),
  makeNode('text', { content: 'Parágrafo visível logo após o nó oculto.' }, 't5'),
];

for (let i = 1; i <= 8; i++) {
  doc.children.push(
    makeNode('text', {
      content: `Parágrafo de preenchimento #${i} — conteúdo para testar quebra de página no modo paginado.`,
    }, `fill${i}`),
  );
}

// ── Render ─────────────────────────────────────────────────

const bodyHtml = doc.children.map((node) => renderNodeForPdf(node)).join('\n');

const { paperSize, orientation, margins } = doc.pageSettings!;
const w = orientation === 'landscape' ? paperSize.height : paperSize.width;
const h = orientation === 'landscape' ? paperSize.width : paperSize.height;

const css = isSingleLong
  ? generateSingleLongPageCSS(doc.pageSettings!)
  : generatePaginatedCSS(doc.pageSettings!);

const dynamicScript = isSingleLong
  ? `<script>${generateSingleLongPageScript(doc.pageSettings!)}</script>`
  : '';

// ── HTML ───────────────────────────────────────────────────

const html = `<!DOCTYPE html> 
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${doc.meta.title}</title>
  <style>
    ${css}

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
        Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif,
        "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji";
      margin: 0;
    }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    a[href] { color: #2563eb; text-decoration: underline; }

    @media screen {
      body { background: #f1f5f9; padding: 32px; }
      /* Screen card — fixed width matches exact page dimensions.
       * max-width would let the card shrink on narrow viewports, making the visual
       * margin appear smaller than the real @page margin in the PDF. */
      .db-print-content {
        position: relative;
        width: ${w}mm; margin: 0 auto; background: white;
        ${isSingleLong
          ? '' /* single-long-page: padding already in generateSingleLongPageCSS */
          : `padding: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;`}
        box-sizing: border-box;
        box-shadow: 0 4px 24px rgba(0,0,0,0.12); border-radius: 4px;
      }
      .db-page-break-indicator {
        position: absolute; left: 0; right: 0;
        border-top: 2px dashed #f87171;
        display: flex; align-items: flex-start;
        pointer-events: none; z-index: 10;
      }
      .db-page-break-label {
        background: #f87171; color: white;
        font-size: 10px; font-family: monospace;
        padding: 2px 7px; border-radius: 0 0 4px 0;
        white-space: nowrap; line-height: 1.4;
      }
      .db-preview-meta {
        position: fixed; bottom: 16px; right: 16px;
        background: rgba(37,99,235,0.9); color: white;
        padding: 8px 16px; border-radius: 8px;
        font-size: 13px; font-family: monospace;
      }
    }
    @media print {
      /* In paginated mode: remove the screen-only padding and fixed width so the content
       * fills the @page printable area (page width minus real @page margins). */
      ${isSingleLong ? '' : '.db-print-content { padding: 0 !important; width: auto !important; }'}
      .db-page-break-indicator { display: none !important; }
      .db-preview-meta { display: none; }
    }
  </style>
  ${dynamicScript}
  ${!isSingleLong ? `<script>
(function () {
  // CSS px per mm (CSS reference pixel = 96dpi, 1mm = 96/25.4 px)
  var MM_TO_PX = 96 / 25.4;

  // The @page rule sets real margins. The printable height per page is:
  //   pageHeight - marginTop - marginBottom
  // In the screen preview the card has padding equal to those margins, so:
  //   - content starts at paddingTop from the top of .db-print-content
  //   - each page's content area is CONTENT_H_PX tall
  //   - the break line in the card sits at: PADDING_TOP_PX + n * CONTENT_H_PX
  var PADDING_TOP_PX   = ${margins.top}   * MM_TO_PX;
  var CONTENT_H_PX     = (${h} - ${margins.top} - ${margins.bottom}) * MM_TO_PX;

  function inject() {
    var wrapper = document.querySelector('.db-print-content');
    if (!wrapper) return;
    // Remove any previously injected indicators (e.g. on resize)
    wrapper.querySelectorAll('.db-page-break-indicator').forEach(function (el) { el.remove(); });
    var totalH = wrapper.scrollHeight;
    var page = 1;
    while (true) {
      // Position of the cut line relative to the top of the card
      var top = PADDING_TOP_PX + page * CONTENT_H_PX;
      if (top >= totalH) break;
      var bar = document.createElement('div');
      bar.className = 'db-page-break-indicator';
      bar.style.top = top + 'px';
      var label = document.createElement('span');
      label.className = 'db-page-break-label';
      label.textContent = '↑ Pág. ' + page + '  ↓ Pág. ' + (page + 1);
      bar.appendChild(label);
      wrapper.appendChild(bar);
      page++;
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
</script>` : ''}
</head>
<body>
  <div class="db-print-content">
  ${bodyHtml}
  </div>
  <div class="db-preview-meta">
    📄 ${w}×${isSingleLong ? 'dynamic' : h}mm · ${orientation}
    · margins: ${margins.top}/${margins.right}/${margins.bottom}/${margins.left}mm
    · ${isSingleLong ? 'single-long-page · @page margin: 0' : 'paginated · desmarque "Cabeçalhos e rodapés" no diálogo de impressão'}
    <br>Ctrl+P → <strong>Salvar como PDF</strong>
  </div>
</body>
</html>`;

// ── Write ──────────────────────────────────────────────────

writeHtml(outputFile, html);
console.log('  Flags disponíveis:');
console.log('    --output <path>            Arquivo de saída (padrão: dist/pdf-preview.html)');
console.log('    --orientation landscape    Orientação paisagem');
console.log('    --single-long-page         Modo página única contínua');
