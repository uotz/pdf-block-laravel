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
        return "{$edge['top']}{$unit} {$edge['right']}{$unit} {$edge['bottom']}{$unit} {$edge['left']}{$unit}";
    }

    public static function cornersToCSS(array $c): string
    {
        return "{$c['topLeft']}px {$c['topRight']}px {$c['bottomRight']}px {$c['bottomLeft']}px";
    }

    public static function borderSideToCSS(array $b): string
    {
        if (($b['style'] ?? 'none') === 'none' || ($b['width'] ?? 0) == 0) {
            return 'none';
        }

        return "{$b['width']}px {$b['style']} {$b['color']}";
    }

    public static function shadowToCSS(array $s): string
    {
        if (empty($s['enabled'])) {
            return 'none';
        }

        return "{$s['offsetX']}px {$s['offsetY']}px {$s['blur']}px {$s['spread']}px {$s['color']}";
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
            ->map(fn(array $s) => "{$s['color']} {$s['position']}%")
            ->implode(', ');

        return ($bg['gradientType'] ?? 'linear') === 'linear'
            ? "linear-gradient({$bg['angle']}deg, {$stops})"
            : "radial-gradient(circle, {$stops})";
    }

    // ─── Block-level composite ───────────────────────────────

    /**
     * Convert a BlockStyles array into a single inline CSS string.
     * Mirrors blockStylesToCSS() from utils.ts.
     */
    public static function blockStyles(array $styles): string
    {
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

    // ─── Justify helper ──────────────────────────────────────

    public static function justifyCSS(string $alignment): string
    {
        return match ($alignment) {
            'left'  => 'flex-start',
            'right' => 'flex-end',
            default => 'center',
        };
    }
}
