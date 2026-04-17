# Início Rápido — @pdf-block/react

Guia para instalar e usar o editor visual de documentos PDF no seu projeto React.

## Instalação

```bash
npm install @pdf-block/react
# ou
pnpm add @pdf-block/react
# ou
yarn add @pdf-block/react
```

### Peer Dependencies

O pacote requer React 18.2+ ou 19:

```json
{
  "react": "^18.2.0 || ^19.0.0",
  "react-dom": "^18.2.0 || ^19.0.0"
}
```

---

## Uso Mínimo

```tsx
import { PDFBuilder } from '@pdf-block/react';
import '@pdf-block/react/styles';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <PDFBuilder />
    </div>
  );
}
```

O componente ocupa 100% do container pai. Inclua o CSS (`@pdf-block/react/styles`) uma vez na raiz da aplicação.

---

## Com Documento Inicial

```tsx
import { PDFBuilder } from '@pdf-block/react';
import '@pdf-block/react/styles';
import type { Document } from '@pdf-block/react';

const meuDocumento: Document = {
  id: 'doc-1',
  version: '2.0.0',
  meta: { title: 'Meu Documento', description: '', locale: 'pt-BR', tags: [] },
  pageSettings: {
    paperSize: { preset: 'a4', width: 210, height: 297 },
    orientation: 'portrait',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    defaultFontFamily: 'Inter, sans-serif',
  },
  globalStyles: {
    pageBackground: '#ffffff',
    contentBackground: '#ffffff',
    defaultFontColor: '#333333',
  },
  blocks: [],
};

function App() {
  return (
    <PDFBuilder initialDocument={meuDocumento} />
  );
}
```

---

## Configuração

Passe opções via `config`:

```tsx
<PDFBuilder
  config={{
    locale: 'pt-BR',           // 'pt-BR' | 'en'
    theme: 'light',            // 'light' | 'dark'
    showToolbar: true,         // Exibir toolbar superior
    showSidebar: true,         // Exibir sidebar esquerda
    showRightPanel: true,      // Exibir painel de propriedades
    readOnly: false,           // Modo somente leitura
    minimap: true,             // Ativar minimap
  }}
/>
```

### Todas as opções de config

| Opção | Tipo | Padrão | Descrição |
|---|---|---|---|
| `locale` | `'pt-BR' \| 'en'` | `'pt-BR'` | Idioma da interface |
| `theme` | `'light' \| 'dark'` | `'light'` | Tema visual |
| `showToolbar` | `boolean` | `true` | Exibir toolbar |
| `showSidebar` | `boolean` | `true` | Exibir sidebar |
| `showRightPanel` | `boolean` | `true` | Exibir painel direito |
| `readOnly` | `boolean` | `false` | Modo somente leitura |
| `availableBlocks` | `BlockType[]` | todos | Blocos disponíveis na sidebar |
| `canvasWidth` | `number` | — | Largura custom do canvas |
| `minimap` | `boolean \| MinimapConfig` | `false` | Configuração do minimap |
| `defaultPageSettings` | `Partial<PageSettings>` | — | Configurações de página padrão |
| `defaultGlobalStyles` | `Partial<GlobalStyles>` | — | Estilos globais padrão |
| `templates` | `Template[]` | `[]` | Templates pré-definidos (read-only) |
| `templateAdapter` | `TemplateAdapter` | localStorage | Adapter de persistência de templates |
| `moduleAdapter` | `ModuleAdapter` | localStorage | Adapter de persistência de módulos |
| `imageLibraryAdapter` | `ImageLibraryAdapter` | localStorage | Adapter de persistência de imagens |
| `onUploadImage` | `(file: File) => Promise<string>` | base64 | Upload customizado de imagens |
| `canUnlock` | `(blockId: string) => boolean` | `() => true` | Controle de permissão de desbloqueio |

---

## Callbacks

```tsx
<PDFBuilder
  onDocumentChange={(doc) => console.log('Documento alterado:', doc)}
  onBlockSelect={(blockId) => console.log('Bloco selecionado:', blockId)}
  onSave={(doc) => salvarNoBackend(doc)}
/>
```

| Callback | Tipo | Descrição |
|---|---|---|
| `onDocumentChange` | `(doc: Document) => void` | Chamado a cada alteração no documento |
| `onBlockSelect` | `(blockId: string \| null) => void` | Chamado ao selecionar/deselecionar bloco |
| `onSave` | `(doc: Document) => void` | Chamado ao pressionar `Ctrl+S` |

---

## Persistência Automática

Use `persistenceAdapter` para salvar/carregar o documento automaticamente:

```tsx
const localAdapter = {
  save(doc) {
    localStorage.setItem('meu-doc', JSON.stringify(doc));
  },
  load() {
    const data = localStorage.getItem('meu-doc');
    return data ? JSON.parse(data) : null;
  },
};

<PDFBuilder persistenceAdapter={localAdapter} />
```

---

## API Imperativa (Ref)

```tsx
import { useRef } from 'react';
import { PDFBuilder } from '@pdf-block/react';
import type { PDFBuilderRef } from '@pdf-block/react';

function App() {
  const editorRef = useRef<PDFBuilderRef>(null);

  return (
    <>
      <PDFBuilder ref={editorRef} />
      <button onClick={() => editorRef.current?.print()}>Imprimir</button>
      <button onClick={() => {
        const doc = editorRef.current?.getDocument();
        console.log(doc);
      }}>
        Obter Documento
      </button>
    </>
  );
}
```

### Métodos disponíveis

| Método | Descrição |
|---|---|
| `print()` | Abre janela de impressão do browser |
| `getDocument()` | Retorna o documento atual (`Document`) |
| `setDocument(doc)` | Substitui o documento inteiro |
| `undo()` | Desfazer |
| `redo()` | Refazer |
| `addBlock(type, stripeId?, position?)` | Adiciona um bloco de conteúdo |
| `selectBlock(id)` | Seleciona um bloco |
| `toJSON()` | Serializa o documento para JSON string |
| `fromJSON(json)` | Carrega documento de JSON string |

---

## Toolbar Personalizada

Adicione botões à toolbar via `toolbarActions`:

```tsx
<PDFBuilder
  toolbarActions={(getDocument) => (
    <>
      <button onClick={() => {
        const doc = getDocument();
        fetch('/api/export/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document: doc }),
        });
      }}>
        Exportar PDF
      </button>
    </>
  )}
/>
```

---

## Hooks

Disponíveis dentro de componentes filhos do `PDFBuilder`:

```tsx
import {
  useDocument,    // Leitura/escrita do documento
  useSelection,   // Seleção de blocos
  useEditor,      // UI state + manipulação de blocos
  useExport,      // print()
  useTemplates,   // Gerenciar templates
  useModules,     // Gerenciar módulos
} from '@pdf-block/react';
```

---

## Atalhos de Teclado

| Atalho | Ação |
|---|---|
| `Ctrl+Z` | Desfazer |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Refazer |
| `Ctrl+S` | Salvar (chama `onSave`) |
| `Ctrl+P` | Imprimir |
| `Ctrl+C` | Copiar bloco selecionado |
| `Ctrl+V` | Colar bloco copiado |
| `Ctrl+D` | Duplicar bloco selecionado |
| `Delete` | Remover bloco selecionado |
| `Escape` | Deselecionar bloco |

---

## Tipos de Blocos Disponíveis

| Tipo | Descrição |
|---|---|
| `text` | Rich text (TipTap editor) |
| `image` | Imagem com alinhamento e crop |
| `button` | Botão com link |
| `divider` | Linha divisória |
| `spacer` | Espaço vertical |
| `banner` | Imagem de fundo com overlay |
| `table` | Tabela com cabeçalho |
| `qrcode` | QR Code |
| `chart` | Gráfico de barras |
| `pagebreak` | Quebra de página |

---

## Próximos Passos

- [Persistência e Adapters](persistence.md) — Templates, módulos e biblioteca de imagens
- [Temas e Customização Visual](theming.md) — Design tokens e temas customizados
- [Sistema de Templates](templates.md) — Templates pré-definidos e adapter pattern
