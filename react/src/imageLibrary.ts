// ─── Image Library Adapter ────────────────────────────────────
// Extensible image library persistence with pluggable adapters.
// Default: localStorage. Override via PDFBuilderConfig.imageLibraryAdapter.

// ─── Types ────────────────────────────────────────────────────

export interface LibraryImage {
  id: string;
  /** Display name (file name without extension) */
  name: string;
  /** The URL used in <img> src — either a data-URL or a remote URL */
  url: string;
  /** Original file MIME type */
  mimeType: string;
  /** File size in bytes (0 for remote URLs) */
  size: number;
  /** ISO date string */
  addedAt: string;
}

/**
 * Adapter interface for image library persistence.
 * Implement this to plug in any backend (REST API, GraphQL, IndexedDB, etc.).
 * All methods return Promises so both sync and async implementations work.
 */
export interface ImageLibraryAdapter {
  /** List all saved images. */
  list(): Promise<LibraryImage[]>;
  /** Save a new image. Returns the persisted image (with generated id if needed). */
  save(image: Omit<LibraryImage, 'id' | 'addedAt'>): Promise<LibraryImage>;
  /** Delete an image by id. */
  delete(id: string): Promise<void>;
  /** Optional: replace an existing image's URL. */
  replace?(id: string, newUrl: string, name?: string): Promise<LibraryImage>;
}

// ─── localStorage Adapter ─────────────────────────────────────

const STORAGE_KEY = 'pdfb-image-library';

function uid(): string {
  return crypto.randomUUID?.() ?? `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readStorage(): LibraryImage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStorage(images: LibraryImage[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
}

/**
 * Default adapter that persists image library entries in localStorage.
 * Note: with base64 data-URLs, localStorage can fill up fast.
 * For production use, implement a custom adapter that stores images on a CDN
 * and only saves URLs here.
 */
export const localStorageImageLibraryAdapter: ImageLibraryAdapter = {
  async list() {
    return readStorage();
  },

  async save(input) {
    const image: LibraryImage = {
      ...input,
      id: uid(),
      addedAt: new Date().toISOString(),
    };
    const list = readStorage();
    list.push(image);
    writeStorage(list);
    return image;
  },

  async delete(id) {
    const list = readStorage().filter(img => img.id !== id);
    writeStorage(list);
  },

  async replace(id, newUrl, name?) {
    const list = readStorage();
    const idx = list.findIndex(img => img.id === id);
    if (idx === -1) throw new Error(`Image not found: ${id}`);
    list[idx] = { ...list[idx], url: newUrl, ...(name ? { name } : {}) };
    writeStorage(list);
    return list[idx];
  },
};
