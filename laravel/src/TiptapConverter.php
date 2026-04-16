<?php

declare(strict_types=1);

namespace PdfBlock\Laravel;

use Tiptap\Editor;

/**
 * Converts TipTap ProseMirror JSON into HTML.
 *
 * Uses the official ueberdosis/tiptap-php package which supports the same
 * extensions as the React editor (StarterKit, TextAlign, Underline, Link, Image).
 */
class TiptapConverter
{
    private Editor $editor;

    public function __construct()
    {
        $this->editor = new Editor([
            'extensions' => [
                new \Tiptap\Extensions\StarterKit,
                new \Tiptap\Marks\Underline,
                new \Tiptap\Marks\Link,
                new \Tiptap\Nodes\Image,
                new \Tiptap\Marks\TextStyle,
            ],
        ]);
    }

    /**
     * Convert ProseMirror JSON to HTML string.
     */
    public function toHtml(array|string $content): string
    {
        if (is_string($content)) {
            $content = json_decode($content, true);
        }

        if (empty($content)) {
            return '';
        }

        return $this->editor->setContent($content)->getHTML();
    }
}
