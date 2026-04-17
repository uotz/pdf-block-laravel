import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Link as LinkIcon, Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, RemoveFormatting,
  Quote, Baseline, CaseSensitive, X,
} from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { useActiveEditor } from './ActiveEditorContext';
import { useEditorStore } from '../store';
import type { TextBlock } from '../types';

const DEFAULT_BLOCKQUOTE_COLOR = 'var(--pdfb-color-accent)';

// ─── Toolbar button ───────────────────────────────────────────
function ToolbarBtn({
  active, onClick, children, title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={`pdfb-bubble-btn ${active ? 'active' : ''}`}
      // preventDefault keeps focus in the TipTap editor when the button is clicked
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
    >
      {children}
    </button>
  );
}

// ─── Color picker popover (portal, fixed-positioned) ─────────────────────────
function ColorPopover({
  anchorRef,
  color,
  onChange,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  color: string;
  onChange: (c: string) => void;
  onClose: () => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  // Stable ref so the outside-click handler never goes stale
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Compute position once on mount from the anchor button's bounding rect
  // Opens to the LEFT of the button (toolbar is on the right side of the screen)
  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.top + rect.height / 2, left: rect.left - 6 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register outside-click handler deferred so it doesn't fire for the opening click
  useEffect(() => {
    let added = false;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      const popover = document.querySelector('.pdfb-color-popover');
      const toolbar = document.getElementById('pdfb-text-format-toolbar');
      if (!popover?.contains(target) && !toolbar?.contains(target)) {
        onCloseRef.current();
      }
    }
    const t = setTimeout(() => {
      document.addEventListener('mousedown', handler);
      added = true;
    }, 0);
    return () => {
      clearTimeout(t);
      if (added) document.removeEventListener('mousedown', handler);
    };
  }, []);

  const content = (
    <div
      className="pdfb-color-popover"
      style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translate(-100%, -50%)' }}
      // Prevent editor blur when interacting with picker
      onMouseDown={e => e.preventDefault()}
    >
      <HexColorPicker color={color} onChange={onChange} />
      <div className="pdfb-color-popover-hex">
        <span>#</span>
        <input
          type="text"
          value={color.replace('#', '')}
          maxLength={6}
          onChange={e => {
            const val = '#' + e.target.value.replace(/[^0-9a-fA-F]/g, '');
            if (val.length === 7) onChange(val);
          }}
        />
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => onCloseRef.current()}>✓</button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ─── Link picker popover (portal, fixed-positioned) ──────────────────────────────
function LinkPopover({
  anchorRef, isActive, currentHref, onSet, onRemove, onClose,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  isActive: boolean;
  currentHref: string;
  onSet: (href: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(currentHref);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.top + rect.height / 2, left: rect.left - 6 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let added = false;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      const popover = document.querySelector('.pdfb-link-popover');
      const toolbar = document.getElementById('pdfb-text-format-toolbar');
      if (!popover?.contains(target) && !toolbar?.contains(target)) {
        onCloseRef.current();
      }
    }
    const t = setTimeout(() => { document.addEventListener('mousedown', handler); added = true; }, 0);
    return () => { clearTimeout(t); if (added) document.removeEventListener('mousedown', handler); };
  }, []);

  const content = (
    <div
      className="pdfb-link-popover"
      style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translate(-100%, -50%)' }}
    >
      <input
        type="url"
        className="pdfb-link-popover-input"
        value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); onSet(url); }
          if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current(); }
        }}
        placeholder="https://..."
        autoFocus
      />
      <div className="pdfb-link-popover-actions">
        {isActive && (
          <button
            type="button"
            className="pdfb-link-popover-btn pdfb-link-popover-btn--remove"
            onMouseDown={e => e.preventDefault()}
            onClick={onRemove}
          >Remover</button>
        )}
        <button
          type="button"
          className="pdfb-link-popover-btn pdfb-link-popover-btn--ok"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onSet(url)}
        >OK</button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ─── Fixed text format toolbar ────────────────────────────────────────────
export function TextFormatToolbar() {
  const { activeEditor, activeBlockId, unregisterEditor } = useActiveEditor();
  const updateContentBlock = useEditorStore(s => s.updateContentBlock);
  const activeBlock = useEditorStore(s => {
    if (!activeBlockId) return null;
    for (const stripe of s.document.blocks) {
      for (const structure of stripe.children) {
        for (const column of structure.columns) {
          const found = column.children.find(b => b.id === activeBlockId);
          if (found) return found;
        }
      }
    }
    return null;
  }) as TextBlock | null;
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showBqColorPicker, setShowBqColorPicker] = useState(false);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  // Font-size: fake input — editor stays focused so text selection is never lost.
  // Keystrokes are captured at document level (capture phase) while editing.
  const [localFontSize, setLocalFontSize] = useState('');
  const [fontSizeEditing, setFontSizeEditing] = useState(false);
  const fontSizeWidgetRef = useRef<HTMLDivElement>(null);
  // Stable ref so event listeners don't capture stale closure values
  const fontSizeEditRef = useRef({
    editing: false, value: '', editor: null as import('@tiptap/react').Editor | null,
    blockId: null as string | null,
    updateBlock: null as ((id: string, updates: Partial<TextBlock>) => void) | null,
  });
  fontSizeEditRef.current = { editing: fontSizeEditing, value: localFontSize, editor: activeEditor, blockId: activeBlockId, updateBlock: updateContentBlock };
  // Version counter — increments on every editor transaction/selection change,
  // which causes a re-render so isActive() calls reflect the current state.
  const [, setTick] = useState(0);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const textColorBtnRef = useRef<HTMLButtonElement>(null);
  const bqColorBtnRef = useRef<HTMLButtonElement>(null);
  const linkBtnRef = useRef<HTMLButtonElement>(null);

  // Subscribe to editor updates
  useEffect(() => {
    if (!activeEditor) {
      setShowLinkPopover(false);
      setShowTextColorPicker(false);
      setShowBqColorPicker(false);
      return;
    }
    const bump = () => setTick(t => t + 1);
    activeEditor.on('transaction', bump);
    activeEditor.on('selectionUpdate', bump);
    return () => {
      activeEditor.off('transaction', bump);
      activeEditor.off('selectionUpdate', bump);
    };
  }, [activeEditor]);

  // ── Font-size fake-input: capture keystrokes while editor stays focused ───
  useEffect(() => {
    if (!fontSizeEditing) return;
    const onKey = (e: KeyboardEvent) => {
      const { editing, value, editor, blockId, updateBlock } = fontSizeEditRef.current;
      if (!editing) return;
      if (/^\d$/.test(e.key)) {
        e.preventDefault(); e.stopImmediatePropagation();
        setLocalFontSize(v => (v + e.key).slice(-3));
      } else if (e.key === 'Backspace') {
        e.preventDefault(); e.stopImmediatePropagation();
        setLocalFontSize(v => v.slice(0, -1));
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault(); e.stopImmediatePropagation();
        const cur = parseInt(value, 10);
        const base = isNaN(cur) ? 14 : cur;
        const next = e.key === 'ArrowUp' ? Math.min(base + 1, 144) : Math.max(base - 1, 6);
        setLocalFontSize(String(next));
        if (editor) {
          if (!editor.state.selection.empty) {
            editor.chain().setFontSize(`${next}px`).run();
          } else if (blockId && updateBlock) {
            updateBlock(blockId, { fontSize: next } as Partial<TextBlock>);
          }
        }
      } else if (e.key === 'Enter') {
        e.preventDefault(); e.stopImmediatePropagation();
        setFontSizeEditing(false);
        if (editor) {
          const n = parseInt(value, 10);
          if (!isNaN(n) && n >= 6 && n <= 144) {
            if (!editor.state.selection.empty) {
              editor.chain().setFontSize(`${n}px`).run();
            } else if (blockId && updateBlock) {
              updateBlock(blockId, { fontSize: n } as Partial<TextBlock>);
            }
          } else if (value === '' && !editor.state.selection.empty) {
            editor.chain().unsetFontSize().run();
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault(); e.stopImmediatePropagation();
        setFontSizeEditing(false);
        setLocalFontSize('');
      }
      // Any other printable key: cancel editing, let event reach editor
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [fontSizeEditing]);

  // ── Font-size fake-input: cancel when clicking outside the widget ─────────
  useEffect(() => {
    if (!fontSizeEditing) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!fontSizeWidgetRef.current?.contains(e.target as Node)) {
        const { value, editor, blockId, updateBlock } = fontSizeEditRef.current;
        setFontSizeEditing(false);
        if (editor && value !== '') {
          const n = parseInt(value, 10);
          if (!isNaN(n) && n >= 6 && n <= 144) {
            if (!editor.state.selection.empty) {
              editor.chain().setFontSize(`${n}px`).run();
            } else if (blockId && updateBlock) {
              updateBlock(blockId, { fontSize: n } as Partial<TextBlock>);
            }
          }
        }
      }
    };
    document.addEventListener('mousedown', onMouseDown, true);
    return () => document.removeEventListener('mousedown', onMouseDown, true);
  }, [fontSizeEditing]);

  // When focus leaves the toolbar to somewhere that is neither the toolbar
  // nor a TipTap editor, trigger deactivation (covers the link-input case).
  const handleToolbarFocusOut = useCallback((e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as Element | null;
    if (!relatedTarget) {
      unregisterEditor();
      return;
    }
    const toolbar = toolbarRef.current;
    if (
      !toolbar?.contains(relatedTarget) &&
      !relatedTarget.closest?.('.ProseMirror') &&
      !relatedTarget.closest?.('.pdfb-link-popover')
    ) {
      unregisterEditor();
    }
  }, [unregisterEditor]);

  // ── Handlers (must be declared before any early return) ────
  // NOTE: deliberately no .focus() calls — these fire from within the toolbar
  // and calling .focus() would steal focus from inputs (font size, color hex).
  const applyTextColor = useCallback((color: string) => {
    if (!activeEditor) return;
    if (activeEditor.state.selection.empty) {
      // No text selected → update block-level color (same as right drawer)
      if (activeBlockId) updateContentBlock(activeBlockId, { fontColor: color } as Partial<TextBlock>);
    } else {
      activeEditor.chain().setColor(color).run();
    }
  }, [activeEditor, activeBlockId, updateContentBlock]);

  const applyLineHeight = useCallback((value: string) => {
    if (!activeEditor) return;
    if (activeEditor.state.selection.empty) {
      // No text selected → update block-level lineHeight
      if (activeBlockId && value) updateContentBlock(activeBlockId, { lineHeight: parseFloat(value) } as Partial<TextBlock>);
    } else {
      if (!value) activeEditor.chain().unsetLineHeight().run();
      else activeEditor.chain().setLineHeight(value).run();
    }
  }, [activeEditor, activeBlockId, updateContentBlock]);

  const applyBqColor = useCallback((color: string) => {
    (activeEditor?.chain() as any).setBlockquoteBorderColor(color).run();
  }, [activeEditor]);

  if (!activeEditor) return null;

  // ── Derived state ──────────────────────────────────────────
  const currentTextColor: string =
    activeEditor.getAttributes('textStyle').color || activeBlock?.fontColor || '#ffffff';

  const currentFontSizeStr: string =
    activeEditor.getAttributes('textStyle').fontSize || '';
  // Convert "16px" → "16"; fall back to block-level fontSize when no mark
  const currentFontSizePx =
    currentFontSizeStr ? parseInt(currentFontSizeStr, 10) || '' : (activeBlock?.fontSize ?? '');

  const currentLineHeight: string =
    activeEditor.getAttributes('textStyle').lineHeight || String(activeBlock?.lineHeight ?? '');

  const inBlockquote = activeEditor.isActive('blockquote');
  const currentBqColor: string =
    activeEditor.getAttributes('blockquote').borderColor || DEFAULT_BLOCKQUOTE_COLOR;

  const toolbar = (
    <div
      ref={toolbarRef}
      id="pdfb-text-format-toolbar"
      className="pdfb-text-format-toolbar"
      onBlur={handleToolbarFocusOut}
    >
      {/* ── Inline formatting ── */}
      <ToolbarBtn
        active={activeEditor.isActive('bold')}
        onClick={() => activeEditor.chain().focus().toggleBold().run()}
        title="Negrito (Ctrl+B)"
      ><Bold size={14} /></ToolbarBtn>

      <ToolbarBtn
        active={activeEditor.isActive('italic')}
        onClick={() => activeEditor.chain().focus().toggleItalic().run()}
        title="Itálico (Ctrl+I)"
      ><Italic size={14} /></ToolbarBtn>

      <ToolbarBtn
        active={activeEditor.isActive('underline')}
        onClick={() => activeEditor.chain().focus().toggleUnderline().run()}
        title="Sublinhado (Ctrl+U)"
      ><UnderlineIcon size={14} /></ToolbarBtn>

      <ToolbarBtn
        active={activeEditor.isActive('strike')}
        onClick={() => activeEditor.chain().focus().toggleStrike().run()}
        title="Tachado"
      ><Strikethrough size={14} /></ToolbarBtn>

      <span className="pdfb-bubble-sep" />

      {/* ── Text color ── */}
      <div className="pdfb-toolbar-color-wrap">
        <button
          ref={textColorBtnRef}
          type="button"
          className="pdfb-bubble-btn"
          title="Cor do texto"
          onMouseDown={e => e.preventDefault()}
          onClick={() => {
            setShowBqColorPicker(false);
            setShowLinkPopover(false);
            setShowTextColorPicker(v => !v);
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Baseline size={13} />
            <span className="pdfb-color-indicator" style={{ background: currentTextColor }} />
          </div>
        </button>
        {showTextColorPicker && (
          <ColorPopover
            anchorRef={textColorBtnRef}
            color={currentTextColor}
            onChange={applyTextColor}
            onClose={() => setShowTextColorPicker(false)}
          />
        )}
      </div>

      <span className="pdfb-bubble-sep" />

      {/* ── Font size (fake input — editor stays focused) ── */}
      <div
        ref={fontSizeWidgetRef}
        className="pdfb-toolbar-input-wrap"
        title="Tamanho da fonte"
      >
        <CaseSensitive size={13} style={{ color: 'var(--pdfb-color-overlay-text-muted)', flexShrink: 0 }} />
        <div
          className={`pdfb-toolbar-number-input${fontSizeEditing ? ' pdfb-toolbar-number-input--editing' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            if (!fontSizeEditing) {
              setLocalFontSize(currentFontSizePx !== '' ? String(currentFontSizePx) : '');
              setFontSizeEditing(true);
            }
          }}
        >
          {fontSizeEditing ? (localFontSize || ' ') : (currentFontSizePx || '–')}
          {fontSizeEditing && <span className="pdfb-font-size-cursor" aria-hidden="true" />}
        </div>        <button
          type="button"
          className="pdfb-toolbar-reset-btn"
          title="Usar tamanho padrão da página"
          onMouseDown={e => {
            e.preventDefault();
            e.stopPropagation();
            if (activeEditor && activeBlockId && updateContentBlock) {
              if (!activeEditor.state.selection.empty) {
                activeEditor.chain().unsetFontSize().run();
              } else {
                updateContentBlock(activeBlockId, { fontSize: undefined } as Partial<TextBlock>);
              }
            }
          }}
        >
          <X size={11} />
        </button>      </div>

      <span className="pdfb-bubble-sep" />

      {/* ── Line height ── */}
      <div className="pdfb-toolbar-input-wrap" title="Altura da linha">
        <span style={{ fontSize: 10, color: 'var(--pdfb-color-overlay-text-muted)', letterSpacing: '-0.5px', flexShrink: 0 }}>
          LH
        </span>
        <select
          className="pdfb-toolbar-select"
          value={currentLineHeight}
          onMouseDown={e => e.stopPropagation()}
          onChange={e => applyLineHeight(e.target.value)}
        >
          <option value="">–</option>
          <option value="1">1</option>
          <option value="1.2">1.2</option>
          <option value="1.4">1.4</option>
          <option value="1.5">1.5</option>
          <option value="1.6">1.6</option>
          <option value="1.8">1.8</option>
          <option value="2">2</option>
          <option value="2.5">2.5</option>
        </select>
      </div>

      <span className="pdfb-bubble-sep" />

      {/* ── Headings ── */}
      <ToolbarBtn
        active={activeEditor.isActive('heading', { level: 1 })}
        onClick={() => activeEditor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Título 1"
      ><Heading1 size={14} /></ToolbarBtn>

      <ToolbarBtn
        active={activeEditor.isActive('heading', { level: 2 })}
        onClick={() => activeEditor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Título 2"
      ><Heading2 size={14} /></ToolbarBtn>

      <ToolbarBtn
        active={activeEditor.isActive('heading', { level: 3 })}
        onClick={() => activeEditor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Título 3"
      ><Heading3 size={14} /></ToolbarBtn>

      <span className="pdfb-bubble-sep" />

      {/* ── Lists & quote ── */}
      <ToolbarBtn
        active={activeEditor.isActive('bulletList')}
        onClick={() => activeEditor.chain().focus().toggleBulletList().run()}
        title="Lista"
      ><List size={14} /></ToolbarBtn>

      <ToolbarBtn
        active={activeEditor.isActive('orderedList')}
        onClick={() => activeEditor.chain().focus().toggleOrderedList().run()}
        title="Lista numerada"
      ><ListOrdered size={14} /></ToolbarBtn>

      {/* Blockquote toggle + color */}
      <div className="pdfb-toolbar-color-wrap">
        <ToolbarBtn
          active={inBlockquote}
          onClick={() => activeEditor.chain().focus().toggleBlockquote().run()}
          title="Citação"
        ><Quote size={14} /></ToolbarBtn>
        {inBlockquote && (
          <button
            ref={bqColorBtnRef}
            type="button"
            className="pdfb-bq-color-btn"
            title="Cor da citação"
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              setShowTextColorPicker(false);
              setShowLinkPopover(false);
              setShowBqColorPicker(v => !v);
            }}
            style={{ background: currentBqColor }}
          />
        )}
        {showBqColorPicker && (
          <ColorPopover
            anchorRef={bqColorBtnRef}
            color={currentBqColor}
            onChange={applyBqColor}
            onClose={() => setShowBqColorPicker(false)}
          />
        )}
      </div>

      <span className="pdfb-bubble-sep" />

      {/* ── Alignment ── */}
      <ToolbarBtn
        active={activeEditor.isActive({ textAlign: 'left' })}
        onClick={() => activeEditor.chain().focus().setTextAlign('left').run()}
        title="Alinhar esquerda"
      ><AlignLeft size={14} /></ToolbarBtn>

      <ToolbarBtn
        active={activeEditor.isActive({ textAlign: 'center' })}
        onClick={() => activeEditor.chain().focus().setTextAlign('center').run()}
        title="Centralizar"
      ><AlignCenter size={14} /></ToolbarBtn>

      <ToolbarBtn
        active={activeEditor.isActive({ textAlign: 'right' })}
        onClick={() => activeEditor.chain().focus().setTextAlign('right').run()}
        title="Alinhar direita"
      ><AlignRight size={14} /></ToolbarBtn>

      <ToolbarBtn
        active={activeEditor.isActive({ textAlign: 'justify' })}
        onClick={() => activeEditor.chain().focus().setTextAlign('justify').run()}
        title="Justificar"
      ><AlignJustify size={14} /></ToolbarBtn>

      <span className="pdfb-bubble-sep" />

      {/* ── Link & clear ── */}
      <button
        ref={linkBtnRef}
        type="button"
        className={`pdfb-bubble-btn${activeEditor.isActive('link') ? ' active' : ''}`}
        title="Link"
        onMouseDown={e => e.preventDefault()}
        onClick={() => {
          setShowTextColorPicker(false);
          setShowBqColorPicker(false);
          setShowLinkPopover(v => !v);
        }}
      ><LinkIcon size={14} /></button>
      {showLinkPopover && (
        <LinkPopover
          anchorRef={linkBtnRef}
          isActive={activeEditor.isActive('link')}
          currentHref={activeEditor.getAttributes('link').href || ''}
          onSet={href => {
            if (href.trim()) activeEditor.chain().focus().extendMarkRange('link').setLink({ href: href.trim() }).run();
            else activeEditor.chain().focus().extendMarkRange('link').unsetLink().run();
            setShowLinkPopover(false);
          }}
          onRemove={() => {
            activeEditor.chain().focus().extendMarkRange('link').unsetLink().run();
            setShowLinkPopover(false);
          }}
          onClose={() => setShowLinkPopover(false)}
        />
      )}

      <ToolbarBtn
        onClick={() => activeEditor.chain().focus().clearNodes().unsetAllMarks().run()}
        title="Limpar formatação"
      ><RemoveFormatting size={14} /></ToolbarBtn>
    </div>
  );

  // Portal to body so `position: fixed` is never affected by ancestor overflow/transform.
  return createPortal(toolbar, document.body);
}
