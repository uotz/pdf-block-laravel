<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Node & NPM Binaries
    |--------------------------------------------------------------------------
    |
    | Paths to the Node.js and npm binaries on the server. Browsershot needs
    | these to launch Puppeteer. Adjust for your environment (e.g. nvm paths).
    |
    */

    'node_binary' => env('PDF_BLOCK_NODE_BINARY', '/usr/bin/node'),
    'npm_binary'  => env('PDF_BLOCK_NPM_BINARY', '/usr/bin/npm'),

    /*
    |--------------------------------------------------------------------------
    | Timeout
    |--------------------------------------------------------------------------
    |
    | Maximum time in seconds to wait for the browser to render the PDF.
    |
    */

    'timeout' => (int) env('PDF_BLOCK_TIMEOUT', 30),

    /*
    |--------------------------------------------------------------------------
    | Chrome Arguments
    |--------------------------------------------------------------------------
    |
    | Extra CLI flags passed to the Chromium instance spawned by Puppeteer.
    | The defaults below work for most Linux servers and Docker containers.
    |
    */

    'chrome_args' => [
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
    ],

];
