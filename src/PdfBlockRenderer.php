<?php

declare(strict_types=1);

namespace PdfBlock\Laravel;

use Symfony\Component\Process\Process;

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
     * Render the DSL document as a native PDF via Chromium CLI.
     *
     * Returns a PdfResult that can be saved, downloaded, or streamed.
     */
    public function toPdf(array $document): PdfResult
    {
        $html = $this->toHtml($document);

        $chromeBin = $this->config['chrome_path'] ?? '/usr/bin/chromium';
        $timeout   = (int) ($this->config['timeout'] ?? 30);

        // Mirror React's mmToPx: round(mm * 96/25.4, 2)
        // Used to set the viewport width = paper width, so the content
        // lays out at exactly the same width as in the React editor.
        $ps        = $document['pageSettings'] ?? [];
        $paper     = $ps['paperSize'] ?? ['width' => 210, 'height' => 297];
        $landscape = ($ps['orientation'] ?? 'portrait') === 'landscape';
        $paperW    = $landscape ? ($paper['height'] ?? 297) : ($paper['width'] ?? 210);
        $viewportW = (int) round($paperW * 96 / 25.4);

        $tmpHtml = tempnam(sys_get_temp_dir(), 'pdfblock_') . '.html';
        $tmpPdf  = sys_get_temp_dir() . '/pdfblock_' . uniqid() . '.pdf';

        try {
            file_put_contents($tmpHtml, $html);

            $defaultArgs = [
                '--headless',
                '--ozone-platform=headless',
                '--disable-gpu',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--run-all-compositor-stages-before-draw',
            ];

            $args = array_merge(
                [$chromeBin],
                $this->config['chrome_args'] ?? $defaultArgs,
                [
                    // Set viewport width = paper width so height measurement
                    // in beforeprint JS matches the actual PDF layout width.
                    '--window-size=' . $viewportW . ',1080',
                    '--no-pdf-header-footer',
                    '--print-to-pdf=' . $tmpPdf,
                    'file://' . $tmpHtml,
                ]
            );

            $process = new Process($args);
            $process->setTimeout($timeout);
            $process->mustRun();

            $pdfBinary = file_get_contents($tmpPdf);
        } finally {
            @unlink($tmpHtml);
            @unlink($tmpPdf);
        }

        return new PdfResult($pdfBinary);
    }
}

