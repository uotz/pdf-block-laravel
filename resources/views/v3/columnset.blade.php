{{--
  pdf-block::v3.columnset

  ColumnSet v3 NATIVO → linha de colunas em CSS Grid. Lê columns[].flow direto
  (sem achatar). Emite o MESMO DOM/data-attrs que structure.blade (paridade) —
  base para spanning (tracks/colSpan) sem perder no PDF.
--}}
@php
  use PdfBlock\Laravel\FlowRender;
  use PdfBlock\Laravel\StyleHelpers as S;

  $cols = $columnset['columns'] ?? [];
  $count = max(count($cols), 1);
  $gap = $columnset['columnGap'] ?? 0;
  $vAlign = FlowRender::vAlign($columnset['verticalAlignment'] ?? 'top');
  // MODO GRADE (spanning) vs MODO LARGURA (atual). No grade, tracks = repeat(N,1fr)
  // e cada coluna ocupa `grid-column: span`; spans excedentes quebram p/ nova linha.
  $gridColumns = $columnset['gridColumns'] ?? null;
  $useGrid = FlowRender::useGrid($cols, $gridColumns);
  $gridCols = $gridColumns ?? 12;
  $tracks = $useGrid ? "repeat({$gridCols}, minmax(0, 1fr))" : FlowRender::gridTracks($cols);
  $isMultiColumn = count($cols) > 1;
  $hasColoredBg = S::hasColoredBackground($columnset['styles'] ?? []);
  $isAtomic = $isMultiColumn || $hasColoredBg;
  $outerStyle = S::blockStyles($columnset['styles'] ?? FlowRender::defaultStyles());
  // Alvo de âncora de clique (#id) → emite id no wrapper para o link interno do PDF.
  $__isAnchor = isset($columnset['id']) && in_array($columnset['id'], $pdfbAnchorTargets ?? [], true);
@endphp
<div style="{{ $outerStyle }}"
  @if($__isAnchor) id="{{ $columnset['id'] }}" @endif
  @if($columnset['meta']['breakBefore'] ?? false) data-break-before="true" @endif
  @if($columnset['meta']['breakAfter'] ?? false) data-break-after="true" @endif
  @if($columnset['meta']['keepTogether'] ?? false) data-keep-together="true" @endif
  @if($isMultiColumn) data-multi-column="true" @endif
  @if($isAtomic) data-atomic="true" @endif
>
  <div style="
    display:grid;
    grid-template-columns:{{ $tracks }};
    gap:{{ $gap }}px;
    align-items:{{ $vAlign }};
    width:100%;
  ">
    @foreach($cols as $col)
      @php $span = $useGrid ? FlowRender::span($col, $gridCols) : null; @endphp
      <div style="
        flex:{{ $col['width'] ?? (100 / $count) }} 0 0px;
        min-width:0;
        {{ $span !== null ? "grid-column:span {$span};" : '' }}
        {{ isset($col['verticalAlignment']) ? 'align-self:' . FlowRender::vAlign($col['verticalAlignment']) . ';' : '' }}
        {{ S::blockStyles($col['styles'] ?? FlowRender::defaultStyles()) }}
      ">
        @include('pdf-block::v3.column-flow', ['flow' => $col['flow'] ?? []])
      </div>
    @endforeach
  </div>
</div>
