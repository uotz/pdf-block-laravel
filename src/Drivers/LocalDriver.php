<?php

declare(strict_types=1);

namespace PdfBlock\Laravel\Drivers;

use PdfBlock\Laravel\Contracts\PdfDriver;
use Symfony\Component\Process\Process;

/**
 * Driver local: gera PDF invocando o binário do Chromium via CLI.
 *
 * É o driver padrão. Requer Chromium instalado no servidor ou container.
 * Para rodar como usuário não-root, use --no-sandbox (já incluso nos defaultArgs)
 * combinado com --disable-crash-reporter e --disable-breakpad para evitar que
 * o crashpad handler seja spawned (falha com EPERM quando no_new_privs está ativo).
 */
class LocalDriver implements PdfDriver
{
    private string $chromeBin;
    private int $timeout;
    private array $defaultArgs;

    public function __construct(private readonly array $config)
    {
        $this->chromeBin = $config['chrome_path'] ?? '/usr/bin/chromium';
        $this->timeout   = (int) ($config['timeout'] ?? 30);

        $this->defaultArgs = [
            '--headless',
            '--ozone-platform=headless',
            '--disable-gpu',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--run-all-compositor-stages-before-draw',
            '--disable-crash-reporter',
            '--disable-breakpad',
            '--user-data-dir=/tmp/chrome-data',
        ];
    }

    public function render(string $html, array $document): string
    {
        // Calcula viewport width = largura do papel em px (espelha mmToPx do React)
        $ps        = $document['pageSettings'] ?? [];
        $paper     = $ps['paperSize'] ?? ['width' => 210, 'height' => 297];
        $landscape = ($ps['orientation'] ?? 'portrait') === 'landscape';
        $paperW    = $landscape ? ($paper['height'] ?? 297) : ($paper['width'] ?? 210);
        $viewportW = (int) round($paperW * 96 / 25.4);

        $tmpHtml = tempnam(sys_get_temp_dir(), 'pdfblock_') . '.html';
        $tmpPdf  = sys_get_temp_dir() . '/pdfblock_' . uniqid() . '.pdf';

        try {
            file_put_contents($tmpHtml, $html);

            $args = array_merge(
                [$this->chromeBin],
                $this->config['chrome_args'] ?? $this->defaultArgs,
                [
                    '--window-size=' . $viewportW . ',1080',
                    '--no-pdf-header-footer',
                    '--print-to-pdf=' . $tmpPdf,
                    'file://' . $tmpHtml,
                ]
            );

            $process = new Process($args);
            $process->setTimeout($this->timeout);
            $process->mustRun();

            return file_get_contents($tmpPdf);
        } finally {
            @unlink($tmpHtml);
            @unlink($tmpPdf);
        }
    }
}
