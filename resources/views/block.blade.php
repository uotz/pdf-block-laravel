{{--
  pdf-block::block

  Router — dispatches to the correct block template based on $block['type'].

  Custom block plugins registered via BlockRendererRegistry are resolved
  first; unknown types fall through to the built-in Blade templates below.
--}}
@php
  $__type = $block['type'] ?? '';
  $__registry = app(\PdfBlock\Laravel\BlockRendererRegistry::class);
  $__pluginHtml = $__registry->render('pdf', $block, [
      'tiptap' => $tiptap ?? null,
      'mode'   => 'pdf',
  ]);
@endphp
@if($__pluginHtml !== null)
  {!! $__pluginHtml !!}
@else
@switch($__type)
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
@endif
