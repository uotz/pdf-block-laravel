<?php

declare(strict_types=1);

namespace PdfBlock\Laravel;

/**
 * AUTO-GERADO por packages/schema/gen.mjs a partir de defaults.json — NÃO EDITE À MÃO.
 * Rode `pnpm gen` na raiz após alterar defaults.json. Fonte única dos defaults
 * dos campos próprios por tipo de bloco (DSL esparsa), espelhada em TS
 * (schema.gen.ts). `BlockDefaults` delega a esta classe.
 */
class SchemaDefaults
{
    /** @return array<string, array<string, mixed>> */
    public static function ownFields(): array
    {
        return [
            'text' => ['fontWeight' => 400, 'fontColor' => '', 'lineHeight' => 1.6, 'letterSpacing' => 0, 'textAlign' => 'left', 'textTransform' => 'none'],
            'image' => ['src' => '', 'alt' => '', 'title' => '', 'width' => 'auto', 'height' => 'auto', 'objectFit' => 'contain', 'alignment' => 'center'],
            'button' => [
                'text' => 'Clique aqui',
                'url' => '#',
                'target' => '_blank',
                'fullWidth' => false,
                'fontWeight' => 600,
                'fontColor' => '#ffffff',
                'bgColor' => '#5b8cff',
                'borderColor' => '#5b8cff',
                'borderWidth' => 0,
                'borderRadius' => ['topLeft' => 6, 'topRight' => 6, 'bottomRight' => 6, 'bottomLeft' => 6],
                'paddingH' => 24,
                'paddingV' => 12,
                'alignment' => 'center',
            ],
            'divider' => ['lineStyle' => 'solid', 'thickness' => 1, 'color' => '#e0e0ec', 'widthPercent' => 100, 'alignment' => 'center'],
            'spacer' => ['height' => 24],
            'table' => ['headerRow' => true, 'headerBgColor' => '#f0f0f5', 'headerFontColor' => '#1a1a2e', 'cellPadding' => 10, 'borderColor' => '#e0e0ec', 'borderWidth' => 1, 'fontSize' => 0, 'fontColor' => '', 'stripedRows' => false, 'stripedColor' => '#f8f9fd'],
            'qrcode' => ['data' => 'https://example.com', 'size' => 128, 'fgColor' => '#000000', 'bgColor' => '#ffffff', 'alignment' => 'center'],
            'figure' => ['src' => '', 'alt' => '', 'caption' => '', 'width' => 'full', 'alignment' => 'center'],
            'toc' => ['title' => 'Sumário', 'maxLevel' => 3, 'showPageNumbers' => true],
            'svg' => ['width' => 'auto', 'height' => 'auto', 'alignment' => 'center'],
            'chart' => ['chartType' => 'bar', 'title' => 'Gráfico', 'width' => 400, 'height' => 300],
            'pagebreak' => [],
        ];
    }

    /** @return array<string, mixed> */
    public static function bannerFields(): array
    {
        return [
            'backgroundImage' => '',
            'backgroundSize' => 'cover',
            'backgroundPosition' => 'center center',
            'minHeight' => 300,
            'overlayColor' => '#000000',
            'overlayOpacity' => 0,
        ];
    }
}
