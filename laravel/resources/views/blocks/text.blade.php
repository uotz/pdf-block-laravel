@php
  use PdfBlock\Laravel\StyleHelpers as S;
  
  $style = S::blockStyles($block['styles'] ?? []) . implode('', array_filter([
      "font-family:" . ($block['fontFamily'] ?? 'inherit') . ";",
      "font-size:" . ($block['fontSize'] ?? 16) . "px;",
      "font-weight:" . ($block['fontWeight'] ?? 400) . ";",
      "color:" . ($block['fontColor'] ?? 'inherit') . ";",
      ($block['lineHeight'] ?? null) ? "line-height:{$block['lineHeight']};" : '',
      ($block['letterSpacing'] ?? null) ? "letter-spacing:{$block['letterSpacing']}px;" : '',
      "text-align:" . ($block['textAlign'] ?? 'left') . ";",
      ($block['textTransform'] ?? 'none') !== 'none' ? "text-transform:{$block['textTransform']};" : '',
  ]));

  $html = $tiptap->toHtml($block['content'] ?? []);
@endphp
<div style="{{ $style }}">{!! $html !!}</div>
