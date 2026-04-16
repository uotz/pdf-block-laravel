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
export const ColoredBlockquote = Blockquote.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      borderColor: {
        default: null,
        parseHTML: (el: HTMLElement) =>
          el.getAttribute('data-border-color') || null,
        renderHTML: (attrs: Record<string, string | null>) => {
          if (!attrs.borderColor) return {};
          return {
            'data-border-color': attrs.borderColor,
            style: `border-left-color: ${attrs.borderColor}`,
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
