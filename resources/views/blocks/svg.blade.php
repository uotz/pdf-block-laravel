{{--
  pdf-block::blocks.svg

  Bloco de SVG inline — o "escape hatch" vetorial. Renderiza desenho arbitrário
  (diagramas, ícones, conectores, gráficos custom) como VETOR no PDF. O conteúdo
  é SANITIZADO (SvgSanitizer) antes de injetar: remove <script>, handlers on*,
  <foreignObject> e URLs perigosas — que o Chromium executaria durante o render.
  Espelha o SVGBlockRenderer do React (packages/react/src/blocks/renderers.tsx).
--}}
@php
  use PdfBlock\Laravel\StyleHelpers as S;
  use PdfBlock\Laravel\SvgSanitizer;

  $style   = S::blockStyles($block['styles'] ?? []);
  $justify = S::justifyCSS($block['alignment'] ?? 'center');
  $width   = $block['width'] ?? 'auto';
  $height  = $block['height'] ?? 'auto';

  $widthCSS  = $width === 'auto' ? 'auto' : ($width === 'full' ? '100%' : $width . 'px');
  $heightCSS = $height === 'auto' ? 'auto' : $height . 'px';

  $svg = SvgSanitizer::sanitize((string) ($block['content'] ?? ''));
@endphp
<div style="{{ $style }};display:flex;justify-content:{{ $justify }}">
  <div style="width:{{ $widthCSS }};height:{{ $heightCSS }};max-width:100%">
    {!! $svg !!}
  </div>
</div>
