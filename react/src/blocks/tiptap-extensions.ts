import Blockquote from '@tiptap/extension-blockquote';

// ─── Command type augmentation ────────────────────────────────
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    coloredBlockquote: {
      /** Change the left-border colour of the blockquote containing the cursor. */
      setBlockquoteBorderColor: (color: string | null) => ReturnType;
    };
  }
}

// ─── ColoredBlockquote ────────────────────────────────────────
// Extends TipTap's default Blockquote node with an optional left-border colour.
// Accepts `defaultBorderColor` via `.configure({ defaultBorderColor: '#ccc' })`.
export const ColoredBlockquote = Blockquote.extend({
  addOptions() {
    return {
      ...(this.parent?.() ?? {}),
      defaultBorderColor: null,
    } as any;
  },

  addAttributes() {
    const defaultColor = (this.options as any).defaultBorderColor as string | null;
    return {
      ...(this.parent?.() ?? {}),
      borderColor: {
        default: null,
        parseHTML: (el: HTMLElement) =>
          el.getAttribute('data-border-color') || null,
        renderHTML: (attrs: Record<string, string | null>) => {
          const color = attrs.borderColor || defaultColor;
          if (!color) return {};
          return {
            'data-border-color': attrs.borderColor || '',
            style: `border-left-color: ${color}`,
          };
        },
      },
    };
  },

  addCommands() {
    return {
      ...(this.parent?.() ?? {}),
      setBlockquoteBorderColor:
        (color: string | null) =>
        ({ commands }: any) =>
          commands.updateAttributes('blockquote', { borderColor: color }),
    };
  },
});
