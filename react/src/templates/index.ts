/**
 * Built-in templates — templates de sistema pré-definidos.
 * São read-only: o usuário não pode excluir nem renomear.
 */
import type { Template } from '../templates';
import { newsletterTemplate } from './newsletter';
import { dropUotz0603Template } from './drop-uotz-06-03';

export const BUILTIN_TEMPLATES: Template[] = [
  newsletterTemplate,
  dropUotz0603Template,
];
