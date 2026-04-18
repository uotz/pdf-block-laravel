<?php

declare(strict_types=1);

namespace PdfBlock\Laravel\Drivers;

use Illuminate\Http\Client\Factory as HttpFactory;
use PdfBlock\Laravel\Contracts\PdfDriver;

/**
 * Driver browserless: gera PDF via POST ao endpoint /pdf de qualquer serviço
 * compatível com a API Browserless v1 (auto-hospedado ou browserless.io).
 *
 * Elimina o Chromium do container PHP — o browser roda em um container
 * isolado, onde pode ser executado como root sem problemas de permissão.
 *
 * Referência da API: https://docs.browserless.io/HTTP-APIs/pdf
 */
class BrowserlessDriver implements PdfDriver
{
    private string $url;
    private int $timeout;

    public function __construct(
        array $config,
        private readonly HttpFactory $http,
    ) {
        $this->url     = rtrim($config['url'] ?? 'http://browserless:3000', '/');
        $this->timeout = (int) ($config['timeout'] ?? 30);
    }

    public function render(string $html, array $document): string
    {
        $response = $this->http->timeout($this->timeout)->post($this->url . '/pdf', [
            'html' => $html,

            // O HTML gerado pelo Blade já contém toda a lógica de dimensionamento:
            // o JS injeta `@page { size: Wmm Hmm; margin: 0; }` via beforeprint,
            // medindo o scrollHeight real após fontes e imagens carregadas.
            // preferCSSPageSize: true instrui o Puppeteer a ler esse @page em vez
            // de usar format/width/height/margin passados aqui — evitando conflito.
            'options' => [
                'preferCSSPageSize' => true,
                'printBackground'   => true,
            ],

            // networkidle0 aguarda até não haver requisições de rede pendentes
            // (Google Fonts, imagens remotas) — garante que o layout esteja
            // estabilizado antes de o Puppeteer disparar beforeprint e gerar o PDF.
            // timeout em ms para a navegação (page.goto), independente do timeout HTTP.
            'gotoOptions' => [
                'waitUntil' => 'networkidle0',
                'timeout'   => $this->timeout * 1000,
            ],

            // O viewport define a largura de renderização do HTML — sem ele o
            // Chromium usa 800 px por padrão, causando layout incorreto (conteúdo
            // centralizado em largura errada e scrollHeight calculado errado).
            // Deve ser igual à largura do papel em px para paridade com o LocalDriver.
            'viewport' => [
                'width'  => $this->calcViewportWidth($document),
                'height' => 1080,
            ],
        ]);

        if (! $response->successful()) {
            throw new \RuntimeException(sprintf(
                'Browserless retornou HTTP %d: %s',
                $response->status(),
                $response->body(),
            ));
        }

        return $response->body();
    }

    /**
     * Converte a largura do papel (em mm) para pixels a 96 DPI.
     * Espelha mmToPx do React: round(mm * 96 / 25.4).
     */
    private function calcViewportWidth(array $document): int
    {
        $ps        = $document['pageSettings'] ?? [];
        $paper     = $ps['paperSize'] ?? [];
        $landscape = ($ps['orientation'] ?? 'portrait') === 'landscape';
        $paperW    = $landscape ? ($paper['height'] ?? 297) : ($paper['width'] ?? 210);

        return (int) round($paperW * 96 / 25.4);
    }
}

