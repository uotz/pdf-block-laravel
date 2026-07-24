@php
  use PdfBlock\Laravel\StyleHelpers as S;

  $s = $block['styles'] ?? [];
  $justify = S::justifyCSS($block['alignment'] ?? 'center');

  // Com cor de fundo, o bloco vira um "card": a sombra precisa contornar o card
  // (este wrapper, que pinta o fundo), não ficar presa em volta da <img> interna.
  // Espelha ImageBlockRenderer (client) — sem fundo, a sombra fica na imagem.
  $hasBg = S::hasColoredBackground($s);
  $shadowCss = S::shadowToCSS($s['shadow'] ?? ['enabled'=>false]);
  $radiusCss = S::cornersToCSS($s['borderRadius'] ?? ['topLeft'=>0,'topRight'=>0,'bottomRight'=>0,'bottomLeft'=>0]);

  $outerStyle = implode('', [
      'padding:' . S::edgeToCSS($s['padding'] ?? ['top'=>0,'right'=>0,'bottom'=>0,'left'=>0]) . ';',
      'margin:' . S::edgeToCSS($s['margin'] ?? ['top'=>0,'right'=>0,'bottom'=>0,'left'=>0]) . ';',
      'opacity:' . ($s['opacity'] ?? 1) . ';',
      S::backgroundToCSS($s['background'] ?? ['type'=>'solid','color'=>'transparent']),
      "display:flex;justify-content:{$justify};",
      $hasBg ? "box-shadow:{$shadowCss};border-radius:{$radiusCss};" : '',
  ]);

  $w = match(true) {
      ($block['width'] ?? 'auto') === 'auto' => 'auto',
      ($block['width'] ?? 'auto') === 'full' => '100%',
      default => $block['width'] . 'px',
  };
  $h = ($block['height'] ?? 'auto') === 'auto' ? 'auto' : $block['height'] . 'px';

  // In single-page PDF mode, images with height:auto can cause scrollHeight
  // miscalculation if the image hasn't fully loaded at measurement time.
  // We constrain max-height so even in the worst case (image loads after
  // measurement), it can't expand beyond the container and force a new page.
  $maxH = $h === 'auto' ? 'max-height:100vh;' : '';
  
  // Sanitiza a URL (permite data:image para imagens embutidas em base64).
  $src = S::safeUrl((string) ($block['src'] ?? ''), true);

  $border = $s['border'] ?? [];
  $imgStyle = implode('', [
      "width:{$w};height:{$h};",
      $maxH,
      "object-fit:" . ($block['objectFit'] ?? 'contain') . ";",
      "max-width:100%;display:block;",
      'border-top:' . S::borderSideToCSS($border['top'] ?? ['width'=>0,'style'=>'none','color'=>'#000']) . ';',
      'border-right:' . S::borderSideToCSS($border['right'] ?? ['width'=>0,'style'=>'none','color'=>'#000']) . ';',
      'border-bottom:' . S::borderSideToCSS($border['bottom'] ?? ['width'=>0,'style'=>'none','color'=>'#000']) . ';',
      'border-left:' . S::borderSideToCSS($border['left'] ?? ['width'=>0,'style'=>'none','color'=>'#000']) . ';',
      'border-radius:' . $radiusCss . ';',
      'box-shadow:' . ($hasBg ? 'none' : $shadowCss) . ';',
  ]);
@endphp
<div style="{{ $outerStyle }}">
  @if($src && $src !== '#')
    <img src="{{ $src }}" alt="{{ $block['alt'] ?? '' }}" title="{{ $block['title'] ?? '' }}" style="{{ $imgStyle }}" />
  @endif
</div>
