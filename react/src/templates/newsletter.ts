/**
 * Template: Newsletter / Drop Informativo
 * Baseado em newsletter exportada do editor, com dados estáticos.
 */
import type { Template } from '../templates';
import type { Document } from '../dsl';
import { uid } from '../utils';
import docData from './newsletter-data.json';

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

export const newsletterTemplate: Template = {
  id: 'builtin-newsletter-drop',
  name: 'Newsletter — Drop Setorial',
  description: 'Newsletter corporativa com análise de mercado em 5 seções, destaques e CTA',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  get document() {
    return cloneWithNewIds(docData as unknown as Document);
  },
  builtIn: true,
};
