#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# release.sh — Publica o pacote pdf-block/laravel para o repositório público
#              https://github.com/uotz/pdf-block-laravel (split de subtree),
#              que é registrado no Packagist.
#
# Uso (a partir da raiz do monorepo):
#   pnpm release:laravel 1.2.0
#   pnpm release:laravel 1.2.0 --force        # ignora alterações não commitadas
#   VERSION=1.2.0 pnpm release:laravel
#   VERSION=1.2.0 pnpm release:laravel --force
#
# Flags:
#   --force, -f    Ignora alterações não commitadas em packages/laravel/
#   --help,  -h    Exibe este help
#
# Pré-requisito (já configurado):
#   git remote add laravel-dist https://github.com/uotz/pdf-block-laravel.git
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Parse de argumentos ───────────────────────────────────────────────────────
FORCE=false
POSITIONAL=()

for arg in "$@"; do
  case "$arg" in
    --force|-f) FORCE=true ;;
    --help|-h)
      sed -n '2,19p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    -*) echo "❌  Flag desconhecida: $arg"; exit 1 ;;
    *)  POSITIONAL+=("$arg") ;;
  esac
done

# Versão: argumento posicional tem prioridade sobre env var
if [[ ${#POSITIONAL[@]} -gt 0 ]]; then
  VERSION="${POSITIONAL[0]}"
fi

# ── Validação da versão ───────────────────────────────────────────────────────
if [[ -z "${VERSION:-}" ]]; then
  echo "❌  Versão não informada."
  echo "    Uso: pnpm release:laravel 1.2.3"
  echo "         VERSION=1.2.3 pnpm release:laravel"
  exit 1
fi

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-].+)?$ ]]; then
  echo "❌  Versão inválida: '$VERSION'"
  echo "    Exemplos válidos: 1.0.0  1.2.3-beta.1  2.0.0-rc1"
  exit 1
fi

TAG="v${VERSION}"

# ── Verificar que estamos na raiz do monorepo ─────────────────────────────────
if [[ ! -f "packages/laravel/composer.json" ]]; then
  echo "❌  Execute este script a partir da raiz do monorepo."
  exit 1
fi

# ── Verificar remote laravel-dist ─────────────────────────────────────────────
if ! git remote get-url laravel-dist &>/dev/null; then
  echo "❌  Remote 'laravel-dist' não configurado."
  echo ""
  echo "    Configure com:"
  echo "      git remote add laravel-dist https://github.com/uotz/pdf-block-laravel.git"
  echo ""
  exit 1
fi

REMOTE_URL=$(git remote get-url laravel-dist)
echo "📦  Publicando pdf-block/laravel ${TAG}"
echo "    → ${REMOTE_URL}"
echo ""

# ── Verificar tag duplicada ───────────────────────────────────────────────────
if git tag --list | grep -q "^laravel-${TAG}$"; then
  echo "❌  Tag 'laravel-${TAG}' já existe localmente."
  exit 1
fi

# ── Garantir working tree limpo ───────────────────────────────────────────────
if [[ -n "$(git status --porcelain packages/laravel/)" ]]; then
  if [[ "$FORCE" == true ]]; then
    echo "⚠️   Há alterações não commitadas em packages/laravel/ (ignorado via --force)."
  else
    echo "❌  Há alterações não commitadas em packages/laravel/."
    echo "    Faça commit ou stash antes de publicar, ou use --force para ignorar."
    exit 1
  fi
fi

# ── Fazer o split do subtree ──────────────────────────────────────────────────
# Abordagem: repositório temporário limpo com apenas o conteúdo de packages/laravel/
# Isso garante que SOMENTE o pacote Laravel seja enviado, sem nenhum conteúdo
# do restante do monorepo.
echo "📁  Criando repositório temporário com conteúdo de packages/laravel/ ..."
TMPDIR_RELEASE=$(mktemp -d)
trap 'rm -rf "$TMPDIR_RELEASE"' EXIT

# Copiar apenas o conteúdo do pacote Laravel
cp -r packages/laravel/. "$TMPDIR_RELEASE/"

# Inicializar git limpo
cd "$TMPDIR_RELEASE"
git init -q
git checkout -q -b main
git add .
git commit -q -m "Release ${TAG}"
git tag "${TAG}"
git remote add origin "$REMOTE_URL"

# ── Push para o repositório público ──────────────────────────────────────────
echo "⬆️   Enviando para ${REMOTE_URL} ..."
git push --force -q origin main
git push -q origin "${TAG}"

cd - > /dev/null

# ── Criar tag local no monorepo para rastreabilidade ─────────────────────────
echo "🏷️   Criando tag local laravel-${TAG} no monorepo ..."
git tag "laravel-${TAG}"

echo ""
echo "✅  pdf-block/laravel ${TAG} publicado com sucesso!"
echo ""
echo "    Packagist: https://packagist.org/packages/pdf-block/laravel"
echo "    GitHub:    https://github.com/uotz/pdf-block-laravel/releases/tag/${TAG}"
echo ""
