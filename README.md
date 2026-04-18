# pdf-block/laravel

Pacote Laravel para renderizar documentos da DSL do **pdf-block** em PDF nativo. Texto selecionável, links clicáveis, imagens embutidas — PDF de verdade, não screenshot.

Suporta dois **drivers de renderização** intercambiáveis:

| Driver | Como funciona | Quando usar |
|---|---|---|
| `local` | Chromium CLI no mesmo container que o PHP | Desenvolvimento e ambientes controlados |
| `browserless` | HTTP POST a um serviço Browserless v1 (auto-hospedado ou gerenciado) | Produção, servidores com `www-data` sem `CAP_SYS_PTRACE` |

---

## Instalação

```bash
composer require pdf-block/laravel
```

O service provider é registrado automaticamente via auto-discovery do Laravel.

### Publicar config (opcional)

```bash
php artisan vendor:publish --tag=pdf-block-config
```

Cria `config/pdf-block.php` no projeto com todas as opções disponíveis.

### Publicar views (opcional)

```bash
php artisan vendor:publish --tag=pdf-block-views
```

Permite customizar os Blade templates em `resources/views/vendor/pdf-block/`.

---

## Uso

### Injeção de dependência

```php
use PdfBlock\Laravel\PdfBlockRenderer;

class ExportController extends Controller
{
    public function pdf(Request $request, PdfBlockRenderer $renderer)
    {
        $document = $request->input('document');

        return $renderer->toPdf($document)->toResponse('documento.pdf');
    }
}
```

### API pública

```php
$renderer = app(PdfBlockRenderer::class);

// DSL → HTML (útil para debug, e-mail, preview)
$html = $renderer->toHtml($document);

// DSL → PDF
$pdf = $renderer->toPdf($document);

// Download (Content-Disposition: attachment)
return $pdf->toResponse('fatura.pdf');

// Preview inline no browser (Content-Disposition: inline)
return $pdf->toInlineResponse('preview.pdf');

// Salvar em disco
$pdf->save(storage_path('exports/fatura.pdf'));

// Conteúdo binário raw
$binary = $pdf->content();

// Tamanho em bytes
$bytes = $pdf->size();
```

---

## Configuração

```php
// config/pdf-block.php

return [
    // Driver ativo: 'local' ou 'browserless'
    'driver' => env('PDF_BLOCK_DRIVER', 'local'),

    'drivers' => [
        'local' => [
            'chrome_path' => env('PDF_BLOCK_CHROME_PATH', '/usr/bin/chromium'),
            'timeout'     => (int) env('PDF_BLOCK_TIMEOUT', 30),
            'chrome_args' => [
                '--headless',
                '--ozone-platform=headless',
                '--no-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--run-all-compositor-stages-before-draw',
                '--disable-crash-reporter',
                '--disable-breakpad',
            ],
        ],

        'browserless' => [
            'url'     => env('PDF_BLOCK_BROWSERLESS_URL', 'http://browserless:3000'),
            'timeout' => (int) env('PDF_BLOCK_BROWSERLESS_TIMEOUT', 30),
        ],
    ],
];
```

### Variáveis de ambiente

**Driver local:**

```dotenv
PDF_BLOCK_DRIVER=local
PDF_BLOCK_CHROME_PATH=/usr/bin/chromium
PDF_BLOCK_TIMEOUT=30
```

**Driver browserless:**

```dotenv
PDF_BLOCK_DRIVER=browserless
PDF_BLOCK_BROWSERLESS_URL=http://browserless:3000
PDF_BLOCK_BROWSERLESS_TIMEOUT=30
```

---

## Driver local

O driver padrão. Invoca o binário do Chromium diretamente via `symfony/process` com a flag `--print-to-pdf`. Não requer Node.js, Puppeteer ou Browsershot.

### Pré-requisitos

Chromium instalado no servidor ou container:

```bash
# Debian/Ubuntu
sudo apt install chromium fonts-noto-color-emoji

# Alpine (Docker)
apk add chromium font-noto-emoji
```

> **fonts-noto-color-emoji**: necessário para renderizar emojis. Sem ela, emojis aparecem como quadrados vazios no PDF.

### Dockerfile (desenvolvimento)

```dockerfile
FROM php:8.2-cli-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
        chromium \
        fonts-noto-color-emoji \
        libzip-dev unzip git \
    && docker-php-ext-install zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
```

### Produção com `www-data` (PHP-FPM)

O `chrome_crashpad_handler` usa `ptrace(PTRACE_ATTACH)` no processo pai do Chromium. Quando o PHP roda como `www-data` sem `CAP_SYS_PTRACE`, o kernel nega essa chamada e o Chromium recebe `SIGTRAP`.

Os flags `--disable-crash-reporter` e `--disable-breakpad` (já incluídos nos defaults) reduzem a frequência desse problema, mas não o eliminam em todos os builds do Chromium no Debian/Ubuntu.

**Solução definitiva via `setcap`** (requer `libcap2-bin`):

```dockerfile
RUN apt-get install -y libcap2-bin \
    && setcap cap_sys_ptrace+ep /usr/lib/chromium/chrome_crashpad_handler
```

**Alternativa recomendada para produção:** use o driver `browserless`, onde o Chromium roda como root em container isolado — o problema de permissão não existe nesse contexto.

---

## Driver browserless

Envia o HTML via `POST /pdf` para qualquer serviço compatível com a [API Browserless v1](https://docs.browserless.io/HTTP-APIs/pdf). Elimina o Chromium do container PHP por completo.

O HTML gerado pelo Blade já carrega toda a lógica de dimensionamento: um script injeta `@page { size: Wmm Hmm; margin: 0 }` via `beforeprint`, medindo o `scrollHeight` real após fontes e imagens carregadas. O driver envia `preferCSSPageSize: true` para que o Puppeteer obedeça esse `@page` — tamanho, margens e orientação vêm diretamente da DSL via CSS, sem duplicação no JSON da requisição.

### Docker Compose (desenvolvimento)

```yaml
# docker-compose.yml
services:
  api:
    build: .
    env_file: .env
    depends_on:
      - browserless

  browserless:
    image: ghcr.io/browserless/chromium:latest
    ports:
      - "3000:3000"
    environment:
      TOKEN: ""         # sem autenticação (desenvolvimento)
      TIMEOUT: 30000
      CONCURRENT: 5
```

```dotenv
# .env
PDF_BLOCK_DRIVER=browserless
PDF_BLOCK_BROWSERLESS_URL=http://browserless:3000
```

### Serviço gerenciado (browserless.io)

```dotenv
PDF_BLOCK_DRIVER=browserless
PDF_BLOCK_BROWSERLESS_URL=https://chrome.browserless.io
PDF_BLOCK_BROWSERLESS_TIMEOUT=30
```

### Driver customizado

Implemente a interface `PdfBlock\Laravel\Contracts\PdfDriver` e registre o binding no seu service provider:

```php
use PdfBlock\Laravel\Contracts\PdfDriver;

// AppServiceProvider::register()
$this->app->bind(PdfDriver::class, MyCustomDriver::class);
```

---

## Diagnóstico

O sandbox inclui dois endpoints para validar a configuração de cada driver sem gerar um PDF completo:

### Verificar driver local

```bash
GET /api/diagnostics/local
```

Executa `chromium --version` e retorna:

```json
{
  "driver": "local",
  "status": "ok",
  "chrome_path": "/usr/bin/chromium",
  "version": "Chromium 124.0.6367.82 built on Debian 12.5, running on Debian 12.5"
}
```

### Verificar driver browserless

```bash
GET /api/diagnostics/browserless
```

Faz um request de health check ao serviço e retorna:

```json
{
  "driver": "browserless",
  "status": "ok",
  "url": "http://browserless:3000",
  "response_ms": 42,
  "service": { "Browser": "Chrome/124...", "Protocol": "1.3" }
}
```

Em caso de erro, ambos os endpoints retornam HTTP 500/502 com `"status": "error"` e uma `"message"` descritiva.

---

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
    ├─── driver: local ──────────────────────┐
    │    LocalDriver::render()               │
    │    Chromium CLI --print-to-pdf         │
    │    (symfony/process)                   │
    │                                        │
    └─── driver: browserless ────────────────┤
         BrowserlessDriver::render()         │
         POST {url}/pdf com opções Puppeteer │
         (illuminate/http)                   │
                                             ▼
                                      PdfResult (PDF nativo)
```

### Paridade visual

Os Blade templates replicam 1:1 os renderers React. Ambos usam 100% inline styles via as mesmas funções CSS helper (portadas de TypeScript para PHP em `StyleHelpers.php`).

---

## DSL — Formato do documento

O pacote espera receber a mesma DSL JSON produzida pelo editor `@pdf-block/react`:

```json
{
  "id": "uuid",
  "version": "2.0.0",
  "meta": { "title": "Meu documento", "locale": "pt-BR", "tags": [] },
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
  "blocks": [...]
}
```

### Blocos suportados

| Bloco | Descrição |
|---|---|
| `text` | Rich text via TipTap JSON → HTML (`ueberdosis/tiptap-php`) |
| `image` | Imagem com alignment, objectFit, bordas |
| `button` | Link estilizado como botão (clicável no PDF) |
| `divider` | Linha horizontal |
| `spacer` | Espaço vertical |
| `banner` | Imagem de fundo com overlay e textos |
| `table` | Tabela com header, zebra, bordas |
| `qrcode` | QR code |
| `chart` | Gráfico de barras (CSS puro) |
| `pagebreak` | Quebra de página forçada |

---

## Customização de templates

Após publicar as views (`--tag=pdf-block-views`), edite os templates em `resources/views/vendor/pdf-block/`:

```
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

---

## Integração com o editor React

### Endpoint Laravel

```php
// routes/api.php
Route::post('/export/pdf', function (Request $request, PdfBlockRenderer $renderer) {
    $document = $request->validate([
        'document'              => 'required|array',
        'document.blocks'       => 'required|array',
        'document.pageSettings' => 'required|array',
        'document.globalStyles' => 'required|array',
    ])['document'];

    return $renderer->toPdf($document)->toResponse('documento.pdf');
});
```

### No React

```tsx
const editorRef = useRef<PDFBuilderRef>(null);

const exportPdf = async () => {
  const doc = editorRef.current?.getDocument();
  if (!doc) return;

  const res = await fetch('/api/export/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document: doc }),
  });

  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'documento.pdf';
  a.click();
};
```

---

## Migração da config anterior

Se você usava uma versão anterior do pacote, a estrutura de configuração foi alterada. Re-publique o arquivo de config e ajuste suas variáveis de ambiente:

**Antes (configuração plana):**

```php
return [
    'chrome_path' => env('PDF_BLOCK_CHROME_PATH', '/usr/bin/chromium'),
    'timeout'     => (int) env('PDF_BLOCK_TIMEOUT', 30),
    'chrome_args' => [...],
];
```

**Depois (configuração por driver):**

```php
return [
    'driver' => env('PDF_BLOCK_DRIVER', 'local'),
    'drivers' => [
        'local' => [
            'chrome_path' => env('PDF_BLOCK_CHROME_PATH', '/usr/bin/chromium'),
            'timeout'     => (int) env('PDF_BLOCK_TIMEOUT', 30),
            'chrome_args' => [...],
        ],
        'browserless' => [...],
    ],
];
```

As variáveis `PDF_BLOCK_CHROME_PATH` e `PDF_BLOCK_TIMEOUT` continuam funcionando — apenas foram movidas para dentro de `drivers.local`.

```bash
# Após atualizar o pacote:
php artisan vendor:publish --tag=pdf-block-config --force
```

---

## Requisitos

- PHP ≥ 8.2
- Laravel ≥ 11.0
- **Driver local:** Chromium instalado no servidor
- **Driver browserless:** Serviço Browserless v1 acessível via HTTP

## Licença

MIT
