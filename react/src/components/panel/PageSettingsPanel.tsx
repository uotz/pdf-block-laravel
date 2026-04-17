import React, { useState, useCallback } from 'react';
import { useEditorStore } from '../../store';
import { t } from '../../i18n';
import { NumberInput } from '../ui/NumberInput';
import { Select, SegmentedControl, Accordion, EdgeInput } from '../ui/Controls';
import { ColorPicker } from '../ui/ColorPicker';
import { FontPicker } from '../ui/FontPicker';
import { PAPER_SIZES } from '../../types';
import type { PaperPreset, Orientation } from '../../types';

export function PageSettingsPanel() {
  const pageSettings   = useEditorStore(s => s.document.pageSettings);
  const globalStyles   = useEditorStore(s => s.document.globalStyles);
  const updatePageSettings  = useEditorStore(s => s.updatePageSettings);
  const updateGlobalStyles  = useEditorStore(s => s.updateGlobalStyles);

  // Track whether page and content background are linked (synced)
  const [bgLinked, setBgLinked] = useState(
    () => (globalStyles.pageBackground || '#ffffff') === (globalStyles.contentBackground || '#ffffff')
  );

  const handlePageBackground = useCallback((v: string) => {
    if (bgLinked) {
      updateGlobalStyles({ pageBackground: v, contentBackground: v });
    } else {
      updateGlobalStyles({ pageBackground: v });
    }
  }, [bgLinked, updateGlobalStyles]);

  const handleContentBackground = useCallback((v: string) => {
    setBgLinked(false);
    updateGlobalStyles({ contentBackground: v });
  }, [updateGlobalStyles]);

  const toggleBgLink = useCallback(() => {
    setBgLinked(prev => {
      if (!prev) {
        // Linking: sync content bg to page bg immediately
        updateGlobalStyles({ contentBackground: globalStyles.pageBackground });
      }
      return !prev;
    });
  }, [globalStyles.pageBackground, updateGlobalStyles]);

  const handlePaperPreset = (preset: string) => {
    if (preset === 'custom') {
      updatePageSettings({ paperSize: { preset: 'custom', width: pageSettings.paperSize.width, height: pageSettings.paperSize.height } });
    } else {
      const dims = PAPER_SIZES[preset as Exclude<PaperPreset, 'custom'>];
      updatePageSettings({ paperSize: { preset: preset as PaperPreset, width: dims.width, height: dims.height } });
    }
  };

  return (
    <div>
      <div className="pdfb-panel-header">{t('toolbar.pageSettings')}</div>

      <Accordion title={t('page.paper')}>
        <Select
          label={t('page.paper')}
          value={pageSettings.paperSize.preset}
          onChange={handlePaperPreset}
          options={[
            { value: 'a4', label: 'A4 (210 × 297mm)' },
            { value: 'a3', label: 'A3 (297 × 420mm)' },
            { value: 'a5', label: 'A5 (148 × 210mm)' },
            { value: 'letter', label: 'Carta (216 × 279mm)' },
            { value: 'legal', label: 'Legal (216 × 356mm)' },
            { value: 'custom', label: 'Personalizado' },
          ]}
        />
        {pageSettings.paperSize.preset === 'custom' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <NumberInput label={t('props.width')}
              value={pageSettings.paperSize.width}
              onChange={v => updatePageSettings({ paperSize: { ...pageSettings.paperSize, width: v } })}
              min={50} max={1000} unit="mm" />
            <NumberInput label={t('props.height')}
              value={pageSettings.paperSize.height}
              onChange={v => updatePageSettings({ paperSize: { ...pageSettings.paperSize, height: v } })}
              min={50} max={2000} unit="mm" />
          </div>
        )}
      </Accordion>

      <Accordion title={t('page.orientation')}>
        <SegmentedControl
          value={pageSettings.orientation}
          onChange={v => updatePageSettings({ orientation: v as Orientation })}
          columns={2}
          options={[
            {
              value: 'portrait',
              label: t('page.portrait'),
              icon: (
                <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
                  <rect x="1" y="1" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
                  <rect x="4" y="5" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.6"/>
                  <rect x="4" y="8.5" width="8" height="1.5" rx="0.75" fill="currentColor" opacity="0.4"/>
                  <rect x="4" y="12" width="6" height="1.5" rx="0.75" fill="currentColor" opacity="0.4"/>
                </svg>
              ),
            },
            {
              value: 'landscape',
              label: t('page.landscape'),
              icon: (
                <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
                  <rect x="1" y="1" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
                  <rect x="4" y="4.5" width="14" height="1.5" rx="0.75" fill="currentColor" opacity="0.6"/>
                  <rect x="4" y="7.5" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.4"/>
                  <rect x="4" y="10.5" width="7" height="1.5" rx="0.75" fill="currentColor" opacity="0.4"/>
                </svg>
              ),
            },
          ]}
        />
      </Accordion>

      <Accordion title={t('page.margins')}>
        <EdgeInput
          label={t('page.margins')}
          value={pageSettings.margins}
          onChange={v => updatePageSettings({ margins: v })}
          unit="mm"
        />
      </Accordion>

      <Accordion title={t('global.primaryFont')}>
        <FontPicker
          label={t('global.primaryFont')}
          value={pageSettings.defaultFontFamily}
          onChange={v => updatePageSettings({ defaultFontFamily: v })}
        />
        <NumberInput
          label="Tamanho da fonte padrão"
          value={globalStyles.defaultFontSize ?? 16}
          onChange={v => updateGlobalStyles({ defaultFontSize: v })}
          min={8}
          max={72}
          step={1}
          unit="px"
        />
      </Accordion>

      {/* ─── Cores ─── */}
      <Accordion title="Cores de fundo">
        <ColorPicker
          label="Fundo da página"
          value={globalStyles.pageBackground || '#ffffff'}
          onChange={handlePageBackground}
        />
        <button
          className={`pdfb-bg-link-btn${bgLinked ? ' pdfb-bg-link-btn--active' : ''}`}
          onClick={toggleBgLink}
          title={bgLinked ? 'Desacoplar cores' : 'Sincronizar com a cor da página'}
        >
          {bgLinked ? (
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
              <path d="M4.5 6.5V4a1.5 1.5 0 0 1 3 0v2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
              <rect x="1.5" y="6" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.25" fill="currentColor" fillOpacity="0.12"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 5.5V3.5a1.5 1.5 0 0 1 3 0" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
              <rect x="1.5" y="6" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.25" fill="none"/>
            </svg>
          )}
          <span>{bgLinked ? 'Sincronizados' : 'Independentes'}</span>
        </button>
        <ColorPicker
          label="Fundo do conteúdo"
          value={globalStyles.contentBackground || '#ffffff'}
          onChange={handleContentBackground}
        />
        <ColorPicker
          label="Cor padrão do texto"
          value={globalStyles.defaultFontColor || '#333333'}
          onChange={v => updateGlobalStyles({ defaultFontColor: v })}
        />
        <ColorPicker
          label="Cor da borda de citações"
          value={globalStyles.blockquoteBorderColor || '#e0e0e0'}
          onChange={v => updateGlobalStyles({ blockquoteBorderColor: v })}
        />
        <ColorPicker
          label="Fundo padrão do banner"
          value={globalStyles.bannerBackground || '#0d1b3e'}
          onChange={v => updateGlobalStyles({ bannerBackground: v })}
        />
      </Accordion>
    </div>
  );
}
