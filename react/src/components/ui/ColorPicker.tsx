import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker } from 'react-colorful';

const PRESET_COLORS = [
  'transparent',
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8',
  '#9900ff', '#ff00ff', '#c9daf8', '#d9ead3', '#fce5cd', '#f4cccc', '#ead1dc',
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const [popupPos, setPopupPos] = useState({ top: 0, right: 0 });
  const swatchRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setHexInput(value); }, [value]);

  // Position popup relative to swatch, aligned to the right
  const openPicker = useCallback(() => {
    if (swatchRef.current) {
      const rect = swatchRef.current.getBoundingClientRect();
      const viewportW = window.innerWidth;
      setPopupPos({
        top: rect.bottom + window.scrollY + 4,
        right: viewportW - rect.right,
      });
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        swatchRef.current?.contains(e.target as Node) ||
        popupRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleHexSubmit = useCallback(() => {
    const hex = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) onChange(hex);
  }, [hexInput, onChange]);

  const handlePickerChange = useCallback((color: string) => {
    onChange(color);
    setHexInput(color);
  }, [onChange]);

  const popup = open ? createPortal(
    <div
      ref={popupRef}
      className="pdfb-color-picker-popup"
      style={{
        position: 'fixed',
        top: popupPos.top,
        right: popupPos.right,
        zIndex: 9999,
      }}
    >
      <HexColorPicker color={value} onChange={handlePickerChange} />
      <div className="pdfb-color-hex-input">
        <span style={{ fontSize: 11, color: 'var(--pdfb-color-text-secondary)' }}>HEX</span>
        <input
          value={hexInput}
          onChange={e => setHexInput(e.target.value)}
          onBlur={handleHexSubmit}
          onKeyDown={e => e.key === 'Enter' && handleHexSubmit()}
        />
      </div>
      <div className="pdfb-color-presets">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            className={`pdfb-color-preset ${c === 'transparent' ? 'pdfb-color-preset--transparent' : ''}`}
            style={{ backgroundColor: c !== 'transparent' ? c : undefined }}
            onClick={() => { handlePickerChange(c); }}
            title={c === 'transparent' ? 'Transparente' : c}
            type="button"
            aria-label={c}
          />
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="pdfb-color-row">
      {label && <span className="pdfb-label pdfb-color-label">{label}</span>}
      <div className="pdfb-color-controls">
        <button
          ref={swatchRef}
          className="pdfb-color-swatch"
          onClick={() => open ? setOpen(false) : openPicker()}
          type="button"
          aria-label="Escolher cor"
          title={value}
        >
          <div className="pdfb-color-swatch-inner" style={{ backgroundColor: value }} />
        </button>
        <input
          className="pdfb-input pdfb-color-hex-inline"
          value={hexInput}
          onChange={e => setHexInput(e.target.value)}
          onBlur={handleHexSubmit}
          onKeyDown={e => {
            if (e.key === 'Enter') handleHexSubmit();
            if (e.key === 'F2' || e.key === ' ') openPicker();
          }}
          placeholder="#000000"
        />
      </div>
      {popup}
    </div>
  );
}
