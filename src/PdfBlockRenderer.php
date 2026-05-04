<?php

declare(strict_types=1);

namespace PdfBlock\Laravel;

use PdfBlock\Laravel\Contracts\PdfDriver;

/**
 * Ponto de entrada principal — converte um documento da DSL pdf-block em HTML ou PDF.
 *
 * Uso:
 *   $renderer = app(PdfBlockRenderer::class);
 *   $html = $renderer->toHtml($document);
 *   $pdf  = $renderer->toPdf($document);
 *   return $pdf->toResponse('fatura.pdf');
 */
class PdfBlockRenderer
{
    public function __construct(
        private readonly PdfDriver $driver,
        private readonly TiptapConverter $tiptap,
        private readonly array $config = [],
    ) {
    }

    /**
     * Renderiza o documento DSL como string HTML completa (página standalone).
     *
     * Útil para debug, e-mail ou alimentar qualquer pipeline HTML → PDF.
     */
    public function toHtml(array $document): string
    {
        return view('pdf-block::document', [
            'doc'    => $document,
            'tiptap' => $this->tiptap,
        ])->render();
    }

    /**
     * Renderiza o documento DSL como PDF nativo usando o driver configurado.
     *
     * Retorna um PdfResult que pode ser salvo, baixado ou transmitido.
     */
    public function toPdf(array $document): PdfResult
    {
        $pdf = $this->driver->render($this->toHtml($document), $document);

        return new PdfResult($pdf);
    }
}


