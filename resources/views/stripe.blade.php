{{--
  pdf-block::stripe
  
  Renders a StripeBlock — the top-level horizontal band.
  Contains one or more StructureBlocks.
--}}
@php
  use PdfBlock\Laravel\StyleHelpers as S;
  
  $maxW = $stripe['contentMaxWidth'] ?? 0;
  $align = $stripe['contentAlignment'] ?? 'center';
  $innerMargin = match($align) {
      'left'  => '0 auto 0 0',
      'right' => '0 0 0 auto',
      default => '0 auto',
  };
@endphp
<div style="{{ S::blockStyles($stripe['styles'] ?? []) }}">
  <div style="
    {{ $maxW > 0 ? "max-width:{$maxW}px;" : '' }}
    margin:{{ $innerMargin }};
    width:100%;
  ">
    @foreach($stripe['children'] ?? [] as $structure)
      @if($structure['meta']['hideOnExport'] ?? false)
        @continue
      @endif
      @include('pdf-block::structure', ['structure' => $structure])
    @endforeach
  </div>
</div>
