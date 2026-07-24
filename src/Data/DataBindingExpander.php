<?php

declare(strict_types=1);

namespace PdfBlock\Laravel\Data;

/**
 * Expande os LOOPS por bloco (`repeat`) — o espelho server-side da repetição
 * do editor React.
 *
 * Para cada bloco/grupo com `repeat: { list, itemOverrides? }`:
 *  - duplica o bloco uma vez por ITEM de `data[list]` (a variável de lista),
 *    resolvendo `{{bind:...}}` (e nós de variável) contra o ESCOPO do item:
 *    `globais + campos do item (sombreiam) + item.numero/item.total`;
 *  - `itemOverrides` (casados por `__id`/índice) patcheiam o clone ANTES da
 *    resolução (styles/props/hidden/content — espelho de data/itemOverrides.ts).
 *
 * Blocos sem `repeat` resolvem contra o escopo corrente (no topo, o `data`
 * global = valores das variáveis + overrides do host + `sys.*`).
 *
 * Convenção: cada item de lista carrega `__id` (id estável) para `recordId`.
 */
class DataBindingExpander
{
    /**
     * @param  array<string, mixed>  $document
     * @param  array<string, mixed>  $data
     * @param  array<string, string>  $formatMap  path → format (ver ValueFormatter)
     * @return array<string, mixed>
     */
    public static function expand(array $document, array $data, array $formatMap = []): array
    {
        // Mapa de estilos NOMEADOS (id → styles parciais) — usado ao materializar o
        // `styleRef` de um nó ao aplicar um `itemOverride` de estilo (mesma regra do
        // client). Extraído aqui pois o `styleRef` só é resolvido DEPOIS (FlowRender),
        // então o override precisa materializar antes que o pré-pass re-sobreponha.
        $namedStyleMap = self::buildNamedStyleMap($document);

        // v3 (Seções/fluxo): expande o `flow` de cada seção. v2: expande `blocks`.
        // O modelo de loop é o MESMO (repeat por nó); só muda o nome dos containers
        // (flow/columns[].flow no v3 vs children/columns[].children no v2).
        if (isset($document['sections']) && is_array($document['sections'])) {
            $document['sections'] = array_map(function ($sec) use ($data, $formatMap, $namedStyleMap) {
                if (is_array($sec) && isset($sec['flow']) && is_array($sec['flow'])) {
                    $sec['flow'] = self::expandList($sec['flow'], $data, $formatMap, $namedStyleMap);
                }
                return $sec;
            }, $document['sections']);
            // Cabeçalho/rodapé document-level (v3): mesmo modelo das seções — um `flow`
            // de FlowNodes. Sem expandi-los, os `{{bind:...}}`/nós `variable` da mobília
            // NÃO resolvem e somem no PDF. Escopo = data global.
            foreach (['header', 'footer'] as $slot) {
                if (isset($document[$slot]['flow']) && is_array($document[$slot]['flow'])) {
                    $document[$slot]['flow'] = self::expandList($document[$slot]['flow'], $data, $formatMap, $namedStyleMap);
                }
            }
            return $document;
        }
        $document['blocks'] = self::expandList($document['blocks'] ?? [], $data, $formatMap, $namedStyleMap);
        return $document;
    }

    /**
     * Índice `id → styles` (parciais) dos estilos nomeados do documento.
     *
     * @param  array<string, mixed>  $document
     * @return array<string, array<string, mixed>>
     */
    private static function buildNamedStyleMap(array $document): array
    {
        $map = [];
        $named = $document['stylesheet']['namedStyles'] ?? null;
        if (is_array($named)) {
            foreach ($named as $ns) {
                if (is_array($ns) && isset($ns['id'])) {
                    $map[(string) $ns['id']] = is_array($ns['styles'] ?? null) ? $ns['styles'] : [];
                }
            }
        }
        return $map;
    }

    /**
     * Expande uma lista de blocos, aplicando o repeat de cada um. `$scope` é o
     * mapa de dados corrente (data global no topo; escopo do item dentro de loop).
     *
     * @param  list<array<string, mixed>>  $list
     * @param  array<string, mixed>  $scope
     * @param  array<string, string>  $formatMap
     * @param  array<string, array<string, mixed>>  $namedStyleMap
     * @return list<array<string, mixed>>
     */
    private static function expandList(array $list, array $scope, array $formatMap, array $namedStyleMap = []): array
    {
        $out = [];
        foreach ($list as $block) {
            if (! is_array($block)) {
                continue;
            }
            $binding = $block['repeat'] ?? null;

            if (is_array($binding) && isset($binding['list'])) {
                $records = BindingResolver::dotGetRaw($scope, (string) $binding['list']);
                $records = is_array($records) ? array_values($records) : [];
                $total = count($records);
                // Ajustes por item (esparsos): casam por __id (recordId) ou índice e
                // patcheiam o clone do item ANTES da resolução de bindings (espelha o
                // client). Nós ocultos (hidden) somem.
                $overrides = is_array($binding['itemOverrides'] ?? null) ? $binding['itemOverrides'] : [];
                $i = 0;
                foreach ($records as $rec) {
                    $recArr = is_array($rec) ? $rec : [];
                    $item = $block;
                    if ($overrides) {
                        $recordId = isset($recArr['__id']) ? (string) $recArr['__id'] : null;
                        $ov = self::matchOverride($overrides, $recordId, $i);
                        if (is_array($ov)) {
                            $set = is_array($ov['set'] ?? null) ? $ov['set'] : [];
                            $patched = self::applyItemOverride($block, $set, $namedStyleMap);
                            if ($patched === null) { // raiz do item oculta → descarta o item
                                $i++;
                                continue;
                            }
                            $item = $patched;
                        }
                    }
                    // Escopo do item: globais + campos do item (sombreiam) + item.*
                    // (espelha buildItemRecord do client).
                    $itemScope = array_merge($scope, $recArr, ['item' => ['numero' => $i + 1, 'total' => $total]]);
                    $out[] = self::expandBlock($item, $itemScope, $formatMap, $namedStyleMap);
                    $i++;
                }
                continue;
            }

            $out[] = self::expandBlock($block, $scope, $formatMap, $namedStyleMap);
        }
        return $out;
    }

    /**
     * Expande um único bloco no escopo dado: resolve seus escalares/nós de
     * variável e desce em `children`/`flow`/`columns` (permitindo loops aninhados).
     *
     * @param  array<string, mixed>  $block
     * @param  array<string, mixed>  $scope
     * @param  array<string, string>  $formatMap
     * @param  array<string, array<string, mixed>>  $namedStyleMap
     * @return array<string, mixed>
     */
    private static function expandBlock(array $block, array $scope, array $formatMap, array $namedStyleMap = []): array
    {
        $out = [];
        foreach ($block as $key => $value) {
            if ($key === 'repeat') {
                continue; // consumido — não vai para a saída
            }
            if (($key === 'children' || $key === 'flow') && is_array($value)) {
                // v2: `children` (filhos de stripe/coluna). v3: `flow` (FlowNodes de
                // Section/Group/coluna). Ambos são listas de nós que repetem/resolvem.
                $out[$key] = self::expandList($value, $scope, $formatMap, $namedStyleMap);
            } elseif ($key === 'columns' && is_array($value)) {
                $out[$key] = array_map(function ($col) use ($scope, $formatMap, $namedStyleMap) {
                    if (! is_array($col)) {
                        return $col;
                    }
                    // v3: a coluna tem `flow`; v2: tem `children`.
                    $childKey = (isset($col['flow']) && is_array($col['flow'])) ? 'flow' : 'children';
                    $children = $col[$childKey] ?? [];
                    $rest = $col;
                    unset($rest[$childKey]);
                    $rest = BindingResolver::resolve($rest, $scope, $formatMap);
                    $rest[$childKey] = is_array($children) ? self::expandList($children, $scope, $formatMap, $namedStyleMap) : $children;
                    return $rest;
                }, $value);
            } else {
                // content (TipTap), props de plugin, url, src, etc. → resolve no escopo.
                $out[$key] = BindingResolver::resolve($value, $scope, $formatMap);
            }
        }
        return $out;
    }

    // ─── itemOverrides (ajustes por item do loop) — espelho de data/itemOverrides.ts ───

    /**
     * Seleciona o override que vale para um item `(recordId, index)`. `recordId`
     * PRECEDE `index`; override com recordId que não casa fica INERTE (não cai para
     * index). Em cada passe, o 1º match vence.
     *
     * @param  list<array<string, mixed>>  $overrides
     * @return array<string, mixed>|null
     */
    private static function matchOverride(array $overrides, ?string $recordId, int $index): ?array
    {
        if ($recordId !== null) {
            foreach ($overrides as $o) {
                if (is_array($o) && ($o['recordId'] ?? null) !== null && (string) $o['recordId'] === $recordId) {
                    return $o;
                }
            }
        }
        foreach ($overrides as $o) {
            if (is_array($o) && ($o['recordId'] ?? null) === null && ($o['index'] ?? null) === $index) {
                return $o;
            }
        }

        return null;
    }

    /**
     * Aplica os patches de um `set` a UM item (o nó repetido). Retorna o nó
     * modificado, ou `null` se o próprio nó-raiz foi ocultado (`hidden`). Ordem
     * idêntica ao TS: patch da RAIZ antes da descida; `hidden` remove do pai;
     * `styles` materializa `styleRef` e deep-merge (patch vence); `props`/`fields`
     * merge raso (plugin/campos do topo); `content` substitui por inteiro (texto
     * editado SÓ naquele item).
     *
     * @param  array<string, mixed>  $node
     * @param  array<string, array<string, mixed>>  $set  nodeId → patch
     * @param  array<string, array<string, mixed>>  $namedStyleMap
     * @return array<string, mixed>|null
     */
    private static function applyItemOverride(array $node, array $set, array $namedStyleMap): ?array
    {
        $id = (isset($node['id']) && is_string($node['id'])) ? $node['id'] : null;
        $patch = $id !== null ? ($set[$id] ?? null) : null;
        if (is_array($patch) && ($patch['hidden'] ?? false) === true) {
            return null;
        }
        if (is_array($patch)) {
            $node = self::applyPatchToNode($node, $patch, $namedStyleMap);
        }
        foreach (['flow', 'children', 'columns'] as $key) {
            if (isset($node[$key]) && is_array($node[$key])) {
                $kept = [];
                foreach ($node[$key] as $child) {
                    if (is_array($child)) {
                        $res = self::applyItemOverride($child, $set, $namedStyleMap);
                        if ($res !== null) {
                            $kept[] = $res;
                        }
                    } else {
                        $kept[] = $child;
                    }
                }
                $node[$key] = $kept;
            }
        }

        return $node;
    }

    /**
     * Chaves estruturais que `fields` NUNCA sobrescreve — cada uma tem canal
     * próprio (`styles`/`props`/`content`) ou é identidade/estrutura do nó.
     * ESPELHADO no TS (`data/itemOverrides.ts` → RESERVED_FIELD_KEYS).
     *
     * @var list<string>
     */
    private const RESERVED_FIELD_KEYS = [
        'id', 'type', 'meta', 'styles', 'styleRef', 'props', 'content',
        'flow', 'columns', 'children', 'repeat',
    ];

    /**
     * Aplica UM patch nos campos do nó.
     *
     * @param  array<string, mixed>  $node
     * @param  array<string, mixed>  $patch
     * @param  array<string, array<string, mixed>>  $namedStyleMap
     * @return array<string, mixed>
     */
    private static function applyPatchToNode(array $node, array $patch, array $namedStyleMap): array
    {
        if (isset($patch['styles']) && is_array($patch['styles'])) {
            // Materializa o styleRef (nome vence) e o remove ANTES do patch — assim o
            // ajuste do item prevalece e o pré-pass de styleRef (FlowRender, depois) não
            // re-sobrepõe o nome sobre o patch.
            $ref = $node['styleRef'] ?? null;
            if (is_string($ref)) {
                if (isset($namedStyleMap[$ref]) && is_array($namedStyleMap[$ref])) {
                    $node['styles'] = self::deepMerge(is_array($node['styles'] ?? null) ? $node['styles'] : [], $namedStyleMap[$ref]);
                }
                unset($node['styleRef']);
            }
            $node['styles'] = self::deepMerge(is_array($node['styles'] ?? null) ? $node['styles'] : [], $patch['styles']);
        }
        if (isset($patch['props']) && is_array($patch['props'])) {
            $props = is_array($node['props'] ?? null) ? $node['props'] : [];
            $node['props'] = array_merge($props, $patch['props']);
        }
        if (isset($patch['fields']) && is_array($patch['fields'])) {
            // Campos PRÓPRIOS do bloco (fontSize/textAlign/src/…) — merge raso no
            // topo do nó, pulando as chaves estruturais reservadas.
            foreach ($patch['fields'] as $k => $v) {
                if (! in_array($k, self::RESERVED_FIELD_KEYS, true)) {
                    $node[$k] = $v;
                }
            }
        }
        if (array_key_exists('content', $patch) && $patch['content'] !== null) {
            $node['content'] = $patch['content'];
        }

        return $node;
    }

    /**
     * Deep-merge onde `$source` vence (espelha StyleHelpers::deepMerge / utils.deepMerge):
     * objetos (arrays associativos) recursam; listas/escalares são substituídos; `null`
     * no source é ignorado.
     *
     * @param  array<string, mixed>  $target
     * @param  array<string, mixed>  $source
     * @return array<string, mixed>
     */
    private static function deepMerge(array $target, array $source): array
    {
        $result = $target;
        foreach ($source as $key => $val) {
            if (is_array($val) && ! array_is_list($val) && isset($result[$key]) && is_array($result[$key])) {
                $result[$key] = self::deepMerge($result[$key], $val);
            } elseif ($val !== null) {
                $result[$key] = $val;
            }
        }

        return $result;
    }
}
