@php
  use PdfBlock\Laravel\StyleHelpers as S;
  
  $style = S::blockStyles($block['styles'] ?? []) . implode('', array_filter([
      "font-size:" . ($block['fontSize'] ?? 16) . "px;",
      "font-weight:" . ($block['fontWeight'] ?? 400) . ";",
      !empty($block['fontColor']) ? "color:{$block['fontColor']};" : '',
      ($block['lineHeight'] ?? null) ? "line-height:{$block['lineHeight']};" : '',
      ($block['letterSpacing'] ?? null) ? "letter-spacing:{$block['letterSpacing']}px;" : '',
      "text-align:" . ($block['textAlign'] ?? 'left') . ";",
      ($block['textTransform'] ?? 'none') !== 'none' ? "text-transform:{$block['textTransform']};" : '',
  ]));

  $html = $tiptap->toHtml($block['content'] ?? []);
@endphp
<div class="pdfb-tiptap" style="{{ $style }}">{!! $html !!}</div>
