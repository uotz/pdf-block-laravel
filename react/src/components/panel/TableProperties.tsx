import React from 'react';
import { useEditorStore } from '../../store';
import { Accordion, Toggle } from '../ui/Controls';
import { NumberInput } from '../ui/NumberInput';
import { ColorPicker } from '../ui/ColorPicker';
import type { TableBlock } from '../../types';

export function TableProperties({ block }: { block: TableBlock }) {
  const updateContentBlock = useEditorStore(s => s.updateContentBlock);
  const update = (updates: Partial<TableBlock>) =>
    updateContentBlock(block.id, updates as Parameters<typeof updateContentBlock>[1]);

  const rows = block.rows;
  const rowCount = rows.length;
  const colCount = rows[0]?.length ?? 0;

  // ── Structural helpers ──────────────────────────────────────
  const handleRowChange = (v: number) => {
    const next = Math.max(1, v);
    if (next === rowCount) return;
    if (next > rowCount) {
      const more = Array.from({ length: next - rowCount }, () => Array(colCount).fill(''));
      update({ rows: [...rows, ...more] });
    } else {
      update({ rows: rows.slice(0, next) });
    }
  };

  const handleColChange = (v: number) => {
    const next = Math.max(1, v);
    if (next === colCount) return;
    if (next > colCount) {
      update({ rows: rows.map(row => [...row, ...Array(next - colCount).fill('')]) });
    } else {
      update({ rows: rows.map(row => row.slice(0, next)) });
    }
  };

  return (
    <div>
      {/* ── Estrutura ── */}
      <Accordion title="Estrutura" defaultOpen>
        <NumberInput
          label="Linhas"
          value={rowCount}
          onChange={handleRowChange}
          min={1}
          max={100}
          step={1}
        />
        <NumberInput
          label="Colunas"
          value={colCount}
          onChange={handleColChange}
          min={1}
          max={20}
          step={1}
        />
        <Toggle
          label="Linha de cabeçalho"
          value={block.headerRow}
          onChange={v => update({ headerRow: v })}
        />
        <Toggle
          label="Linhas alternadas"
          value={block.stripedRows}
          onChange={v => update({ stripedRows: v })}
        />
      </Accordion>

      {/* ── Tipografia e células ── */}
      <Accordion title="Células">
        <div className="pdfb-field">
          <span className="pdfb-label">Fonte</span>
          <input
            className="pdfb-input"
            value={block.fontFamily}
            onChange={e => update({ fontFamily: e.target.value })}
          />
        </div>
        <NumberInput
          label="Tamanho da fonte"
          value={block.fontSize}
          onChange={v => update({ fontSize: v })}
          min={8}
          max={48}
          unit="px"
        />
        <ColorPicker
          label="Cor do texto"
          value={block.fontColor}
          onChange={v => update({ fontColor: v })}
        />
        <NumberInput
          label="Espaçamento interno"
          value={block.cellPadding}
          onChange={v => update({ cellPadding: v })}
          min={0}
          max={60}
          unit="px"
        />
      </Accordion>

      {/* ── Bordas ── */}
      <Accordion title="Bordas">
        <NumberInput
          label="Espessura"
          value={block.borderWidth}
          onChange={v => update({ borderWidth: v })}
          min={0}
          max={10}
          unit="px"
        />
        <ColorPicker
          label="Cor da borda"
          value={block.borderColor}
          onChange={v => update({ borderColor: v })}
        />
      </Accordion>

      {/* ── Cabeçalho ── */}
      {block.headerRow && (
        <Accordion title="Cabeçalho">
          <ColorPicker
            label="Fundo do cabeçalho"
            value={block.headerBgColor}
            onChange={v => update({ headerBgColor: v })}
          />
          <ColorPicker
            label="Texto do cabeçalho"
            value={block.headerFontColor}
            onChange={v => update({ headerFontColor: v })}
          />
        </Accordion>
      )}

      {/* ── Linhas alternadas ── */}
      {block.stripedRows && (
        <Accordion title="Linhas alternadas">
          <ColorPicker
            label="Cor alternada"
            value={block.stripedColor}
            onChange={v => update({ stripedColor: v })}
          />
        </Accordion>
      )}
    </div>
  );
}
