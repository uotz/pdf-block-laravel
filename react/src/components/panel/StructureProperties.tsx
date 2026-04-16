import React, { useCallback, useRef, useState } from 'react';
import { Upload, Images, X } from 'lucide-react';
import { useEditorStore } from '../../store';
import { useEditorConfig } from '../EditorConfig';
import { useImageLibrary, processFile, libraryStore } from '../ImageLibrary';
import { t } from '../../i18n';
import { NumberInput } from '../ui/NumberInput';
import { SegmentedControl, Accordion, ColumnGrid, Slider } from '../ui/Controls';
import { ColorPicker } from '../ui/ColorPicker';
import type { StructureBlock, VerticalAlign } from '../../types';

// ─── Position icon helper ─────────────────────────────────────
function PosIcon({ hx, hy }: { hx: 'left' | 'center' | 'right'; hy: 'top' | 'center' | 'bottom' }) {
  const cx = hx === 'left' ? 3 : hx === 'center' ? 8 : 13;
  const cy = hy === 'top' ? 3 : hy === 'center' ? 8 : 13;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <circle cx={cx} cy={cy} r="2.5" fill="currentColor"/>
    </svg>
  );
}

export function StructureProperties({ structure, stripeId }: { structure: StructureBlock; stripeId: string }) {
  const updateStructure = useEditorStore(s => s.updateStructure);
  const addColumn = useEditorStore(s => s.addColumn);
  const removeColumn = useEditorStore(s => s.removeColumn);
  const updateColumnWidth = useEditorStore(s => s.updateColumnWidth);
  const config = useEditorConfig();
  const { openLibrary } = useImageLibrary();

  const isBanner = structure.variant === 'banner';
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const update = useCallback((updates: Partial<StructureBlock>) => updateStructure(stripeId, structure.id, updates),
    [updateStructure, stripeId, structure.id]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const img = await processFile(file, config.onUploadImage);
      libraryStore.add(img);
      update({ backgroundImage: img.url });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.onUploadImage, structure.id]);

  // Handle interactive column count change
  const handleColumnCountChange = useCallback((count: number) => {
    const current = structure.columns.length;
    if (count === current) return;
    if (count > current) {
      for (let i = current; i < count; i++) addColumn(stripeId, structure.id);
    } else {
      const cols = [...structure.columns];
      for (let i = current - 1; i >= count; i--) removeColumn(stripeId, structure.id, cols[i].id);
    }
  }, [structure.columns, stripeId, structure.id, addColumn, removeColumn]);

  const positionOptions = [
    { value: 'left top',      label: 'Topo esquerda',  icon: <PosIcon hx="left"   hy="top"    /> },
    { value: 'center top',    label: 'Topo centro',    icon: <PosIcon hx="center" hy="top"    /> },
    { value: 'right top',     label: 'Topo direita',   icon: <PosIcon hx="right"  hy="top"    /> },
    { value: 'left center',   label: 'Meio esquerda',  icon: <PosIcon hx="left"   hy="center" /> },
    { value: 'center center', label: 'Centro',         icon: <PosIcon hx="center" hy="center" /> },
    { value: 'right center',  label: 'Meio direita',   icon: <PosIcon hx="right"  hy="center" /> },
    { value: 'left bottom',   label: 'Base esquerda',  icon: <PosIcon hx="left"   hy="bottom" /> },
    { value: 'center bottom', label: 'Base centro',    icon: <PosIcon hx="center" hy="bottom" /> },
    { value: 'right bottom',  label: 'Base direita',   icon: <PosIcon hx="right"  hy="bottom" /> },
  ];

  return (
    <div>
      {/* ── Banner-specific: background image ── */}
      {isBanner && (
        <>
          <div className="pdfb-panel-header">Banner</div>

          <Accordion title="Imagem de fundo" defaultOpen>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {/* Preview */}
            {structure.backgroundImage && (
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <img
                  src={structure.backgroundImage}
                  alt="preview"
                  style={{
                    width: '100%', maxHeight: 100, objectFit: 'cover',
                    borderRadius: 'var(--pdfb-radius-md)',
                    border: '1px solid var(--pdfb-border-color)',
                    background: 'var(--pdfb-color-surface)',
                    display: 'block',
                  }}
                />
                <button
                  type="button"
                  title="Remover imagem"
                  onClick={() => update({ backgroundImage: '' })}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    background: 'var(--pdfb-color-scrim)', border: 'none',
                    borderRadius: 4, padding: '2px 4px', cursor: 'pointer',
                    color: 'var(--pdfb-color-overlay-text)', display: 'flex', alignItems: 'center',
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
              <button
                type="button"
                className="pdfb-img-upload-btn"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Upload size={14} />
                {uploading ? 'Enviando…' : 'Enviar do computador'}
              </button>
              <button
                type="button"
                className="pdfb-img-upload-btn pdfb-img-upload-btn--secondary"
                onClick={() => openLibrary({ onSelect: v => update({ backgroundImage: v }) })}
              >
                <Images size={14} />
                Biblioteca de imagens
              </button>
            </div>

            <NumberInput
              label="Altura mínima"
              value={structure.minHeight ?? 300}
              onChange={v => update({ minHeight: v })}
              min={60}
              max={2000}
              step={5}
              unit="px"
            />

            <SegmentedControl
              label="Tamanho"
              value={structure.backgroundSize ?? 'cover'}
              onChange={v => update({ backgroundSize: v as StructureBlock['backgroundSize'] })}
              columns={3}
              iconOnly
              options={[
                {
                  value: 'cover', label: 'Cobrir',
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="1" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
                      <rect x="1" y="1" width="14" height="14" rx="1.5" fill="currentColor" opacity="0.15"/>
                      <rect x="3" y="3" width="10" height="10" rx="1" fill="currentColor" opacity="0.7"/>
                    </svg>
                  ),
                },
                {
                  value: 'contain', label: 'Conter',
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="1" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
                      <rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" opacity="0.7"/>
                    </svg>
                  ),
                },
                {
                  value: 'auto', label: 'Mosaico',
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="1" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
                      <rect x="2" y="2" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.6"/>
                      <rect x="9" y="2" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.6"/>
                      <rect x="2" y="9" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.6"/>
                      <rect x="9" y="9" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.6"/>
                    </svg>
                  ),
                },
              ]}
            />

            <SegmentedControl
              label="Posição"
              value={structure.backgroundPosition ?? 'center center'}
              onChange={v => update({ backgroundPosition: v })}
              columns={3}
              iconOnly
              options={positionOptions}
            />
          </Accordion>

          <Accordion title="Overlay" defaultOpen>
            <ColorPicker
              label="Cor do overlay"
              value={structure.overlayColor ?? '#000000'}
              onChange={v => update({ overlayColor: v })}
            />
            <Slider
              label="Opacidade"
              value={Math.round((structure.overlayOpacity ?? 0) * 100)}
              onChange={v => update({ overlayOpacity: v / 100 })}
              min={0}
              max={100}
              unit="%"
            />
          </Accordion>
        </>
      )}

      {/* ── Columns (hidden for banner) ── */}
      {!isBanner && (
        <Accordion title={t('structure.columns')}>
          <ColumnGrid
            count={structure.columns.length}
            max={12}
            onChange={handleColumnCountChange}
            label="Quantidade de colunas"
          />
          <div style={{
            display: 'flex', gap: 2, height: 36, margin: '12px 0',
            border: '1px solid var(--pdfb-border-color)', borderRadius: 6, overflow: 'hidden',
          }}>
            {structure.columns.map((col, i) => (
              <div key={col.id} style={{
                flex: col.width,
                background: 'var(--pdfb-color-accent-light)',
                borderRight: i < structure.columns.length - 1 ? '1px solid var(--pdfb-border-color)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: 'var(--pdfb-color-accent)', fontWeight: 500,
              }}>
                {Math.round(col.width)}%
              </div>
            ))}
          </div>
          {structure.columns.map((col, i) => {
            const otherCols = structure.columns.filter(c => c.id !== col.id);
            const sliderMax = Math.max(5, 100 - otherCols.length * 5);
            return (
              <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--pdfb-color-text-secondary)', minWidth: 40, flexShrink: 0 }}>
                  Col {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <input
                    type="range"
                    min={5}
                    max={sliderMax}
                    value={Math.round(col.width)}
                    onChange={e => updateColumnWidth(stripeId, structure.id, col.id, Number(e.target.value))}
                    style={{ width: '100%', height: 4, accentColor: 'var(--pdfb-color-accent)' }}
                  />
                </div>
                <span style={{ fontSize: 11, color: 'var(--pdfb-color-text-secondary)', minWidth: 32, textAlign: 'right' }}>
                  {Math.round(col.width)}%
                </span>
              </div>
            );
          })}
        </Accordion>
      )}

      {/* ── Layout ── */}
      <Accordion title="Layout">
        {!isBanner && (
          <Slider
            label={t('structure.gap')}
            value={structure.columnGap}
            onChange={v => update({ columnGap: v })}
            min={0}
            max={60}
            unit="px"
          />
        )}
        <SegmentedControl
          label={t('structure.verticalAlign')}
          value={structure.verticalAlignment}
          onChange={v => update({ verticalAlignment: v as VerticalAlign })}
          columns={3}
          iconOnly
          options={[
            {
              value: 'top', label: t('misc.top'),
              icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="1" width="12" height="1.5" rx="0.75" fill="currentColor"/>
                <rect x="5" y="4" width="6" height="2" rx="1" fill="currentColor" opacity="0.7"/>
                <rect x="5" y="7.5" width="6" height="2" rx="1" fill="currentColor" opacity="0.4"/>
                <rect x="5" y="11" width="6" height="2" rx="1" fill="currentColor" opacity="0.2"/>
              </svg>,
            },
            {
              value: 'center', label: 'Centro',
              icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="2" width="6" height="2" rx="1" fill="currentColor" opacity="0.4"/>
                <rect x="5" y="6" width="6" height="2" rx="1" fill="currentColor" opacity="0.8"/>
                <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor" opacity="0.3"/>
                <rect x="5" y="10" width="6" height="2" rx="1" fill="currentColor" opacity="0.4"/>
              </svg>,
            },
            {
              value: 'bottom', label: t('misc.bottom'),
              icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="3" width="6" height="2" rx="1" fill="currentColor" opacity="0.2"/>
                <rect x="5" y="6.5" width="6" height="2" rx="1" fill="currentColor" opacity="0.4"/>
                <rect x="5" y="10" width="6" height="2" rx="1" fill="currentColor" opacity="0.7"/>
                <rect x="2" y="13.5" width="12" height="1.5" rx="0.75" fill="currentColor"/>
              </svg>,
            },
          ]}
        />
      </Accordion>
    </div>
  );
}
