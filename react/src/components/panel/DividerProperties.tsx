import React from 'react';
import { useEditorStore } from '../../store';
import { t } from '../../i18n';
import { ColorPicker } from '../ui/ColorPicker';
import { Accordion, Slider, SegmentedControl } from '../ui/Controls';
import type { DividerBlock, ContentAlign } from '../../types';

const LINE_STYLE_OPTS = [
  {
    value: 'solid',
    label: 'Sólida',
    icon: <svg width="28" height="4" viewBox="0 0 28 4"><line x1="0" y1="2" x2="28" y2="2" stroke="currentColor" strokeWidth="2"/></svg>,
  },
  {
    value: 'dashed',
    label: 'Tracejada',
    icon: <svg width="28" height="4" viewBox="0 0 28 4"><line x1="0" y1="2" x2="28" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="6 3"/></svg>,
  },
  {
    value: 'dotted',
    label: 'Pontilhada',
    icon: <svg width="28" height="4" viewBox="0 0 28 4"><line x1="0" y1="2" x2="28" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="2 3" strokeLinecap="round"/></svg>,
  },
  {
    value: 'double',
    label: 'Dupla',
    icon: <svg width="28" height="6" viewBox="0 0 28 6"><line x1="0" y1="1" x2="28" y2="1" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="28" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
];

export function DividerProperties({ block }: { block: DividerBlock }) {
  const updateContentBlock = useEditorStore(s => s.updateContentBlock);
  const update = (updates: Partial<DividerBlock>) => updateContentBlock(block.id, updates);

  return (
    <div>
      <Accordion title={t('panel.config')}>
        <SegmentedControl
          label={t('divider.style')}
          value={block.lineStyle}
          onChange={v => update({ lineStyle: v as DividerBlock['lineStyle'] })}
          options={LINE_STYLE_OPTS}
          columns={2}
        />
        <Slider
          label={t('divider.thickness')}
          value={block.thickness}
          onChange={v => update({ thickness: v })}
          min={1}
          max={10}
          unit="px"
        />
        <ColorPicker
          label={t('divider.color')}
          value={block.color}
          onChange={v => update({ color: v })}
        />
        <Slider
          label={t('divider.widthPercent')}
          value={block.widthPercent}
          onChange={v => update({ widthPercent: v })}
          min={10}
          max={100}
          unit="%"
        />
        <SegmentedControl
          label={t('props.alignment')}
          value={block.alignment}
          onChange={v => update({ alignment: v as ContentAlign })}
          columns={3}
          iconOnly
          options={[
            {
              value: 'left', label: 'Esquerda',
              icon: <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                <line x1="1" y1="2" x2="15" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="1" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
                <line x1="1" y1="10" x2="12" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
              </svg>,
            },
            {
              value: 'center', label: 'Centro',
              icon: <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                <line x1="1" y1="2" x2="15" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="3" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
                <line x1="2.5" y1="10" x2="13.5" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
              </svg>,
            },
            {
              value: 'right', label: 'Direita',
              icon: <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                <line x1="1" y1="2" x2="15" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="6" y1="6" x2="15" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
                <line x1="4" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
              </svg>,
            },
          ]}
        />
      </Accordion>
    </div>
  );
}
