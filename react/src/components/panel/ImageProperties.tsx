import React, { useCallback, useRef, useState } from 'react';
import { Images, Upload, X } from 'lucide-react';
import { useEditorStore } from '../../store';
import { useEditorConfig } from '../EditorConfig';
import { t } from '../../i18n';
import { Accordion, TextInput, SegmentedControl, LinkedDimensionFields } from '../ui/Controls';
import { useImageLibrary, processFile, libraryStore } from '../ImageLibrary';
import type { ImageBlock, ContentAlign } from '../../types';

export function ImageProperties({ block }: { block: ImageBlock }) {
  const updateContentBlock = useEditorStore(s => s.updateContentBlock);
  const config = useEditorConfig();
  const { openLibrary } = useImageLibrary();
  const update = (updates: Partial<ImageBlock>) => updateContentBlock(block.id, updates);

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const img = await processFile(file, config.onUploadImage);
      libraryStore.add(img);
      update({ src: img.url });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.onUploadImage, block.id]);

  return (
    <div>
      <Accordion title={t('image.upload')}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Current image preview */}
        {block.src && (
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <img
              src={block.src}
              alt={block.alt || 'preview'}
              style={{
                width: '100%', maxHeight: 120, objectFit: 'contain',
                borderRadius: 'var(--pdfb-radius-md)',
                border: '1px solid var(--pdfb-border-color)',
                background: 'var(--pdfb-color-surface)',
                display: 'block',
              }}
            />
            <button
              type="button"
              title="Remover imagem"
              onClick={() => update({ src: '' })}
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
            onClick={() => openLibrary({ targetBlockId: block.id })}
          >
            <Images size={14} />
            Biblioteca de imagens
          </button>
        </div>
      </Accordion>

      <Accordion title={t('props.size')}>
        <SegmentedControl
          label={t('props.alignment')}
          value={block.alignment}
          onChange={v => update({ alignment: v as ContentAlign })}
          columns={3}
          options={[
            {
              value: 'left',
              label: 'Esquerda',
              icon: <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                <rect x="0" y="1" width="10" height="3" rx="1" fill="currentColor"/>
                <rect x="0" y="6" width="14" height="3" rx="1" fill="currentColor" opacity="0.4"/>
                <rect x="0" y="11" width="8" height="3" rx="1" fill="currentColor" opacity="0.4"/>
              </svg>,
            },
            {
              value: 'center',
              label: 'Centro',
              icon: <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                <rect x="4" y="1" width="10" height="3" rx="1" fill="currentColor"/>
                <rect x="2" y="6" width="14" height="3" rx="1" fill="currentColor" opacity="0.4"/>
                <rect x="5" y="11" width="8" height="3" rx="1" fill="currentColor" opacity="0.4"/>
              </svg>,
            },
            {
              value: 'right',
              label: 'Direita',
              icon: <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                <rect x="8" y="1" width="10" height="3" rx="1" fill="currentColor"/>
                <rect x="4" y="6" width="14" height="3" rx="1" fill="currentColor" opacity="0.4"/>
                <rect x="10" y="11" width="8" height="3" rx="1" fill="currentColor" opacity="0.4"/>
              </svg>,
            },
          ]}
        />
        <LinkedDimensionFields
          widthValue={block.width}
          widthMin={20}
          widthMax={800}
          widthDefaultVal={300}
          widthAllowFull
          onWidthChange={v => update({ width: v as ImageBlock['width'] })}
          heightValue={block.height}
          heightMin={20}
          heightMax={1000}
          heightDefaultVal={200}
          onHeightChange={v => update({ height: v })}
        />
        <SegmentedControl
          label="Ajuste de imagem"
          value={block.objectFit}
          onChange={v => update({ objectFit: v as ImageBlock['objectFit'] })}
          columns={4}
          options={[
            {
              value: 'cover',
              label: 'Cobrir',
              icon: <svg width="20" height="14" viewBox="0 0 20 14"><rect x="0" y="0" width="20" height="14" rx="2" fill="currentColor" opacity="0.25"/><rect x="0" y="0" width="20" height="14" rx="2" fill="currentColor" opacity="0.5"/><rect x="4" y="3" width="12" height="8" rx="1" fill="var(--pdfb-color-surface)" opacity="0.7"/></svg>,
            },
            {
              value: 'contain',
              label: 'Conter',
              icon: <svg width="20" height="14" viewBox="0 0 20 14"><rect x="0" y="0" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5"/><rect x="5" y="3" width="10" height="8" rx="1" fill="currentColor" opacity="0.5"/></svg>,
            },
            {
              value: 'fill',
              label: 'Esticar',
              icon: <svg width="20" height="14" viewBox="0 0 20 14"><rect x="0" y="0" width="20" height="14" rx="2" fill="currentColor" opacity="0.65"/></svg>,
            },
            {
              value: 'none',
              label: 'Original',
              icon: <svg width="20" height="14" viewBox="0 0 20 14"><rect x="0" y="0" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5"/><rect x="6" y="4" width="8" height="6" rx="1" fill="currentColor" opacity="0.4"/></svg>,
            },
          ]}
        />
      </Accordion>

      <Accordion title="Atributos" defaultOpen={false}>
        <TextInput
          label={t('image.alt')}
          value={block.alt}
          onChange={v => update({ alt: v })}
          placeholder="Descrição da imagem"
        />
        <TextInput
          label={t('image.title')}
          value={block.title}
          onChange={v => update({ title: v })}
        />
      </Accordion>
    </div>
  );
}
