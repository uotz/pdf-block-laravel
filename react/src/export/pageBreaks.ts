/**
 * Shared page-break calculation used by:
 *  - CanvasArea (visual indicator)
 *  - exportToPDF (programmatic PDF slicing)
 *  - openPrintWindow (CSS break-before rules injected into the print mount)
 *
 * All three consumers pass the SAME stripe heights (measured from the live
 * DOM after layout, fonts, and images have rendered) so the three views are
 * always in sync.
 */

import type { StripeBlock } from '../types';

export interface PageBreak {
  /** Index of the stripe that starts the new page (0-based in doc.blocks) */
  stripeIndex: number;
  stripeId: string;
  /** Y position of the cut in CONTENT SPACE (0 = top of content, no margin offset) */
  cutY: number;
  /** 1-based page number that comes BEFORE this cut */
  pageNum: number;
}

/**
 * Compute page-cut positions from measured stripe heights.
 *
 * Algorithm (same priority order in all three views):
 *  1. meta.breakBefore → explicit cut immediately before the stripe
 *  2. stripe overflows current page → smart cut before the stripe
 *  3. stripe taller than one page → hard cut at page boundary
 *  4. meta.breakAfter → cut immediately after the stripe
 *
 * @param stripes       flat list of stripe blocks (doc.blocks)
 * @param heights       { stripeId → rendered height in CSS px }
 * @param contentHeightPx  usable content area height per page (px, WITHOUT margins)
 */
export function computePageBreaks(
  stripes: StripeBlock[],
  heights: Record<string, number>,
  contentHeightPx: number,
): PageBreak[] {
  const breaks: PageBreak[] = [];
  let accumY    = 0;   // running y in content-space
  let pageStart = 0;   // y where current page started
  let pageNum   = 1;

  const addBreak = (stripeIndex: number, stripeId: string, cutY: number) => {
    breaks.push({ stripeIndex, stripeId, cutY, pageNum });
    pageNum++;
    pageStart = cutY;
  };

  for (let i = 0; i < stripes.length; i++) {
    const stripe = stripes[i];
    const h      = heights[stripe.id] ?? 0;
    const top    = accumY;
    const bottom = accumY + h;

    // 1. Explicit break-before
    if (stripe.meta.breakBefore && top > pageStart) {
      addBreak(i, stripe.id, top);
    }

    // 2 & 3. Overflow handling
    if (bottom > pageStart + contentHeightPx) {
      if (top > pageStart) {
        // Smart break: the whole stripe moves to the next page
        addBreak(i, stripe.id, top);
      }
      // Hard cuts for stripes taller than one page
      while (bottom > pageStart + contentHeightPx) {
        addBreak(i, stripe.id, pageStart + contentHeightPx);
      }
    }

    accumY = bottom;

    // 4. Explicit break-after
    if (stripe.meta.breakAfter && bottom > pageStart) {
      addBreak(i + 1, stripes[i + 1]?.id ?? '', bottom);
    }
  }

  return breaks;
}

/**
 * Measure rendered heights of every stripe by reading from the LIVE DOM.
 *
 * Uses the direct children of .pdfb-page-content (StripeHeightTracker
 * wrappers), which have already been laid out with real images + fonts.
 * Index i corresponds to doc.blocks[i].
 */
export function measureStripeHeights(
  pageElement: HTMLElement,
  stripes: StripeBlock[],
): Record<string, number> {
  const heights: Record<string, number> = {};
  const pageContent = pageElement.querySelector('.pdfb-page-content');
  if (!pageContent) return heights;

  const children = Array.from(pageContent.children) as HTMLElement[];
  stripes.forEach((stripe, i) => {
    if (children[i]) {
      heights[stripe.id] = children[i].offsetHeight;
    }
  });
  return heights;
}
