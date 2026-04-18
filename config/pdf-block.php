<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Driver de PDF
    |--------------------------------------------------------------------------
    |
    | Define qual driver será usado para gerar PDFs.
    |
    |   'local'       — Chromium local via CLI (padrão). Requer o binário
    |                   instalado no servidor ou container.
    |   'browserless' — Serviço HTTP compatível com Browserless v1
    |                   (auto-hospedado ou browserless.io). Elimina o
    |                   Chromium do container PHP.
    |
    | Valor: env PDF_BLOCK_DRIVER
    |
    */

    'driver' => env('PDF_BLOCK_DRIVER', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Configuração por driver
    |--------------------------------------------------------------------------
    */

    'drivers' => [

        'local' => [
            /*
             | Caminho para o binário do Chromium ou Google Chrome.
             */
            'chrome_path' => env('PDF_BLOCK_CHROME_PATH', '/usr/bin/chromium'),

            /*
             | Tempo máximo (em segundos) para aguardar a renderização.
             */
            'timeout' => (int) env('PDF_BLOCK_TIMEOUT', 30),

            /*
             | Flags CLI passadas ao Chromium.
             |
             | --disable-crash-reporter e --disable-breakpad reduzem problemas
             | de permissão (ptrace) com o crashpad_handler em ambientes sem
             | CAP_SYS_PTRACE (ex.: www-data via PHP-FPM).
             */
            'chrome_args' => [
                '--headless',
                '--ozone-platform=headless',
                '--no-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--run-all-compositor-stages-before-draw',
                '--disable-crash-reporter',
                '--disable-breakpad',
            ],
        ],

        'browserless' => [
            /*
             | URL base do serviço Browserless.
             | Ex.: http://browserless:3000  (Docker interno)
             |       https://chrome.browserless.io  (managed)
             */
            'url' => env('PDF_BLOCK_BROWSERLESS_URL', 'http://browserless:3000'),

            /*
             | Tempo máximo (em segundos) para aguardar a resposta HTTP.
             */
            'timeout' => (int) env('PDF_BLOCK_BROWSERLESS_TIMEOUT', 30),
        ],

    ],

];
