<?php

declare(strict_types=1);

namespace PdfBlock\Laravel;

use Illuminate\Support\ServiceProvider;

class PdfBlockServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../config/pdf-block.php', 'pdf-block');

        $this->app->singleton(PdfBlockRenderer::class, function ($app) {
            return new PdfBlockRenderer(
                config: $app['config']->get('pdf-block', []),
            );
        });

        $this->app->alias(PdfBlockRenderer::class, 'pdf-block');
    }

    public function boot(): void
    {
        $this->loadViewsFrom(__DIR__ . '/../resources/views', 'pdf-block');

        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__ . '/../config/pdf-block.php' => config_path('pdf-block.php'),
            ], 'pdf-block-config');

            $this->publishes([
                __DIR__ . '/../resources/views' => resource_path('views/vendor/pdf-block'),
            ], 'pdf-block-views');
        }
    }
}
