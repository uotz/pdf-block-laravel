{{--
  pdf-block::block
  
  Router — dispatches to the correct block template based on $block['type'].
--}}
@switch($block['type'] ?? '')
  @case('text')
    @include('pdf-block::blocks.text', ['block' => $block])
    @break
  @case('image')
    @include('pdf-block::blocks.image', ['block' => $block])
    @break
  @case('button')
    @include('pdf-block::blocks.button', ['block' => $block])
    @break
  @case('divider')
    @include('pdf-block::blocks.divider', ['block' => $block])
    @break
  @case('spacer')
    @include('pdf-block::blocks.spacer', ['block' => $block])
    @break
  @case('table')
    @include('pdf-block::blocks.table', ['block' => $block])
    @break
  @case('qrcode')
    @include('pdf-block::blocks.qrcode', ['block' => $block])
    @break
  @case('chart')
    @include('pdf-block::blocks.chart', ['block' => $block])
    @break
  @case('pagebreak')
    @include('pdf-block::blocks.pagebreak', ['block' => $block])
    @break
@endswitch
