import React, { useCallback, useContext, useRef, useEffect } from 'react';
import { useImageLibrary } from '../components/ImageLibrary';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TiptapImage from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle, Color, FontSize, LineHeight } from '@tiptap/extension-text-style';
import { ColoredBlockquote } from './tiptap-extensions';
import {
  Image as ImageIcon, QrCode, BarChart3,
} from 'lucide-react';
import { blockStylesToCSS, edgeToCSS, borderSideToCSS, cornersToCSS, shadowToCSS, backgroundToCSS } from '../utils';
import { useEditorStore } from '../store';
import { t } from '../i18n';
import { ActiveEditorCtx } from '../components/ActiveEditorContext';
import type {
  ContentBlock, TextBlock, ImageBlock, ButtonBlock, DividerBlock,
  SpacerBlock, TableBlock, QRCodeBlock, ChartBlock,
  PageBreakBlock,
} from '../types';

// ─── Text Block ───────────────────────────────────────────────
export function TextBlockRenderer({ block }: { block: TextBlock }) {
  const updateContentBlock = useEditorStore(s => s.updateContentBlock);
  const { registerEditor, unregisterEditor } = useContext(ActiveEditorCtx);
  const isLocked = block.meta.locked;
  const blockquoteBorderColor = useEditorStore(s => s.document.globalStyles.blockquoteBorderColor);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        bulletList: {},
        orderedList: {},
        blockquote: false, // replaced by ColoredBlockquote below
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'pdfb-link' } }),
      TiptapImage,
      Placeholder.configure({ placeholder: 'Digite seu texto aqui...' }),
      TextStyle,
      Color,
      FontSize,
      LineHeight,
      ColoredBlockquote.configure({ defaultBorderColor: blockquoteBorderColor || null } as any),
    ],
    content: block.content as Record<string, unknown>,
    editable: !isLocked,
    onFocus: ({ editor: e }) => { registerEditor(e, block.id); },
    onBlur: () => { unregisterEditor(); },
    onUpdate: ({ editor: e }) => {
      if (isLocked) return;
      updateContentBlock(block.id, { content: e.getJSON() } as Partial<TextBlock>);
    },
  });

  // Sync editable state when lock changes
  React.useEffect(() => {
    if (editor) editor.setEditable(!isLocked);
  }, [editor, isLocked]);

  const style: React.CSSProperties = {
    ...blockStylesToCSS(block.styles),
    fontSize: block.fontSize || undefined,
    fontWeight: block.fontWeight,
    color: block.fontColor || undefined,
    lineHeight: block.lineHeight,
    letterSpacing: block.letterSpacing ? `${block.letterSpacing}px` : undefined,
    textAlign: block.textAlign,
    textTransform: block.textTransform,
  };

  return (
    <div style={style} onMouseDown={e => e.stopPropagation()}>
      <EditorContent editor={editor} />
    </div>
  );
}

// ─── Image Block ──────────────────────────────────────────────
export function ImageBlockRenderer({ block, isLocked: lockedProp = false }: { block: ImageBlock; isLocked?: boolean }) {
  const s = block.styles;
  const justify = block.alignment === 'left' ? 'flex-start' : block.alignment === 'right' ? 'flex-end' : 'center';
  // Effective lock from prop (inherited) OR own meta
  const isLocked = lockedProp || block.meta.locked;
  const { openLibrary } = useImageLibrary();

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    openLibrary({ targetBlockId: block.id });
  }, [isLocked, openLibrary, block.id]);

  // Outer wrapper: spacing + background + opacity only
  const outerStyle: React.CSSProperties = {
    padding: edgeToCSS(s.padding),
    margin: edgeToCSS(s.margin),
    opacity: s.opacity,
    ...backgroundToCSS(s.background),
    display: 'flex',
    justifyContent: justify,
  };

  // Applied directly to <img>: border, borderRadius, boxShadow
  const imgStyle: React.CSSProperties = {
    width:  block.width  === 'auto' ? 'auto' : block.width === 'full' ? '100%' : `${block.width}px`,
    height: block.height === 'auto' ? 'auto' : `${block.height}px`,
    objectFit: block.objectFit,
    maxWidth: '100%',
    display: 'block',
    borderTop:    borderSideToCSS(s.border.top),
    borderRight:  borderSideToCSS(s.border.right),
    borderBottom: borderSideToCSS(s.border.bottom),
    borderLeft:   borderSideToCSS(s.border.left),
    borderRadius: cornersToCSS(s.borderRadius),
    boxShadow:    shadowToCSS(s.shadow),
  };

  return (
    <div
      className="pdfb-block-image"
      style={outerStyle}
      onDoubleClick={handleDoubleClick}
      title={block.src && !isLocked ? 'Duplo clique para trocar imagem' : undefined}
    >
      {!block.src ? (
        <div className="pdfb-block-image-placeholder">
          <ImageIcon size={32} />
          <span>{t('image.upload')}</span>
          {!isLocked && <span style={{ fontSize: 10, opacity: 0.7 }}>Duplo clique para selecionar</span>}
        </div>
      ) : (
        <img
          src={block.src}
          alt={block.alt}
          title={block.title}
          style={imgStyle}
          draggable={false}
        />
      )}
    </div>
  );
}

// ─── Button Block ─────────────────────────────────────────────
export function ButtonBlockRenderer({ block }: { block: ButtonBlock }) {
  const outerStyle = blockStylesToCSS(block.styles);
  const justify = block.alignment === 'left' ? 'flex-start' : block.alignment === 'right' ? 'flex-end' : 'center';

  const btnStyle: React.CSSProperties = {
    fontSize: block.fontSize,
    fontWeight: block.fontWeight,
    color: block.fontColor,
    backgroundColor: block.bgColor,
    border: block.borderWidth > 0 ? `${block.borderWidth}px solid ${block.borderColor}` : 'none',
    borderRadius: cornersToCSS(block.borderRadius),
    padding: `${block.paddingV}px ${block.paddingH}px`,
    width: block.fullWidth ? '100%' : 'auto',
    display: block.fullWidth ? 'block' : 'inline-block',
    textDecoration: 'none',
    textAlign: 'center',
  };

  return (
    <div
      className="pdfb-block-button-wrapper"
      style={{ ...outerStyle, justifyContent: justify }}
      data-button-url={block.url}
      data-button-target={block.target}
    >
      <a
        className="pdfb-block-button"
        href={block.url || '#'}
        target={block.target}
        style={btnStyle}
        onClick={e => e.preventDefault()}
      >
        {block.text}
      </a>
    </div>
  );
}

// ─── Divider Block ────────────────────────────────────────────
export function DividerBlockRenderer({ block }: { block: DividerBlock }) {
  const style = blockStylesToCSS(block.styles);
  const justify = block.alignment === 'left' ? 'flex-start' : block.alignment === 'right' ? 'flex-end' : 'center';

  return (
    <div className="pdfb-block-divider" style={{ ...style, justifyContent: justify }}>
      <hr
        className="pdfb-block-divider-line"
        style={{
          width: `${block.widthPercent}%`,
          border: 'none',
          borderTop: `${block.thickness}px ${block.lineStyle} ${block.color}`,
          margin: 0,
        }}
      />
    </div>
  );
}

// ─── Spacer Block ─────────────────────────────────────────────
export function SpacerBlockRenderer({ block }: { block: SpacerBlock }) {
  return (
    <div
      className="pdfb-block-spacer"
      style={{ ...blockStylesToCSS(block.styles), height: block.height }}
    />
  );
}

// ─── Table helpers ───────────────────────────────────────────
function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function TableCell({ value, isHeader, isLocked, onCommit, cellStyle }: {
  value: string;
  isHeader: boolean;
  isLocked: boolean;
  onCommit: (v: string) => void;
  cellStyle: React.CSSProperties;
}) {
  const ref = useRef<HTMLTableCellElement>(null);
  const Tag = isHeader ? 'th' as const : 'td' as const;
  return (
    <Tag
      ref={ref}
      contentEditable={!isLocked}
      suppressContentEditableWarning
      onBlur={e => onCommit(e.currentTarget.innerText)}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur(); }
        if (e.key === 'Escape') {
          if (ref.current) ref.current.innerText = value;
          (e.target as HTMLElement).blur();
        }
      }}
      style={cellStyle}
      // dangerouslySetInnerHTML keeps React from overwriting the DOM while
      // the user is typing (React only updates when __html string changes).
      dangerouslySetInnerHTML={{ __html: escapeHtml(value) }}
    />
  );
}

// ─── Table Block ──────────────────────────────────────────────
export function TableBlockRenderer({ block, isLocked = false }: { block: TableBlock; isLocked?: boolean }) {
  const updateContentBlock = useEditorStore(s => s.updateContentBlock);
  const style = blockStylesToCSS(block.styles);

  const handleCommit = useCallback((ri: number, ci: number, value: string) => {
    if (value === block.rows[ri]?.[ci]) return;
    const newRows = block.rows.map((row, r) =>
      row.map((cell, c) => (r === ri && c === ci) ? value : cell)
    );
    updateContentBlock(block.id, { rows: newRows } as Partial<TableBlock>);
  }, [block.rows, block.id, updateContentBlock]);

  const borderStyle: React.CSSProperties = block.borderWidth > 0
    ? { borderStyle: 'solid' as const, borderWidth: block.borderWidth, borderColor: block.borderColor }
    : { borderWidth: 0, borderStyle: 'none' as const };

  return (
    <div className="pdfb-block-table" style={style}>
      <table style={{
        fontSize: block.fontSize,
        color: block.fontColor || undefined,
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
      }}>
        <tbody>
          {block.rows.map((row, ri) => {
            const isHeaderRow = ri === 0 && block.headerRow;
            const isStriped = block.stripedRows && !isHeaderRow && ri % 2 === (block.headerRow ? 0 : 1);
            const rowBg = isHeaderRow ? block.headerBgColor : isStriped ? block.stripedColor : undefined;
            return (
              <tr key={ri} style={{ backgroundColor: rowBg }}>
                {row.map((cell, ci) => (
                  <TableCell
                    key={ci}
                    value={cell}
                    isHeader={isHeaderRow}
                    isLocked={isLocked}
                    onCommit={v => handleCommit(ri, ci, v)}
                    cellStyle={{
                      ...borderStyle,
                      padding: block.cellPadding,
                      color: isHeaderRow ? block.headerFontColor : block.fontColor,
                      fontWeight: isHeaderRow ? 600 : undefined,
                      verticalAlign: 'top',
                      wordBreak: 'break-word',
                    }}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── QR Code Block ────────────────────────────────────────────
export function QRCodeBlockRenderer({ block }: { block: QRCodeBlock }) {
  const style = blockStylesToCSS(block.styles);
  const justify = block.alignment === 'left' ? 'flex-start' : block.alignment === 'right' ? 'flex-end' : 'center';

  return (
    <div style={{ ...style, display: 'flex', justifyContent: justify }}>
      <div
        style={{
          width: block.size, height: block.size,
          backgroundColor: block.bgColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${block.fgColor}20`,
          borderRadius: 4,
        }}
      >
        <QrCode size={block.size * 0.7} color={block.fgColor} />
      </div>
    </div>
  );
}

// ─── Chart Block ──────────────────────────────────────────────
export function ChartBlockRenderer({ block }: { block: ChartBlock }) {
  const style = blockStylesToCSS(block.styles);
  const maxValue = Math.max(...block.data.map(d => d.value), 1);

  return (
    <div style={{ ...style, width: block.width, margin: '0 auto' }}>
      {block.title && (
        <div style={{ textAlign: 'center', fontWeight: 600, marginBottom: 12, fontSize: 14 }}>
          {block.title}
        </div>
      )}
      {block.chartType === 'bar' && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: block.height - 40, justifyContent: 'center' }}>
          {block.data.map((d, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 40, backgroundColor: d.color || '#5b8cff',
                  height: `${(d.value / maxValue) * 100}%`,
                  borderRadius: '4px 4px 0 0',
                  minHeight: 4,
                }}
              />
              <span style={{ fontSize: 11 }}>{d.label}</span>
            </div>
          ))}
        </div>
      )}
      {block.chartType === 'pie' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BarChart3 size={64} color="var(--pdfb-color-text-secondary)" />
        </div>
      )}
    </div>
  );
}

// ─── Page Break Block ─────────────────────────────────────────
export function PageBreakBlockRenderer({ block }: { block: PageBreakBlock }) {
  return <div className="pdfb-block-pagebreak" data-label={t('block.pagebreak')} />;
}

// ─── Master Renderer ──────────────────────────────────────────
export function renderContentBlock(block: ContentBlock, isLocked = false): React.ReactNode {
  switch (block.type) {
    case 'text':      return <TextBlockRenderer block={block} />;
    case 'image':     return <ImageBlockRenderer block={block} isLocked={isLocked} />;
    case 'button':    return <ButtonBlockRenderer block={block} />;
    case 'divider':   return <DividerBlockRenderer block={block} />;
    case 'spacer':    return <SpacerBlockRenderer block={block} />;
    case 'table':     return <TableBlockRenderer block={block} isLocked={isLocked} />;
    case 'qrcode':    return <QRCodeBlockRenderer block={block} />;
    case 'chart':     return <ChartBlockRenderer block={block} />;
    case 'pagebreak': return <PageBreakBlockRenderer block={block} />;
    default:          return <div>Bloco desconhecido: {(block as ContentBlock).type}</div>;
  }
}
