<?php

declare(strict_types=1);

namespace PdfBlock\Laravel;

use HeadlessChromium\BrowserFactory;
use HeadlessChromium\Page;

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
     * Render the DSL document as a native PDF via chrome-php (DevTools Protocol).
     *
     * Returns a PdfResult that can be saved, downloaded, or streamed.
     */
    public function toPdf(array $document): PdfResult
    {
        $html = $this->toHtml($document);

        $ps        = $document['pageSettings'] ?? [];
        $margins   = $ps['margins'] ?? ['top' => 20, 'right' => 20, 'bottom' => 20, 'left' => 20];
        $paper     = $ps['paperSize'] ?? ['width' => 210, 'height' => 297];
        $landscape = ($ps['orientation'] ?? 'portrait') === 'landscape';

        $paperWidthMm = $landscape ? $paper['height'] : $paper['width'];

        $chromeBin  = $this->config['chrome_path'] ?? '/usr/bin/chromium';
        $chromeArgs = $this->config['chrome_args'] ?? ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'];
        $timeout    = (int) ($this->config['timeout'] ?? 30) * 1000; // ms

        $factory = new BrowserFactory($chromeBin);
        $browser = $factory->createBrowser([
            'noSandbox'   => true,
            'headless'    => true,
            'customFlags' => $chromeArgs,
        ]);

        try {
            $page = $browser->createPage();

            // ── Viewport width ──────────────────────────────────────────────────
            //
            // The HTML template (document.blade.php) embeds the DSL page margins
            // as body padding, so the content area inside the body equals the
            // React editor's content area. We set the viewport = full paper width
            // and Chrome PDF margins = 0, which means:
            //
            //   • body background (pageBackground) fills the full 794px viewport
            //     → visible in the PDF including the left/right margin strips.
            //   • The content inside body padding lays out at paperWidth − margins
            //     = the same content-area width as the React editor.
            //   • Printable area = paperWidth − 0 − 0 = paperWidth = viewport
            //     → 1:1 layout, no scaling or clipping.
            //
            // Mirror React's mmToPx exactly: round(mm * 96/25.4, 2).
            $mmToPx = fn(float $mm): float => round($mm * 96 / 25.4, 2);
            $pageWidthPx = (int) round($mmToPx($paperWidthMm));
            $page->setViewport($pageWidthPx, 1080);

            $page->setHtml($html, $timeout);
            $page->evaluate('document.fonts.ready')->getReturnValue($timeout);

            // Measure full content height.
            // getBoundingClientRect on the last child captures collapsed margins that
            // scrollHeight misses. We take the max of both for safety, then add 1px
            // buffer to absorb sub-pixel rounding inside Chrome's PDF compositor.
            $scrollH = $page->evaluate(<<<'JS'
                (() => {
                    const rect = document.body.getBoundingClientRect();
                    const byRect = Math.ceil(rect.top + rect.height);
                    const byScroll = Math.max(
                        document.body.scrollHeight,
                        document.documentElement.scrollHeight
                    );
                    return Math.max(byRect, byScroll) + 1; // +1px safety buffer
                })()
            JS)->getReturnValue($timeout);

            // scrollH already includes the body padding (= DSL margins) because
            // document.blade.php embeds them as body padding. The Chrome PDF margins
            // are 0 — all margin spacing is accounted for in the HTML itself.
            $pdfBinary = $page->pdf([
                'printBackground'   => true,
                'preferCSSPageSize' => false,
                'paperWidth'        => round($paperWidthMm / 25.4, 6),
                'paperHeight'       => round($scrollH / 96, 6),
                'marginTop'         => 0,
                'marginRight'       => 0,
                'marginBottom'      => 0,
                'marginLeft'        => 0,
            ])->getBase64();
        } finally {
            $browser->close();
        }

        return new PdfResult(base64_decode($pdfBinary));
    }
}
