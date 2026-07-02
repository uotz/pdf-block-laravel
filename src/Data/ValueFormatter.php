<?php

declare(strict_types=1);

namespace PdfBlock\Laravel\Data;

/**
 * Formatação de valores por `format` do contrato — espelho EXATO do
 * `packages/react/src/data/format.ts` (client).
 *
 * Aplicada ao resolver bindings, com base no `format` do `ContractField`:
 *  - `date:dd/MM/yyyy` · `datetime:dd/MM/yyyy HH:mm`
 *  - `number:2` · `currency:BRL` · `percent:1`
 *
 * A formatação numérica é MANUAL (padrão pt-BR: milhar `.`, decimal `,`) e as
 * datas usam UTC — garantindo paridade com o client (sem `Intl`/fuso local).
 *
 * Nota de paridade: valores de data/hora SEM timezone devem vir como data pura
 * (`yyyy-mm-dd`) ou com `Z`/offset — o JS interpreta date-time sem fuso como
 * horário local, o que pode divergir do UTC assumido aqui.
 */
class ValueFormatter
{
    private const CURRENCY = ['BRL' => 'R$', 'USD' => '$', 'EUR' => '€', 'GBP' => '£'];

    /**
     * Mapa `path → format` a partir dos contratos do payload (campos com `format`).
     *
     * @param  array<int, array<string, mixed>>  $contracts
     * @return array<string, string>
     */
    public static function buildMap(array $contracts): array
    {
        $out = [];
        foreach ($contracts as $contract) {
            if (! is_array($contract)) {
                continue;
            }
            foreach (($contract['fields'] ?? []) as $field) {
                if (is_array($field) && ! empty($field['format']) && isset($field['key'])) {
                    $out[(string) $field['key']] = (string) $field['format'];
                }
            }
        }
        return $out;
    }

    /** Converte escalar em string; arrays/objetos → '' (espelha o JS `scalarString`). */
    public static function scalarString(mixed $value): string
    {
        if ($value === null || is_array($value)) {
            return '';
        }
        if (is_bool($value)) {
            return $value ? 'true' : 'false'; // paridade com JS `String(bool)`
        }
        return (string) $value;
    }

    /** Aplica o `format` a um valor; sem `format`, retorna o valor escalar como string. */
    public static function format(mixed $value, ?string $format): string
    {
        if ($format === null || $format === '') {
            return self::scalarString($value);
        }
        [$kind, $arg] = self::split($format);
        return match ($kind) {
            'date'     => self::formatDate($value, $arg !== '' ? $arg : 'dd/MM/yyyy'),
            'datetime' => self::formatDate($value, $arg !== '' ? $arg : 'dd/MM/yyyy HH:mm'),
            'number'   => self::formatNumber($value, $arg !== '' ? (int) $arg : 0),
            'currency' => self::formatCurrency($value, $arg !== '' ? $arg : 'BRL'),
            'percent'  => self::formatNumber($value, $arg !== '' ? (int) $arg : 0) . '%',
            default    => self::scalarString($value),
        };
    }

    /** @return array{0: string, 1: string} */
    private static function split(string $format): array
    {
        $i = strpos($format, ':');
        return $i === false
            ? [trim($format), '']
            : [trim(substr($format, 0, $i)), trim(substr($format, $i + 1))];
    }

    private static function toNumber(mixed $value): ?float
    {
        if (is_int($value) || is_float($value)) {
            return is_finite((float) $value) ? (float) $value : null;
        }
        if (is_string($value) && trim($value) !== '') {
            $s = str_replace(',', '.', $value);
            return is_numeric($s) ? (float) $s : null;
        }
        return null;
    }

    private static function formatNumber(mixed $value, int $decimals): string
    {
        $n = self::toNumber($value);
        if ($n === null) {
            return self::scalarString($value);
        }
        $fixed = number_format(abs($n), max(0, $decimals), '.', '');
        [$int, $dec] = array_pad(explode('.', $fixed), 2, '');
        $grouped = preg_replace('/\B(?=(\d{3})+(?!\d))/', '.', $int) ?? $int;
        return ($n < 0 ? '-' : '') . $grouped . ($dec !== '' ? ',' . $dec : '');
    }

    private static function formatCurrency(mixed $value, string $code): string
    {
        $n = self::toNumber($value);
        if ($n === null) {
            return self::scalarString($value);
        }
        $symbol = self::CURRENCY[strtoupper($code)] ?? strtoupper($code);
        return $symbol . ' ' . self::formatNumber($n, 2);
    }

    private static function formatDate(mixed $value, string $pattern): string
    {
        $d = self::toDate($value);
        if ($d === null) {
            return self::scalarString($value);
        }
        $map = [
            'yyyy' => $d->format('Y'),
            'yy'   => $d->format('y'),
            'MM'   => $d->format('m'),
            'dd'   => $d->format('d'),
            'HH'   => $d->format('H'),
            'mm'   => $d->format('i'),
            'ss'   => $d->format('s'),
        ];
        return preg_replace_callback('/yyyy|yy|MM|dd|HH|mm|ss/', fn (array $m) => $map[$m[0]] ?? $m[0], $pattern) ?? $pattern;
    }

    private static function toDate(mixed $value): ?\DateTimeImmutable
    {
        if ($value instanceof \DateTimeInterface) {
            return \DateTimeImmutable::createFromInterface($value)->setTimezone(new \DateTimeZone('UTC'));
        }
        if (is_int($value) || is_float($value)) {
            // JS `new Date(number)` = milissegundos desde a epoch.
            return (new \DateTimeImmutable('@' . (int) floor(((float) $value) / 1000)))->setTimezone(new \DateTimeZone('UTC'));
        }
        if (is_string($value) && trim($value) !== '') {
            try {
                return new \DateTimeImmutable($value, new \DateTimeZone('UTC'));
            } catch (\Exception) {
                return null;
            }
        }
        return null;
    }
}
