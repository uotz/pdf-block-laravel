import React from 'react';
import { useEditorStore } from '../../store';
import { t } from '../../i18n';
import { ColorPicker } from '../ui/ColorPicker';
import { Accordion, SpacingControl, SegmentedControl, Slider, CornerRadiusControl } from '../ui/Controls';
import type { AnyBlock, BlockStyles, BorderSide, SolidBackground, BorderStyle } from '../../types';

export function CommonStylesPanel({ block }: { block: AnyBlock }) {
  const updateBlockStyles = useEditorStore(s => s.updateBlockStyles);

  const styles = block.styles;
  const bgColor = styles.background.type === 'solid'
    ? (styles.background as SolidBackground).color
    : 'transparent';

  const update = (partial: Partial<BlockStyles>) => updateBlockStyles(block.id, partial);

  const updateAllBorders = (partial: Partial<BorderSide>) => {
    update({
      border: {
        top: { ...styles.border.top, ...partial },
        right: { ...styles.border.right, ...partial },
        bottom: { ...styles.border.bottom, ...partial },
        left: { ...styles.border.left, ...partial },
      },
    });
  };

  return (
    <div>
      {/* ─── Espaçamento ─── */}
      <Accordion title={t('props.spacing')}>
        <SpacingControl
          label={t('props.padding')}
          value={styles.padding}
          onChange={v => update({ padding: v })}
        />
        <div style={{ marginTop: 10 }} />
        <SpacingControl
          label={t('props.margin')}
          value={styles.margin}
          onChange={v => update({ margin: v })}
        />
      </Accordion>

      {/* ─── Fundo ─── */}
      <Accordion title={t('props.background')}>
        <ColorPicker
          label={t('props.backgroundColor')}
          value={bgColor}
          onChange={v => update({ background: { type: 'solid', color: v } })}
        />
      </Accordion>

      {/* ─── Borda + Arredondamento ─── */}
      <Accordion title={t('props.border')} defaultOpen={false}>
        <SegmentedControl
          label="Estilo"
          value={styles.border.top.style}
          onChange={v => updateAllBorders({ style: v as BorderStyle })}
          columns={4}
          iconOnly
          options={[
            {
              value: 'none', label: t('misc.none'),
              icon: <svg width="22" height="4" viewBox="0 0 22 4" fill="none"><line x1="2" y1="2" x2="20" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" opacity="0.35"/></svg>,
            },
            {
              value: 'solid', label: t('misc.solid'),
              icon: <svg width="22" height="4" viewBox="0 0 22 4" fill="none"><line x1="1" y1="2" x2="21" y2="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
            },
            {
              value: 'dashed', label: t('misc.dashed'),
              icon: <svg width="22" height="4" viewBox="0 0 22 4" fill="none"><line x1="1" y1="2" x2="21" y2="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 3"/></svg>,
            },
            {
              value: 'dotted', label: t('misc.dotted'),
              icon: <svg width="22" height="4" viewBox="0 0 22 4" fill="none"><circle cx="3" cy="2" r="1.2" fill="currentColor"/><circle cx="9" cy="2" r="1.2" fill="currentColor"/><circle cx="15" cy="2" r="1.2" fill="currentColor"/><circle cx="21" cy="2" r="1.2" fill="currentColor"/></svg>,
            },
          ]}
        />
        {styles.border.top.style !== 'none' && (
          <>
            <Slider
              label="Espessura"
              value={styles.border.top.width}
              onChange={v => updateAllBorders({ width: v })}
              min={0} max={20} unit="px"
            />
            <ColorPicker
              label="Cor da borda"
              value={styles.border.top.color}
              onChange={v => updateAllBorders({ color: v })}
            />
          </>
        )}
        <div style={{ marginTop: 12, borderTop: '1px solid var(--pdfb-border-color)', paddingTop: 10 }}>
          <CornerRadiusControl
            value={styles.borderRadius}
            onChange={v => update({ borderRadius: v })}
          />
        </div>
      </Accordion>

      {/* ─── Opacidade ─── */}
      <Accordion title={t('props.opacity')} defaultOpen={false}>
        <Slider
          label="Transparência"
          value={Math.round(styles.opacity * 100)}
          onChange={v => update({ opacity: v / 100 })}
          min={0} max={100} unit="%"
        />
      </Accordion>
    </div>
  );
}
