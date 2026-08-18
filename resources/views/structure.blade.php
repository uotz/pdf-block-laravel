{{--
  pdf-block::structure
  
  Renders a StructureBlock — a row of columns.
  Uses flexbox layout matching the React StructureRenderer.
--}}
@php
  use PdfBlock\Laravel\StyleHelpers as S;
  
  $gap = $structure['columnGap'] ?? 0;
  // CSS Grid como primitiva (paridade com o editor): align-items em termos de grid.
  $vAlign = match($structure['verticalAlignment'] ?? 'top') {
      'center' => 'center',
      'bottom' => 'end',
      default  => 'start',
  };
  // Tracks `fr` proporcionais às larguras (%), espelhando o gridTemplateColumns do
  // FlowCanvas. `minmax(0,…)` replica o antigo `flex:${w} 0 0px; min-width:0` (uma
  // track `Nfr` crua é `minmax(auto,Nfr)`, alargaria a coluna e mudaria a quebra de
  // texto/altura) → mesmo layout/paginação do v2/flex.
  $cols = $structure['columns'] ?? [];
  $colCount = max(count($cols), 1);
  $tracks = implode(' ', array_map(fn($c) => 'minmax(0, ' . ($c['width'] ?? (100 / $colCount)) . 'fr)', $cols));
  if ($tracks === '') { $tracks = 'minmax(0, 1fr)'; }
  $isBanner = ($structure['variant'] ?? 'default') === 'banner';
  // Multi-coluna/banner = unidade indivisível (espelha o data-atomic do React);
  // o CSS paginado aplica break-inside: avoid para o PDF bater com o preview.
  $isMultiColumn = count($structure['columns'] ?? []) > 1;
  // Cards coloridos (fundo não-transparente) também são indivisíveis: um fundo
  // partido por uma quebra de página parece quebrado.
  $hasColoredBg = S::hasColoredBackground($structure['styles'] ?? []);
  $isAtomic = $isBanner || $isMultiColumn || $hasColoredBg;

  $outerStyle = S::blockStyles($structure['styles'] ?? []);
  
  if ($isBanner) {
      // Defaults dos campos de banner (DSL esparsa): fonte única = BlockDefaults,
      // espelho de DEFAULT_BANNER_FIELDS do editor → paridade editor↔PDF.
      $structure = array_merge(\PdfBlock\Laravel\BlockDefaults::bannerFields(), $structure);
      $bgImg = $structure['backgroundImage'];
      $bgSize = $structure['backgroundSize'];
      $bgPos = $structure['backgroundPosition'];
      $minH = $structure['minHeight'];
      $overlayColor = $structure['overlayColor'];
      $overlayOpacity = $structure['overlayOpacity'];
      
      $outerStyle .= "position:relative;min-height:{$minH}px;overflow:hidden;";
      if ($bgImg) {
          $outerStyle .= "background-image:url(" . e($bgImg) . ");background-size:{$bgSize};background-position:{$bgPos};";
      }
  }
@endphp
<div style="{{ $outerStyle }}"
  @if($structure['meta']['breakBefore'] ?? false) data-break-before="true" @endif
  @if($structure['meta']['breakAfter'] ?? false) data-break-after="true" @endif
  @if($structure['meta']['keepTogether'] ?? false) data-keep-together="true" @endif
  @if($isMultiColumn) data-multi-column="true" @endif
  @if($isAtomic) data-atomic="true" @endif
>
  @if($isBanner && ($overlayOpacity ?? 0) > 0)
    <div style="position:absolute;inset:0;background-color:{{ $overlayColor }};opacity:{{ $overlayOpacity }};"></div>
  @endif
  <div style="
    display:grid;
    grid-template-columns:{{ $tracks }};
    gap:{{ $gap }}px;
    align-items:{{ $vAlign }};
    {{ $isBanner ? 'position:relative;z-index:1;min-height:' . $minH . 'px;' : '' }}
    width:100%;
  ">
    @foreach($structure['columns'] ?? [] as $col)
      @php $colWidth = $col['width'] ?? (100 / $colCount); @endphp
      {{-- DUPLO-MODO: o pai é grid (track minmax(0,Nfr) manda); o `flex` é fallback
           p/ contextos que forcem flex (paridade com o editor/print.ts). --}}
      <div style="
        flex:{{ $colWidth }} 0 0px;
        min-width:0;
        {{ S::blockStyles($col['styles'] ?? []) }}
      ">
        @foreach($col['children'] ?? [] as $block)
          @if($block['meta']['hideOnExport'] ?? false)
            @continue
          @endif
          @include('pdf-block::block', ['block' => $block])
        @endforeach
      </div>
    @endforeach
  </div>
</div>
