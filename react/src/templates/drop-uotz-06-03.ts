/**
 * Template: Drop UOTZ — Edição 06/03
 * Newsletter sobre seguros e proteção de renda.
 */
import type { Template } from '../templates';
import type { Document } from '../dsl';
import { uid } from '../utils';
import docData from './drop-uotz-06-03.json';

/**
 * Deep-clone the document and regenerate all block/column IDs
 * so each template application is independent.
 */
function cloneWithNewIds(doc: Document): Document {
  const clone: Document = JSON.parse(JSON.stringify(doc));
  clone.id = uid();
  for (const stripe of clone.blocks) {
    stripe.id = uid();
    for (const structure of stripe.children) {
      structure.id = uid();
      for (const col of structure.columns) {
        col.id = uid();
        for (const block of col.children) {
          block.id = uid();
        }
      }
    }
  }
  return clone;
}

export const dropUotz0603Template: Template = {
  id: 'builtin-drop-uotz-06-03',
  name: 'Drop UOTZ — Edição 06/03',
  description: 'O futuro não é pagar indenização. É proteger renda e padrão de vida hoje',
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
  get document() {
    return cloneWithNewIds(docData as unknown as Document);
  },
  builtIn: true,
};
