<?php

declare(strict_types=1);

namespace PdfBlock\Laravel\Blocks;

use PdfBlock\Laravel\BlockRendererRegistry;
use PdfBlock\Laravel\Contracts\BlockRenderer;
use PdfBlock\Laravel\Data\BindingResolver;

/**
 * Renderer do bloco repetidor embutido (`core.repeater`).
 *
 * Lê os registros de uma fonte de dados (presente em `$context['data'][sourceId]`)
 * e renderiza um item por registro, delegando cada item ao renderer do tipo de
 * bloco escolhido (`props.itemType`) via o `BlockRendererRegistry`. Espelha o
 * comportamento do `RepeaterCanvas` do lado React.
 *
 * `props`: `{ sourceId, itemType, gap }`.
 */
class RepeaterRenderer implements BlockRenderer
{
    public function __construct(private readonly BlockRendererRegistry $registry)
    {
    }

    public function render(array $block, array $context = []): string
    {
        $props    = $block['props'] ?? [];
        $sourceId = $props['sourceId'] ?? null;
        $itemType = $props['itemType'] ?? null;
        $gap      = (int) ($props['gap'] ?? 16);
        $mode     = $context['mode'] ?? 'pdf';
        $data     = $context['data'] ?? [];

        if (! $sourceId || ! $itemType) {
            return '';
        }

        $records = BindingResolver::dotGetRaw($data, (string) $sourceId);
        if (! is_array($records) || $records === []) {
            return '';
        }

        $items = '';
        foreach ($records as $record) {
            $values = is_array($record) ? $record : [];
            $itemBlock = [
                'type'   => $itemType,
                'props'  => $values,
                'meta'   => [],
                'styles' => [],
            ];
            $html = $this->registry->render($mode, $itemBlock, $context);
            if ($html === null) {
                continue;
            }
            $items .= '<div style="margin-bottom:' . $gap . 'px;">' . $html . '</div>';
        }

        return '<div class="pdfb-repeater">' . $items . '</div>';
    }
}
