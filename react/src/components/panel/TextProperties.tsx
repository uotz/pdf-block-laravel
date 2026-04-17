import React from 'react';
import { useEditorStore } from '../../store';
import { t } from '../../i18n';
import { ColorPicker } from '../ui/ColorPicker';
import { Accordion, Slider, FontWeightPicker, SegmentedControl } from '../ui/Controls';
import type { TextBlock, FontWeight, TextTransform, TextAlign, ContentAlign } from '../../types';

// Alignment icons (line-based, same pattern as ImageProperties)
const ALIGN_OPTS = [
  {
    value: 'left', label: 'Esquerda',
    icon: <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
      <rect x="0" y="0" width="11" height="2" rx="1" fill="currentColor"/>
      <rect x="0" y="5" width="16" height="2" rx="1" fill="currentColor" opacity="0.4"/>
      <rect x="0" y="10" width="8" height="2" rx="1" fill="currentColor" opacity="0.4"/>
    </svg>,
  },
  {
    value: 'center', label: 'Centro',
    icon: <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
      <rect x="3.5" y="0" width="11" height="2" rx="1" fill="currentColor"/>
      <rect x="1" y="5" width="16" height="2" rx="1" fill="currentColor" opacity="0.4"/>
      <rect x="5" y="10" width="8" height="2" rx="1" fill="currentColor" opacity="0.4"/>
    </svg>,
  },
  {
    value: 'right', label: 'Direita',
    icon: <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
      <rect x="7" y="0" width="11" height="2" rx="1" fill="currentColor"/>
      <rect x="2" y="5" width="16" height="2" rx="1" fill="currentColor" opacity="0.4"/>
      <rect x="10" y="10" width="8" height="2" rx="1" fill="currentColor" opacity="0.4"/>
    </svg>,
  },
  {
    value: 'justify', label: 'Justificar',
    icon: <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
      <rect x="0" y="0" width="18" height="2" rx="1" fill="currentColor"/>
      <rect x="0" y="5" width="18" height="2" rx="1" fill="currentColor" opacity="0.4"/>
      <rect x="0" y="10" width="12" height="2" rx="1" fill="currentColor" opacity="0.4"/>
    </svg>,
  },
];

// Text transform — icon-only buttons (label used as tooltip)
const TEXT_TRANSFORM_OPTS = [
  {
    value: 'none',
    label: 'Original',
    icon: <span style={{ fontSize: 11, fontWeight: 500, fontStyle: 'italic', lineHeight: 1 }}>Ag</span>,
  },
  {
    value: 'uppercase',
    label: 'Maiúsculas',
    icon: <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1 }}>AA</span>,
  },
  {
    value: 'lowercase',
    label: 'Minúsculas',
    icon: <span style={{ fontSize: 11, fontWeight: 400, lineHeight: 1 }}>aa</span>,
  },
  {
    value: 'capitalize',
    label: 'Capitalizar',
    icon: (
      <span style={{ lineHeight: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>A</span>
        <span style={{ fontSize: 9, fontWeight: 400 }}>a</span>
      </span>
    ),
  },
];

export function TextProperties({ block }: { block: TextBlock }) {
  const updateContentBlock = useEditorStore(s => s.updateContentBlock);
  const defaultFontColor = useEditorStore(s => s.document.globalStyles.defaultFontColor);
  const update = (updates: Partial<TextBlock>) => updateContentBlock(block.id, updates);

  return (
    <div>
      <Accordion title={t('props.font')}>
        <Slider
          label={t('props.fontSize')}
          value={block.fontSize}
          onChange={v => update({ fontSize: v })}
          min={8}
          max={120}
          unit="px"
        />
        <FontWeightPicker
          value={block.fontWeight}
          onChange={v => update({ fontWeight: v as FontWeight })}
        />
        <ColorPicker
          label={t('props.fontColor')}
          value={block.fontColor || defaultFontColor}
          onChange={v => update({ fontColor: v })}
        />
      </Accordion>

      <Accordion title={t('props.paragraph')}>
        <SegmentedControl
          label={t('props.textAlign')}
          value={block.textAlign}
          onChange={v => update({ textAlign: v as TextAlign })}
          options={ALIGN_OPTS}
          columns={4}
          iconOnly
        />
        <Slider
          label={t('props.lineHeight')}
          value={Math.round(block.lineHeight * 10)}
          onChange={v => update({ lineHeight: v / 10 })}
          min={8}
          max={40}
          unit=""
        />
        <Slider
          label={t('props.letterSpacing')}
          value={block.letterSpacing}
          onChange={v => update({ letterSpacing: v })}
          min={-5}
          max={20}
          unit="px"
        />
        <SegmentedControl
          label={t('props.textTransform')}
          value={block.textTransform}
          onChange={v => update({ textTransform: v as TextTransform })}
          options={TEXT_TRANSFORM_OPTS}
          columns={4}
          iconOnly
        />
      </Accordion>
    </div>
  );
}
