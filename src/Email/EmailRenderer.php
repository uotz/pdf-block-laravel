<?php

declare(strict_types=1);

namespace PdfBlock\Laravel\Email;

use PdfBlock\Laravel\BlockRendererRegistry;
use PdfBlock\Laravel\Data\BindingResolver;
use PdfBlock\Laravel\Data\DataBindingExpander;
use PdfBlock\Laravel\Data\ActiveThemeProjector;
use PdfBlock\Laravel\Data\ThemeResolver;
use PdfBlock\Laravel\Data\DocumentVariables;
use PdfBlock\Laravel\TiptapConverter;

/**
 * Renderer principal do modo e-mail.
 *
 * Recebe um documento da DSL `@pdf-block/react` e produz HTML compatível
 * com a baseline Outlook 2007+ (Word engine), Gmail, Apple Mail e OWA.
 *
 * Suporta dois formatos de saída, controlados por opções:
 *
 * - `wrap = true`  (default) → página standalone com `<!DOCTYPE>`, `<html>`,
 *                              `<head>` e tabela wrapper. Ideal para envio
 *                              direto via SMTP.
 * - `wrap = false` + `wrapperView` → renderiza só o miolo e injeta numa
 *                              view Blade legada via `@yield('content')`.
 *                              Viabiliza migração gradual de templates.
 *
 * O array `data` em `$opts['data']` fica disponível para plugins resolverem
 * bindings tipo `{{bind:clipping.title}}` ou iterações em blocos "list".
 */
class EmailRenderer
{
    public function __construct(
        private readonly TiptapConverter $tiptap,
        private readonly BlockRendererRegistry $registry,
    ) {
    }

    /**
     * Renderiza o documento como string HTML.
     *
     * @param  array<string, mixed>  $document
     * @param  array{wrap?: bool, wrapperView?: ?string, data?: array<string, mixed>}  $opts
     */
    public function toHtml(array $document, array $opts = []): string
    {
        $wrap         = $opts['wrap'] ?? true;
        $wrapperView  = $opts['wrapperView'] ?? null;
        // Dados = variáveis do documento + overrides do host + automáticas sys.*.
        $overrides    = is_array($opts['data'] ?? null) ? $opts['data'] : [];
        $data         = DocumentVariables::buildData($document, $overrides);
        $formatMap    = DocumentVariables::formatMap($document);

        // Resolve tokens de tema `{{token:...}}` antes dos bindings (literais estáticos).
        // Tema ATIVO (themes[]/activeThemeId) → theme.colors ANTES de resolver os
        // tokens: documentos montados fora do editor costumam trazer só `themes`,
        // e sem esta projeção nenhum {{token:colors.*}} resolveria.
        $document = ActiveThemeProjector::project($document);
        $document = ThemeResolver::resolve($document);

        // Reconcilia os blocos de lista (itemScope) com os dados + resolve os
        // bindings, aplicando a formatação declarada nas variáveis do documento.
        $document = DataBindingExpander::expand($document, $data, $formatMap);

        $inner = view('pdf-block::email.document', [
            'doc'      => $document,
            'tiptap'   => $this->tiptap,
            'registry' => $this->registry,
            'data'     => $data,
            'wrap'     => $wrap,
        ])->render();

        if ($wrap) {
            return $inner;
        }

        if ($wrapperView !== null) {
            return view($wrapperView, [
                'content' => $inner,
                'doc'     => $document,
                'data'    => $data,
            ])->render();
        }

        return $inner;
    }

    // ─── Bindings ────────────────────────────────────────────────

    /**
     * Acesso por dot-path. Delega ao `BindingResolver` (agora com suporte a
     * índices de array). Mantido público por compatibilidade.
     *
     * @param  array<string, mixed>  $data
     */
    public static function dotGet(array $data, string $path, mixed $default = null): mixed
    {
        return BindingResolver::dotGet($data, $path, $default);
    }
}
