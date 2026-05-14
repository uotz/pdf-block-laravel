@php
  use PdfBlock\Laravel\Email\EmailStyleHelpers as ES;
  use PdfBlock\Laravel\Email\VmlHelpers as V;

  $outer   = ES::blockStyles($block['styles'] ?? []);
  $align   = ES::alignAttr($block['alignment'] ?? 'center');
  $href    = $block['url'] ?? '#';
  $text    = $block['text'] ?? 'Button';
  $padV    = (int) ($block['paddingV'] ?? 12);
  $padH    = (int) ($block['paddingH'] ?? 24);
  $fontSize = (int) ($block['fontSize'] ?? 16);
  $fontWeight = (string) ($block['fontWeight'] ?? 600);
  $fontColor = (string) ($block['fontColor'] ?? '#ffffff');
  $bgColor = (string) ($block['bgColor'] ?? '#3b82f6');
  $radius  = (int) (($block['borderRadius']['topLeft'] ?? 4));

  // Approximate button box size for VML sizing.
  $vmlWidth  = max(120, (int) (strlen($text) * $fontSize * 0.6) + $padH * 2);
  $vmlHeight = $fontSize + $padV * 2 + 4;
  $vmlRadius = $vmlHeight > 0 ? min(50, (int) round(($radius / $vmlHeight) * 100)) : 0;
@endphp
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="{{ $outer }}">
  <tr><td align="{{ $align }}">
    {!! V::buttonRoundrect($href, $text, [
        'width'      => $vmlWidth,
        'height'     => $vmlHeight,
        'radius'     => $vmlRadius,
        'fill'       => $bgColor,
        'stroke'     => $bgColor,
        'fontSize'   => $fontSize,
        'fontWeight' => $fontWeight,
        'color'      => $fontColor,
        'fontFamily' => $fontStack ?? 'Arial, sans-serif',
    ]) !!}
    <!--[if !mso]><!-- -->
    <a href="{{ e($href) }}" target="_blank" style="display:inline-block;background-color:{{ $bgColor }};color:{{ $fontColor }};font-family:{{ $fontStack ?? 'Arial, sans-serif' }};font-size:{{ $fontSize }}px;font-weight:{{ $fontWeight }};text-decoration:none;padding:{{ $padV }}px {{ $padH }}px;border-radius:{{ $radius }}px;mso-hide:all;">{{ e($text) }}</a>
    <!--<![endif]-->
  </td></tr>
</table>
