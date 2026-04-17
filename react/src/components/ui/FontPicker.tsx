import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

// ─── Curated Google Fonts list ─────────────────────────────────
// Popular fonts covering diverse styles. Each entry is the exact
// Google Fonts family name (used in the API URL and CSS font-family).
const GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Nunito',
  'Raleway',
  'Ubuntu',
  'Merriweather',
  'Playfair Display',
  'Source Sans 3',
  'Noto Sans',
  'PT Sans',
  'Rubik',
  'Work Sans',
  'Fira Sans',
  'Barlow',
  'Mulish',
  'Quicksand',
  'Cabin',
  'DM Sans',
  'Manrope',
  'Outfit',
  'Plus Jakarta Sans',
  'Space Grotesk',
  'Archivo',
  'Sora',
  'Lexend',
  'Figtree',
  // Serif
  'Lora',
  'PT Serif',
  'Noto Serif',
  'Crimson Text',
  'Libre Baskerville',
  'EB Garamond',
  'Bitter',
  'Source Serif 4',
  'Cormorant Garamond',
  'DM Serif Display',
  // Mono
  'Fira Code',
  'JetBrains Mono',
  'Source Code Pro',
  'IBM Plex Mono',
  'Space Mono',
  // Display / Decorative
  'Oswald',
  'Bebas Neue',
  'Anton',
  'Righteous',
  'Pacifico',
  'Dancing Script',
  'Caveat',
  'Permanent Marker',
  'Comfortaa',
  'Fredoka',
] as const;

// System / web-safe fonts (always available, no loading needed)
const SYSTEM_FONTS = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Impact',
] as const;

export type FontEntry = {
  family: string;
  source: 'google' | 'system';
};

const ALL_FONTS: FontEntry[] = [
  ...SYSTEM_FONTS.map(f => ({ family: f, source: 'system' as const })),
  ...GOOGLE_FONTS.map(f => ({ family: f, source: 'google' as const })),
];

// ─── Font loading ──────────────────────────────────────────────
const loadedFonts = new Set<string>();

function buildGoogleFontUrl(family: string): string {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`;
}

export function loadGoogleFont(family: string): void {
  if (!family || loadedFonts.has(family)) return;
  // Skip system fonts
  if ((SYSTEM_FONTS as readonly string[]).includes(family)) return;

  loadedFonts.add(family);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = buildGoogleFontUrl(family);
  link.dataset.pdfbFont = family;
  document.head.appendChild(link);
}

/** Load the font for initial/current value on mount */
function useLoadFont(family: string) {
  useEffect(() => {
    if (family) {
      // Extract base family name (strip fallback like ", sans-serif")
      const base = family.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
      loadGoogleFont(base);
    }
  }, [family]);
}

// ─── FontPicker Component ──────────────────────────────────────
interface FontPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}

export function FontPicker({ value, onChange, label, disabled }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Load currently selected font
  useLoadFont(value);

  // Extract display name from value (strip fallback)
  const displayName = useMemo(() => {
    return value.split(',')[0].trim().replace(/^['"]|['"]$/g, '') || 'Inter';
  }, [value]);

  // Filter fonts based on search
  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_FONTS;
    const q = search.toLowerCase();
    return ALL_FONTS.filter(f => f.family.toLowerCase().includes(q));
  }, [search]);

  // Reset highlight when filtered list changes
  useEffect(() => setHighlightIdx(0), [filtered]);

  // Close on outside click (check both the container and the portal dropdown)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      // Check if click is inside the portal dropdown
      const portal = document.querySelector('.pdfb-font-picker-dropdown');
      if (portal?.contains(target)) return;
      setOpen(false);
      setSearch('');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Position the dropdown relative to the trigger button
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 10000,
    });
  }, [open]);

  // Load fonts visible in dropdown for preview
  useEffect(() => {
    if (!open) return;
    // Load first 15 google fonts on open for immediate preview
    filtered.slice(0, 15).forEach(f => {
      if (f.source === 'google') loadGoogleFont(f.family);
    });
  }, [open, filtered]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.children[highlightIdx] as HTMLElement;
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx, open]);

  const selectFont = useCallback((font: FontEntry) => {
    loadGoogleFont(font.family);
    const fallback = font.source === 'system' ? '' : ', sans-serif';
    onChange(`${font.family}${fallback}`);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIdx(i => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIdx(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightIdx]) selectFont(filtered[highlightIdx]);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setSearch('');
        break;
    }
  }, [open, filtered, highlightIdx, selectFont]);

  return (
    <div className="pdfb-field" ref={containerRef}>
      {label && <span className="pdfb-label">{label}</span>}
      <button
        ref={triggerRef}
        type="button"
        className="pdfb-font-picker-trigger"
        onClick={() => { if (!disabled) { setOpen(!open); setSearch(''); } }}
        onKeyDown={disabled ? undefined : handleKeyDown}
        disabled={disabled}
        style={{ fontFamily: value || 'inherit', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : undefined }}
      >
        <span className="pdfb-font-picker-name">{displayName}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && createPortal(
        <div className="pdfb-font-picker-dropdown" style={dropdownStyle}>
          <div className="pdfb-font-picker-search">
            <input
              ref={inputRef}
              type="text"
              className="pdfb-input"
              placeholder="Buscar fonte..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <div className="pdfb-font-picker-list" ref={listRef}>
            {filtered.length === 0 && (
              <div className="pdfb-font-picker-empty">Nenhuma fonte encontrada</div>
            )}
            {filtered.map((font, i) => (
              <button
                key={font.family}
                type="button"
                className={`pdfb-font-picker-item${font.family === displayName ? ' active' : ''}${i === highlightIdx ? ' highlighted' : ''}`}
                style={{ fontFamily: `'${font.family}', sans-serif` }}
                onClick={() => selectFont(font)}
                onMouseEnter={() => {
                  setHighlightIdx(i);
                  if (font.source === 'google') loadGoogleFont(font.family);
                }}
              >
                <span className="pdfb-font-picker-item-name">{font.family}</span>
                {font.source === 'system' && (
                  <span className="pdfb-font-picker-badge">Sistema</span>
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Re-export the list for use in Laravel font collection
export { GOOGLE_FONTS, SYSTEM_FONTS };
