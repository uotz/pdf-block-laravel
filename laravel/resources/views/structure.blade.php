{{--
  pdf-block::structure
  
  Renders a StructureBlock — a row of columns.
  Uses flexbox layout matching the React StructureRenderer.
--}}
@php
  use PdfBlock\Laravel\StyleHelpers as S;
  
  $gap = $structure['columnGap'] ?? 0;
  $vAlign = match($structure['verticalAlignment'] ?? 'top') {
      'center' => 'center',
      'bottom' => 'flex-end',
      default  => 'flex-start',
  };
  $isBanner = ($structure['variant'] ?? 'default') === 'banner';
  
  $outerStyle = S::blockStyles($structure['styles'] ?? []);
  
  if ($isBanner) {
      $bgImg = $structure['backgroundImage'] ?? '';
      $bgSize = $structure['backgroundSize'] ?? 'cover';
      $bgPos = $structure['backgroundPosition'] ?? 'center';
      $minH = $structure['minHeight'] ?? 200;
      $overlayColor = $structure['overlayColor'] ?? 'rgba(0,0,0,0.4)';
      $overlayOpacity = $structure['overlayOpacity'] ?? 0;
      
      $outerStyle .= "position:relative;min-height:{$minH}px;overflow:hidden;";
      if ($bgImg) {
          $outerStyle .= "background-image:url(" . e($bgImg) . ");background-size:{$bgSize};background-position:{$bgPos};";
      }
  }
@endphp
<div style="{{ $outerStyle }}">
  @if($isBanner && ($overlayOpacity ?? 0) > 0)
    <div style="position:absolute;inset:0;background-color:{{ $overlayColor }};opacity:{{ $overlayOpacity }};"></div>
  @endif
  <div style="
    display:flex;
    gap:{{ $gap }}px;
    align-items:{{ $vAlign }};
    {{ $isBanner ? 'position:relative;z-index:1;' : '' }}
    width:100%;
  ">
    @foreach($structure['columns'] ?? [] as $col)
      @php $colWidth = $col['width'] ?? (100 / max(count($structure['columns']), 1)); @endphp
      <div style="
        flex:0 0 {{ $colWidth }}%;
        max-width:{{ $colWidth }}%;
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
