import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface ConfirmDialogProps {
  /** Title shown at the top of the dialog (optional) */
  title?: string;
  /** Body message */
  message: string;
  /** Label for the confirm button (default: "Confirmar") */
  confirmLabel?: string;
  /** Label for the cancel button (default: "Cancelar") */
  cancelLabel?: string;
  /** When true, the confirm button uses the danger/red color */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Platform-themed confirmation dialog.
 * Renders into document.body via a portal.
 * Closes on Escape key and on backdrop click.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    },
    [onCancel, onConfirm],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return createPortal(
    <div className="pdfb-overlay pdfb-confirm-backdrop" onClick={onCancel}>
      <div
        className="pdfb-overlay-inner pdfb-confirm-dialog"
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={title ? 'pdfb-confirm-title' : undefined}
        aria-describedby="pdfb-confirm-message"
      >
        {title && (
          <div className="pdfb-confirm-header">
            <span id="pdfb-confirm-title" className="pdfb-confirm-title">{title}</span>
          </div>
        )}
        <div className="pdfb-confirm-body">
          <p id="pdfb-confirm-message" className="pdfb-confirm-message">{message}</p>
        </div>
        <div className="pdfb-confirm-footer">
          <button
            className="pdfb-confirm-btn pdfb-confirm-btn--cancel"
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`pdfb-confirm-btn pdfb-confirm-btn--confirm${danger ? ' pdfb-confirm-btn--danger' : ''}`}
            onClick={onConfirm}
            type="button"
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
