<?php

declare(strict_types=1);

// Teste standalone do DataBindingExpander (repeat por variável de lista / avulso).
// docker run --rm -v $PWD:/app -w /app php:8.3-cli php packages/laravel/tests/data_binding_expander_check.php

require __DIR__ . '/../src/Data/ValueFormatter.php';
require __DIR__ . '/../src/Data/BindingResolver.php';
require __DIR__ . '/../src/Data/DataBindingExpander.php';

use PdfBlock\Laravel\Data\DataBindingExpander;

$failures = 0;
function check(string $name, bool $ok, string $extra = ''): void
{
    global $failures;
    if ($ok) { echo "ok: $name\n"; }
    else { $failures++; echo "FAIL: $name $extra\n"; }
}

// Helpers de construção
function textWithVar(string $id, string $path): array
{
    return ['type' => 'text', 'id' => $id, 'content' => ['type' => 'doc', 'content' => [
        ['type' => 'paragraph', 'content' => [['type' => 'variable', 'attrs' => ['path' => $path, 'label' => $path]]]],
    ]]];
}
function structure(string $id, array $children, ?array $binding = null): array
{
    $st = ['type' => 'structure', 'id' => $id, 'columns' => [['id' => $id . '-c', 'children' => $children]]];
    if ($binding) $st['repeat'] = $binding;
    return $st;
}
function stripe(string $id, array $children): array
{
    return ['type' => 'stripe', 'id' => $id, 'children' => $children];
}

$data = ['noticias' => [
    ['__id' => 'n1', 'title' => 'AAA'],
    ['__id' => 'n2', 'title' => 'BBB'],
    ['__id' => 'n3', 'title' => 'CCC'],
]];

// ── 1. REPEAT: estrutura repete por item da lista, variável resolve por escopo ──
$docRepeat = ['blocks' => [
    stripe('s1', [
        structure('st1', [textWithVar('t1', 'title')], ['list' => 'noticias']),
    ]),
]];
$out = DataBindingExpander::expand($docRepeat, $data);
$structs = $out['blocks'][0]['children'];
check('repeat: 3 cópias', count($structs) === 3, '(got ' . count($structs) . ')');
$json = json_encode($out);
check('repeat: resolve AAA/BBB/CCC', str_contains($json, 'AAA') && str_contains($json, 'BBB') && str_contains($json, 'CCC'));
check('repeat: remove repeat da saída', ! str_contains($json, '"repeat"'));
check('repeat: sem nós variable remanescentes', ! str_contains($json, '"variable"'));

// ── 2. ESCOPO do item: globais visíveis + item.numero/item.total injetados ──
$docScope = ['blocks' => [
    stripe('s2', [
        structure('st2', [
            textWithVar('t2', 'empresa'),      // global (não sombreada pelo item)
            textWithVar('t2b', 'item.numero'), // automática por item (1-based)
            textWithVar('t2c', 'item.total'),
        ], ['list' => 'noticias']),
    ]),
]];
$out2 = DataBindingExpander::expand($docScope, array_merge($data, ['empresa' => 'ACME']));
$json2 = json_encode($out2);
check('escopo do item: global visível dentro do loop', substr_count($json2, 'ACME') === 3);
check('escopo do item: item.numero 1-based', str_contains($json2, '"1"') || str_contains($json2, '{"type":"text","text":"1"}'));
check('escopo do item: item.total', str_contains($json2, '{"type":"text","text":"3"}'));

// ── 3. Avulso (sem loop): resolve contra data global ──
$docPlain = ['blocks' => [stripe('s3', [structure('st3', [textWithVar('t3', 'title')])])]];
$out3 = DataBindingExpander::expand($docPlain, ['title' => 'GLOBAL']);
check('avulso: resolve data global', str_contains(json_encode($out3), 'GLOBAL'));

// ── Helpers v3 (Seções/fluxo) ──
function v3columnSet(string $id, array $colFlows, ?array $binding = null): array
{
    $cols = [];
    foreach ($colFlows as $i => $flow) {
        $cols[] = ['id' => $id . '-c' . $i, 'width' => 100 / max(count($colFlows), 1), 'flow' => $flow];
    }
    $cs = ['type' => 'columnSet', 'id' => $id, 'columns' => $cols];
    if ($binding) $cs['repeat'] = $binding;
    return $cs;
}
function v3group(string $id, array $flow, ?array $binding = null): array
{
    $g = ['type' => 'group', 'id' => $id, 'flow' => $flow];
    if ($binding) $g['repeat'] = $binding;
    return $g;
}
function v3doc(array $flow): array
{
    return ['version' => '3.0.0', 'sections' => [['id' => 'sec', 'type' => 'section', 'flow' => $flow]]];
}

// ── 4. v3 REPEAT: columnSet repete por item, variável resolve por escopo ──
$v3Repeat = v3doc([
    v3columnSet('cs1', [[textWithVar('vt1', 'title')]], ['list' => 'noticias']),
]);
$o4 = DataBindingExpander::expand($v3Repeat, $data);
$flow4 = $o4['sections'][0]['flow'];
check('v3 repeat: 3 cópias do columnSet', count($flow4) === 3, '(got ' . count($flow4) . ')');
$j4 = json_encode($o4);
check('v3 repeat: resolve AAA/BBB/CCC', str_contains($j4, 'AAA') && str_contains($j4, 'BBB') && str_contains($j4, 'CCC'));
check('v3 repeat: remove repeat da saída', ! str_contains($j4, '"repeat"'));
check('v3 repeat: sem nós variable remanescentes', ! str_contains($j4, '"variable"'));

// ── 5. v3 loop em FOLHA: o próprio bloco repete ──
$v3LeafRepeat = v3doc([
    v3group('g1', [
        array_merge(textWithVar('vt2', 'title'), ['repeat' => ['list' => 'noticias']]),
    ]),
]);
$o5 = DataBindingExpander::expand($v3LeafRepeat, $data);
$g1flow = $o5['sections'][0]['flow'][0]['flow'];
check('v3 folha repetida: 3 cópias', count($g1flow) === 3, '(got ' . count($g1flow) . ')');
check('v3 folha repetida: resolve por item', str_contains(json_encode($o5), 'BBB'));

// ── 6. v3 avulso: folha solta no flow da seção resolve data global ──
$v3Plain = v3doc([textWithVar('vt3', 'title')]);
$o6 = DataBindingExpander::expand($v3Plain, ['title' => 'GLOBAL']);
check('v3 avulso: resolve data global', str_contains(json_encode($o6), 'GLOBAL'));

// ── 7. Cabeçalho/rodapé document-level (v3): o `flow` da mobília resolve variáveis ──
$v3Furniture = array_merge(v3doc([textWithVar('body', 'title')]), [
    'header' => ['enabled' => true, 'flow' => [textWithVar('h', 'title')]],
    'footer' => ['enabled' => true, 'flow' => [textWithVar('f', 'title')]],
]);
$o7 = DataBindingExpander::expand($v3Furniture, ['title' => 'FURNI']);
$jh = json_encode($o7['header']);
$jf = json_encode($o7['footer']);
check('header: resolve variável (FURNI)', str_contains($jh, 'FURNI'), "($jh)");
check('header: sem nós variable remanescentes', ! str_contains($jh, '"variable"'), "($jh)");
check('footer: resolve variável (FURNI)', str_contains($jf, 'FURNI'), "($jf)");
check('footer: sem nós variable remanescentes', ! str_contains($jf, '"variable"'), "($jf)");

// ── 8. Aninhado: loop DENTRO de loop (lista aninhada por item via campo) ──
$nested = v3doc([
    v3group('gout', [
        v3group('gin', [textWithVar('vin', 'nome')], ['list' => 'membros']),
    ], ['list' => 'times']),
]);
$nestedData = ['times' => [
    ['__id' => 't1', 'titulo' => 'Alfa', 'membros' => [['__id' => 'm1', 'nome' => 'Ana'], ['__id' => 'm2', 'nome' => 'Bia']]],
    ['__id' => 't2', 'titulo' => 'Beta', 'membros' => [['__id' => 'm3', 'nome' => 'Caio']]],
]];
$o8 = DataBindingExpander::expand($nested, $nestedData);
$j8 = json_encode($o8);
check('aninhado: resolve membros por time', str_contains($j8, 'Ana') && str_contains($j8, 'Bia') && str_contains($j8, 'Caio'));
check('aninhado: 2 times no topo', count($o8['sections'][0]['flow']) === 2);

// ── 9. content por item: ItemPatch.content substitui o texto SÓ daquele item ──
$docContent = v3doc([
    v3group('gc', [textWithVar('tc', 'title')], ['list' => 'noticias', 'itemOverrides' => [[
        'recordId' => 'n2',
        'set' => ['tc' => ['content' => ['type' => 'doc', 'content' => [[
            'type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'SO-NESTE']],
        ]]]]],
    ]]]),
]);
$o9 = DataBindingExpander::expand($docContent, $data);
$j9 = json_encode($o9);
check('content por item: item n2 usa o texto próprio', str_contains($j9, 'SO-NESTE'));
check('content por item: demais itens seguem o modelo', str_contains($j9, 'AAA') && str_contains($j9, 'CCC') && ! str_contains($j9, 'BBB'));

// ── 10. Fixture COMPARTILHADA (itemOverrides) — paridade com o vitest ──
// Mesma fixture consumida por packages/react/src/data/itemOverrides.test.ts.
function fxIndexById($node, array &$out): void
{
    if (! is_array($node)) {
        return;
    }
    if (isset($node['id']) && is_string($node['id'])) {
        $out[$node['id']] = $node;
    }
    foreach (['flow', 'children', 'columns'] as $key) {
        if (isset($node[$key]) && is_array($node[$key])) {
            foreach ($node[$key] as $child) {
                fxIndexById($child, $out);
            }
        }
    }
}

/** `true` se `$actual` contém (recursivamente) todos os pares de `$expected`. */
function fxDeepSubset($actual, $expected): bool
{
    if (is_array($expected) && ! array_is_list($expected)) {
        if (! is_array($actual)) {
            return false;
        }
        foreach ($expected as $k => $v) {
            if (! array_key_exists($k, $actual) || ! fxDeepSubset($actual[$k], $v)) {
                return false;
            }
        }
        return true;
    }

    return $actual === $expected;
}

$fx = json_decode((string) file_get_contents(__DIR__ . '/../../schema/fixtures/item-overrides.json'), true);
check('fixture: carregou item-overrides.json', is_array($fx) && isset($fx['template'], $fx['records'], $fx['overrides'], $fx['expected'], $fx['listKey']));

// Monta o doc v3: template (grupo) com repeat + itemOverrides + namedStyles.
$fxGroup = $fx['template'];
$fxGroup['repeat'] = ['list' => $fx['listKey'], 'itemOverrides' => $fx['overrides']];
$fxDoc = [
    'version' => '3.0.0',
    'stylesheet' => ['namedStyles' => $fx['namedStyles']],
    'sections' => [['id' => 'sec', 'type' => 'section', 'flow' => [$fxGroup]]],
];
// data por fonte: {__id: id, ...campos} (convenção de buildExportPayload).
$fxData = [$fx['listKey'] => array_map(
    fn ($r) => array_merge(['__id' => (string) $r['id']], $r),
    $fx['records'],
)];

$fxOut = DataBindingExpander::expand($fxDoc, $fxData);
$items = $fxOut['sections'][0]['flow'];
check('fixture: repeat gerou 1 item por registro', count($items) === count($fx['expected']), '(got ' . count($items) . ')');

foreach ($fx['expected'] as $i => $exp) {
    $idx = [];
    fxIndexById($items[$i] ?? [], $idx);
    $tag = "item $i ({$exp['recordId']})";

    foreach ($exp['present'] as $id) {
        check("$tag: presente $id", isset($idx[$id]));
    }
    foreach ($exp['absent'] as $id) {
        check("$tag: ausente $id", ! isset($idx[$id]));
    }
    foreach ($exp['styles'] as $id => $styles) {
        check("$tag: styles de $id", fxDeepSubset($idx[$id]['styles'] ?? null, $styles), '(' . json_encode($idx[$id]['styles'] ?? null) . ')');
    }
    foreach ($exp['hasStyleRef'] as $id => $has) {
        check("$tag: styleRef em $id = " . ($has ? 'sim' : 'não'), array_key_exists('styleRef', $idx[$id] ?? []) === $has);
    }
    foreach ($exp['props'] as $id => $props) {
        check("$tag: props de $id", fxDeepSubset($idx[$id]['props'] ?? null, $props), '(' . json_encode($idx[$id]['props'] ?? null) . ')');
    }
    // fields no TOPO do nó (ItemPatch.fields) — inclui a prova de que chaves
    // reservadas (id/type) NÃO foram sobrescritas pelo patch.
    foreach ($exp['fields'] ?? [] as $id => $fields) {
        check("$tag: fields de $id", fxDeepSubset($idx[$id] ?? null, $fields), '(' . json_encode($idx[$id] ?? null) . ')');
    }
}

echo $failures === 0 ? "\nTODOS OS TESTES PASSARAM\n" : "\n$failures TESTE(S) FALHARAM\n";
exit($failures === 0 ? 0 : 1);
