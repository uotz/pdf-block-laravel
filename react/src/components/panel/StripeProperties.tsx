import React from 'react';
import { useEditorStore } from '../../store';
import { t } from '../../i18n';
import { ColorPicker } from '../ui/ColorPicker';
import { NumberInput } from '../ui/NumberInput';
import { Accordion, EdgeInput, SegmentedControl } from '../ui/Controls';
import type { StripeBlock, ContentAlign, SolidBackground } from '../../types';

export function StripeProperties({ stripe }: { stripe: StripeBlock }) {
  const updateStripe = useEditorStore(s => s.updateStripe);
  const updateBlockStyles = useEditorStore(s => s.updateBlockStyles);
  const update = (updates: Partial<StripeBlock>) => updateStripe(stripe.id, updates);

  const bgColor = stripe.styles.background.type === 'solid'
    ? (stripe.styles.background as SolidBackground).color
    : 'transparent';

  return (
    <div>
      <Accordion title={t('props.background')}>
        <ColorPicker
          label={t('props.backgroundColor')}
          value={bgColor}
          onChange={v => updateBlockStyles(stripe.id, {
            background: { type: 'solid', color: v },
          })}
        />
      </Accordion>

      <Accordion title="Layout">
        <NumberInput
          label={t('stripe.contentWidth')}
          value={stripe.contentMaxWidth}
          onChange={v => update({ contentMaxWidth: v })}
          min={200}
          max={1200}
          unit="px"
        />
        <SegmentedControl
          label={t('stripe.contentAlign')}
          value={stripe.contentAlignment}
          onChange={v => update({ contentAlignment: v as ContentAlign })}
          columns={3}
          iconOnly
          options={[
            {
              value: 'left', label: 'Esquerda',
              icon: <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                <rect x="1" y="1" width="9" height="10" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2"/>
                <rect x="12" y="1" width="3" height="10" rx="1" fill="currentColor" opacity="0.25"/>
              </svg>,
            },
            {
              value: 'center', label: 'Centro',
              icon: <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                <rect x="1" y="1" width="3" height="10" rx="1" fill="currentColor" opacity="0.25"/>
                <rect x="5.5" y="1" width="5" height="10" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2"/>
                <rect x="12" y="1" width="3" height="10" rx="1" fill="currentColor" opacity="0.25"/>
              </svg>,
            },
            {
              value: 'right', label: 'Direita',
              icon: <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                <rect x="1" y="1" width="3" height="10" rx="1" fill="currentColor" opacity="0.25"/>
                <rect x="6" y="1" width="9" height="10" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2"/>
              </svg>,
            },
          ]}
        />
      </Accordion>

      <Accordion title={t('props.padding')}>
        <EdgeInput
          label={t('props.padding')}
          value={stripe.styles.padding}
          onChange={v => updateBlockStyles(stripe.id, { padding: v })}
        />
      </Accordion>
    </div>
  );
}
