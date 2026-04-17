// ─── Module System ────────────────────────────────────────────
// Extensible module (saved stripe) persistence with pluggable adapters.
// Default: localStorage. Override via PDFBuilderConfig.moduleAdapter.

import type { StripeBlock } from './dsl';

// ─── Types ────────────────────────────────────────────────────

export interface Module {
  id: string;
  name: string;
  /** Optional description */
  description?: string;
  /** Optional thumbnail URL (base64 data-url or remote) */
  thumbnail?: string;
  /** The full stripe block snapshot */
  block: StripeBlock;
  /** ISO date string */
  createdAt: string;
  /** ISO date string */
  updatedAt: string;
}

/**
 * Adapter interface for module persistence.
 * Implement this to plug in any backend (REST API, GraphQL, IndexedDB, etc.).
 * All methods return Promises so both sync and async implementations work.
 */
export interface ModuleAdapter {
  /** List all saved modules. */
  list(): Promise<Module[]>;
  /** Save a new module. Returns the persisted module (with generated id if needed). */
  save(module: Omit<Module, 'id' | 'createdAt' | 'updatedAt'>): Promise<Module>;
  /** Delete a module by id. */
  delete(id: string): Promise<void>;
  /** Optional: update an existing module. */
  update?(id: string, updates: Partial<Pick<Module, 'name' | 'description' | 'thumbnail' | 'block'>>): Promise<Module>;
}

// ─── localStorage Adapter ─────────────────────────────────────

const STORAGE_KEY = 'pdfb-modules';

function uid(): string {
  return crypto.randomUUID?.() ?? `mod-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readStorage(): Module[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStorage(modules: Module[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
}

/**
 * Default adapter that persists user modules in localStorage.
 */
export const localStorageModuleAdapter: ModuleAdapter = {
  async list() {
    return readStorage();
  },

  async save(input) {
    const now = new Date().toISOString();
    const mod: Module = {
      ...input,
      id: uid(),
      createdAt: now,
      updatedAt: now,
    };
    const list = readStorage();
    list.unshift(mod);
    writeStorage(list);
    return mod;
  },

  async delete(id) {
    const list = readStorage().filter(m => m.id !== id);
    writeStorage(list);
  },

  async update(id, updates) {
    const list = readStorage();
    const idx = list.findIndex(m => m.id === id);
    if (idx === -1) throw new Error(`Module not found: ${id}`);
    list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
    writeStorage(list);
    return list[idx];
  },
};
