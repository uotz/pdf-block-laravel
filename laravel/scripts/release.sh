#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# release.sh — Publica o pacote pdf-block/laravel para o repositório público
#              https://github.com/uotz/pdf-block-laravel (split de subtree),
#              que é registrado no Packagist.
#
# Uso (a partir da raiz do monorepo):
#   VERSION=1.0.0 pnpm release:laravel
#   VERSION=1.0.0 bash packages/laravel/scripts/release.sh
#
# Pré-requisito (já configurado):
#   git remote add laravel-dist https://github.com/uotz/pdf-block-laravel.git
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Validação da versão ───────────────────────────────────────────────────────
if [[ -z "${VERSION:-}" ]]; then
  echo "❌  VERSION não definida."
  echo "    Uso: VERSION=1.2.3 pnpm release:laravel"
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
  echo "❌  Há alterações não commitadas em packages/laravel/."
  echo "    Faça commit ou stash antes de publicar."
  exit 1
fi

# ── Fazer o split do subtree ──────────────────────────────────────────────────
echo "🔀  Gerando split do subtree packages/laravel/ ..."
SPLIT_SHA=$(git subtree split --prefix=packages/laravel)
echo "    Split SHA: ${SPLIT_SHA}"

# ── Push do branch para o repositório público ─────────────────────────────────
echo "⬆️   Enviando para ${REMOTE_URL} (branch main) ..."
git push laravel-dist "${SPLIT_SHA}:refs/heads/main"

# ── Criar e enviar a tag de versão ────────────────────────────────────────────
# A tag é local no sha do split e enviada ao remote público.
# Packagist detecta tags no formato vX.Y.Z automaticamente.
echo "🏷️   Criando tag ${TAG} ..."
git tag "laravel-${TAG}" "$SPLIT_SHA"
git push laravel-dist "laravel-${TAG}:refs/tags/${TAG}"

echo ""
echo "✅  pdf-block/laravel ${TAG} publicado com sucesso!"
echo ""
echo "    Packagist: https://packagist.org/packages/pdf-block/laravel"
echo "    GitHub:    https://github.com/uotz/pdf-block-laravel/releases/tag/${TAG}"
echo ""
