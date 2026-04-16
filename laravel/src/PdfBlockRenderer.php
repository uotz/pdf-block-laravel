<?php

declare(strict_types=1);

namespace PdfBlock\Laravel;

use Spatie\Browsershot\Browsershot;

/**
 * Main entry point — converts a pdf-block DSL document into HTML or PDF.
 *
 * Usage:
 *   $renderer = app(PdfBlockRenderer::class);
 *   $html = $renderer->toHtml($document);
 *   $pdf  = $renderer->toPdf($document);
 *   return $pdf->toResponse('invoice.pdf');
 */
class PdfBlockRenderer
{
    private TiptapConverter $tiptap;

    public function __construct(
        private readonly array $config = [],
    ) {
        $this->tiptap = new TiptapConverter();
    }

    /**
     * Render the DSL document as a full HTML string (standalone page).
     *
     * Useful for debugging, email, or feeding into any HTML-to-PDF pipeline.
     */
    public function toHtml(array $document): string
    {
        return view('pdf-block::document', [
            'doc'    => $document,
            'tiptap' => $this->tiptap,
        ])->render();
    }

    /**
     * Render the DSL document as a native PDF via Browsershot.
     *
     * Returns a PdfResult that can be saved, downloaded, or streamed.
     */
    public function toPdf(array $document): PdfResult
    {
        $html = $this->toHtml($document);

        $ps      = $document['pageSettings'] ?? [];
        $margins = $ps['margins'] ?? ['top' => 20, 'right' => 20, 'bottom' => 20, 'left' => 20];
        $paper   = $ps['paperSize'] ?? ['width' => 210, 'height' => 297];
        $landscape = ($ps['orientation'] ?? 'portrait') === 'landscape';

        $browsershot = Browsershot::html($html)
            ->setNodeBinary($this->config['node_binary'] ?? '/usr/bin/node')
            ->setNpmBinary($this->config['npm_binary'] ?? '/usr/bin/npm')
            ->setOption('args', $this->config['chrome_args'] ?? ['--no-sandbox'])
            ->timeout($this->config['timeout'] ?? 30)
            ->waitUntilNetworkIdle()
            ->showBackground()
            ->paperWidth($paper['width'], 'mm')
            ->paperHeight($paper['height'], 'mm')
            ->margins(
                $margins['top'],
                $margins['right'],
                $margins['bottom'],
                $margins['left'],
                'mm',
            )
            ->landscape($landscape);

        $pdf = $browsershot->pdf();

        return new PdfResult($pdf);
    }
}
