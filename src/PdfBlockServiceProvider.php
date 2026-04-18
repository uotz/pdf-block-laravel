<?php

declare(strict_types=1);

namespace PdfBlock\Laravel;

use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\ServiceProvider;
use PdfBlock\Laravel\Contracts\PdfDriver;
use PdfBlock\Laravel\Drivers\BrowserlessDriver;
use PdfBlock\Laravel\Drivers\LocalDriver;

class PdfBlockServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../config/pdf-block.php', 'pdf-block');

        // Resolve o driver correto com base em config('pdf-block.driver')
        $this->app->singleton(PdfDriver::class, function ($app) {
            $config = $app['config']->get('pdf-block', []);
            $driver = $config['driver'] ?? 'local';

            return match ($driver) {
                'browserless' => new BrowserlessDriver(
                    config: $config['drivers']['browserless'] ?? [],
                    http: $app->make(HttpFactory::class),
                ),
                default => new LocalDriver(
                    config: $config['drivers']['local'] ?? [],
                ),
            };
        });

        $this->app->singleton(PdfBlockRenderer::class, function ($app) {
            return new PdfBlockRenderer(
                driver: $app->make(PdfDriver::class),
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
