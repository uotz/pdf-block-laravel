@php
  use PdfBlock\Laravel\StyleHelpers as S;

  $styles = $block['styles'] ?? [];
  // A borda estiliza o PRÓPRIO botão (<a>), não o wrapper → remove os border-*
  // (laterais) do wrapper. `border-radius` do wrapper é preservado.
  $outerStyle = preg_replace('/border-(top|right|bottom|left):[^;]*;/', '', S::blockStyles($styles));
  $justify = S::justifyCSS($block['alignment'] ?? 'center');

  // Borda do botão: seção "Borda" PADRÃO (styles.border) OU fallback legado (borderWidth).
  $bd = is_array($styles['border'] ?? null) ? $styles['border'] : [];
  $bt = $bd['top'] ?? null;
  $hasStyleBorder = is_array($bt) && ($bt['style'] ?? 'none') !== 'none' && ($bt['width'] ?? 0) > 0;
  if ($hasStyleBorder) {
      $borderCss = 'border-top:' . S::borderSideToCSS($bd['top'] ?? []) . ';'
                 . 'border-right:' . S::borderSideToCSS($bd['right'] ?? []) . ';'
                 . 'border-bottom:' . S::borderSideToCSS($bd['bottom'] ?? []) . ';'
                 . 'border-left:' . S::borderSideToCSS($bd['left'] ?? []) . ';';
  } else {
      $borderCss = ($block['borderWidth'] ?? 0) > 0
          ? "border:{$block['borderWidth']}px solid " . ($block['borderColor'] ?? '#5b8cff') . ";"
          : 'border:none;';
  }

  $btnStyle = implode('', [
      // fontSize ausente → herda o font-size do documento (body = defaultFontSize),
      // igual ao bloco de texto. Só emite quando explícito (paridade com o editor).
      !empty($block['fontSize']) ? "font-size:{$block['fontSize']}px;" : '',
      "font-weight:" . ($block['fontWeight'] ?? 600) . ";",
      "color:" . ($block['fontColor'] ?? '#ffffff') . ";",
      "background-color:" . ($block['bgColor'] ?? '#5b8cff') . ";",
      $borderCss,
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
