<?php

declare(strict_types=1);

namespace PdfBlock\Laravel;

/**
 * CSS helper functions — direct port of the TypeScript utils.ts helpers.
 *
 * Every function here produces the same CSS output as its JS counterpart,
 * ensuring visual parity between the React editor and the server-rendered PDF.
 */
class StyleHelpers
{
    // ─── Primitives ──────────────────────────────────────────

    public static function edgeToCSS(array $edge, string $unit = 'px'): string
    {
        $t = $edge['top'] ?? 0;
        $r = $edge['right'] ?? 0;
        $b = $edge['bottom'] ?? 0;
        $l = $edge['left'] ?? 0;

        return "{$t}{$unit} {$r}{$unit} {$b}{$unit} {$l}{$unit}";
    }

    public static function cornersToCSS(array $c): string
    {
        $tl = $c['topLeft'] ?? 0;
        $tr = $c['topRight'] ?? 0;
        $br = $c['bottomRight'] ?? 0;
        $bl = $c['bottomLeft'] ?? 0;

        return "{$tl}px {$tr}px {$br}px {$bl}px";
    }

    public static function borderSideToCSS(array $b): string
    {
        if (($b['style'] ?? 'none') === 'none' || ($b['width'] ?? 0) == 0) {
            return 'none';
        }

        $color = $b['color'] ?? '#000000';

        return "{$b['width']}px {$b['style']} {$color}";
    }

    public static function shadowToCSS(array $s): string
    {
        if (empty($s['enabled'])) {
            return 'none';
        }

        $ox = $s['offsetX'] ?? 0;
        $oy = $s['offsetY'] ?? 0;
        $blur = $s['blur'] ?? 0;
        $spread = $s['spread'] ?? 0;
        $color = $s['color'] ?? 'rgba(0,0,0,0.15)';

        return "{$ox}px {$oy}px {$blur}px {$spread}px {$color}";
    }

    public static function backgroundToCSS(array $bg): string
    {
        return match ($bg['type'] ?? 'solid') {
            'solid' => "background-color:{$bg['color']};",

            'image' => implode('', [
                "background-image:url(" . e($bg['url'] ?? '') . ");",
                'background-size:' . (($bg['size'] ?? 'cover') === 'custom' ? 'auto' : ($bg['size'] ?? 'cover')) . ';',
                "background-repeat:" . ($bg['repeat'] ?? 'no-repeat') . ";",
                "background-position:" . ($bg['positionX'] ?? 'center') . " " . ($bg['positionY'] ?? 'center') . ";",
            ]),

            'gradient' => 'background-image:' . self::gradientCSS($bg) . ';',

            default => '',
        };
    }

    public static function gradientCSS(array $bg): string
    {
        $stops = collect($bg['stops'] ?? [])
            ->map(fn(array $s) => ($s['color'] ?? 'transparent') . ' ' . ($s['position'] ?? 0) . '%')
            ->implode(', ');

        $angle = $bg['angle'] ?? 0;

        return ($bg['gradientType'] ?? 'linear') === 'linear'
            ? "linear-gradient({$angle}deg, {$stops})"
            : "radial-gradient(circle, {$stops})";
    }

    // ─── Normalização defensiva (espelho de normalizeStyles do TS) ──

    /**
     * Completa um BlockStyles PARCIAL ou AUSENTE com os defaults, em profundidade.
     * Espelho 1:1 de `normalizeStyles`/`defaultStyles` do React (store.ts) e de
     * `DEFAULT_BLOCK_STYLES` (dsl.ts) — garante paridade editor↔PDF quando a DSL
     * vem ESPARSA (cada bloco carrega só o que difere do default). Sem isto, um
     * sub-objeto parcial (ex.: `padding:{top:8}`) geraria CSS quebrado.
     *
     * @param  array<string, mixed>  $styles
     * @return array<string, mixed>
     */
    public static function normalizeStyles(array $styles): array
    {
        $edge = fn($e) => is_array($e)
            ? ['top' => $e['top'] ?? 0, 'right' => $e['right'] ?? 0, 'bottom' => $e['bottom'] ?? 0, 'left' => $e['left'] ?? 0]
            : ['top' => 0, 'right' => 0, 'bottom' => 0, 'left' => 0];

        $side = fn($b) => is_array($b)
            ? ['width' => is_numeric($b['width'] ?? null) ? $b['width'] : 0, 'style' => $b['style'] ?? 'none', 'color' => $b['color'] ?? '#000000']
            : ['width' => 0, 'style' => 'none', 'color' => '#000000'];

        $defaultSide = ['width' => 0, 'style' => 'none', 'color' => '#000000'];
        $border = $styles['border'] ?? null;

        return [
            'padding' => $edge($styles['padding'] ?? null),
            'margin' => $edge($styles['margin'] ?? null),
            'border' => is_array($border)
                ? ['top' => $side($border['top'] ?? null), 'right' => $side($border['right'] ?? null), 'bottom' => $side($border['bottom'] ?? null), 'left' => $side($border['left'] ?? null)]
                : ['top' => $defaultSide, 'right' => $defaultSide, 'bottom' => $defaultSide, 'left' => $defaultSide],
            'borderRadius' => is_array($styles['borderRadius'] ?? null)
                ? ['topLeft' => $styles['borderRadius']['topLeft'] ?? 0, 'topRight' => $styles['borderRadius']['topRight'] ?? 0, 'bottomRight' => $styles['borderRadius']['bottomRight'] ?? 0, 'bottomLeft' => $styles['borderRadius']['bottomLeft'] ?? 0]
                : ['topLeft' => 0, 'topRight' => 0, 'bottomRight' => 0, 'bottomLeft' => 0],
            'background' => is_array($styles['background'] ?? null)
                ? $styles['background']
                : ['type' => 'solid', 'color' => 'transparent'],
            'shadow' => is_array($styles['shadow'] ?? null)
                ? array_merge(['enabled' => false, 'offsetX' => 0, 'offsetY' => 2, 'blur' => 8, 'spread' => 0, 'color' => 'rgba(0,0,0,0.15)'], $styles['shadow'])
                : ['enabled' => false, 'offsetX' => 0, 'offsetY' => 2, 'blur' => 8, 'spread' => 0, 'color' => 'rgba(0,0,0,0.15)'],
            'opacity' => is_numeric($styles['opacity'] ?? null) ? $styles['opacity'] : 1,
        ];
    }

    // ─── Block-level composite ───────────────────────────────

    /**
     * Convert a BlockStyles array into a single inline CSS string.
     * Mirrors blockStylesToCSS() from utils.ts.
     */
    public static function blockStyles(array $styles): string
    {
        // Completa qualquer styles parcial/ausente antes de serializar (DSL esparsa).
        $styles = self::normalizeStyles($styles);
        $border = $styles['border'] ?? [];

        return implode('', [
            'padding:' . self::edgeToCSS($styles['padding'] ?? ['top' => 0, 'right' => 0, 'bottom' => 0, 'left' => 0]) . ';',
            'margin:' . self::edgeToCSS($styles['margin'] ?? ['top' => 0, 'right' => 0, 'bottom' => 0, 'left' => 0]) . ';',
            'border-top:' . self::borderSideToCSS($border['top'] ?? ['width' => 0, 'style' => 'none', 'color' => '#000']) . ';',
            'border-right:' . self::borderSideToCSS($border['right'] ?? ['width' => 0, 'style' => 'none', 'color' => '#000']) . ';',
            'border-bottom:' . self::borderSideToCSS($border['bottom'] ?? ['width' => 0, 'style' => 'none', 'color' => '#000']) . ';',
            'border-left:' . self::borderSideToCSS($border['left'] ?? ['width' => 0, 'style' => 'none', 'color' => '#000']) . ';',
            'border-radius:' . self::cornersToCSS($styles['borderRadius'] ?? ['topLeft' => 0, 'topRight' => 0, 'bottomRight' => 0, 'bottomLeft' => 0]) . ';',
            'box-shadow:' . self::shadowToCSS($styles['shadow'] ?? ['enabled' => false]) . ';',
            'opacity:' . ($styles['opacity'] ?? 1) . ';',
            self::backgroundToCSS($styles['background'] ?? ['type' => 'solid', 'color' => 'transparent']),
        ]);
    }

    /**
     * Merge PROFUNDO de arrays associativos: `$source` vence nos campos que
     * define; o resto vem de `$target`. Listas (sequenciais) são SUBSTITUÍDAS
     * inteiras (não mescladas). Espelha `deepMerge` em utils.ts. Usado para
     * resolver estilos nomeados (styleRef) — ver FlowRender::resolveStyleRefs.
     *
     * @param  array<string, mixed>  $target
     * @param  array<string, mixed>  $source
     * @return array<string, mixed>
     */
    public static function deepMerge(array $target, array $source): array
    {
        $result = $target;
        foreach ($source as $key => $val) {
            if (is_array($val) && ! array_is_list($val) && isset($result[$key]) && is_array($result[$key])) {
                $result[$key] = self::deepMerge($result[$key], $val);
            } elseif ($val !== null) {
                $result[$key] = $val;
            }
        }

        return $result;
    }

    // ─── Fundo colorido (para evitar corte na quebra de página) ──

    /**
     * `true` quando o bloco tem fundo NÃO-transparente (cor sólida visível,
     * gradiente ou imagem). Um "card" colorido cortado por uma quebra de página
     * parece quebrado; por isso tratamos esses blocos como indivisíveis
     * (`break-inside: avoid`). Espelha `hasColoredBackground` em utils.ts.
     *
     * @param  array<string, mixed>  $styles
     */
    public static function hasColoredBackground(array $styles): bool
    {
        $bg = $styles['background'] ?? [];
        $type = $bg['type'] ?? 'solid';
        if ($type === 'gradient' || $type === 'image') {
            return true;
        }
        $color = strtolower(trim((string) ($bg['color'] ?? '')));

        return $color !== '' && $color !== 'transparent' && $color !== 'rgba(0,0,0,0)';
    }

    // ─── Justify helper ──────────────────────────────────────

    public static function justifyCSS(string $alignment): string
    {
        return match ($alignment) {
            'left'  => 'flex-start',
            'right' => 'flex-end',
            default => 'center',
        };
    }

    // ─── Font-family normalizer ───────────────────────────────

    /**
     * Ensure every token in a CSS font-family string that contains spaces is
     * wrapped in single quotes so Chromium (PDF renderer) resolves it correctly.
     *
     * Without quoting, "Open Sans, sans-serif" is parsed as three unknown tokens
     * ("Open", "Sans", "sans-serif") and Chromium silently falls back to the
     * generic family, never loading the installed font.
     *
     * Examples:
     *   "Open Sans, sans-serif"    → "'Open Sans', sans-serif"
     *   "Roboto, sans-serif"       → "Roboto, sans-serif"  (single-word, unchanged)
     *   "'Source Serif 4', serif"  → "'Source Serif 4', serif"  (already quoted, no double-wrap)
     *   "Spectral, serif"          → "Spectral, serif"
     */
    public static function normalizeFontFamily(string $family): string
    {
        $tokens = explode(',', $family);

        $normalized = array_map(static function (string $token): string {
            $t = trim($token);

            // Already quoted with single or double quotes — leave as-is.
            if (
                (str_starts_with($t, "'") && str_ends_with($t, "'")) ||
                (str_starts_with($t, '"') && str_ends_with($t, '"'))
            ) {
                return $t;
            }

            // Multi-word font name (contains a space) — wrap in single quotes.
            if (str_contains($t, ' ')) {
                return "'{$t}'";
            }

            return $t;
        }, $tokens);

        // Genéricos DETERMINÍSTICOS (espelho 1:1 de fonts.ts do editor):
        // `cursive`/`fantasy` variam por fontconfig; ancoramos na família que a
        // imagem browserless resolve (Comic Sans MS / Impact, mscorefonts) E no
        // aproximado web que o editor usa (Comic Neue / Anton) — a MESMA pilha
        // nos dois lados faz qualquer visualizador cair na mesma fonte; no
        // container o aproximado é ignorado (a concreta vem antes).
        $genericConcrete = [
            'cursive' => ["'Comic Sans MS'", "'Comic Neue'"],
            'fantasy' => ['Impact', 'Anton'],
        ];
        $bare = static fn (string $t): string => strtolower(trim(trim($t), "'\""));
        $present = array_map($bare, $normalized);
        $expanded = [];
        foreach ($normalized as $t) {
            foreach ($genericConcrete[$bare($t)] ?? [] as $concrete) {
                if (! in_array($bare($concrete), $present, true)) {
                    $expanded[] = $concrete;
                    $present[] = $bare($concrete);
                }
            }
            $expanded[] = $t;
        }

        return implode(', ', $expanded);
    }

    // ─── URL sanitizer (segurança) ────────────────────────────

    /**
     * Sanitiza uma URL para uso em `href`/`src`, bloqueando esquemas perigosos
     * (`javascript:`, `vbscript:`, `data:` exceto imagens quando permitido).
     * Retorna `#` para URLs inseguras e `''` para vazias. O escape de HTML fica a
     * cargo do Blade (`{{ }}`) — esta função cuida apenas do ESQUEMA.
     *
     * @param  bool  $allowDataImage  permite `data:image/...` (usado em <img src>).
     */
    public static function safeUrl(string $url, bool $allowDataImage = false): string
    {
        $clean = preg_replace('/[\x00-\x1F\x7F\s]/', '', $url) ?? $url;
        if ($clean === '') {
            return '';
        }
        $lower = strtolower($clean);

        if (str_starts_with($lower, 'data:')) {
            return ($allowDataImage && str_starts_with($lower, 'data:image/')) ? $clean : '#';
        }

        // Se há um esquema explícito (algo antes de ':'), só permite os seguros.
        if (preg_match('/^([a-z][a-z0-9+.\-]*):/', $lower, $m)) {
            if (! in_array($m[1], ['http', 'https', 'mailto', 'tel'], true)) {
                return '#';
            }
        }

        return $clean;
    }

    // ─── Paginação: cabeçalho/rodapé (@page margin boxes) ─────

    /**
     * Escapa uma string para uso em `content:` de CSS.
     * Envolve em aspas duplas e escapa `"`, `\` e quebras de linha.
     */
    public static function cssString(string $s): string
    {
        $escaped = str_replace(['\\', '"', "\n", "\r"], ['\\\\', '\\"', '', ''], $s);

        return '"' . $escaped . '"';
    }

    /**
     * Converte um template de cabeçalho/rodapé (com tokens {page} {pages}
     * {title} {date}) numa expressão CSS válida para `content:`.
     *
     * {page}/{pages} viram counter(page)/counter(pages) — contagem real do
     * Chrome. {title}/{date} são substituídos pelos valores literais (já que
     * o Chrome não suporta string-set()/string() para cabeçalhos dinâmicos).
     * Retorna `""` (string vazia) quando o template é vazio.
     */
    public static function furnitureContent(string $tpl, string $title, string $date): string
    {
        if ($tpl === '') {
            return '""';
        }

        // Resolve tokens literais antes de fatiar pelos counters.
        $tpl = str_replace(['{title}', '{date}'], [$title, $date], $tpl);

        $parts = preg_split(
            '/(\{page\}|\{pages\})/',
            $tpl,
            -1,
            PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY
        ) ?: [];

        $out = [];
        foreach ($parts as $p) {
            if ($p === '{page}') {
                $out[] = 'counter(page)';
            } elseif ($p === '{pages}') {
                $out[] = 'counter(pages)';
            } else {
                $out[] = self::cssString($p);
            }
        }

        return $out === [] ? '""' : implode(' ', $out);
    }

    /**
     * Monta o bloco de @page margin boxes (3 zonas topo + 3 zonas base) a
     * partir das configurações de header/footer da DSL. Retorna o CSS interno
     * do `@page { ... }` (sem o seletor).
     *
     * @param  array<string,mixed>|null  $header
     * @param  array<string,mixed>|null  $footer
     */
    public static function pageMarginBoxes(?array $header, ?array $footer, string $title, string $date, string $defaultColor): string
    {
        $zones = [
            ['box' => '@top-left',      'cfg' => $header, 'key' => 'left'],
            ['box' => '@top-center',    'cfg' => $header, 'key' => 'center'],
            ['box' => '@top-right',     'cfg' => $header, 'key' => 'right'],
            ['box' => '@bottom-left',   'cfg' => $footer, 'key' => 'left'],
            ['box' => '@bottom-center', 'cfg' => $footer, 'key' => 'center'],
            ['box' => '@bottom-right',  'cfg' => $footer, 'key' => 'right'],
        ];

        $css = '';
        foreach ($zones as $z) {
            $cfg = $z['cfg'];
            if (! is_array($cfg)) {
                continue;
            }
            $text = $cfg[$z['key']] ?? '';
            if (! is_string($text) || $text === '') {
                continue;
            }
            $content = self::furnitureContent($text, $title, $date);
            $fontSize = (int) ($cfg['fontSize'] ?? 10);
            $color = is_string($cfg['color'] ?? null) && $cfg['color'] !== '' ? $cfg['color'] : $defaultColor;
            $color = CssSanitizer::color($color, CssSanitizer::color($defaultColor));
            $css .= "{$z['box']} { content: {$content}; font-size: {$fontSize}px; color: {$color}; }\n";
        }

        return $css;
    }

    // ─── Layouts de Página NOMEADOS por seção (P8/A2) ─────────
    // Cada Seção do v3 vira uma `@page` NOMEADA própria (espelha core/pageLayout
    // no TS). O Chromium aplica margin-boxes distintos por named page (spike 2026-06)
    // → header/footer por seção + visibilidade (showOn) na 1ª/última página. A
    // `@page nome:first` SOBREPÕE `@page nome` (specificity B) — provado no Chrome.

    /** Nome CSS estável da named page de uma seção (igual no @page e no `page:`). */
    public static function pageName(string $id): string
    {
        $clean = preg_replace('/[^A-Za-z0-9_-]/', '', $id);

        return 'pdfbsec' . (($clean ?? '') !== '' ? $clean : '0');
    }

    /**
     * PageSetup EFETIVO de uma seção: mescla os campos do Layout (layoutRef) SOBRE o
     * pageSetup (layout vence nos campos que define). Espelha core/pageLayout.resolvePageSetup.
     * paperSize/orientation/defaultFontFamily/pageMode vêm sempre do pageSetup.
     *
     * @param  array<string,mixed>  $pageSetup
     * @param  array<string,array<string,mixed>>  $layoutMap  id → PageLayout
     * @return array<string,mixed>
     */
    public static function resolvePageSetup(array $pageSetup, ?string $layoutRef, array $layoutMap): array
    {
        if ($layoutRef === null || $layoutRef === '' || ! isset($layoutMap[$layoutRef]) || ! is_array($layoutMap[$layoutRef])) {
            return $pageSetup;
        }
        $lay = $layoutMap[$layoutRef];
        $out = $pageSetup;
        foreach (['margins', 'header', 'footer', 'pageBackground', 'contentBackground', 'contentWidth'] as $k) {
            if (array_key_exists($k, $lay) && $lay[$k] !== null) {
                $out[$k] = $lay[$k];
            }
        }

        return $out;
    }

    /** Escopo efetivo da mobília: showOn (novo) com fallback no legado showOnFirstPage. */
    private static function furnitureScope(?array $cfg): string
    {
        if (! is_array($cfg)) {
            return 'all';
        }
        if (isset($cfg['showOn']) && is_string($cfg['showOn'])) {
            return $cfg['showOn'];
        }
        if (($cfg['showOnFirstPage'] ?? true) === false) {
            return 'except-first';
        }

        return 'all';
    }

    /**
     * Em quais páginas a mobília aparece, dado o escopo e a posição da seção.
     * `onNormal` = páginas "comuns" da seção; `onFirst` = a 1ª página do DOCUMENTO
     * (só existe na 1ª seção). "última" é aproximada como a ÚLTIMA SEÇÃO (CSS @page
     * não tem :last); doc de seção única degrada last/first-and-last para "all".
     *
     * @return array{onNormal: bool, onFirst: bool}
     */
    private static function furnitureFlags(string $scope, bool $isFirst, bool $isLast): array
    {
        switch ($scope) {
            case 'except-first':   return ['onNormal' => true,    'onFirst' => false];
            case 'first-only':     return ['onNormal' => false,   'onFirst' => true];
            case 'last-only':      return ['onNormal' => $isLast, 'onFirst' => ($isFirst && $isLast)];
            case 'first-and-last': return ['onNormal' => $isLast, 'onFirst' => $isFirst];
            case 'all':
            default:               return ['onNormal' => true,    'onFirst' => true];
        }
    }

    private static function oneBox(string $box, string $text, array $cfg, string $title, string $date, string $defaultColor): string
    {
        $content = self::furnitureContent($text, $title, $date);
        $fontSize = (int) ($cfg['fontSize'] ?? 10);
        $color = is_string($cfg['color'] ?? null) && $cfg['color'] !== '' ? $cfg['color'] : $defaultColor;
        $color = CssSanitizer::color($color, CssSanitizer::color($defaultColor));

        return "{$box} { content: {$content}; font-size: {$fontSize}px; color: {$color}; }\n";
    }

    /**
     * Zonas de margin-box de UMA seção: devolve [normal, first] onde `normal` vai no
     * `@page nome { }` (todas as páginas da seção) e `first` no `@page nome:first { }`
     * (sobrepõe a 1ª página do documento — só relevante na 1ª seção).
     *
     * @return array{0: string, 1: string}
     */
    private static function furnitureZones(?array $header, ?array $footer, bool $isFirst, bool $isLast, string $title, string $date, string $defaultColor): array
    {
        $zones = [
            ['box' => '@top-left',      'cfg' => $header, 'key' => 'left',   'part' => 'h'],
            ['box' => '@top-center',    'cfg' => $header, 'key' => 'center', 'part' => 'h'],
            ['box' => '@top-right',     'cfg' => $header, 'key' => 'right',  'part' => 'h'],
            ['box' => '@bottom-left',   'cfg' => $footer, 'key' => 'left',   'part' => 'f'],
            ['box' => '@bottom-center', 'cfg' => $footer, 'key' => 'center', 'part' => 'f'],
            ['box' => '@bottom-right',  'cfg' => $footer, 'key' => 'right',  'part' => 'f'],
        ];
        $hs = self::furnitureFlags(self::furnitureScope($header), $isFirst, $isLast);
        $fs = self::furnitureFlags(self::furnitureScope($footer), $isFirst, $isLast);

        $normal = '';
        $first = '';
        foreach ($zones as $z) {
            $cfg = $z['cfg'];
            if (! is_array($cfg)) {
                continue;
            }
            $text = $cfg[$z['key']] ?? '';
            if (! is_string($text) || $text === '') {
                continue;
            }
            $flags = $z['part'] === 'h' ? $hs : $fs;
            $boxCss = self::oneBox($z['box'], $text, $cfg, $title, $date, $defaultColor);
            if ($flags['onNormal']) {
                $normal .= '      ' . $boxCss;
            }
            // :first só é emitida na 1ª seção (única que contém a 1ª página do doc)
            // e só quando difere das páginas comuns.
            if ($isFirst && $flags['onFirst'] !== $flags['onNormal']) {
                $first .= $flags['onFirst']
                    ? '      ' . $boxCss
                    : "      {$z['box']} { content: none; }\n";
            }
        }

        return [$normal, $first];
    }

    /**
     * CSS de todas as `@page` NOMEADAS (uma por seção) do render v3 paginado: margin
     * (se o layout sobrescreve), background e os margin-boxes de header/footer com as
     * regras de `showOn`. O corpo (document-body) marca cada seção com `page: <nome>`.
     *
     * @param  array<int,array<string,mixed>>  $sections
     * @param  array<int,array<string,mixed>>|null  $pageLayouts
     */
    public static function namedPageCss(array $sections, ?array $pageLayouts, string $title, string $date, string $defaultColor): string
    {
        $map = [];
        foreach ($pageLayouts ?? [] as $pl) {
            if (is_array($pl) && isset($pl['id'])) {
                $map[$pl['id']] = $pl;
            }
        }
        $sections = array_values($sections);
        $n = count($sections);
        $out = '';
        foreach ($sections as $i => $sec) {
            if (! is_array($sec)) {
                continue;
            }
            $eff = self::resolvePageSetup(
                is_array($sec['pageSetup'] ?? null) ? $sec['pageSetup'] : [],
                is_string($sec['layoutRef'] ?? null) ? $sec['layoutRef'] : null,
                $map
            );
            $name = self::pageName((string) ($sec['id'] ?? (string) $i));
            $isFirst = $i === 0;
            $isLast = $i === $n - 1;
            $header = is_array($eff['header'] ?? null) ? $eff['header'] : null;
            $footer = is_array($eff['footer'] ?? null) ? $eff['footer'] : null;

            $decl = '';
            if (is_array($eff['margins'] ?? null)) {
                $mm = $eff['margins'];
                $decl .= sprintf(
                    "      margin: %smm %smm %smm %smm;\n",
                    CssSanitizer::number($mm['top'] ?? 20, '20'),
                    CssSanitizer::number($mm['right'] ?? 20, '20'),
                    CssSanitizer::number($mm['bottom'] ?? 20, '20'),
                    CssSanitizer::number($mm['left'] ?? 20, '20'),
                );
            }
            if (is_string($eff['pageBackground'] ?? null) && $eff['pageBackground'] !== '') {
                $decl .= '      background: ' . CssSanitizer::color($eff['pageBackground'], '#ffffff') . ";\n";
            }

            [$normal, $first] = self::furnitureZones($header, $footer, $isFirst, $isLast, $title, $date, $defaultColor);

            $body = $decl . $normal;
            if (trim($body) !== '') {
                $out .= "    @page {$name} {\n{$body}    }\n";
            }
            if ($isFirst && trim($first) !== '') {
                $out .= "    @page {$name}:first {\n{$first}    }\n";
            }
        }

        return $out;
    }
}
