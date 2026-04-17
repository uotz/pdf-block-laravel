# Sistema de Templates

O editor inclui um sistema extensível de templates que permite:

- Exibir templates pré-definidos (built-in)
- Salvar o documento atual como template
- Aplicar templates ao documento
- Persistência customizável via **adapter pattern**

## Configuração Básica

```tsx
import { PDFBuilder } from '@pdf-block/react';

// Sem configuração extra: usa localStorage como backend
<PDFBuilder />
```

O painel "Templates" aparece automaticamente na sidebar esquerda. Os templates do usuário são salvos em `localStorage` na chave `pdfb-templates`.

## Templates Pré-definidos (Built-in)

Passe templates via a prop `templates` do `PDFBuilderConfig`. Eles aparecem no topo do painel e **não podem ser editados ou excluídos** pelo usuário:

```tsx
import type { Template } from '@pdf-block/react';

const builtInTemplates: Template[] = [
  {
    id: 'invoice',
    name: 'Fatura',
    description: 'Template de fatura comercial',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    document: { /* Document JSON completo */ },
  },
  // ...
];

<PDFBuilder
  config={{ templates: builtInTemplates }}
/>
```

## Adapter Pattern (Persistência Customizada)

Por padrão, templates do usuário são salvos no `localStorage`. Para integrar com uma API backend, implemente a interface `TemplateAdapter`:

```ts
interface TemplateAdapter {
  /** Lista todos os templates do usuário */
  list(): Promise<Template[]>;

  /** Salva um novo template. Retorna o template salvo (com id gerado). */
  save(input: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template>;

  /** Remove um template por id. */
  delete(id: string): Promise<void>;

  /** (Opcional) Atualiza um template existente. */
  update?(id: string, input: Partial<Omit<Template, 'id'>>): Promise<Template>;
}
```

### Exemplo: Adapter para API REST

```ts
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

  async update(id, input) {
    const res = await fetch(`/api/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.json();
  },
};

<PDFBuilder
  config={{ templateAdapter: apiTemplateAdapter }}
/>
```

## Hook `useTemplates`

Para interação programática com templates de dentro de componentes filhos do `PDFBuilder`:

```ts
import { useTemplates } from '@pdf-block/react';

function MyComponent() {
  const {
    templates,      // Template[] — built-in + usuário
    loading,        // boolean
    saveTemplate,   // (name: string, description?: string) => Promise<Template>
    deleteTemplate, // (id: string) => Promise<void>
    applyTemplate,  // (template: Template) => void
    refresh,        // () => Promise<void>
  } = useTemplates();
}
```

### Ordem de resolução

1. `config.templateAdapter` (se fornecido)
2. `localStorageTemplateAdapter` (fallback)

Templates built-in de `config.templates` são sempre mesclados com `builtIn: true`.

## Tipo `Template`

```ts
interface Template {
  id: string;
  name: string;
  thumbnail?: string;       // URL ou data:URI (opcional)
  description?: string;
  createdAt: string;         // ISO 8601
  updatedAt: string;
  document: Document;        // Snapshot completo do documento
  builtIn?: boolean;         // true = não pode ser deletado
}
```

## Fluxo do Usuário

1. Clica no ícone "Templates" na sidebar esquerda
2. Vê lista de templates (pré-definidos + salvos)
3. Clica "Usar" → confirmação → documento é substituído
4. Clica "+ Salvar atual" → dialog com nome/descrição → salva no adapter
5. Templates do usuário podem ser excluídos (ícone lixeira)

## localStorage Adapter

O `localStorageTemplateAdapter` é exportado e pode ser usado como base ou referência:

```ts
import { localStorageTemplateAdapter } from '@pdf-block/react';
```

Armazena em `localStorage` na chave `pdfb-templates` como JSON array.
