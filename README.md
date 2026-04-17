# pdf-block/laravel

Pacote Laravel para renderizar documentos da DSL do **pdf-block** em PDF nativo. Texto selecionável, links clicáveis, imagens embutidas — PDF de verdade, não screenshot.

Usa [Browsershot](https://github.com/spatie/browsershot) (Puppeteer) para converter HTML com inline styles em PDF via Chrome headless.

## Instalação

```bash
composer require pdf-block/laravel
```

O service provider é registrado automaticamente via auto-discovery do Laravel.

### Pré-requisitos no servidor

O Browsershot requer Node.js e Puppeteer instalados no servidor:

```bash
# Node.js
sudo apt install nodejs npm

# Puppeteer (Chrome headless)
npm install -g puppeteer
# ou instale o Chromium do SO:
sudo apt install chromium-browser
```

### Publicar config (opcional)

```bash
php artisan vendor:publish --tag=pdf-block-config
```

Isso cria `config/pdf-block.php` com as opções de configuração.

### Publicar views (opcional)

```bash
php artisan vendor:publish --tag=pdf-block-views
```

Permite customizar os Blade templates de renderização em `resources/views/vendor/pdf-block/`.

## Uso

### Injeção de dependência

```php
use PdfBlock\Laravel\PdfBlockRenderer;

class ExportController extends Controller
{
    public function pdf(Request $request, PdfBlockRenderer $renderer)
    {
        $document = $request->input('document');

        // Gera PDF nativo
        $pdf = $renderer->toPdf($document);

        // Retorna como download
        return $pdf->toResponse('documento.pdf');
    }
}
```

### API completa

```php
$renderer = app(PdfBlockRenderer::class);

// DSL → HTML (útil para debug, email, preview)
$html = $renderer->toHtml($document);

// DSL → PDF (blob)
$pdf = $renderer->toPdf($document);

// Download
return $pdf->toResponse('invoice.pdf');

// Preview inline no browser
return $pdf->toInlineResponse('preview.pdf');

// Salvar em disco
$pdf->save(storage_path('exports/invoice.pdf'));

// Tamanho em bytes
$pdf->size();

// Conteúdo binário raw
$pdf->content();
```

## Configuração

```php
// config/pdf-block.php

return [
    // Caminho para o binário do Node.js
    'node_binary' => env('PDF_BLOCK_NODE_BINARY', '/usr/bin/node'),

    // Caminho para o binário do npm
    'npm_binary'  => env('PDF_BLOCK_NPM_BINARY', '/usr/bin/npm'),

    // Timeout em segundos para a renderização
    'timeout' => (int) env('PDF_BLOCK_TIMEOUT', 30),

    // Flags do Chromium
    'chrome_args' => [
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
    ],
];
```

### Variáveis de ambiente

```dotenv
PDF_BLOCK_NODE_BINARY=/usr/bin/node
PDF_BLOCK_NPM_BINARY=/usr/bin/npm
PDF_BLOCK_TIMEOUT=30
```

## DSL — Formato do documento

O pacote espera receber a mesma DSL JSON produzida pelo editor `@pdf-block/react`:

```json
{
  "id": "uuid",
  "version": "2.0.0",
  "meta": {
    "title": "Meu documento",
    "description": "",
    "locale": "pt-BR",
    "tags": []
  },
  "pageSettings": {
    "paperSize": { "preset": "a4", "width": 210, "height": 297 },
    "orientation": "portrait",
    "margins": { "top": 20, "right": 20, "bottom": 20, "left": 20 },
    "defaultFontFamily": "Inter, sans-serif"
  },
  "globalStyles": {
    "pageBackground": "#ffffff",
    "contentBackground": "#ffffff",
    "defaultFontColor": "#333333"
  },
  "blocks": [
    {
      "type": "stripe",
      "children": [
        {
          "type": "structure",
          "columns": [
            {
              "width": 100,
              "children": [
                { "type": "text", "content": { "type": "doc", "content": [...] }, ... },
                { "type": "image", "src": "https://...", ... },
                { "type": "button", "text": "Clique aqui", "url": "https://...", ... }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Arquitetura

```
DSL JSON (do editor React)
    │
    ▼
PdfBlockRenderer::toHtml()
    │  Blade templates renderizam cada bloco
    │  com inline styles idênticos ao editor
    ▼
HTML string standalone
    │
    ▼
PdfBlockRenderer::toPdf()
    │  Browsershot → Puppeteer → Chrome headless
    │  page.pdf() com margens e tamanho de papel
    ▼
PdfResult (blob PDF nativo)
```

### Paridade visual

Os Blade templates replicam 1:1 os renderers React. Ambos usam 100% inline styles via as mesmas funções CSS helper (portadas de TypeScript para PHP em `StyleHelpers.php`).

### Blocos suportados

| Bloco | Template | Descrição |
|---|---|---|
| `text` | `blocks/text.blade.php` | Rich text via TipTap JSON → HTML (`ueberdosis/tiptap-php`) |
| `image` | `blocks/image.blade.php` | Imagem com alignment, objectFit, bordas |
| `button` | `blocks/button.blade.php` | Link estilizado como botão (clicável no PDF) |
| `divider` | `blocks/divider.blade.php` | Linha horizontal |
| `spacer` | `blocks/spacer.blade.php` | Espaço vertical |
| `banner` | `blocks/banner.blade.php` | Imagem de fundo com overlay e textos |
| `table` | `blocks/table.blade.php` | Tabela com header, zebra, bordas |
| `qrcode` | `blocks/qrcode.blade.php` | Placeholder de QR code |
| `chart` | `blocks/chart.blade.php` | Gráfico de barras (CSS puro) |
| `pagebreak` | `blocks/pagebreak.blade.php` | Quebra de página forçada |

## Customização de templates

Após publicar as views (`--tag=pdf-block-views`), edite os templates em `resources/views/vendor/pdf-block/` para customizar a renderização:

```bash
resources/views/vendor/pdf-block/
├── document.blade.php     # Layout principal
├── stripe.blade.php       # Stripe (banda horizontal)
├── structure.blade.php    # Structure (row de colunas)
├── block.blade.php        # Router de blocos
└── blocks/
    ├── text.blade.php
    ├── image.blade.php
    ├── button.blade.php
    ├── divider.blade.php
    ├── spacer.blade.php
    ├── banner.blade.php
    ├── table.blade.php
    ├── qrcode.blade.php
    ├── chart.blade.php
    └── pagebreak.blade.php
```

## Integração com o editor React

### Endpoint típico

```php
// routes/api.php
Route::post('/export/pdf', function (Request $request, PdfBlockRenderer $renderer) {
    $document = $request->validate([
        'document' => 'required|array',
        'document.blocks' => 'required|array',
        'document.pageSettings' => 'required|array',
        'document.globalStyles' => 'required|array',
    ])['document'];

    return $renderer->toPdf($document)->toResponse('document.pdf');
});
```

### No React

```tsx
import { useExport } from '@pdf-block/react';

function ExportButton() {
  const editorRef = useRef<PDFBuilderRef>(null);

  const handleExport = async () => {
    const doc = editorRef.current?.getDocument();
    if (!doc) return;

    const res = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: doc }),
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url); // ou link de download
  };

  return <button onClick={handleExport}>Exportar PDF</button>;
}
```

## Docker

Para ambientes Docker, use a imagem oficial do Puppeteer:

```dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

Ou use [Gotenberg](https://gotenberg.dev/) como alternativa ao Browsershot.

## Desenvolvimento

```bash
# No monorepo
cd apps/laravel-sandbox
composer install
cp .env.example .env
php artisan serve

# Teste os endpoints:
curl -X POST http://localhost:8000/api/export/html \
  -H "Content-Type: application/json" \
  -d '{"document": {...}}'
```

## Requisitos

- PHP ≥ 8.2
- Laravel ≥ 11.0
- Node.js ≥ 18 (para Browsershot/Puppeteer)
- Chromium ou Chrome instalado no servidor

## Licença

MIT
