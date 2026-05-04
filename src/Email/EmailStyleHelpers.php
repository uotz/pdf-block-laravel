<?php

declare(strict_types=1);

namespace PdfBlock\Laravel\Email;

/**
 * Email-safe CSS helpers.
 *
 * Unlike `StyleHelpers` (PDF), these helpers aggressively degrade properties
 * that don't render consistently in email clients (Outlook Windows 2007+, Gmail):
 *
 * - `box-shadow` → dropped (Outlook ignores it, Gmail can render it).
 * - `opacity`    → forced to 1 when < 1 (Outlook renders non-image opacity as 0).
 * - `border-style` → any non-solid style is flattened to solid.
 * - `background: gradient` → replaced by first color stop.
 * - `background: image`    → kept, but callers are expected to pair it with a VML
 *                            fallback for Outlook via `VmlHelpers::backgroundRect()`.
 *
 * Every helper produces snippets meant for an inline `style="…"` attribute —
 * CSS classes are not supported because Gmail strips `<style>` blocks in some
 * contexts (embedded HTML, forwards).
 */
class EmailStyleHelpers
{
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
        $width = (int) ($b['width'] ?? 0);
        $style = (string) ($b['style'] ?? 'none');
        if ($style === 'none' || $width === 0) {
            return 'none';
        }
        // Degrade dashed/dotted/double → solid for Outlook Windows parity.
        $safeStyle = $style === 'solid' ? 'solid' : 'solid';
        return "{$width}px {$safeStyle} {$b['color']}";
    }

    /**
     * Resolve a background value to an email-safe solid color (dropping
     * gradients by picking the first stop). Returns `'transparent'` when
     * the background is an image (callers render the image separately).
     */
    public static function solidFallbackColor(array $bg): string
    {
        $type = $bg['type'] ?? 'solid';
        if ($type === 'solid') {
            return (string) ($bg['color'] ?? 'transparent');
        }
        if ($type === 'gradient') {
            $stops = $bg['stops'] ?? [];
            return (string) ($stops[0]['color'] ?? 'transparent');
        }
        return 'transparent';
    }

    public static function backgroundToCSS(array $bg): string
    {
        return 'background-color:' . self::solidFallbackColor($bg) . ';';
    }

    /**
     * Produce inline CSS for a block's container — skipping shadow and
     * opacity and flattening borders + backgrounds.
     */
    public static function blockStyles(array $styles): string
    {
        $border = $styles['border'] ?? [];
        $parts = [
            'padding:' . self::edgeToCSS($styles['padding'] ?? ['top' => 0, 'right' => 0, 'bottom' => 0, 'left' => 0]) . ';',
            'margin:' . self::edgeToCSS($styles['margin'] ?? ['top' => 0, 'right' => 0, 'bottom' => 0, 'left' => 0]) . ';',
            'border-top:' . self::borderSideToCSS($border['top'] ?? ['width' => 0, 'style' => 'none', 'color' => '#000']) . ';',
            'border-right:' . self::borderSideToCSS($border['right'] ?? ['width' => 0, 'style' => 'none', 'color' => '#000']) . ';',
            'border-bottom:' . self::borderSideToCSS($border['bottom'] ?? ['width' => 0, 'style' => 'none', 'color' => '#000']) . ';',
            'border-left:' . self::borderSideToCSS($border['left'] ?? ['width' => 0, 'style' => 'none', 'color' => '#000']) . ';',
            // Progressive enhancement — clients that understand border-radius get
            // rounded corners; others (Outlook Windows) show square corners.
            'border-radius:' . self::cornersToCSS($styles['borderRadius'] ?? ['topLeft' => 0, 'topRight' => 0, 'bottomRight' => 0, 'bottomLeft' => 0]) . ';',
            self::backgroundToCSS($styles['background'] ?? ['type' => 'solid', 'color' => 'transparent']),
        ];
        return implode('', $parts);
    }

    /** Horizontal alignment → `<td align="…">` value. */
    public static function alignAttr(string $alignment): string
    {
        return match ($alignment) {
            'left'  => 'left',
            'right' => 'right',
            default => 'center',
        };
    }
}
