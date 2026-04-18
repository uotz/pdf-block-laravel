<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Chrome / Chromium Binary
    |--------------------------------------------------------------------------
    |
    | Path to the Chrome or Chromium executable. chrome-php communicates
    | directly via DevTools Protocol — Node.js is NOT required.
    |
    */

    'chrome_path' => env('PDF_BLOCK_CHROME_PATH', '/usr/bin/chromium'),

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
    | Extra CLI flags passed to the Chromium instance.
    | The defaults below work for most Linux servers and Docker containers.
    |
    */

    'chrome_args' => [
        '--headless',
        '--ozone-platform=headless',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--run-all-compositor-stages-before-draw',
    ],

];
