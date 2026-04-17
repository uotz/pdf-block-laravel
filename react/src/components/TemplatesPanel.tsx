import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import { useTemplates } from '../hooks/useTemplates';
import { t } from '../i18n';
import type { Template } from '../templates';

// ─── Save Template Dialog ─────────────────────────────────────

function SaveTemplateDialog({
  onSave,
  onCancel,
}: {
  onSave: (name: string, description?: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, description.trim() || undefined);
  }, [name, description, onSave]);

  return createPortal(
    <div className="pdfb-overlay pdfb-confirm-backdrop" onClick={onCancel}>
      <div
        className="pdfb-overlay-inner pdfb-confirm-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="pdfb-confirm-header">
          <span className="pdfb-confirm-title">{t('templates.saveTitle')}</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="pdfb-confirm-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="pdfb-field">
              <label className="pdfb-label">{t('templates.name')}</label>
              <input
                ref={inputRef}
                className="pdfb-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('templates.namePlaceholder')}
                maxLength={80}
              />
            </div>
            <div className="pdfb-field">
              <label className="pdfb-label">{t('templates.description')}</label>
              <input
                className="pdfb-input"
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('templates.descriptionPlaceholder')}
                maxLength={200}
              />
            </div>
          </div>
          <div className="pdfb-confirm-footer">
            <button
              className="pdfb-confirm-btn pdfb-confirm-btn--cancel"
              onClick={onCancel}
              type="button"
            >
              {t('templates.cancel')}
            </button>
            <button
              className="pdfb-confirm-btn pdfb-confirm-btn--confirm"
              type="submit"
              disabled={!name.trim()}
            >
              {t('templates.save')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

// ─── Template Card ────────────────────────────────────────────

function TemplateCard({
  template,
  onApply,
  onDelete,
}: {
  template: Template;
  onApply: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="pdfb-template-card">
      <div className="pdfb-template-card-info">
        <span className="pdfb-template-card-name">{template.name}</span>
        {template.description && (
          <span className="pdfb-template-card-desc">{template.description}</span>
        )}
        {template.builtIn && (
          <span className="pdfb-template-card-badge">{t('templates.builtIn')}</span>
        )}
      </div>
      <div className="pdfb-template-card-actions">
        <button
          className="pdfb-toolbar-btn"
          style={{ color: 'var(--pdfb-color-accent)', fontSize: 11, padding: '2px 8px', height: 'auto' }}
          onClick={onApply}
          type="button"
        >
          {t('templates.apply')}
        </button>
        {onDelete && (
          <button
            className="pdfb-toolbar-btn"
            style={{ color: 'var(--pdfb-color-danger)', fontSize: 11, padding: '2px 4px', height: 'auto' }}
            onClick={onDelete}
            type="button"
            title={t('templates.delete')}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Templates Panel ──────────────────────────────────────────

export function TemplatesPanel() {
  const { templates, loading, saveTemplate, deleteTemplate, applyTemplate } = useTemplates();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [confirmApply, setConfirmApply] = useState<Template | null>(null);

  const handleSave = useCallback(async (name: string, description?: string) => {
    await saveTemplate(name, description);
    setShowSaveDialog(false);
  }, [saveTemplate]);

  const handleApply = useCallback((template: Template) => {
    setConfirmApply(template);
  }, []);

  const handleConfirmApply = useCallback(() => {
    if (confirmApply) {
      applyTemplate(confirmApply);
      setConfirmApply(null);
    }
  }, [confirmApply, applyTemplate]);

  const builtIn = templates.filter(t => t.builtIn);
  const userTemplates = templates.filter(t => !t.builtIn);

  return (
    <div>
      <div className="pdfb-sidebar-panel-header">
        <span>{t('sidebar.templates')}</span>
        <button
          className="pdfb-toolbar-btn"
          style={{ fontSize: 11, padding: '2px 8px', height: 'auto', marginLeft: 'auto' }}
          onClick={() => setShowSaveDialog(true)}
          type="button"
        >
          + {t('templates.saveBtn')}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--pdfb-color-text-secondary)', fontSize: 12 }}>
          {t('templates.loading')}
        </div>
      ) : (
        <div style={{ padding: 8 }}>
          {builtIn.length > 0 && (
            <>
              <div className="pdfb-template-section-label">{t('templates.builtInSection')}</div>
              {builtIn.map(tpl => (
                <TemplateCard key={tpl.id} template={tpl} onApply={() => handleApply(tpl)} />
              ))}
            </>
          )}

          {userTemplates.length > 0 && (
            <>
              <div className="pdfb-template-section-label">{t('templates.userSection')}</div>
              {userTemplates.map(tpl => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  onApply={() => handleApply(tpl)}
                  onDelete={() => deleteTemplate(tpl.id)}
                />
              ))}
            </>
          )}

          {builtIn.length === 0 && userTemplates.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--pdfb-color-text-secondary)', fontSize: 12 }}>
              {t('templates.empty')}
            </div>
          )}
        </div>
      )}

      {showSaveDialog && (
        <SaveTemplateDialog
          onSave={handleSave}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}

      {confirmApply && createPortal(
        <div className="pdfb-overlay pdfb-confirm-backdrop" onClick={() => setConfirmApply(null)}>
          <div
            className="pdfb-overlay-inner pdfb-confirm-dialog"
            onClick={e => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="pdfb-confirm-header">
              <span className="pdfb-confirm-title">{t('templates.confirmTitle')}</span>
            </div>
            <div className="pdfb-confirm-body">
              <p className="pdfb-confirm-message">{t('templates.confirmMessage')}</p>
            </div>
            <div className="pdfb-confirm-footer">
              <button
                className="pdfb-confirm-btn pdfb-confirm-btn--cancel"
                onClick={() => setConfirmApply(null)}
                type="button"
              >
                {t('templates.cancel')}
              </button>
              <button
                className="pdfb-confirm-btn pdfb-confirm-btn--confirm"
                onClick={handleConfirmApply}
                type="button"
              >
                {t('templates.apply')}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
