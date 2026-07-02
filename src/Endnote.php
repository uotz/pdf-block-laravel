<?php

declare(strict_types=1);

namespace PdfBlock\Laravel;

use Tiptap\Core\Node;
use Tiptap\Utils\HTML;

/**
 * Nó TipTap `endnote` (nota de fim) — espelha `blocks/tiptap-endnote.tsx`.
 * Marcador inline sobrescrito, numerado por CSS counter (`pdfb-endnote`); o texto
 * da nota vive no attr `text` e é coletado para a lista do fim
 * (FlowRender::collectEndnotes). Render: `<sup class="pdfb-endnote-ref" title="...">`.
 */
class Endnote extends Node
{
    public static $name = 'endnote';

    public function addAttributes(): array
    {
        return ['text' => ['default' => '']];
    }

    public function parseHTML(): array
    {
        return [['tag' => 'sup.pdfb-endnote-ref']];
    }

    public function renderHTML($node, $HTMLAttributes = []): array
    {
        $attrs = $node->attrs ?? new \stdClass();
        $text = is_object($attrs) ? (string) ($attrs->text ?? '') : '';

        return [
            'sup',
            HTML::mergeAttributes(['class' => 'pdfb-endnote-ref', 'data-endnote' => $text, 'title' => $text], $HTMLAttributes),
        ];
    }
}
