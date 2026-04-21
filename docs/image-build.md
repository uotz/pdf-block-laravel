# Imagem Docker `pdf-block-browserless`

Documentação do pipeline de build e publicação da imagem
[`ghcr.io/uotz/pdf-block-browserless`](https://github.com/uotz/pdf-block-laravel/pkgs/container/pdf-block-browserless),
consumida pelo driver `browserless` do `pdf-block/laravel`.

---

## O que a imagem contém

Partindo de `ghcr.io/browserless/chromium:latest`, a imagem adiciona:

- **Noto Color Emoji** (`fonts-noto-color-emoji` reinstalado e configurado
  como família padrão para `emoji` via `/etc/fonts/conf.d/01-noto-color-emoji.conf`).
- **20 famílias corporativas** (Inter, Roboto, Open Sans, Lato, Source Sans 3,
  Noto Sans, Work Sans, DM Sans, Montserrat, Spectral, Merriweather, Lora,
  Source Serif 4, PT Serif, EB Garamond, Libre Baskerville, Playfair Display,
  Noto Serif, Oswald, Roboto Mono) instaladas em `/usr/local/share/fonts/pdfblock`.
- `fontconfig` cache reconstruído (`fc-cache -f`).

Nada mais é alterado — o entrypoint, portas, variáveis de ambiente e API
HTTP do Browserless v2 permanecem idênticos ao upstream.

---

## Arquivos de entrada

Somente estes dois arquivos afetam o conteúdo da imagem:

| Arquivo | Efeito |
|---|---|
| `Dockerfile.browserless` | Receita (FROM, RUN, COPY, fontconfig, etc.) |
| `docker/install-fonts.sh` | Lista e download dos `.ttf` das 20 famílias |

Qualquer outro arquivo no pacote pode mudar sem acionar build.

---

## Pipeline automático

O workflow [`.github/workflows/publish-browserless.yml`](../.github/workflows/publish-browserless.yml)
publica a imagem em três situações:

### 1. Release do pacote (recomendado) — tag `vX.Y.Z`

```bash
# A partir da raiz do monorepo
pnpm release:laravel 1.2.3
```

O script `release-laravel.sh` empurra `main` + tag `v1.2.3` para o repositório
público. A tag dispara o workflow, que produz:

```
ghcr.io/uotz/pdf-block-browserless:v1.2.3
ghcr.io/uotz/pdf-block-browserless:v1.2
ghcr.io/uotz/pdf-block-browserless:latest
```

**Resultado:** cada versão do pacote Composer tem uma imagem com tag casada.
Apps que travam a imagem em `:v1.2.3` continuam previsíveis mesmo que `:latest`
avance.

### 2. Commit direto em `main` tocando a imagem

Se você alterar **somente** `Dockerfile.browserless` ou `docker/install-fonts.sh`
e commitar em `main` do repositório público (fora de um release), o filtro
`paths` aciona o workflow e atualiza `:latest`.

Útil para: nova versão do upstream `browserless/chromium`, novo hotfix em
script de fontes — sem bumping de versão do pacote PHP.

### 3. Manual — `workflow_dispatch`

No GitHub Actions → **Publish browserless image** → **Run workflow**.

Input `tag_as_latest`:

- `true` (padrão) → atualiza `:latest`.
- `false` → builda sem publicar como `:latest`. Útil para validar uma mudança
  sem afetar consumidores que travam em `:latest`.

---

## Fluxograma de decisão

```
Alterou só Dockerfile.browserless ou install-fonts.sh?
│
├── Quer a mudança junto com uma release do pacote?
│       → pnpm release:laravel X.Y.Z
│         (gera tag + imagem versionada)
│
├── É um hotfix independente do pacote?
│       → commit em main → workflow dispara via `paths`
│         (atualiza só :latest)
│
└── Upstream browserless/chromium foi atualizado e quero rebuild?
        → workflow_dispatch manual
          (atualiza :latest, sem alterar código)
```

---

## Build local

Para testar alterações no `Dockerfile.browserless` ou `install-fonts.sh` antes
de publicar:

```bash
# A partir de packages/laravel/
docker build -f Dockerfile.browserless -t pdf-block-browserless:dev .

# Rodar localmente
docker run --rm -p 3001:3000 \
  -e TOKEN="" \
  -e CONCURRENT=1 \
  pdf-block-browserless:dev

# Em outro terminal, testar o endpoint
curl -sS -X POST 'http://localhost:3001/pdf' \
  -H 'Content-Type: application/json' \
  -d '{"html":"<h1>teste</h1>"}' \
  -o /tmp/teste.pdf

file /tmp/teste.pdf
# → /tmp/teste.pdf: PDF document, ...
```

O sandbox (`apps/laravel-sandbox/docker-compose.yml`) pode referenciar a imagem
local trocando `image:` por `build:` — veja o próprio compose para um exemplo
pronto.

---

## Multi-arch

A imagem publicada no GHCR contempla **`linux/amd64`** e **`linux/arm64`**,
cobrindo servidores x86 comuns e Apple Silicon / AWS Graviton.

Se o build no workflow ficar lento demais, você pode reduzir a matriz no YAML
editando a chave `platforms` do passo `Build and push`.

---

## Cache de camadas

O workflow usa cache de camadas via GitHub Actions
(`cache-from: type=gha` / `cache-to: type=gha,mode=max`). Isso faz rebuilds
subsequentes reutilizarem as camadas de `apt-get install` e `install-fonts.sh`
sem re-baixar as 20 famílias de fonte do `google/fonts` toda vez — o build
típico cai de ~4 min para ~30 s quando só a tag muda.

---

## Adicionar uma nova família de fonte

1. Editar [`docker/install-fonts.sh`](../docker/install-fonts.sh) adicionando
   os `fetch "ofl/..."` dos arquivos da nova família.
2. Atualizar [`config/pdf-block.php`](../config/pdf-block.php) →
   `fonts.local_fonts`.
3. Atualizar `packages/react/src/components/ui/FontPicker.tsx` →
   `GOOGLE_FONTS` (sincroniza com o editor).
4. Commit → o workflow detecta a mudança em `install-fonts.sh` e rebuilda
   `:latest` automaticamente.
5. Quando quiser lançar junto com o pacote, rodar `pnpm release:laravel X.Y.Z`.

---

## Consumir a imagem

No `docker-compose.yml` do seu app:

```yaml
services:
  browserless:
    image: ghcr.io/uotz/pdf-block-browserless:latest
    # ou trave em uma versão específica:
    # image: ghcr.io/uotz/pdf-block-browserless:v1.2.3
    ports:
      - "3001:3000"
    environment:
      TOKEN: ""
      CONCURRENT: "1"
    mem_limit: 336m
```

A imagem é pública — não é necessário `docker login` em ambientes de
consumo (`pull` anônimo no `ghcr.io` funciona).
