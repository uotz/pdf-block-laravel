{{--
  pdf-block::v3.group

  Group v3 NATIVO. level='stripe' (filho de Seção, espelha groupToStripe) ou
  level='structure' (aninhado em coluna/grupo, espelha groupToStructure).
  Variante banner: fundo/overlay/minHeight a partir de group.banner.
  `forceBreak` = 1ª faixa de uma seção não-primeira (nova página).
--}}
@php
  use PdfBlock\Laravel\FlowRender;
  use PdfBlock\Laravel\StyleHelpers as S;

  $isBanner = ($group['variant'] ?? 'default') === 'banner';
  $meta = $group['meta'] ?? [];
  $gStyles = $group['styles'] ?? [];
  $keepTogether = ($meta['keepTogether'] ?? false) || S::hasColoredBackground($gStyles);
  $forceBreak = $forceBreak ?? false;
  $wrap = S::blockStyles(FlowRender::defaultStyles());
  // Alvo de âncora de clique (#id). O group recursiona stripe→structure; `anchorEmitted`
  // garante que o `id` saia UMA vez só (no wrapper externo), evitando id duplicado.
  $__isAnchor = isset($group['id']) && in_array($group['id'], $pdfbAnchorTargets ?? [], true);
  $anchorEmitted = $anchorEmitted ?? false;
@endphp

@if($level === 'stripe')
  @if($isBanner)
    {{-- banner no topo: stripe sintético (default) embrulha a structure banner --}}
    <div style="{{ $wrap }}" @if($__isAnchor) id="{{ $group['id'] }}" @endif @if($forceBreak) data-break-before="true" @endif>
      <div style="margin:0 auto;width:100%;">
        @include('pdf-block::v3.group', ['group' => $group, 'level' => 'structure', 'anchorEmitted' => $__isAnchor])
      </div>
    </div>
  @else
    @php
      $maxW = $group['contentMaxWidth'] ?? 0;
      $align = $group['contentAlignment'] ?? 'center';
      $innerMargin = match($align) { 'left' => '0 auto 0 0', 'right' => '0 0 0 auto', default => '0 auto' };
    @endphp
    <div style="{{ S::blockStyles($gStyles) }}"
      @if($__isAnchor && !$anchorEmitted) id="{{ $group['id'] }}" @endif
      @if(($meta['breakBefore'] ?? false) || $forceBreak) data-break-before="true" @endif
      @if($meta['breakAfter'] ?? false) data-break-after="true" @endif
      @if($keepTogether) data-keep-together="true" @endif
    >
      <div style="{{ $maxW > 0 ? "max-width:{$maxW}px;" : '' }}margin:{{ $innerMargin }};width:100%;">
        @include('pdf-block::v3.structure-flow', ['flow' => $group['flow'] ?? []])
      </div>
    </div>
  @endif
@else
  {{-- level === 'structure' (aninhado) --}}
  @if($isBanner)
    @php
      $banner = array_merge(\PdfBlock\Laravel\BlockDefaults::bannerFields(), $group['banner'] ?? []);
      $bgImg = $banner['backgroundImage'] ?? '';
      $bgSize = $banner['backgroundSize'] ?? 'cover';
      $bgPos = $banner['backgroundPosition'] ?? 'center center';
      $minH = $banner['minHeight'] ?? 300;
      $overlayColor = $banner['overlayColor'] ?? '#000000';
      $overlayOpacity = $banner['overlayOpacity'] ?? 0;
      $outerStyle = S::blockStyles($gStyles);
      $outerStyle .= "position:relative;min-height:{$minH}px;overflow:hidden;";
      if ($bgImg) {
          // Espelha o React (FlowCanvas): só ladrilha quando size='auto'; senão
          // no-repeat (senão 'contain'/'cover' ladrilhariam no PDF).
          $bgRepeat = $bgSize === 'auto' ? 'repeat' : 'no-repeat';
          $outerStyle .= "background-image:url(" . e($bgImg) . ");background-size:{$bgSize};background-position:{$bgPos};background-repeat:{$bgRepeat};";
      }
    @endphp
    <div style="{{ $outerStyle }}"
      @if($__isAnchor && !$anchorEmitted) id="{{ $group['id'] }}" @endif
      @if($meta['breakBefore'] ?? false) data-break-before="true" @endif
      @if($meta['breakAfter'] ?? false) data-break-after="true" @endif
      @if($meta['keepTogether'] ?? false) data-keep-together="true" @endif
      data-atomic="true"
    >
      @if(($overlayOpacity ?? 0) > 0)
        <div style="position:absolute;inset:0;background-color:{{ $overlayColor }};opacity:{{ $overlayOpacity }};"></div>
      @endif
      <div style="display:grid;grid-template-columns:minmax(0, 100fr);gap:0px;align-items:center;position:relative;z-index:1;min-height:{{ $minH }}px;width:100%;">
        <div style="flex:100 0 0px;min-width:0;{{ $wrap }}">
          @include('pdf-block::v3.column-flow', ['flow' => $group['flow'] ?? []])
        </div>
      </div>
    </div>
  @else
    @php $hasColoredBg = S::hasColoredBackground($gStyles); @endphp
    <div style="{{ S::blockStyles($gStyles) }}"
      @if($__isAnchor && !$anchorEmitted) id="{{ $group['id'] }}" @endif
      @if($meta['breakBefore'] ?? false) data-break-before="true" @endif
      @if($meta['breakAfter'] ?? false) data-break-after="true" @endif
      @if($meta['keepTogether'] ?? false) data-keep-together="true" @endif
      @if($hasColoredBg) data-atomic="true" @endif
    >
      <div style="display:grid;grid-template-columns:minmax(0, 100fr);gap:0px;align-items:start;width:100%;">
        <div style="flex:100 0 0px;min-width:0;{{ $wrap }}">
          @include('pdf-block::v3.column-flow', ['flow' => $group['flow'] ?? []])
        </div>
      </div>
    </div>
  @endif
@endif
