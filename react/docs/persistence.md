# Persistência e Integração via API

O `@pdf-block/react` oferece três sistemas de persistência com **adapters plugáveis**. Todos seguem o mesmo padrão:

1. **Adapter padrão** → `localStorage` (funciona sem backend)
2. **Adapter customizado** → você implementa a interface e conecta com sua API

---

## 1. Templates (Documentos Salvos)

Templates são snapshots completos de um documento (`Document`).

### Interface `TemplateAdapter`

```ts
interface TemplateAdapter {
  list(): Promise<Template[]>;
  save(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template>;
  delete(id: string): Promise<void>;
  update?(id: string, updates: Partial<Pick<Template, 'name' | 'description' | 'thumbnail' | 'document'>>): Promise<Template>;
}
```

### Tipo `Template`

```ts
interface Template {
  id: string;
  name: string;
  thumbnail?: string;    // base64 ou URL remota
  description?: string;
  createdAt: string;      // ISO date
  updatedAt: string;      // ISO date
  document: Document;     // snapshot completo
  builtIn?: boolean;      // true = não pode deletar
}
```

### Uso com localStorage (padrão)

Sem configuração. O editor já usa `localStorageTemplateAdapter` automaticamente.

### Integração com API REST

```tsx
import { PDFBuilder } from '@pdf-block/react';
import type { TemplateAdapter, Template } from '@pdf-block/react';

const apiTemplateAdapter: TemplateAdapter = {
  async list() {
    const res = await fetch('/api/templates');
    return res.json();
  },

  async save(input) {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.json();
  },

  async delete(id) {
    await fetch(`/api/templates/${id}`, { method: 'DELETE' });
  },

  async update(id, updates) {
    const res = await fetch(`/api/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },
};

function App() {
  return (
    <PDFBuilder
      config={{
        templateAdapter: apiTemplateAdapter,
        // Opcionalmente, templates pré-definidos (read-only):
        // templates: [meuTemplatePadrao],
      }}
    />
  );
}
```

### Hook `useTemplates()`

```ts
const {
  templates,          // Template[] — built-in + user
  loading,            // boolean
  saveTemplate,       // (name: string, description?: string) => Promise<Template>
  deleteTemplate,     // (id: string) => Promise<void>
  applyTemplate,      // (template: Template) => void
  refresh,            // () => Promise<void>
} = useTemplates();
```

---

## 2. Módulos (Faixas Salvas)

Módulos são faixas (stripes) salvas para reutilização. O usuário seleciona uma faixa, salva como módulo, e pode inseri-la novamente mais tarde.

### Interface `ModuleAdapter`

```ts
interface ModuleAdapter {
  list(): Promise<Module[]>;
  save(module: Omit<Module, 'id' | 'createdAt' | 'updatedAt'>): Promise<Module>;
  delete(id: string): Promise<void>;
  update?(id: string, updates: Partial<Pick<Module, 'name' | 'description' | 'thumbnail' | 'block'>>): Promise<Module>;
}
```

### Tipo `Module`

```ts
interface Module {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  block: StripeBlock;    // snapshot da faixa completa
  createdAt: string;
  updatedAt: string;
}
```

### Uso com localStorage (padrão)

Sem configuração. O editor usa `localStorageModuleAdapter` automaticamente.

### Integração com API REST

```tsx
import { PDFBuilder } from '@pdf-block/react';
import type { ModuleAdapter } from '@pdf-block/react';

const apiModuleAdapter: ModuleAdapter = {
  async list() {
    const res = await fetch('/api/modules');
    return res.json();
  },

  async save(input) {
    const res = await fetch('/api/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.json();
  },

  async delete(id) {
    await fetch(`/api/modules/${id}`, { method: 'DELETE' });
  },

  async update(id, updates) {
    const res = await fetch(`/api/modules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },
};

function App() {
  return (
    <PDFBuilder
      config={{
        moduleAdapter: apiModuleAdapter,
      }}
    />
  );
}
```

### Hook `useModules()`

```ts
const {
  modules,            // Module[]
  loading,            // boolean
  saveModule,         // (name: string, stripeId: string) => Promise<Module | undefined>
  deleteModule,       // (id: string) => Promise<void>
  applyModule,        // (module: Module, position?: number) => void
  refresh,            // () => Promise<void>
} = useModules();
```

---

## 3. Biblioteca de Imagens

A biblioteca de imagens armazena referências de imagens já enviadas. Funciona em conjunto com `config.onUploadImage` para upload customizado.

### Interface `ImageLibraryAdapter`

```ts
interface ImageLibraryAdapter {
  list(): Promise<LibraryImage[]>;
  save(image: Omit<LibraryImage, 'id' | 'addedAt'>): Promise<LibraryImage>;
  delete(id: string): Promise<void>;
  replace?(id: string, newUrl: string, name?: string): Promise<LibraryImage>;
}
```

### Tipo `LibraryImage`

```ts
interface LibraryImage {
  id: string;
  name: string;         // nome do arquivo (sem extensão)
  url: string;           // data-URL ou URL remota
  mimeType: string;
  size: number;          // bytes
  addedAt: string;       // ISO date
}
```

### Uso com localStorage (padrão)

Sem configuração. O editor usa `localStorageImageLibraryAdapter` automaticamente.

> ⚠️ **Atenção:** Com base64, o localStorage pode estourar rápido (~5MB).
> Em produção, use `onUploadImage` para enviar ao CDN e armazene apenas URLs.

### Integração com API REST

```tsx
import { PDFBuilder } from '@pdf-block/react';
import type { ImageLibraryAdapter } from '@pdf-block/react';

const apiImageLibraryAdapter: ImageLibraryAdapter = {
  async list() {
    const res = await fetch('/api/images');
    return res.json();
  },

  async save(input) {
    const res = await fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.json();
  },

  async delete(id) {
    await fetch(`/api/images/${id}`, { method: 'DELETE' });
  },

  async replace(id, newUrl, name) {
    const res = await fetch(`/api/images/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newUrl, name }),
    });
    return res.json();
  },
};

function App() {
  return (
    <PDFBuilder
      config={{
        imageLibraryAdapter: apiImageLibraryAdapter,
        // Upload customizado (envia arquivo ao CDN e retorna URL):
        onUploadImage: async (file) => {
          const form = new FormData();
          form.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: form });
          const { url } = await res.json();
          return url;
        },
      }}
    />
  );
}
```

### Diferença entre `onUploadImage` e `imageLibraryAdapter`

| Responsabilidade | `onUploadImage` | `imageLibraryAdapter` |
|---|---|---|
| **O que faz** | Recebe `File`, retorna URL final (CDN/storage) | Persiste metadados da imagem na biblioteca |
| **Quando usar** | Sempre que quiser evitar base64 | Quando quiser persistir a galeria de imagens |
| **Independentes?** | Sim — podem ser usados juntos ou separados | Sim |

**Fluxo completo:**
1. Usuário faz upload → `onUploadImage(file)` → retorna URL do CDN
2. Editor cria `LibraryImage` com a URL → `imageLibraryAdapter.save()` → persiste na API
3. Imagem aparece na galeria e pode ser reutilizada

### Hook `useImageLibrary()`

```ts
const {
  openLibrary,        // (opts?: LibraryOpenOptions) => void
  adapter,            // ImageLibraryAdapter (resolved)
} = useImageLibrary();
```

O `libraryStore` (in-memory) também é exportado para uso avançado:

```ts
import { libraryStore } from '@pdf-block/react';

libraryStore.images;                          // LibraryImage[]
libraryStore.add(image);                      // adiciona ao cache
libraryStore.remove(id);                      // remove do cache
libraryStore.replace(id, newUrl, name?);      // atualiza no cache
libraryStore.setAll(images);                  // substitui todo o cache
```

---

## Exemplo Completo: Todos os 3 Adapters

```tsx
import { PDFBuilder } from '@pdf-block/react';
import type { TemplateAdapter, ModuleAdapter, ImageLibraryAdapter } from '@pdf-block/react';

// Crie seus adapters...
const templateAdapter: TemplateAdapter = { /* ... */ };
const moduleAdapter: ModuleAdapter = { /* ... */ };
const imageLibraryAdapter: ImageLibraryAdapter = { /* ... */ };

function App() {
  return (
    <PDFBuilder
      config={{
        templateAdapter,
        moduleAdapter,
        imageLibraryAdapter,
        onUploadImage: async (file) => {
          // Upload para CDN e retorna URL
          const form = new FormData();
          form.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: form });
          const { url } = await res.json();
          return url;
        },
      }}
    />
  );
}
```

---

## Resumo

| Sistema | Config | Adapter padrão | Hook |
|---|---|---|---|
| Templates | `templateAdapter` | `localStorageTemplateAdapter` | `useTemplates()` |
| Módulos | `moduleAdapter` | `localStorageModuleAdapter` | `useModules()` |
| Imagens | `imageLibraryAdapter` | `localStorageImageLibraryAdapter` | `useImageLibrary()` |

Todos os adapters usam a mesma arquitetura: interface assíncrona (`Promise`), fallback para `localStorage`, e podem ser substituídos por qualquer implementação que respeite a interface.
