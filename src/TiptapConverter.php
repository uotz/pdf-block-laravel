<?php

declare(strict_types=1);

namespace PdfBlock\Laravel;

use Tiptap\Editor;

/**
 * Converts TipTap ProseMirror JSON into HTML.
 *
 * Uses the official ueberdosis/tiptap-php package which supports the same
 * extensions as the React editor (StarterKit, TextAlign, Underline, Link, Image).
 *
 * Extension notes:
 * - TextAlign MUST list the node types it targets; omitting 'types' → no-op.
 * - ColoredBlockquote replaces StarterKit's built-in Blockquote so the
 *   custom `borderColor` attribute (from the React ColoredBlockquote extension)
 *   is serialised as an inline `border-left-color` style.
 * - Color / FontFamily default to types=['textStyle'] which is correct.
 */
class TiptapConverter
{
    private Editor $editor;

    public function __construct()
    {
        $this->editor = new Editor([
            'extensions' => [
                // Disable built-in Blockquote — we use ColoredBlockquote below.
                new \Tiptap\Extensions\StarterKit(['blockquote' => false]),

                // TextAlign MUST receive the node types it applies to.
                new \Tiptap\Extensions\TextAlign(['types' => ['heading', 'paragraph']]),

                new \Tiptap\Extensions\Color,
                new \Tiptap\Extensions\FontFamily,
                new \Tiptap\Marks\Underline,
                new \Tiptap\Marks\Link,
                new \Tiptap\Nodes\Image,
                new \Tiptap\Marks\TextStyle,

                // Handles fontSize, lineHeight, letterSpacing on textStyle spans.
                new TextStyleAttributes,

                // Custom blockquote that carries the borderColor attribute.
                new ColoredBlockquote,
            ],
        ]);
    }

    /**
     * Convert ProseMirror JSON to HTML string.
     *
     * Post-processing:
     * - Empty <p></p> → <p><br></p> so Chromium renders them with line height
     *   (mirrors TipTap's browser behaviour of inserting a <br> in empty blocks).
     */
    public function toHtml(array|string $content): string
    {
        if (is_string($content)) {
            $content = json_decode($content, true);
        }

        if (empty($content)) {
            return '';
        }

        $html = $this->editor->setContent($content)->getHTML();

        // Ensure empty paragraphs have height in headless Chromium.
        $html = str_replace('<p></p>', '<p><br></p>', $html);

        return $html;
    }
}
