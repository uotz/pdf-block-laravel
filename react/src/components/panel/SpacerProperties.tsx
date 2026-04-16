import React from 'react';
import { useEditorStore } from '../../store';
import { t } from '../../i18n';
import { Accordion, Slider } from '../ui/Controls';
import type { SpacerBlock } from '../../types';

export function SpacerProperties({ block }: { block: SpacerBlock }) {
  const updateContentBlock = useEditorStore(s => s.updateContentBlock);
  const update = (updates: Partial<SpacerBlock>) => updateContentBlock(block.id, updates);

  return (
    <div>
      <Accordion title={t('panel.config')}>
        <Slider
          label={t('props.height')}
          value={block.height}
          onChange={v => update({ height: v })}
          min={4}
          max={500}
          unit="px"
        />
      </Accordion>
    </div>
  );
}
