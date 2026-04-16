{{-- 
  pdf-block::document
  
  Main layout template — renders the full DSL document as standalone HTML.
  Mirrors the React StripeRenderer → StructureRenderer → ContentBlock pipeline.
--}}
@php
  use PdfBlock\Laravel\StyleHelpers as S;
  
  $globalStyles = $doc['globalStyles'] ?? [];
  $pageSettings = $doc['pageSettings'] ?? [];
  $pageBg = $globalStyles['pageBackground'] ?? '#ffffff';
  $contentBg = $globalStyles['contentBackground'] ?? '#ffffff';
  $defaultColor = $globalStyles['defaultFontColor'] ?? '#333333';
  $defaultFont = $pageSettings['defaultFontFamily'] ?? 'Inter, sans-serif';
@endphp
<!DOCTYPE html>
<html lang="{{ $doc['meta']['locale'] ?? 'pt-BR' }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ e($doc['meta']['title'] ?? 'Document') }}</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: {{ $pageBg }};
      font-family: {{ $defaultFont }};
      color: {{ $defaultColor }};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    img { max-width: 100%; }
    a { color: inherit; }
    table { border-collapse: collapse; }
    .pdfb-content-area {
      background: {{ $contentBg }};
      width: 100%;
    }
  </style>
</head>
<body>
<div class="pdfb-content-area">
  @foreach($doc['blocks'] ?? [] as $stripe)
    @if($stripe['meta']['hideOnExport'] ?? false)
      @continue
    @endif
    @include('pdf-block::stripe', ['stripe' => $stripe])
  @endforeach
</div>
</body>
</html>
