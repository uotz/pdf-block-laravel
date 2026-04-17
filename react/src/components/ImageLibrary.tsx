/**
 * Image Library — in-memory store + modal UI for managing uploaded images.
 *
 * Persistence is handled via pluggable adapters (ImageLibraryAdapter).
 * Default: localStorage. Override via PDFBuilderConfig.imageLibraryAdapter.
 *
 * Developers can provide a custom upload hook via `config.onUploadImage`.
 * Without it the editor stores images as base64 data-URLs (works out of the
 * box, no backend needed).
 *
 * Images stored here are keyed by a stable `id`. All canvas image blocks that
 * reference `libraryId` will be updated automatically when an image is replaced.
 */
import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Upload, Images, Check } from 'lucide-react';
import { useEditorStore } from '../store';
import { useEditorConfig } from './EditorConfig';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { uid } from '../utils';
import type { ImageBlock } from '../types';
import type { LibraryImage, ImageLibraryAdapter } from '../imageLibrary';
import { localStorageImageLibraryAdapter } from '../imageLibrary';

// Re-export the type so existing consumers keep working
export type { LibraryImage } from '../imageLibrary';

interface LibraryStore {
  images: LibraryImage[];
  /** Add an image to the in-memory store (call after persisting via adapter). */
  add(img: LibraryImage): void;
  /** Replace an image URL in the in-memory store. */
  replace(id: string, newUrl: string, name?: string): void;
  /** Remove an image from the in-memory store. */
  remove(id: string): void;
  /** Replace the entire image list (used on initial load from adapter). */
  setAll(images: LibraryImage[]): void;
}

// ─── Global singleton ─────────────────────────────────────────
// Not Zustand — intentionally a simple module-level store so the library
// survives hot-reload and is accessible without a Provider.
let _images: LibraryImage[] = [];
let _listeners: Array<() => void> = [];

function notifyListeners() {
  _listeners.forEach(fn => fn());
}

const libraryStore: LibraryStore = {
  get images() { return _images; },
  add(img) {
    _images = [..._images, img];
    notifyListeners();
  },
  replace(id, newUrl, name?) {
    _images = _images.map(img => img.id === id ? { ...img, url: newUrl, ...(name ? { name } : {}) } : img);
    notifyListeners();
  },
  remove(id) {
    _images = _images.filter(img => img.id !== id);
    notifyListeners();
  },
  setAll(images) {
    _images = [...images];
    notifyListeners();
  },
};

function useLibraryImages(): LibraryImage[] {
  const [imgs, setImgs] = useState<LibraryImage[]>(_images);
  useEffect(() => {
    const fn = () => setImgs([..._images]);
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter(l => l !== fn); };
  }, []);
  return imgs;
}

// ─── Context (for open/close) ─────────────────────────────────
interface LibraryCtxValue {
  openLibrary: (opts?: LibraryOpenOptions) => void;
  /** The resolved adapter instance for persistence. */
  adapter: ImageLibraryAdapter;
}

export interface LibraryOpenOptions {
  /** If provided, "Select" in the modal will set this block's src */
  targetBlockId?: string;
  /** Generic callback: receives the selected image URL */
  onSelect?: (url: string) => void;
}

const LibraryCtx = createContext<LibraryCtxValue>({ openLibrary: () => {}, adapter: localStorageImageLibraryAdapter });

export function useImageLibrary() {
  return useContext(LibraryCtx);
}

// ─── Upload helper (used by modal + renderer) ─────────────────
export async function processFile(
  file: File,
  onUploadImage?: (f: File) => Promise<string>,
): Promise<LibraryImage> {
  let url: string;
  if (onUploadImage) {
    url = await onUploadImage(file);
  } else {
    url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  return {
    id: uid(),
    name: file.name.replace(/\.[^.]+$/, ''),
    url,
    mimeType: file.type,
    size: file.size,
    addedAt: new Date().toISOString(),
  };
}

// ─── Modal ────────────────────────────────────────────────────
interface ModalProps {
  targetBlockId?: string;
  onSelect?: (url: string) => void;
  onClose: () => void;
}

function ImageLibraryModal({ targetBlockId, onSelect, onClose }: ModalProps) {
  const images = useLibraryImages();
  const config = useEditorConfig();
  const { adapter } = useImageLibrary();
  const updateContentBlock = useEditorStore(s => s.updateContentBlock);
  const allBlocks = useEditorStore(s => s.document.blocks);

  const fileRef = useRef<HTMLInputElement>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Upload new images
  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const processed = await processFile(file, config.onUploadImage);
        // Persist via adapter, then sync in-memory store
        const saved = await adapter.save({
          name: processed.name,
          url: processed.url,
          mimeType: processed.mimeType,
          size: processed.size,
        });
        libraryStore.add(saved);
        setSelectedId(saved.id);
      }
    } finally {
      setUploading(false);
    }
  }, [config.onUploadImage, adapter]);

  // Replace an existing library image and update all canvas blocks that reference it
  const handleReplace = useCallback(async (files: FileList | null, imgId: string) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const processed = await processFile(files[0], config.onUploadImage);
      const oldImg = _images.find(i => i.id === imgId);

      // Persist via adapter, then sync in-memory store
      if (adapter.replace) {
        await adapter.replace(imgId, processed.url, processed.name);
      }
      libraryStore.replace(imgId, processed.url, processed.name);

      // Update every canvas image block pointing to the old URL
      if (oldImg) {
        for (const stripe of allBlocks) {
          for (const structure of stripe.children) {
            for (const column of structure.columns) {
              for (const block of column.children) {
                if (block.type === 'image' && (block as ImageBlock).src === oldImg.url) {
                  updateContentBlock(block.id, { src: processed.url } as Partial<ImageBlock>);
                }
              }
            }
          }
        }
      }
    } finally {
      setUploading(false);
      setReplacingId(null);
    }
  }, [config.onUploadImage, allBlocks, updateContentBlock, adapter]);

  // Delete an image from the library
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleDelete = useCallback((imgId: string) => {
    setDeleteTargetId(imgId);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTargetId) return;
    // Persist via adapter, then sync in-memory store
    await adapter.delete(deleteTargetId);
    libraryStore.remove(deleteTargetId);
    if (selectedId === deleteTargetId) setSelectedId(null);
    setDeleteTargetId(null);
  }, [deleteTargetId, selectedId, adapter]);

  // Select and apply to target block or custom callback
  const handleSelect = useCallback((img: LibraryImage) => {
    if (onSelect) {
      onSelect(img.url);
      onClose();
    } else if (targetBlockId) {
      updateContentBlock(targetBlockId, { src: img.url } as Partial<ImageBlock>);
      onClose();
    } else {
      setSelectedId(prev => prev === img.id ? null : img.id);
    }
  }, [targetBlockId, onSelect, updateContentBlock, onClose]);

  // Drag-and-drop onto the upload zone
  const [dragOver, setDragOver] = useState(false);

  const content = (
    <div className="pdfb-overlay" onClick={onClose}>
      <div
        className="pdfb-overlay-inner pdfb-img-library-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pdfb-overlay-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Images size={16} />
            <span>Biblioteca de Imagens</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="pdfb-toolbar-btn pdfb-toolbar-btn--primary"
              style={{ height: 28, fontSize: 12 }}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload size={13} style={{ marginRight: 4 }} />
              {uploading ? 'Enviando…' : 'Enviar imagem'}
            </button>
            <button type="button" className="pdfb-overlay-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => { handleUpload(e.target.files); e.target.value = ''; }}
        />
        <input
          ref={replaceFileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => {
            if (replacingId) handleReplace(e.target.files, replacingId);
            e.target.value = '';
          }}
        />

        {/* Drop zone / grid */}
        <div
          className={`pdfb-img-library-body${dragOver ? ' pdfb-img-library-body--dragover' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            handleUpload(e.dataTransfer.files);
          }}
        >
          {images.length === 0 ? (
            <div className="pdfb-img-library-empty">
              <Images size={40} style={{ opacity: 0.3 }} />
              <p>Nenhuma imagem ainda.</p>
              <p style={{ fontSize: 12, opacity: 0.6 }}>
                Clique em "Enviar imagem" ou arraste arquivos aqui.
              </p>
            </div>
          ) : (
            <div className="pdfb-img-library-grid">
              {images.map(img => {
                const isSelected = selectedId === img.id;
                return (
                  <div
                    key={img.id}
                    className={`pdfb-img-library-item${isSelected ? ' pdfb-img-library-item--selected' : ''}`}
                    onClick={() => handleSelect(img)}
                    title={img.name}
                  >
                    <div className="pdfb-img-library-thumb">
                      <img src={img.url} alt={img.name} draggable={false} />
                      {isSelected && (
                        <div className="pdfb-img-library-check">
                          <Check size={16} />
                        </div>
                      )}
                    </div>
                    <div className="pdfb-img-library-name">{img.name}</div>
                    <div className="pdfb-img-library-actions">
                      <button
                        type="button"
                        className="pdfb-img-library-action-btn"
                        title="Substituir imagem"
                        onClick={e => {
                          e.stopPropagation();
                          setReplacingId(img.id);
                          replaceFileRef.current?.click();
                        }}
                      >
                        <Upload size={12} />
                      </button>
                      <button
                        type="button"
                        className="pdfb-img-library-action-btn pdfb-img-library-action-btn--danger"
                        title="Remover da biblioteca"
                        onClick={e => { e.stopPropagation(); handleDelete(img.id); }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {(targetBlockId || onSelect) && selectedId && (
          <div className="pdfb-img-library-footer">
            <button
              type="button"
              className="pdfb-toolbar-btn pdfb-toolbar-btn--primary"
              onClick={() => {
                const img = _images.find(i => i.id === selectedId);
                if (!img) return;
                if (onSelect) {
                  onSelect(img.url);
                } else if (targetBlockId) {
                  updateContentBlock(targetBlockId, { src: img.url } as Partial<ImageBlock>);
                }
                onClose();
              }}
            >
              Usar imagem selecionada
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {createPortal(content, document.body)}
      {deleteTargetId && (
        <ConfirmDialog
          title="Remover imagem"
          message="Tem certeza que deseja remover esta imagem da biblioteca?"
          confirmLabel="Remover"
          danger
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}
    </>
  );
}

// ─── Provider ─────────────────────────────────────────────────
export function ImageLibraryProvider({ children }: { children: React.ReactNode }) {
  const config = useEditorConfig();
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<LibraryOpenOptions | undefined>();

  const adapter: ImageLibraryAdapter = config.imageLibraryAdapter ?? localStorageImageLibraryAdapter;

  // Load images from adapter on mount
  useEffect(() => {
    adapter.list().then(images => {
      libraryStore.setAll(images);
    }).catch(err => {
      console.error('[pdf-block] Failed to load image library:', err);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter]);

  const openLibrary = useCallback((options?: LibraryOpenOptions) => {
    setOpts(options);
    setOpen(true);
  }, []);

  return (
    <LibraryCtx.Provider value={{ openLibrary, adapter }}>
      {children}
      {open && (
        <ImageLibraryModal
          targetBlockId={opts?.targetBlockId}
          onSelect={opts?.onSelect}
          onClose={() => { setOpen(false); setOpts(undefined); }}
        />
      )}
    </LibraryCtx.Provider>
  );
}

// Re-export store for advanced usage
export { libraryStore };
