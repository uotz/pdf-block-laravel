<?php

declare(strict_types=1);

// Teste standalone do ValueFormatter (formatação por tipo) — paridade com
// packages/react/src/data/format.ts (ver format.test.ts no pacote React).
// docker run --rm -v $PWD:/app -w /app php:8.3-cli php packages/laravel/tests/value_formatter_check.php

require __DIR__ . '/../src/Data/ValueFormatter.php';

use PdfBlock\Laravel\Data\ValueFormatter as VF;

$failures = 0;
function check(string $name, mixed $got, mixed $expected): void
{
    global $failures;
    if ($got === $expected) {
        echo "ok: $name\n";
    } else {
        $failures++;
        echo "FAIL: $name\n  esperado: " . json_encode($expected) . "\n  obtido:   " . json_encode($got) . "\n";
    }
}

// scalarString / sem format
check('null → vazio', VF::format(null, null), '');
check('objeto → vazio', VF::format(['a' => 1], null), '');
check('escalar sem format', VF::format('abc', null), 'abc');
check('número sem format', VF::format(42, null), '42');

// number (pt-BR: milhar '.', decimal ',')
check('number:2', VF::format(1234.5, 'number:2'), '1.234,50');
check('number:0', VF::format(1234, 'number:0'), '1.234');
check('number negativo', VF::format(-1234.5, 'number:2'), '-1.234,50');
check('number string pt-BR', VF::format('1234,5', 'number:2'), '1.234,50');

// currency
check('currency BRL', VF::format(1234.5, 'currency:BRL'), 'R$ 1.234,50');
check('currency USD', VF::format(9.9, 'currency:USD'), '$ 9,90');
check('currency default', VF::format(5, 'currency'), 'R$ 5,00');

// percent
check('percent:1', VF::format(12.3, 'percent:1'), '12,3%');

// date / datetime (UTC)
check('date dd/MM/yyyy', VF::format('2026-06-13', 'date:dd/MM/yyyy'), '13/06/2026');
check('date yyyy-MM-dd', VF::format('2026-06-13', 'date:yyyy-MM-dd'), '2026-06-13');
check('datetime Z', VF::format('2026-06-13T08:05:00Z', 'datetime:dd/MM/yyyy HH:mm'), '13/06/2026 08:05');
check('date inválida → escalar', VF::format('não-data', 'date'), 'não-data');

// buildMap (path → format)
check('buildMap', VF::buildMap([['id' => 'c', 'fields' => [
    ['key' => 'price', 'format' => 'currency:BRL'],
    ['key' => 'name'],
]]]), ['price' => 'currency:BRL']);

echo $failures === 0 ? "\nTODOS OS TESTES PASSARAM\n" : "\n$failures TESTE(S) FALHARAM\n";
exit($failures === 0 ? 0 : 1);
