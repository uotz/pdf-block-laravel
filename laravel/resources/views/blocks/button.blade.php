@php
  use PdfBlock\Laravel\StyleHelpers as S;

  $outerStyle = S::blockStyles($block['styles'] ?? []);
  $justify = S::justifyCSS($block['alignment'] ?? 'center');

  $btnStyle = implode('', [
      "font-family:" . ($block['fontFamily'] ?? 'inherit') . ";",
      "font-size:" . ($block['fontSize'] ?? 16) . "px;",
      "font-weight:" . ($block['fontWeight'] ?? 600) . ";",
      "color:" . ($block['fontColor'] ?? '#ffffff') . ";",
      "background-color:" . ($block['bgColor'] ?? '#3b82f6') . ";",
      ($block['borderWidth'] ?? 0) > 0
          ? "border:{$block['borderWidth']}px solid " . ($block['borderColor'] ?? '#3b82f6') . ";"
          : "border:none;",
      'border-radius:' . S::cornersToCSS($block['borderRadius'] ?? ['topLeft'=>4,'topRight'=>4,'bottomRight'=>4,'bottomLeft'=>4]) . ';',
      "padding:" . ($block['paddingV'] ?? 12) . "px " . ($block['paddingH'] ?? 24) . "px;",
      ($block['fullWidth'] ?? false) ? "width:100%;display:block;" : "display:inline-block;",
      "text-decoration:none;text-align:center;",
  ]);
@endphp
<div style="{{ $outerStyle }};display:flex;justify-content:{{ $justify }}">
  <a href="{{ $block['url'] ?? '#' }}" target="{{ $block['target'] ?? '_self' }}" style="{{ $btnStyle }}">
    {{ e($block['text'] ?? 'Button') }}
  </a>
</div>
