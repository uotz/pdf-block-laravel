{{-- 
  pdf-block::document
  
  Main layout template — renders the full DSL document as standalone HTML.
  Mirrors the React StripeRenderer → StructureRenderer → ContentBlock pipeline.
--}}
@php
  use PdfBlock\Laravel\StyleHelpers as S;
  
  $globalStyles = $doc['globalStyles'] ?? [];
  $pageSettings = $doc['pageSettings'] ?? [];
  $pageBg    = $globalStyles['pageBackground']    ?? '#ffffff';
  $contentBg = $globalStyles['contentBackground'] ?? '#ffffff';
  $defaultColor = $globalStyles['defaultFontColor'] ?? '#333333';
  $defaultFont  = $pageSettings['defaultFontFamily'] ?? 'Inter, sans-serif';
  $defaultFontSize = $globalStyles['defaultFontSize'] ?? 16;
  $blockquoteBorderColor = $globalStyles['blockquoteBorderColor'] ?? '#e0e0e0';

  // Page margins in px — same formula as React's mmToPx (round(mm * 96/25.4, 2)).
  // We apply these as body padding so the full paper-width viewport is used and
  // pageBg fills the entire page (including the margin strips in the PDF).
  // The content area inside the body padding equals the React content area width.
  $m = $pageSettings['margins'] ?? ['top' => 20, 'right' => 20, 'bottom' => 20, 'left' => 20];
  $mmToPx = fn(float $mm): float => round($mm * 96 / 25.4, 2);
  $padTop    = $mmToPx($m['top']);
  $padRight  = $mmToPx($m['right']);
  $padBottom = $mmToPx($m['bottom']);
  $padLeft   = $mmToPx($m['left']);

  // Paper size for @page — respects orientation.
  $paper     = $pageSettings['paperSize'] ?? ['width' => 210, 'height' => 297];
  $landscape = ($pageSettings['orientation'] ?? 'portrait') === 'landscape';
  $pageW     = $landscape ? ($paper['height'] ?? 297) : ($paper['width'] ?? 210);
@endphp
<!DOCTYPE html>
<html lang="{{ $doc['meta']['locale'] ?? 'pt-BR' }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ e($doc['meta']['title'] ?? 'Document') }}</title>
  @php
    // Collect the page-level default font for Google Fonts loading
    $extractFont = fn(string $val): string => trim(explode(',', $val)[0], "'\" ");

    $fontSet = [];
    $fontSet[$extractFont($defaultFont)] = true;

    // System/web-safe fonts that don't need Google Fonts loading
    $systemFonts = ['Arial','Helvetica','Georgia','Times New Roman','Courier New','Verdana','Trebuchet MS','Impact'];

    // Filter out system fonts and build a single Google Fonts URL
    $googleFamilies = array_filter(array_keys($fontSet), fn($f) => $f && !in_array($f, $systemFonts));
    $googleFontUrl = '';
    if (!empty($googleFamilies)) {
      $familyParams = array_map(
        fn($f) => 'family=' . rawurlencode($f) . ':wght@100;200;300;400;500;600;700;800;900',
        $googleFamilies
      );
      $googleFontUrl = 'https://fonts.googleapis.com/css2?' . implode('&', $familyParams) . '&display=swap';
    }
  @endphp
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  @if($googleFontUrl)
    <link href="{{ $googleFontUrl }}" rel="stylesheet">
  @endif
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      /* pageBg on body fills the full paper-width viewport, including the
         margin strips that would otherwise show as white in the PDF.
         The body padding mirrors the DSL page margins so the content
         area inside the body equals the React editor's content area. */
      background: {{ $pageBg }};
      padding: {{ $padTop }}px {{ $padRight }}px {{ $padBottom }}px {{ $padLeft }}px;
      font-family: {{ $defaultFont }};
      font-size: {{ $defaultFontSize }}px;
      color: {{ $defaultColor }};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      /* Prevent any element from creating a second page in single-page PDF mode.
         overflow:hidden clips anything that extends beyond the measured scrollHeight. */
      overflow: hidden;
    }
    img { max-width: 100%; display: block; }
    /* ── Single-page mode: suppress ALL page breaks ─────────────────────
       Break properties are suppressed so Chrome never splits the content.
       The actual page height is set dynamically via JS (beforeprint). */
    * {
      break-inside: avoid !important;
      break-before: avoid !important;
      break-after: avoid !important;
      page-break-inside: avoid !important;
      page-break-before: avoid !important;
      page-break-after: avoid !important;
    }
    /* Force zero Chrome PDF margins — all spacing is in body padding. */
    @page { margin: 0; }
    a { color: inherit; text-decoration: none; }
    table { border-collapse: collapse; }
    .pdfb-content-area {
      /* contentBg on the content area (100% of body's content box = paper
         width minus left+right padding/margins). The pageBg is visible in
         the surrounding body padding zone (the margin strips). */
      background: {{ $contentBg }};
      width: 100%;
    }

    /* ── TipTap / ProseMirror rendered content ──────────────────────────
       tiptap-php outputs raw HTML (p, h1–h6, ul, ol, blockquote, etc.)
       without any surrounding .ProseMirror wrapper, so we scope to the
       .pdfb-tiptap class added by text.blade.php.
    ── */
    /* ── Chromium PDF whitespace fix ─────────────────────────────────────
       In Chromium's PDF rendering pipeline, space characters adjacent to
       inline elements with different font-size or line-height can be
       treated as collapsible (same as end-of-line spaces in white-space:
       normal), causing words to appear merged (e.g. "O mercado de" →
       "Omercadode"). white-space: pre-wrap disables this collapsing while
       still allowing normal word-wrap at the container edge.
    ── */
    .pdfb-tiptap p   { margin: 0; white-space: pre-wrap; }
    /* Empty paragraphs (from TipTap empty lines) must have line height.
       tiptap-php emits <p><br></p> after our post-processing, but keep
       this rule as a safety net for any that slip through. */
    .pdfb-tiptap p:empty,
    .pdfb-tiptap p > br:only-child { display: block; min-height: 1em; }
    .pdfb-tiptap h1  { font-size: 2em;    font-weight: 700; margin: 0.5em 0 0.2em; line-height: 1.2; white-space: pre-wrap; }
    .pdfb-tiptap h2  { font-size: 1.5em;  font-weight: 700; margin: 0.5em 0 0.2em; line-height: 1.3; white-space: pre-wrap; }
    .pdfb-tiptap h3  { font-size: 1.17em; font-weight: 600; margin: 0.5em 0 0.2em; line-height: 1.3; white-space: pre-wrap; }
    .pdfb-tiptap h4  { font-size: 1em;    font-weight: 600; margin: 0.4em 0 0.2em; white-space: pre-wrap; }
    .pdfb-tiptap h5  { font-size: 0.83em; font-weight: 600; margin: 0.4em 0 0.2em; white-space: pre-wrap; }
    .pdfb-tiptap h6  { font-size: 0.75em; font-weight: 600; margin: 0.4em 0 0.2em; white-space: pre-wrap; }
    .pdfb-tiptap ul,
    .pdfb-tiptap ol  { padding-left: 1.5em; margin: 0.4em 0; }
    .pdfb-tiptap li  { margin: 0.15em 0; white-space: pre-wrap; }
    .pdfb-tiptap blockquote {
      border-left: 3px solid {{ $blockquoteBorderColor }};
      padding-left: 1em;
      margin: 0.4em 0;
      color: #6b6b80;
      font-style: italic;
    }
    .pdfb-tiptap a   { color: #5b8cff; text-decoration: underline; }
    .pdfb-tiptap strong { font-weight: 700; }
    .pdfb-tiptap em     { font-style: italic; }
    .pdfb-tiptap u      { text-decoration: underline; }
    .pdfb-tiptap s      { text-decoration: line-through; }
    .pdfb-tiptap code   {
      font-family: monospace;
      background: rgba(0,0,0,0.06);
      padding: 0.1em 0.3em;
      border-radius: 3px;
    }
    .pdfb-tiptap pre  {
      background: #1e1e2e;
      color: #cdd6f4;
      padding: 1em;
      border-radius: 6px;
      overflow: auto;
      font-family: monospace;
      font-size: 0.9em;
    }
    /* Divider / button / image layout helpers */
    .pdfb-block-divider   { display: flex; padding: 4px 0; }
    .pdfb-block-image     { display: flex; }
    .pdfb-block-button-wrapper { display: flex; }
    .pdfb-block-button-wrapper a { text-decoration: none; }
  </style>
</head>
<body>
<div class="pdfb-content-area">
  @foreach($doc['blocks'] ?? [] as $stripe)
    @if($stripe['meta']['hideOnExport'] ?? false)
      @continue
    @endif
    @include('pdf-block::stripe', ['stripe' => $stripe])
  @endforeach
</div>

{{-- Dynamic single-page size: measure scrollHeight on beforeprint and inject @page size.
     Chromium fires beforeprint synchronously before rendering the PDF, so the
     @page size update takes effect before any page compositing happens. --}}
<style id="pdfb-page-size">@page { margin: 0; }</style>
<script>
(function () {
    var W = {{ $pageW }};
    var cachedMm = null;

    function measure() {
        var byRect  = Math.ceil(document.body.getBoundingClientRect().height);
        var byScroll = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
        );
        // +2px absorbs sub-pixel rounding in Chrome's compositor.
        return (((Math.max(byRect, byScroll) + 2) / 96) * 25.4).toFixed(4);
    }

    function apply(mm) {
        document.getElementById('pdfb-page-size').textContent =
            '@page { size: ' + W + 'mm ' + mm + 'mm; margin: 0; }';
    }

    // Pre-measure after fonts AND images are fully loaded so scrollHeight is stable.
    window.addEventListener('load', function () {
        Promise.all([
            document.fonts.ready,
            Promise.all(
                Array.from(document.images)
                    .filter(function (i) { return !i.complete; })
                    .map(function (i) {
                        return new Promise(function (r) { i.onload = i.onerror = r; });
                    })
            )
        ]).then(function () { apply(cachedMm = measure()); });
    });

    // beforeprint fires synchronously before Chrome composites the PDF.
    window.addEventListener('beforeprint', function () { apply(cachedMm || measure()); });
}());
</script>
</body>
</html>
