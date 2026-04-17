import React from 'react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { useEditorStore } from '../../store';
import { t } from '../../i18n';
import { ColorPicker } from '../ui/ColorPicker';
import { Accordion, TextInput, Slider, FontWeightPicker, SegmentedControl, CornerRadiusControl } from '../ui/Controls';
import type { ButtonBlock, ContentAlign, FontWeight } from '../../types';

// ─── Main component ───────────────────────────────────────────
export function ButtonProperties({ block }: { block: ButtonBlock }) {
  const updateContentBlock = useEditorStore(s => s.updateContentBlock);
  const update = (updates: Partial<ButtonBlock>) => updateContentBlock(block.id, updates);

  const LAYOUT_OPTS = [
    { value: 'left',   icon: <AlignLeft  size={14} />, label: 'Esq' },
    { value: 'center', icon: <AlignCenter size={14} />, label: 'Centro' },
    { value: 'right',  icon: <AlignRight size={14} />, label: 'Dir' },
    {
      value: '_full',
      label: 'Total',
      icon: (
        <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
          <rect x="0.75" y="0.75" width="16.5" height="8.5" rx="1.5"
            stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15"/>
        </svg>
      ),
    },
  ];
  const layoutValue = block.fullWidth ? '_full' : block.alignment;
  const handleLayout = (v: string) => {
    if (v === '_full') update({ fullWidth: true });
    else update({ fullWidth: false, alignment: v as ContentAlign });
  };

  return (
    <div>
      {/* ── Configuração ── */}
      <Accordion title={t('panel.config')}>
        <TextInput
          label={t('button.text')}
          value={block.text}
          onChange={v => update({ text: v })}
        />
        <TextInput
          label={t('button.url')}
          value={block.url}
          onChange={v => update({ url: v })}
          placeholder="https://..."
        />
        <SegmentedControl
          value={block.target}
          onChange={v => update({ target: v as '_self' | '_blank' })}
          columns={2}
          options={[
            {
              value: '_self', label: 'Mesma aba',
              icon: <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
                <rect x="1" y="1" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                <path d="M5 7h6M8 4.5l2.5 2.5L8 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>,
            },
            {
              value: '_blank', label: 'Nova aba',
              icon: <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
                <rect x="1" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                <path d="M8 1h6v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8.5 6.5L14 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>,
            },
          ]}
        />
        <SegmentedControl
          label="Layout"
          value={layoutValue}
          onChange={handleLayout}
          options={LAYOUT_OPTS}
          columns={4}
        />
      </Accordion>

      {/* ── Tipografia ── */}
      <Accordion title={t('props.font')}>
        <Slider
          label={t('props.fontSize')}
          value={block.fontSize}
          onChange={v => update({ fontSize: v })}
          min={8}
          max={72}
          unit="px"
        />
        <FontWeightPicker
          value={block.fontWeight}
          onChange={v => update({ fontWeight: v as FontWeight })}
        />
        <ColorPicker
          label={t('props.fontColor')}
          value={block.fontColor}
          onChange={v => update({ fontColor: v })}
        />
      </Accordion>

      {/* ── Aparência ── */}
      <Accordion title={t('button.appearance')}>
        <ColorPicker
          label={t('props.backgroundColor')}
          value={block.bgColor}
          onChange={v => update({ bgColor: v })}
        />
        <CornerRadiusControl
          value={block.borderRadius}
          onChange={v => update({ borderRadius: v })}
          max={50}
        />
        <div className="pdfb-field">
          <div className="pdfb-btn-border-header">
            <span className="pdfb-label">Borda</span>
            <div className="pdfb-btn-border-width">
              <input
                type="number"
                className="pdfb-input pdfb-btn-border-width-input"
                value={block.borderWidth}
                min={0}
                max={10}
                onChange={e => update({ borderWidth: Math.max(0, Math.min(10, Number(e.target.value))) })}
              />
              <span className="pdfb-btn-border-unit">px</span>
            </div>
          </div>
          {block.borderWidth > 0 && (
            <div style={{ marginTop: 6 }}>
              <ColorPicker value={block.borderColor} onChange={v => update({ borderColor: v })} />
            </div>
          )}
        </div>
      </Accordion>
    </div>
  );
}
