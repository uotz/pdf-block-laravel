@php
  use PdfBlock\Laravel\StyleHelpers as S;

  $style = S::blockStyles($block['styles'] ?? []);
  $rows = $block['rows'] ?? [];
  $hasHeader = $block['headerRow'] ?? false;
  $borderW = $block['borderWidth'] ?? 1;
  $borderC = $block['borderColor'] ?? '#e5e7eb';
  $borderCSS = $borderW > 0
      ? "border:{$borderW}px solid {$borderC};"
      : "border:none;";
@endphp
<div style="{{ $style }}">
  <table style="
    @php $fs = $block['fontSize'] ?? 0; @endphp
    @if($fs > 0)font-size:{{ $fs }}px;@endif
    @if(!empty($block['fontColor']))color:{{ $block['fontColor'] }};@endif
    width:100%;
    border-collapse:collapse;
    table-layout:fixed;
  ">
    <tbody>
      @foreach($rows as $ri => $row)
        @php
          $isHeader = $ri === 0 && $hasHeader;
          $isStriped = ($block['stripedRows'] ?? false)
              && !$isHeader
              && $ri % 2 === ($hasHeader ? 0 : 1);
          $rowBg = $isHeader
              ? ($block['headerBgColor'] ?? '#f3f4f6')
              : ($isStriped ? ($block['stripedColor'] ?? '#f9fafb') : 'transparent');
        @endphp
        <tr style="background-color:{{ $rowBg }}">
          @foreach($row as $cell)
            @if($isHeader)
              <th style="
                {{ $borderCSS }}
                padding:{{ $block['cellPadding'] ?? 8 }}px;
                color:{{ $block['headerFontColor'] ?? 'inherit' }};
                font-weight:600;
                vertical-align:top;
                word-break:break-word;
                white-space:pre-wrap;
              ">{{ e($cell) }}</th>
            @else
              <td style="
                {{ $borderCSS }}
                padding:{{ $block['cellPadding'] ?? 8 }}px;
                color:{{ $block['fontColor'] ?? 'inherit' }};
                vertical-align:top;
                word-break:break-word;
                white-space:pre-wrap;
              ">{{ e($cell) }}</td>
            @endif
          @endforeach
        </tr>
      @endforeach
    </tbody>
  </table>
</div>
