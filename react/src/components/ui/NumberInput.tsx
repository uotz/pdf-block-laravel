import React, { useCallback, useRef, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { clamp } from '../../utils';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label?: string;
  width?: number | string;
}

export function NumberInput({
  value, onChange, min = 0, max = 9999, step = 1, unit, label, width,
}: NumberInputProps) {
  const [localValue, setLocalValue] = useState(String(value));
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const valueRef = useRef(value);
  valueRef.current = value;

  const commit = useCallback((v: string) => {
    const num = parseFloat(v);
    if (!isNaN(num)) {
      onChange(clamp(num, min, max));
    }
    setLocalValue(String(clamp(isNaN(num) ? valueRef.current : num, min, max)));
  }, [onChange, min, max]);

  const increment = useCallback((delta: number) => {
    const next = clamp(valueRef.current + delta, min, max);
    onChange(next);
    setLocalValue(String(next));
  }, [onChange, min, max]);

  const startRepeating = useCallback((delta: number) => {
    increment(delta);
    intervalRef.current = setInterval(() => increment(delta), 80);
  }, [increment]);

  const stopRepeating = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const mult = e.ctrlKey ? 10 : e.shiftKey ? 0.1 : 1;
    increment(e.deltaY < 0 ? step * mult : -step * mult);
  }, [increment, step]);

  React.useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  return (
    <div className="pdfb-field" style={{ width }}>
      {label && <span className="pdfb-label">{label}</span>}
      <div className="pdfb-number-input">
        <button
          className="pdfb-number-step"
          onMouseDown={() => startRepeating(-step)}
          onMouseUp={stopRepeating}
          onMouseLeave={stopRepeating}
          type="button"
          tabIndex={-1}
          aria-label="Diminuir"
        >
          <ChevronDown size={14} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={localValue}
          onChange={e => setLocalValue(e.target.value)}
          onBlur={() => commit(localValue)}
          onKeyDown={e => {
            if (e.key === 'Enter') commit(localValue);
            if (e.key === 'ArrowUp') { e.preventDefault(); increment(step); }
            if (e.key === 'ArrowDown') { e.preventDefault(); increment(-step); }
            if (e.key === 'Escape') { setLocalValue(String(value)); }
          }}
          onWheel={handleWheel}
        />
        {unit && (
          <span style={{ fontSize: 10, color: 'var(--pdfb-color-text-disabled)', paddingRight: 4, userSelect: 'none' }}>
            {unit}
          </span>
        )}
        <button
          className="pdfb-number-step"
          onMouseDown={() => startRepeating(step)}
          onMouseUp={stopRepeating}
          onMouseLeave={stopRepeating}
          type="button"
          tabIndex={-1}
          aria-label="Aumentar"
        >
          <ChevronUp size={14} />
        </button>
      </div>
    </div>
  );
}
