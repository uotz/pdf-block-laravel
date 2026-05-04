@php
  use PdfBlock\Laravel\StyleHelpers as S;

  $style = S::blockStyles($block['styles'] ?? []);
  $chartData = $block['data'] ?? [];
  $maxValue = max(array_map(fn($d) => $d['value'] ?? 0, $chartData) ?: [1]);
  $chartType = $block['chartType'] ?? 'bar';
  $width = $block['width'] ?? 400;
  $height = $block['height'] ?? 250;
@endphp
<div style="{{ $style }};width:{{ $width }}px;margin:0 auto">
  @if($block['title'] ?? '')
    <div style="text-align:center;font-weight:600;margin-bottom:12px;font-size:14px">
      {{ e($block['title']) }}
    </div>
  @endif

  @if($chartType === 'bar')
    <div style="display:flex;align-items:flex-end;gap:8px;height:{{ $height - 40 }}px;justify-content:center">
      @foreach($chartData as $d)
        @php $pct = $maxValue > 0 ? ($d['value'] / $maxValue) * 100 : 0; @endphp
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
          <div style="
            width:40px;
            background-color:{{ $d['color'] ?? '#5b8cff' }};
            height:{{ $pct }}%;
            border-radius:4px 4px 0 0;
            min-height:4px;
          "></div>
          <span style="font-size:11px">{{ e($d['label'] ?? '') }}</span>
        </div>
      @endforeach
    </div>
  @else
    <div style="text-align:center;padding:24px;color:#999;font-size:13px">
      [{{ ucfirst($chartType) }} chart — {{ count($chartData) }} data points]
    </div>
  @endif
</div>
