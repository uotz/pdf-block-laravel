<?php

declare(strict_types=1);

namespace PdfBlock\Laravel\Data;

/**
 * Expande os vínculos de dados por bloco (`dataBinding`) anexados pelo usuário
 * final — o espelho server-side do escopo/repetição do editor React.
 *
 * Para cada bloco/grupo com `dataBinding`:
 *  - `repeat` → duplica o bloco uma vez por registro de `data[sourceId]`,
 *               resolvendo `{{bind:...}}` (e nós de variável) contra cada registro;
 *  - `single` → resolve a subárvore contra o registro fixo (`recordId`) ou o
 *               escopo herdado.
 *
 * Blocos sem vínculo resolvem contra o escopo corrente (no topo, o `data` global),
 * preservando o comportamento de bindings avulsos `{{bind:campo}}`.
 *
 * Convenção de dados (enviada pelo client): `data[sourceId]` é uma lista de
 * objetos de valores, cada um com `__id` para casar `recordId` no modo single.
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
        // O modelo de vínculo é o MESMO (dataBinding por nó); só muda o nome dos
        // containers (flow/columns[].flow no v3 vs children/columns[].children no v2),
        // tratados em expandBlock().
        if (isset($document['sections']) && is_array($document['sections'])) {
            $document['sections'] = array_map(function ($sec) use ($data, $formatMap, $namedStyleMap) {
                if (is_array($sec) && isset($sec['flow']) && is_array($sec['flow'])) {
                    $sec['flow'] = self::expandList($sec['flow'], $data, $data, $formatMap, $namedStyleMap);
                }
                return $sec;
            }, $document['sections']);
            // Cabeçalho/rodapé document-level (v3): mesmo modelo das seções — um `flow`
            // de FlowNodes. Sem expandi-los, os `{{bind:...}}`/nós `variable` da mobília
            // NÃO resolvem e somem no PDF. Escopo = data global (registro de preview).
            foreach (['header', 'footer'] as $slot) {
                if (isset($document[$slot]['flow']) && is_array($document[$slot]['flow'])) {
                    $document[$slot]['flow'] = self::expandList($document[$slot]['flow'], $data, $data, $formatMap, $namedStyleMap);
                }
            }
            return $document;
        }
        $document['blocks'] = self::expandList($document['blocks'] ?? [], $data, $data, $formatMap, $namedStyleMap);
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
     * Expande uma lista de blocos, aplicando repeat/single de cada um.
     *
     * @param  list<array<string, mixed>>  $list
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $scope
     * @param  array<string, string>  $formatMap
     * @param  array<string, array<string, mixed>>  $namedStyleMap
     * @return list<array<string, mixed>>
     */
    private static function expandList(array $list, array $data, array $scope, array $formatMap, array $namedStyleMap = []): array
    {
        $out = [];
        foreach ($list as $block) {
            if (! is_array($block)) {
                continue;
            }
            $binding = $block['dataBinding'] ?? null;

            if (is_array($binding) && ($binding['mode'] ?? 'single') === 'repeat') {
                $records = self::records($data, $binding, $scope);
                // Ajustes por item (esparsos): casam por __id (recordId) ou índice e
                // patcheiam o clone do item ANTES da resolução de bindings (espelha o
                // client). Só o modo repeat os consome; nós ocultos (hidden) somem.
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
                    $out[] = self::expandBlock($item, $data, $recArr, $formatMap, $namedStyleMap);
                    $i++;
                }
                continue;
            }

            if (is_array($binding)) { // single
                $rec = self::singleRecord($data, $binding, $scope);
                $out[] = self::expandBlock($block, $data, $rec, $formatMap, $namedStyleMap);
                continue;
            }

            $out[] = self::expandBlock($block, $data, $scope, $formatMap, $namedStyleMap);
        }
        return $out;
    }

    /**
     * Expande um único bloco no escopo dado: resolve seus escalares/nós de
     * variável e desce em `children`/`columns` (permitindo vínculos aninhados).
     *
     * @param  array<string, mixed>  $block
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $scope
     * @param  array<string, string>  $formatMap
     * @param  array<string, array<string, mixed>>  $namedStyleMap
     * @return array<string, mixed>
     */
    private static function expandBlock(array $block, array $data, array $scope, array $formatMap, array $namedStyleMap = []): array
    {
        $out = [];
        foreach ($block as $key => $value) {
            if ($key === 'dataBinding') {
                continue; // consumido — não vai para a saída
            }
            if (($key === 'children' || $key === 'flow') && is_array($value)) {
                // v2: `children` (filhos de stripe/coluna). v3: `flow` (FlowNodes de
                // Section/Group/coluna). Ambos são listas de nós que repetem/resolvem.
                $out[$key] = self::expandList($value, $data, $scope, $formatMap, $namedStyleMap);
            } elseif ($key === 'columns' && is_array($value)) {
                $out[$key] = array_map(function ($col) use ($data, $scope, $formatMap, $namedStyleMap) {
                    if (! is_array($col)) {
                        return $col;
                    }
                    // v3: a coluna tem `flow`; v2: tem `children`.
                    $childKey = (isset($col['flow']) && is_array($col['flow'])) ? 'flow' : 'children';
                    $children = $col[$childKey] ?? [];
                    $rest = $col;
                    unset($rest[$childKey]);
                    $rest = BindingResolver::resolve($rest, $scope, $formatMap);
                    $rest[$childKey] = is_array($children) ? self::expandList($children, $data, $scope, $formatMap, $namedStyleMap) : $children;
                    return $rest;
                }, $value);
            } else {
                // content (TipTap), props de plugin, url, src, etc. → resolve no escopo.
                $out[$key] = BindingResolver::resolve($value, $scope, $formatMap);
            }
        }
        return $out;
    }

    /**
     * Lista de registros para o modo repeat (a partir da fonte do vínculo).
     *
     * @return list<mixed>
     */
    private static function records(array $data, array $binding, array $scope): array
    {
        $sourceId = $binding['sourceId'] ?? null;
        if ($sourceId === null) {
            return [];
        }
        $records = BindingResolver::dotGetRaw($data, (string) $sourceId);
        return is_array($records) ? array_values($records) : [];
    }

    /**
     * Registro para o modo single: `recordId` na fonte, ou o escopo herdado.
     *
     * @return array<string, mixed>
     */
    private static function singleRecord(array $data, array $binding, array $scope): array
    {
        $sourceId = $binding['sourceId'] ?? null;
        $recordId = $binding['recordId'] ?? null;

        // Registro fixo por id: só tenta o `recordId`; se não achar, cai no escopo
        // herdado (igual ao client, que deixa `record = null` quando o id não casa).
        if ($sourceId !== null && $recordId !== null) {
            $records = BindingResolver::dotGetRaw($data, (string) $sourceId);
            if (is_array($records)) {
                foreach ($records as $rec) {
                    if (is_array($rec) && ($rec['__id'] ?? null) === $recordId) {
                        return $rec;
                    }
                }
            }
            return $scope;
        }

        // Single SEM recordId: espelha o client (preview.ts useBindingScope). O escopo
        // herdado só vale se PERTENCE ao contrato do vínculo (preview global do mesmo
        // contrato é achatado no topo por buildExportData). Se for de OUTRO contrato,
        // cai no 1º registro da fonte do vínculo — como o client faz com
        // `source?.records[0]`. Sem isso, o servidor resolvia contra dados alheios.
        if ($sourceId !== null) {
            $records = BindingResolver::dotGetRaw($data, (string) $sourceId);
            if (is_array($records) && $records !== [] && ! self::scopeBelongsToSource($scope, $records)) {
                $first = $records[array_key_first($records)] ?? null;
                if (is_array($first)) {
                    return $first;
                }
            }
        }

        // fallback: o escopo herdado (registro do repeat pai, ou preview do mesmo contrato).
        return $scope;
    }

    /**
     * `true` quando o `$scope` é um registro do contrato de `$records` — heurística
     * por presença de campos: o escopo contém TODOS os campos (exceto `__id`) do 1º
     * registro da fonte. No topo, o preview global é achatado como esses campos
     * (só quando é do mesmo contrato); com outro contrato/sem preview, o escopo é o
     * mapa `data` bruto (chaves = sourceIds) e NÃO tem os campos → `false`.
     *
     * @param  array<string, mixed>  $scope
     * @param  list<mixed>  $records
     */
    private static function scopeBelongsToSource(array $scope, array $records): bool
    {
        $first = null;
        foreach ($records as $rec) {
            if (is_array($rec)) {
                $first = $rec;
                break;
            }
        }
        if ($first === null) {
            return false;
        }
        $total = 0;
        foreach ($first as $field => $_) {
            if ($field === '__id') {
                continue;
            }
            $total++;
            if (! array_key_exists($field, $scope)) {
                return false;
            }
        }

        return $total > 0;
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
     * `styles` materializa `styleRef` e deep-merge (patch vence); `props` merge raso.
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
