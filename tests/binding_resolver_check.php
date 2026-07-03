<?php

declare(strict_types=1);

// Teste standalone (sem PHPUnit/Composer) do BindingResolver.
// Rodar: docker run --rm -v $PWD:/app -w /app php:8.3-cli php packages/laravel/tests/binding_resolver_check.php

require __DIR__ . '/../src/Data/ValueFormatter.php';
require __DIR__ . '/../src/Data/BindingResolver.php';

use PdfBlock\Laravel\Data\BindingResolver;

$failures = 0;
function check(string $name, mixed $got, mixed $expected): void
{
    global $failures;
    $ok = $got === $expected;
    if (! $ok) {
        $failures++;
        echo "FAIL: $name\n  esperado: " . json_encode($expected) . "\n  obtido:   " . json_encode($got) . "\n";
    } else {
        echo "ok: $name\n";
    }
}

// dotGet — dotted + índice de array + escalar→string
check('dotGet dotted', BindingResolver::dotGet(['a' => ['b' => 'x']], 'a.b'), 'x');
check('dotGet index', BindingResolver::dotGet(['items' => [['title' => 'T0'], ['title' => 'T1']]], 'items[1].title'), 'T1');
check('dotGet number→string', BindingResolver::dotGet(['n' => 42], 'n'), '42');
check('dotGet missing→default', BindingResolver::dotGet(['a' => 1], 'a.b.c', 'D'), 'D');

// dotGetRaw — preserva arrays
$raw = BindingResolver::dotGetRaw(['src' => [['title' => 'A'], ['title' => 'B']]], 'src');
check('dotGetRaw array count', is_array($raw) ? count($raw) : -1, 2);

// resolveString — único e múltiplo, faltante → ''
check('resolveString multi', BindingResolver::resolveString('{{bind:title}} — {{bind:link}}', ['title' => 'Olá', 'link' => 'u']), 'Olá — u');
check('resolveString missing', BindingResolver::resolveString('a{{bind:x}}b', []), 'ab');

// resolve — props aninhados
$props = ['title' => '{{bind:title}}', 'url' => 'https://{{bind:host}}/x', 'n' => 3];
check('resolve nested props', BindingResolver::resolve($props, ['title' => 'T', 'host' => 'ex.com']), ['title' => 'T', 'url' => 'https://ex.com/x', 'n' => 3]);

// resolve — nó TipTap variable → nó de texto
$content = [
    'type' => 'doc',
    'content' => [[
        'type' => 'paragraph',
        'content' => [
            ['type' => 'text', 'text' => 'Olá '],
            ['type' => 'variable', 'attrs' => ['path' => 'title', 'label' => 'Título']],
        ],
    ]],
];
$resolved = BindingResolver::resolve($content, ['title' => 'Mundo']);
check('resolve variable node', $resolved['content'][0]['content'][1], ['type' => 'text', 'text' => 'Mundo']);

// formatMap — formatação por campo + paridade objeto→vazio
check('resolveString currency', BindingResolver::resolveString('Total: {{bind:price}}', ['price' => 1234.5], ['price' => 'currency:BRL']), 'Total: R$ 1.234,50');
check('resolveString date', BindingResolver::resolveString('{{bind:d}}', ['d' => '2026-06-13'], ['d' => 'date:dd/MM/yyyy']), '13/06/2026');
check('resolveString objeto→vazio', BindingResolver::resolveString('x{{bind:obj}}y', ['obj' => ['a' => 1]]), 'xy');
$vnode = ['type' => 'variable', 'attrs' => ['path' => 'n', 'label' => 'N']];
check('resolve variable formatado', BindingResolver::resolve($vnode, ['n' => 1234.5], ['n' => 'number:2']), ['type' => 'text', 'text' => '1.234,50']);

echo $failures === 0 ? "\nTODOS OS TESTES PASSARAM\n" : "\n$failures TESTE(S) FALHARAM\n";
exit($failures === 0 ? 0 : 1);
