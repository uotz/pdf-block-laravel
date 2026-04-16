import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronRight, Lock, Unlock, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { NumberInput } from './NumberInput';
import { clamp } from '../../utils';
import type { EdgeValues, ContentAlign, TextAlign, CornerValues } from '../../types';

// ─── Edge Number (value in center, arrows on sides, drag support) ─
interface EdgeNumberProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

function EdgeNumber({ value, onChange, min = 0, max = 999, step = 1, label }: EdgeNumberProps) {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(String(value));
  const holdRef = useRef<ReturnType<typeof setInterval>>();
  const dragRef = useRef({ startY: 0, startVal: 0, dragging: false });

  useEffect(() => { if (!editing) setLocalVal(String(value)); }, [value, editing]);

  const startHold = useCallback((delta: number) => {
    const next = clamp(value + delta, min, max);
    onChange(next);
    let current = value;
    holdRef.current = setInterval(() => {
      current = clamp(current + delta, min, max);
      onChange(current);
    }, 120);
  }, [value, onChange, min, max]);

  const stopHold = useCallback(() => {
    if (holdRef.current) clearInterval(holdRef.current);
  }, []);

  const handleMiddleMouseDown = useCallback((e: React.MouseEvent) => {
    if (editing) return;
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startVal: value, dragging: false };
    const onMove = (ev: MouseEvent) => {
      const dy = dragRef.current.startY - ev.clientY;
      if (Math.abs(dy) > 2) dragRef.current.dragging = true;
      if (dragRef.current.dragging) {
        onChange(clamp(Math.round(dragRef.current.startVal + dy), min, max));
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (!dragRef.current.dragging) setEditing(true);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [editing, value, onChange, min, max]);

  const commit = useCallback(() => {
    const num = parseFloat(localVal);
    if (!isNaN(num)) onChange(clamp(num, min, max));
    setEditing(false);
  }, [localVal, onChange, min, max]);

  return (
    <div
      className="pdfb-edge-number"
      title={label}
      onMouseDown={handleMiddleMouseDown}
    >
      <button
        type="button"
        className="pdfb-edge-number-btn"
        onMouseDown={e => { e.stopPropagation(); startHold(-step); }}
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
        tabIndex={-1}
      >‹</button>

      {editing ? (
        <input
          type="text"
          inputMode="numeric"
          className="pdfb-edge-number-input"
          value={localVal}
          onChange={e => setLocalVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
          autoFocus
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span className="pdfb-edge-number-val">{value}</span>
      )}

      <button
        type="button"
        className="pdfb-edge-number-btn"
        onMouseDown={e => { e.stopPropagation(); startHold(step); }}
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
        tabIndex={-1}
      >›</button>
    </div>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────
interface ToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}

export function Toggle({ value, onChange, label }: ToggleProps) {
  return (
    <div className="pdfb-field-inline">
      {label && <span className="pdfb-label">{label}</span>}
      <button
        className={`pdfb-toggle ${value ? 'on' : ''}`}
        onClick={() => onChange(!value)}
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
      />
    </div>
  );
}

// ─── Slider with value display ────────────────────────────────
interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
}

export function Slider({ value, onChange, min = 0, max = 100, step = 1, label, unit = '' }: SliderProps) {
  return (
    <div className="pdfb-field pdfb-slider-field">
      {label && (
        <div className="pdfb-slider-header">
          <span className="pdfb-label">{label}</span>
          <span className="pdfb-slider-value-badge">{value}{unit}</span>
        </div>
      )}
      <input
        className="pdfb-slider-input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────
interface TabsProps {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="pdfb-tabs">
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`pdfb-tab ${active === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Accordion ────────────────────────────────────────────────
interface AccordionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function Accordion({ title, defaultOpen = true, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="pdfb-accordion">
      <button
        className="pdfb-accordion-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        type="button"
      >
        <ChevronRight size={14} />
        {title}
      </button>
      <div
        className="pdfb-accordion-body"
        style={{ maxHeight: open ? '2000px' : '0px' }}
      >
        <div className="pdfb-accordion-content">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Edge Input (Padding / Margin with lock) ──────────────────
interface EdgeInputProps {
  value: EdgeValues;
  onChange: (value: EdgeValues) => void;
  label?: string;
  unit?: string;
}

export function EdgeInput({ value, onChange, label, unit = 'px' }: EdgeInputProps) {
  const [linked, setLinked] = useState(
    value.top === value.right && value.right === value.bottom && value.bottom === value.left
  );

  const handleChange = (side: keyof EdgeValues, v: number) => {
    if (linked) {
      onChange({ top: v, right: v, bottom: v, left: v });
    } else {
      onChange({ ...value, [side]: v });
    }
  };

  return (
    <div className="pdfb-field">
      {label && <span className="pdfb-label">{label}</span>}
      <div className="pdfb-edge-input">
        <div className="pdfb-edge-top">
          <EdgeNumber value={value.top} onChange={v => handleChange('top', v)} label="Topo" />
        </div>
        <div className="pdfb-edge-left">
          <EdgeNumber value={value.left} onChange={v => handleChange('left', v)} label="Esquerda" />
        </div>
        <div className="pdfb-edge-lock">
          <button
            className={`pdfb-lock-btn ${linked ? 'locked' : ''}`}
            onClick={() => setLinked(!linked)}
            type="button"
            title={linked ? 'Valores vinculados' : 'Valores independentes'}
          >
            {linked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
        </div>
        <div className="pdfb-edge-right">
          <EdgeNumber value={value.right} onChange={v => handleChange('right', v)} label="Direita" />
        </div>
        <div className="pdfb-edge-bottom">
          <EdgeNumber value={value.bottom} onChange={v => handleChange('bottom', v)} label="Baixo" />
        </div>
      </div>
    </div>
  );
}

// ─── Alignment Buttons ────────────────────────────────────────
interface AlignButtonsProps {
  value: ContentAlign | TextAlign;
  onChange: (value: ContentAlign | TextAlign) => void;
  includeJustify?: boolean;
  label?: string;
}

export function AlignButtons({ value, onChange, includeJustify = false, label }: AlignButtonsProps) {
  const options: { key: string; icon: React.ReactNode }[] = [
    { key: 'left', icon: <AlignLeft size={16} /> },
    { key: 'center', icon: <AlignCenter size={16} /> },
    { key: 'right', icon: <AlignRight size={16} /> },
  ];
  if (includeJustify) {
    options.push({ key: 'justify', icon: <AlignJustify size={16} /> });
  }

  return (
    <div className="pdfb-field">
      {label && <span className="pdfb-label">{label}</span>}
      <div className="pdfb-align-group">
        {options.map(opt => (
          <button
            key={opt.key}
            className={`pdfb-align-btn ${value === opt.key ? 'active' : ''}`}
            onClick={() => onChange(opt.key as ContentAlign)}
            type="button"
            aria-label={opt.key}
          >
            {opt.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────
interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label?: string;
}

export function Select({ value, onChange, options, label }: SelectProps) {
  return (
    <div className="pdfb-field">
      {label && <span className="pdfb-label">{label}</span>}
      <select
        className="pdfb-select"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Text Input ───────────────────────────────────────────────
interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  multiline?: boolean;
}

export function TextInput({ value, onChange, label, placeholder, multiline }: TextInputProps) {
  return (
    <div className="pdfb-field">
      {label && <span className="pdfb-label">{label}</span>}
      {multiline ? (
        <textarea
          className="pdfb-input"
          style={{ height: 80, resize: 'vertical', paddingTop: 6 }}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className="pdfb-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

// ─── Column Grid Selector (interactive colspan) ───────────────
interface ColumnGridProps {
  count: number;
  max?: number;
  onChange: (count: number) => void;
  label?: string;
}

export function ColumnGrid({ count, max = 12, onChange, label }: ColumnGridProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="pdfb-field">
      {label && <span className="pdfb-label">{label}</span>}
      <div className="pdfb-col-grid" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            className={`pdfb-col-grid-cell ${n <= (hover || count) ? 'active' : ''}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            type="button"
            title={`${n} ${n === 1 ? 'coluna' : 'colunas'}`}
          />
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--pdfb-color-text-secondary)', marginTop: 2, textAlign: 'center' }}>
        {hover || count} {(hover || count) === 1 ? 'coluna' : 'colunas'}
      </div>
    </div>
  );
}

// ─── SpacingControl (visual 4-side box with lock) ─────────────
export function SpacingControl({ value, onChange, label }: {
  value: EdgeValues;
  onChange: (v: EdgeValues) => void;
  label?: string;
}) {
  const [linked, setLinked] = useState(
    value.top === value.right && value.right === value.bottom && value.bottom === value.left,
  );
  const set = (side: keyof EdgeValues, n: number) => {
    const v = Math.max(0, n);
    onChange(linked ? { top: v, right: v, bottom: v, left: v } : { ...value, [side]: v });
  };
  return (
    <div className="pdfb-field">
      {label && <span className="pdfb-label">{label}</span>}
      <div className="pdfb-spacing-ctrl">
        {/* Top */}
        <div className="pdfb-spacing-row pdfb-spacing-row--top">
          <input type="number" className="pdfb-spacing-num" value={value.top} min={0}
            onChange={e => set('top', Number(e.target.value))} />
        </div>
        {/* Middle: Left / Lock / Right */}
        <div className="pdfb-spacing-row pdfb-spacing-row--mid">
          <input type="number" className="pdfb-spacing-num" value={value.left} min={0}
            onChange={e => set('left', Number(e.target.value))} />
          <div className="pdfb-spacing-center">
            <div className="pdfb-spacing-inner" />
            <button type="button"
              className={`pdfb-spacing-lock${linked ? ' active' : ''}`}
              onClick={() => setLinked(l => !l)}
              title={linked ? 'Desvincular lados' : 'Vincular todos os lados'}>
              {linked ? <Lock size={10} /> : <Unlock size={10} />}
            </button>
          </div>
          <input type="number" className="pdfb-spacing-num" value={value.right} min={0}
            onChange={e => set('right', Number(e.target.value))} />
        </div>
        {/* Bottom */}
        <div className="pdfb-spacing-row pdfb-spacing-row--bottom">
          <input type="number" className="pdfb-spacing-num" value={value.bottom} min={0}
            onChange={e => set('bottom', Number(e.target.value))} />
        </div>
      </div>
    </div>
  );
}

// ─── Font Weight Picker ───────────────────────────────────────
const _FW_OPTS = [300, 400, 500, 600, 700, 800] as const;

export function FontWeightPicker({ value, onChange, label }: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  return (
    <div className="pdfb-field">
      <span className="pdfb-label">{label ?? 'Peso'}</span>
      <div className="pdfb-weight-group">
        {_FW_OPTS.map(w => (
          <button key={w} type="button"
            className={`pdfb-weight-btn${Number(value) === w ? ' active' : ''}`}
            style={{ fontWeight: w }}
            onClick={() => onChange(w)}>
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── SegmentedControl (icon-grid options) ─────────────────────
export interface SegOpt {
  value: string;
  label?: string;
  icon?: React.ReactNode;
}

export function SegmentedControl({ value, onChange, options, label, columns = 2, iconOnly = false }: {
  value: string;
  onChange: (v: string) => void;
  options: SegOpt[];
  label?: string;
  columns?: number;
  iconOnly?: boolean;
}) {
  return (
    <div className="pdfb-field">
      {label && <span className="pdfb-label">{label}</span>}
      <div className="pdfb-seg-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {options.map(opt => (
          <button key={opt.value} type="button"
            className={`pdfb-seg-opt${value === opt.value ? ' active' : ''}`}
            onClick={() => onChange(opt.value)}
            title={opt.label}>
            {opt.icon && <span className="pdfb-seg-icon">{opt.icon}</span>}
            {!iconOnly && opt.label && <span className="pdfb-seg-label">{opt.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── DimensionField (value + auto/px toggle) ──────────────────
export function DimensionField({ label, value, min, max, defaultVal, onChange, allowFull }: {
  label: string;
  value: number | 'auto' | 'full';
  min: number;
  max: number;
  defaultVal: number;
  onChange: (v: number | 'auto' | 'full') => void;
  allowFull?: boolean;
}) {
  const isAuto = value === 'auto';
  const isFull = value === 'full';
  const isPx   = !isAuto && !isFull;
  return (
    <div className="pdfb-dimension-field">
      <div className="pdfb-dimension-header">
        <span className="pdfb-label">{label}</span>
        <div className="pdfb-auto-toggle">
          <button type="button"
            className={`pdfb-auto-btn${isAuto ? ' active' : ''}`}
            onClick={() => onChange('auto')}>
            AUTO
          </button>
          <button type="button"
            className={`pdfb-auto-btn${isPx ? ' active' : ''}`}
            onClick={() => { if (!isPx) onChange(defaultVal); }}>
            PX
          </button>
          {allowFull && (
            <button type="button"
              className={`pdfb-auto-btn${isFull ? ' active' : ''}`}
              onClick={() => onChange('full')}>
              100%
            </button>
          )}
        </div>
      </div>
      {isPx && (
        <Slider value={value as number} onChange={v => onChange(v)} min={min} max={max} unit="px" />
      )}
    </div>
  );
}

// ─── LinkedDimensionFields ───────────────────────────────────
// Width + Height fields with an equal-value lock button between them.
export function LinkedDimensionFields({
  widthLabel = 'Largura', widthValue, widthMin, widthMax, widthDefaultVal, widthAllowFull, onWidthChange,
  heightLabel = 'Altura', heightValue, heightMin, heightMax, heightDefaultVal, onHeightChange,
}: {
  widthLabel?: string;
  widthValue: number | 'auto' | 'full';
  widthMin: number;
  widthMax: number;
  widthDefaultVal: number;
  widthAllowFull?: boolean;
  onWidthChange: (v: number | 'auto' | 'full') => void;
  heightLabel?: string;
  heightValue: number | 'auto';
  heightMin: number;
  heightMax: number;
  heightDefaultVal: number;
  onHeightChange: (v: number | 'auto') => void;
}) {
  const [linked, setLinked] = useState(false);

  const handleWidthChange = (v: number | 'auto' | 'full') => {
    onWidthChange(v);
    if (linked && typeof v === 'number') {
      onHeightChange(clamp(v, heightMin, heightMax) as number);
    }
  };

  const handleHeightChange = (v: number | 'auto') => {
    onHeightChange(v);
    if (linked && typeof v === 'number') {
      onWidthChange(clamp(v, widthMin, widthMax) as number);
    }
  };

  return (
    <div>
      <DimensionField
        label={widthLabel}
        value={widthValue}
        min={widthMin}
        max={widthMax}
        defaultVal={widthDefaultVal}
        allowFull={widthAllowFull}
        onChange={handleWidthChange}
      />
      <div className="pdfb-dim-link-row">
        <button
          type="button"
          className={`pdfb-dim-link-btn${linked ? ' active' : ''}`}
          onClick={() => setLinked(l => !l)}
          title={linked ? 'Desvincular' : 'Igualar largura e altura'}
        >
          {linked ? <Lock size={11} /> : <Unlock size={11} />}
          {linked ? 'Vinculado' : 'Igualar'}
        </button>
      </div>
      <DimensionField
        label={heightLabel}
        value={heightValue as number | 'auto'}
        min={heightMin}
        max={heightMax}
        defaultVal={heightDefaultVal}
        onChange={handleHeightChange as (v: number | 'auto' | 'full') => void}
      />
    </div>
  );
}

// ─── Corner Radius Control ────────────────────────────────────
// Reusable 4-corner border-radius control with linked/independent mode.
// Used in CommonStylesPanel (BlockStyles.borderRadius) and ButtonProperties.
export function CornerRadiusControl({ value, onChange, label = 'Arredondamento', max = 120 }: {
  value: CornerValues;
  onChange: (v: CornerValues) => void;
  label?: string;
  max?: number;
}) {
  // Normalize: guard against legacy number (e.g. old documents stored borderRadius: 6)
  const fallback = typeof (value as unknown) === 'number' ? (value as unknown as number) : 0;
  const safe: CornerValues = {
    topLeft:     value?.topLeft     ?? fallback,
    topRight:    value?.topRight    ?? fallback,
    bottomRight: value?.bottomRight ?? fallback,
    bottomLeft:  value?.bottomLeft  ?? fallback,
  };

  const isLinked = safe.topLeft === safe.topRight &&
    safe.topRight === safe.bottomRight &&
    safe.bottomRight === safe.bottomLeft;
  const [linked, setLinked] = useState(isLinked);

  const handleAll = (v: number) =>
    onChange({ topLeft: v, topRight: v, bottomRight: v, bottomLeft: v });

  const handleCorner = (corner: keyof CornerValues, v: number) =>
    onChange({ ...safe, [corner]: v });

  const cornerDefs: { key: keyof CornerValues; icon: string }[] = [
    { key: 'topLeft',     icon: '↖' },
    { key: 'topRight',    icon: '↗' },
    { key: 'bottomLeft',  icon: '↙' },
    { key: 'bottomRight', icon: '↘' },
  ];

  return (
    <div className="pdfb-field">
      <div className="pdfb-corner-header">
        <span className="pdfb-label">{label}</span>
        <button
          type="button"
          className={`pdfb-corner-link-btn${linked ? ' active' : ''}`}
          title={linked ? 'Cantos independentes' : 'Vincular cantos'}
          onClick={() => setLinked(l => !l)}
        >
          {linked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>
      </div>
      {linked ? (
        <Slider value={safe.topLeft} onChange={handleAll} min={0} max={max} unit="px" />
      ) : (
        <div className="pdfb-corner-grid">
          {cornerDefs.map(({ key, icon }) => (
            <div key={key} className="pdfb-corner-cell">
              <span className="pdfb-corner-icon">{icon}</span>
              <input
                type="number"
                className="pdfb-spacing-num"
                value={safe[key]}
                min={0}
                max={max}
                onChange={e => handleCorner(key, Math.max(0, Math.min(max, Number(e.target.value))))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
