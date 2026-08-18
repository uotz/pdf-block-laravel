<?php

declare(strict_types=1);

// Teste standalone do handler do nó TipTap `variable` no TiptapConverter:
// um nó `variable` CRU (não resolvido) NÃO pode sumir — emite o rótulo (ou path).
// Requer o tiptap-php (autoload do sandbox). As classes do pacote são requeridas
// manualmente (o PSR-4 do sandbox aponta para um symlink que só resolve no app).
// docker run --rm -v $PWD:/app -w /app php:8.3-cli php packages/laravel/tests/variable_node_check.php

require __DIR__ . '/../../../apps/laravel-sandbox/vendor/autoload.php';
require __DIR__ . '/../src/TextStyleAttributes.php';
require __DIR__ . '/../src/ColoredBlockquote.php';
require __DIR__ . '/../src/Xref.php';
require __DIR__ . '/../src/StyledLink.php';
require __DIR__ . '/../src/Variable.php';
require __DIR__ . '/../src/TiptapConverter.php';

use PdfBlock\Laravel\TiptapConverter;

$failures = 0;
function check(string $name, bool $ok, string $extra = ''): void
{
    global $failures;
    if ($ok) { echo "ok: $name\n"; }
    else { $failures++; echo "FAIL: $name $extra\n"; }
}

$conv = new TiptapConverter();

// ── 1. Variável com rótulo: emite o rótulo, envolto em .pdfb-var (não some) ──
$doc = ['type' => 'doc', 'content' => [
    ['type' => 'paragraph', 'content' => [
        ['type' => 'text', 'text' => 'Olá '],
        ['type' => 'variable', 'attrs' => ['path' => 'customer.name', 'label' => 'Cliente']],
        ['type' => 'text', 'text' => '!'],
    ]],
]];
$html = $conv->toHtml($doc);
check('variável não some (tem pdfb-var)', str_contains($html, 'pdfb-var'), "($html)");
check('variável emite o rótulo', str_contains($html, 'Cliente'), "($html)");
check('preserva o texto ao redor', str_contains($html, 'Olá') && str_contains($html, '!'), "($html)");
check('marca data-pdfb-var com o path', str_contains($html, 'customer.name'), "($html)");

// ── 2. Variável SEM rótulo: cai no path (nunca vazio) ──
$doc2 = ['type' => 'doc', 'content' => [
    ['type' => 'paragraph', 'content' => [
        ['type' => 'variable', 'attrs' => ['path' => 'total', 'label' => '']],
    ]],
]];
$html2 = $conv->toHtml($doc2);
check('sem rótulo → emite o path', str_contains($html2, 'total'), "($html2)");
check('sem rótulo → span visível', str_contains($html2, 'pdfb-var'), "($html2)");

// ── 3. Texto normal segue intacto (sanidade: não quebrou o conversor) ──
$doc3 = ['type' => 'doc', 'content' => [
    ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Sem variáveis aqui']]],
]];
$html3 = $conv->toHtml($doc3);
check('texto normal intacto', str_contains($html3, 'Sem variáveis aqui'), "($html3)");

echo $failures === 0 ? "\nTODOS OS TESTES PASSARAM\n" : "\n$failures TESTE(S) FALHARAM\n";
exit($failures === 0 ? 0 : 1);
