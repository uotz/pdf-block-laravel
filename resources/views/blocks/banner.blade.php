@php
  use PdfBlock\Laravel\StyleHelpers as S;

  $style = S::blockStyles($block['styles'] ?? []);
  $align = $block['alignment'] ?? 'center';
  $textAlign = match($align) {
      'left'  => 'left',
      'right' => 'right',
      default => 'center',
  };
  $alignItems = match($align) {
      'left'  => 'flex-start',
      'right' => 'flex-end',
      default => 'center',
  };
@endphp
<div style="
  {{ $style }}
  height:{{ $block['height'] ?? 200 }}px;
  background-image:{{ ($block['imageUrl'] ?? '') ? 'url(' . e($block['imageUrl']) . ')' : 'linear-gradient(135deg, #667eea, #764ba2)' }};
  background-size:cover;
  background-position:center;
  display:flex;
  flex-direction:column;
  align-items:{{ $alignItems }};
  justify-content:center;
  padding:24px;
  position:relative;
">
  <div style="position:absolute;inset:0;background-color:{{ $block['overlayColor'] ?? 'rgba(0,0,0,0.3)' }};opacity:{{ $block['overlayOpacity'] ?? 0.3 }}"></div>
  <div style="position:relative;z-index:1;text-align:{{ $textAlign }}">
    <div style="font-size:{{ $block['titleFontSize'] ?? 28 }}px;color:{{ $block['titleColor'] ?? '#ffffff' }};font-weight:700;margin-bottom:8px">
      {{ e($block['title'] ?? '') }}
    </div>
    <div style="font-size:{{ $block['subtitleFontSize'] ?? 16 }}px;color:{{ $block['subtitleColor'] ?? '#ffffff' }}">
      {{ e($block['subtitle'] ?? '') }}
    </div>
  </div>
</div>
