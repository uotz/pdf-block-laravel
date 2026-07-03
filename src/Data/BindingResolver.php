<?php

declare(strict_types=1);

namespace PdfBlock\Laravel\Data;

/**
 * Resolução de bindings de dados — espelho exato do resolver client
 * (`packages/react/src/data/bindings.ts`).
 *
 * Substitui tokens `{{bind:path}}` em strings e nós TipTap `variable`
 * (`{ type: 'variable', attrs: { path } }`) pelos valores de um array de dados.
 * Suporta caminhos pontilhados e índices de array (`items[0].title`).
 *
 * Compartilhado entre o modo PDF (`PdfBlockRenderer`) e o modo email
 * (`EmailRenderer`), garantindo paridade de comportamento.
 */
class BindingResolver
{
    /** Regex de um token, idêntico ao lado JS. */
    public const TOKEN_RE = '/\{\{bind:([a-zA-Z0-9_.\[\]]+)\}\}/';

    /**
     * Resolve recursivamente tokens e nós de variável num nó arbitrário da DSL.
     * O `$formatMap` (path → format) aplica a formatação declarada no contrato.
     *
     * @param  array<string, mixed>  $data
     * @param  array<string, string>  $formatMap
     */
    public static function resolve(mixed $node, array $data, array $formatMap = []): mixed
    {
        if (is_string($node)) {
            return self::resolveString($node, $data, $formatMap);
        }

        if (is_array($node)) {
            // Nó TipTap `variable` → nó de texto com o valor resolvido (e formatado).
            if (
                ($node['type'] ?? null) === 'variable'
                && isset($node['attrs']['path'])
                && is_string($node['attrs']['path'])
            ) {
                $path = $node['attrs']['path'];
                $val = ValueFormatter::format(self::dotGetRaw($data, $path), $formatMap[$path] ?? null);
                return ['type' => 'text', 'text' => $val];
            }

            $out = [];
            foreach ($node as $key => $value) {
                $out[$key] = self::resolve($value, $data, $formatMap);
            }
            return $out;
        }

        return $node;
    }

    /**
     * Substitui todos os tokens `{{bind:path}}` de uma string pelos valores
     * (formatados conforme o `$formatMap`). Valores não-escalares → ''.
     *
     * @param  array<string, mixed>  $data
     * @param  array<string, string>  $formatMap
     */
    public static function resolveString(string $str, array $data, array $formatMap = []): string
    {
        if (! str_contains($str, '{{bind:')) {
            return $str;
        }
        return preg_replace_callback(
            self::TOKEN_RE,
            fn (array $m) => ValueFormatter::format(self::dotGetRaw($data, $m[1]), $formatMap[$m[1]] ?? null),
            $str,
        ) ?? $str;
    }

    /**
     * Acesso por caminho pontilhado com índices de array. Retorna SEMPRE escalar
     * como string (compatível com o `EmailRenderer::dotGet` original).
     *
     * @param  array<string, mixed>  $data
     */
    public static function dotGet(array $data, string $path, mixed $default = null): mixed
    {
        $raw = self::dotGetRaw($data, $path);
        if ($raw === null) {
            return $default;
        }
        return is_scalar($raw) ? (string) $raw : $default;
    }

    /**
     * Igual ao `dotGet`, mas preserva o valor cru (arrays/objetos) — usado pelo
     * repetidor para obter a lista de registros de uma fonte.
     *
     * @param  array<string, mixed>  $data
     */
    public static function dotGetRaw(array $data, string $path): mixed
    {
        $normalized = preg_replace('/\[(\d+)\]/', '.$1', $path) ?? $path;
        $cursor = $data;
        foreach (explode('.', $normalized) as $segment) {
            if ($segment === '') {
                continue;
            }
            if (is_array($cursor) && array_key_exists($segment, $cursor)) {
                $cursor = $cursor[$segment];
            } else {
                return null;
            }
        }
        return $cursor;
    }
}
