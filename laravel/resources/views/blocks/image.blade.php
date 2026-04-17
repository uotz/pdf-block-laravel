@php
  use PdfBlock\Laravel\StyleHelpers as S;

  $s = $block['styles'] ?? [];
  $justify = S::justifyCSS($block['alignment'] ?? 'center');
  
  $outerStyle = implode('', [
      'padding:' . S::edgeToCSS($s['padding'] ?? ['top'=>0,'right'=>0,'bottom'=>0,'left'=>0]) . ';',
      'margin:' . S::edgeToCSS($s['margin'] ?? ['top'=>0,'right'=>0,'bottom'=>0,'left'=>0]) . ';',
      'opacity:' . ($s['opacity'] ?? 1) . ';',
      S::backgroundToCSS($s['background'] ?? ['type'=>'solid','color'=>'transparent']),
      "display:flex;justify-content:{$justify};",
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
      'border-radius:' . S::cornersToCSS($s['borderRadius'] ?? ['topLeft'=>0,'topRight'=>0,'bottomRight'=>0,'bottomLeft'=>0]) . ';',
      'box-shadow:' . S::shadowToCSS($s['shadow'] ?? ['enabled'=>false]) . ';',
  ]);
@endphp
<div style="{{ $outerStyle }}">
  @if($block['src'] ?? '')
    <img src="{{ $block['src'] }}" alt="{{ e($block['alt'] ?? '') }}" title="{{ e($block['title'] ?? '') }}" style="{{ $imgStyle }}" />
  @endif
</div>
