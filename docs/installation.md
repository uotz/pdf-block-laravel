# Instalação — pdf-block/laravel

Guia completo de instalação e configuração do pacote Laravel para renderização de PDFs a partir da DSL do `@pdf-block/react`.

## Requisitos

| Requisito | Versão |
|---|---|
| PHP | ≥ 8.2 |
| Laravel | 11.x ou 12.x |
| Chrome / Chromium | Instalado no servidor |

> **Nota:** Este pacote usa [chrome-php/chrome](https://github.com/chrome-php/chrome) para comunicação direta com o Chrome via DevTools Protocol. **Não** requer Node.js nem Puppeteer.

---

## Instalação

```bash
composer require pdf-block/laravel
```

O service provider é registrado automaticamente via [Laravel Package Discovery](https://laravel.com/docs/packages#package-discovery).

---

## Dependências

### Dependências PHP (instaladas automaticamente)

| Pacote | Descrição |
|---|---|
| `chrome-php/chrome` ^1.10 | Comunicação com Chrome headless via DevTools Protocol |
| `ueberdosis/tiptap-php` ^1.0\|^2.0 | Conversão de TipTap JSON → HTML (blocos de texto) |
| `illuminate/support` ^11.0\|^12.0 | Helpers do Laravel |
| `illuminate/view` ^11.0\|^12.0 | Engine Blade para templates |

### Chrome / Chromium no servidor

O pacote precisa de um binário Chrome ou Chromium instalado no sistema operacional:

#### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y chromium-browser
# ou
sudo apt install -y chromium
```

#### Alpine (Docker)

```dockerfile
RUN apk add --no-cache chromium
```

#### Amazon Linux / CentOS

```bash
sudo yum install -y chromium
```

#### macOS (desenvolvimento)

```bash
brew install --cask chromium
```

#### Verificar instalação

```bash
which chromium || which chromium-browser || which google-chrome
# Deve retornar o caminho do binário, ex: /usr/bin/chromium
```

---

## Configuração

### Publicar arquivo de config (opcional)

```bash
php artisan vendor:publish --tag=pdf-block-config
```

Cria `config/pdf-block.php`:

```php
<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Chrome / Chromium Binary
    |--------------------------------------------------------------------------
    |
    | Caminho para o executável do Chrome ou Chromium.
    | chrome-php se comunica via DevTools Protocol — Node.js NÃO é necessário.
    |
    */

    'chrome_path' => env('PDF_BLOCK_CHROME_PATH', '/usr/bin/chromium'),

    /*
    |--------------------------------------------------------------------------
    | Timeout
    |--------------------------------------------------------------------------
    |
    | Tempo máximo em segundos para aguardar a renderização do PDF.
    |
    */

    'timeout' => (int) env('PDF_BLOCK_TIMEOUT', 30),

    /*
    |--------------------------------------------------------------------------
    | Chrome Arguments
    |--------------------------------------------------------------------------
    |
    | Flags CLI passadas ao Chromium.
    | Os padrões abaixo funcionam na maioria dos servidores Linux e containers.
    |
    */

    'chrome_args' => [
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
    ],

];
```

### Variáveis de Ambiente

```dotenv
# Caminho do binário Chrome/Chromium
PDF_BLOCK_CHROME_PATH=/usr/bin/chromium

# Timeout de renderização (segundos)
PDF_BLOCK_TIMEOUT=30
```

---

## Publicar Views (opcional)

Para customizar os templates Blade de renderização:

```bash
php artisan vendor:publish --tag=pdf-block-views
```

Os templates são copiados para `resources/views/vendor/pdf-block/`:

```
resources/views/vendor/pdf-block/
├── document.blade.php     # Layout principal do documento
├── stripe.blade.php       # Stripe (faixa horizontal)
├── structure.blade.php    # Structure (container de colunas)
├── block.blade.php        # Router que despacha para o template do bloco
└── blocks/
    ├── text.blade.php     # Bloco de texto (TipTap JSON → HTML)
    ├── image.blade.php    # Bloco de imagem
    ├── button.blade.php   # Bloco de botão
    ├── divider.blade.php  # Linha divisória
    ├── spacer.blade.php   # Espaço vertical
    ├── banner.blade.php   # Banner com imagem de fundo
    ├── table.blade.php    # Tabela
    ├── qrcode.blade.php   # QR Code
    ├── chart.blade.php    # Gráfico de barras (CSS)
    └── pagebreak.blade.php # Quebra de página
```

---

## Service Provider

O `PdfBlockServiceProvider` registra automaticamente:

1. **Singleton** `PdfBlockRenderer` — injetável via DI com as configurações do `config/pdf-block.php`
2. **Alias** `pdf-block` — permite `app('pdf-block')`
3. **Views** no namespace `pdf-block` — `pdf-block::document`, `pdf-block::stripe`, etc.

---

## Verificação

Teste se tudo está configurado corretamente:

```bash
php artisan tinker
```

```php
$renderer = app(\PdfBlock\Laravel\PdfBlockRenderer::class);
$html = $renderer->toHtml([
    'id' => 'test',
    'version' => '2.0.0',
    'meta' => ['title' => 'Teste', 'description' => '', 'locale' => 'pt-BR', 'tags' => []],
    'pageSettings' => [
        'paperSize' => ['preset' => 'a4', 'width' => 210, 'height' => 297],
        'orientation' => 'portrait',
        'margins' => ['top' => 20, 'right' => 20, 'bottom' => 20, 'left' => 20],
        'defaultFontFamily' => 'Inter, sans-serif',
    ],
    'globalStyles' => [
        'pageBackground' => '#ffffff',
        'contentBackground' => '#ffffff',
        'defaultFontColor' => '#333333',
    ],
    'blocks' => [],
]);
echo strlen($html) . " bytes de HTML gerados.\n";
```

---

## Solução de Problemas

### Chrome não encontrado

```
Could not find Chrome binary
```

Verifique o caminho do binário:

```bash
which chromium
# Configure no .env:
PDF_BLOCK_CHROME_PATH=/caminho/correto/chromium
```

### Erro de sandbox no container Docker

```
Running as root without --no-sandbox is not supported
```

Certifique-se de que `--no-sandbox` está nos `chrome_args` (padrão do config).

### Timeout de renderização

```
Timeout reached while waiting for page to load
```

Aumente o timeout no `.env`:

```dotenv
PDF_BLOCK_TIMEOUT=60
```

### Shared memory insuficiente (Docker)

```
DevToolsActivePort file doesn't exist
```

Adicione ao container Docker:

```yaml
# docker-compose.yml
services:
  app:
    shm_size: '256m'
    # ou
    tmpfs:
      - /dev/shm:rw,nosuid,nodev,noexec,size=256m
```

---

## Próximos Passos

- [Início Rápido](quick-start.md) — Uso básico e exemplos de integração
- [Templates Blade](templates.md) — Customização dos templates de renderização
- [Blade Rendering Guide](blade-rendering-guide.md) — Referência técnica detalhada
