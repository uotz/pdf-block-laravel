// ─── Template System ──────────────────────────────────────────
// Extensible template persistence with pluggable adapters.
// Default: localStorage. Override via PDFBuilderConfig.templateAdapter.

import type { Document } from './dsl';

// ─── Types ────────────────────────────────────────────────────

export interface Template {
  id: string;
  name: string;
  /** Optional thumbnail URL (base64 data-url or remote) */
  thumbnail?: string;
  /** Optional description */
  description?: string;
  /** ISO date string */
  createdAt: string;
  /** ISO date string */
  updatedAt: string;
  /** The full document snapshot */
  document: Document;
  /** Whether this is a built-in (non-deletable) template */
  builtIn?: boolean;
}

/**
 * Adapter interface for template persistence.
 * Implement this to plug in any backend (REST API, GraphQL, IndexedDB, etc.).
 * All methods return Promises so both sync and async implementations work.
 */
export interface TemplateAdapter {
  /** List all templates (built-in + user-saved). */
  list(): Promise<Template[]>;
  /** Save a new template. Returns the persisted template (with generated id if needed). */
  save(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template>;
  /** Delete a template by id. Built-in templates should not be deletable. */
  delete(id: string): Promise<void>;
  /** Optional: update an existing template. */
  update?(id: string, updates: Partial<Pick<Template, 'name' | 'description' | 'thumbnail' | 'document'>>): Promise<Template>;
}

// ─── localStorage Adapter ─────────────────────────────────────

const STORAGE_KEY = 'pdfb-templates';

function uid(): string {
  return crypto.randomUUID?.() ?? `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readStorage(): Template[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStorage(templates: Template[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

/**
 * Default adapter that persists user templates in localStorage.
 * Built-in templates are NOT stored here — they're injected via
 * `PDFBuilderConfig.templates` and merged at the hook level.
 */
export const localStorageTemplateAdapter: TemplateAdapter = {
  async list() {
    return readStorage();
  },

  async save(input) {
    const now = new Date().toISOString();
    const template: Template = {
      ...input,
      id: uid(),
      createdAt: now,
      updatedAt: now,
    };
    const list = readStorage();
    list.unshift(template);
    writeStorage(list);
    return template;
  },

  async delete(id) {
    const list = readStorage().filter(t => t.id !== id);
    writeStorage(list);
  },

  async update(id, updates) {
    const list = readStorage();
    const idx = list.findIndex(t => t.id === id);
    if (idx === -1) throw new Error(`Template not found: ${id}`);
    list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
    writeStorage(list);
    return list[idx];
  },
};
