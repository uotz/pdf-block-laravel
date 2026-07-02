@php
  use PdfBlock\Laravel\StyleHelpers as S;

  $outerStyle = S::blockStyles($block['styles'] ?? []);
  $justify = S::justifyCSS($block['alignment'] ?? 'center');

  $btnStyle = implode('', [
      "font-size:" . ($block['fontSize'] ?? 16) . "px;",
      "font-weight:" . ($block['fontWeight'] ?? 600) . ";",
      "color:" . ($block['fontColor'] ?? '#ffffff') . ";",
      "background-color:" . ($block['bgColor'] ?? '#5b8cff') . ";",
      ($block['borderWidth'] ?? 0) > 0
          ? "border:{$block['borderWidth']}px solid " . ($block['borderColor'] ?? '#5b8cff') . ";"
          : "border:none;",
      'border-radius:' . S::cornersToCSS($block['borderRadius'] ?? ['topLeft'=>6,'topRight'=>6,'bottomRight'=>6,'bottomLeft'=>6]) . ';',
      "padding:" . ($block['paddingV'] ?? 12) . "px " . ($block['paddingH'] ?? 24) . "px;",
      ($block['fullWidth'] ?? false) ? "width:100%;display:block;" : "display:inline-block;",
      "text-decoration:none;text-align:center;",
      // line-height NUMÉRICO fixo (paridade com o editor): `normal` depende das
      // métricas da fonte e diverge; um múltiplo fixo dá a MESMA altura nos dois.
      "line-height:1.5;",
  ]);
@endphp
<div style="{{ $outerStyle }};display:flex;justify-content:{{ $justify }}">
  <a href="{{ S::safeUrl($block['url'] ?? '#') }}" target="{{ $block['target'] ?? '_blank' }}" style="{{ $btnStyle }}">
    {{ $block['text'] ?? 'Clique aqui' }}
  </a>
</div>
