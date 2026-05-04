{{--
  pdf-block::email.block

  Dispatcher. Custom plugins registered via BlockRendererRegistry take
  precedence; unknown core types fall through to a no-op.
--}}
@php
  $__type = $block['type'] ?? '';
  $__registry = app(\PdfBlock\Laravel\BlockRendererRegistry::class);
  $__pluginHtml = $__registry->render('email', $block, [
      'tiptap'    => $tiptap ?? null,
      'mode'      => 'email',
      'fontStack' => $fontStack ?? null,
      'fontColor' => $fontColor ?? null,
      'data'      => $data ?? [],
  ]);
@endphp
@if($__pluginHtml !== null)
  {!! $__pluginHtml !!}
@else
@switch($__type)
  @case('text')
    @include('pdf-block::email.blocks.text',    ['block' => $block])
    @break
  @case('image')
    @include('pdf-block::email.blocks.image',   ['block' => $block])
    @break
  @case('button')
    @include('pdf-block::email.blocks.button',  ['block' => $block])
    @break
  @case('divider')
    @include('pdf-block::email.blocks.divider', ['block' => $block])
    @break
  @case('spacer')
    @include('pdf-block::email.blocks.spacer',  ['block' => $block])
    @break
  @case('table')
    @include('pdf-block::email.blocks.table',   ['block' => $block])
    @break
  @case('banner')
    @include('pdf-block::email.blocks.banner',  ['block' => $block])
    @break
  @case('qrcode')
    @include('pdf-block::email.blocks.image',   ['block' => $block])
    @break
  @case('pagebreak')
  @case('chart')
    {{-- no-op in email mode --}}
    @break
@endswitch
@endif
