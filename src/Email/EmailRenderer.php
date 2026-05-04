<?php

declare(strict_types=1);

namespace PdfBlock\Laravel\Email;

use PdfBlock\Laravel\BlockRendererRegistry;
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
        $data         = $opts['data'] ?? [];

        // Resolve bindings (simple {{bind:path}} substitution) before rendering.
        $document = $this->resolveBindings($document, $data);

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
     * Resolve `{{bind:dot.path}}` tokens anywhere in the document (strings only).
     *
     * @param  array<string, mixed>  $node
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function resolveBindings(array $node, array $data): array
    {
        array_walk_recursive($node, function (&$value) use ($data) {
            if (is_string($value) && str_contains($value, '{{bind:')) {
                $value = preg_replace_callback(
                    '/\{\{bind:([a-zA-Z0-9_.\[\]]+)\}\}/',
                    fn (array $m) => self::dotGet($data, $m[1], ''),
                    $value,
                ) ?? $value;
            }
        });
        return $node;
    }

    /**
     * Simple dot-path access (e.g. `clipping.contact.name`). Does NOT support
     * array index wildcards (`[]`) — those are handled by list-style blocks
     * via the plugin API.
     *
     * @param  array<string, mixed>  $data
     */
    public static function dotGet(array $data, string $path, mixed $default = null): mixed
    {
        $cursor = $data;
        foreach (explode('.', $path) as $segment) {
            if (is_array($cursor) && array_key_exists($segment, $cursor)) {
                $cursor = $cursor[$segment];
            } else {
                return $default;
            }
        }
        return is_scalar($cursor) ? (string) $cursor : $default;
    }
}
