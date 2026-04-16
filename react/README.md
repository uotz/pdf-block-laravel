# @pdf-block/react

Editor visual WYSIWYG de documentos PDF para React. Drag-and-drop, rich text, estilos inline — tudo pronto para gerar PDFs nativos server-side.

<p align="center">
  <img src="docs/preview.png" alt="PDF Block Editor" width="700" />
</p>

## Instalação

```bash
npm install @pdf-block/react
# ou
pnpm add @pdf-block/react
```

**Peer dependencies:**

```bash
npm install react react-dom
```

## Início rápido

```tsx
import { PDFBuilder } from '@pdf-block/react';
import '@pdf-block/react/styles';
import type { Document } from '@pdf-block/react';

function App() {
  const handleChange = (doc: Document) => {
    console.log('Document changed:', doc);
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <PDFBuilder
        config={{ locale: 'pt-BR', minimap: true }}
        callbacks={{ onDocumentChange: handleChange }}
      />
    </div>
  );
}
```

## Componente principal

### `<PDFBuilder />`

O componente raiz que renderiza o editor completo.

| Prop | Tipo | Descrição |
|---|---|---|
| `initialDocument` | `Document` | Documento inicial (opcional — cria um vazio se omitido) |
| `config` | `PDFBuilderConfig` | Configuração do editor |
| `callbacks` | `PDFBuilderCallbacks` | Callbacks de eventos |
| `ref` | `PDFBuilderRef` | Ref para controle programático |

#### Config

```ts
interface PDFBuilderConfig {
  locale?: 'pt-BR' | 'en';       // Idioma da interface
  minimap?: boolean;              // Minimap ativo (default: true)
  minimapConfig?: MinimapConfig;  // Posição e modo do minimap
  theme?: Theme;                  // 'light' (default)
}
```

#### Callbacks

```ts
interface PDFBuilderCallbacks {
  onDocumentChange?: (doc: Document) => void; // Toda alteração
  onSave?: (doc: Document) => void;           // Ctrl+S / botão salvar
  onExport?: (blob: Blob) => void;            // Após exportar PDF
}
```

#### Ref

```ts
interface PDFBuilderRef {
  getDocument: () => Document;
  setDocument: (doc: Document) => void;
  exportPDF: () => Promise<Blob>;
}
```

## Hooks públicos

### `useDocument()`

Acesso reativo ao documento e funções de manipulação.

```ts
const {
  document,           // Document completo
  pageSettings,       // PageSettings
  globalStyles,       // GlobalStyles
  updatePageSettings, // (partial: Partial<PageSettings>) => void
  updateGlobalStyles, // (partial: Partial<GlobalStyles>) => void
} = useDocument();
```

### `useEditor()`

Controle da UI do editor e operações em blocos.

```ts
const {
  viewMode,           // 'desktop'
  sidebarPanel,       // SidebarPanel | null
  blocks,             // StripeBlock[]
  addStripe,          // () => void
  removeStripe,       // (id: string) => void
  addContentBlock,    // (stripeId, structureId, columnId, type, index?) => void
  undo, redo,         // () => void
  canUndo, canRedo,   // boolean
} = useEditor();
```

### `useSelection()`

Estado de seleção atual.

```ts
const {
  selectedBlockId,    // string | null
  selectedBlock,      // AnyBlock | null
  selectedStripe,     // StripeBlock | null
  path,               // string[] (caminho hierárquico)
} = useSelection();
```

### `useExport()`

Exportação para PDF e impressão.

```ts
const {
  exportPDF,          // () => Promise<Blob>
  downloadPDF,        // (filename?: string) => Promise<void>
  print,              // () => void
  isExporting,        // boolean
} = useExport();
```

## DSL — Estrutura do documento

O documento segue uma hierarquia rigorosa:

```
Document
├── meta: { title, description, locale, tags }
├── pageSettings: { paperSize, orientation, margins, defaultFontFamily }
├── globalStyles: { pageBackground, contentBackground, defaultFontColor }
└── blocks: StripeBlock[]
    └── children: StructureBlock[]
        └── columns: Column[]
            └── children: ContentBlock[]
                ├── TextBlock       (rich text via TipTap)
                ├── ImageBlock      (src, alt, objectFit, alignment)
                ├── ButtonBlock     (text, url, target, cores)
                ├── DividerBlock    (estilo de linha, espessura, cor)
                ├── SpacerBlock     (altura em px)
                ├── BannerBlock     (imagem de fundo, overlay, textos)
                ├── TableBlock      (linhas, header, zebra, bordas)
                ├── QRCodeBlock     (data, tamanho, cores)
                ├── ChartBlock      (bar/line/pie, dados)
                └── PageBreakBlock  (forçar quebra de página)
```

### Todos os blocos compartilham:

```ts
interface BaseBlock {
  id: string;
  type: BlockType;
  meta: BlockMeta;        // hideOnExport, locked, breakBefore, breakAfter
  styles: BlockStyles;    // padding, margin, border, borderRadius, background, shadow, opacity
}
```

## Exportação para PDF

### Client-side (imagem)

O pacote inclui exportação client-side via `html2canvas` + `jsPDF`:

```ts
import { useExport } from '@pdf-block/react';

const { downloadPDF } = useExport();
await downloadPDF('meu-documento.pdf');
```

### Server-side (nativo) — Recomendado

Para PDFs nativos com texto selecionável e links clicáveis, use o pacote companion `pdf-block/laravel`:

```ts
const doc = editorRef.current.getDocument();

const response = await fetch('/api/export/pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ document: doc }),
});

const blob = await response.blob();
```

Veja a [documentação do pacote Laravel](../laravel/README.md) para detalhes.

## Persistência

O pacote não persiste dados — essa responsabilidade é da aplicação consumidora. Use o callback `onDocumentChange` para salvar:

```tsx
<PDFBuilder
  initialDocument={loadFromDB()}
  callbacks={{
    onDocumentChange: (doc) => saveToAPI(doc),
    onSave: (doc) => saveToAPI(doc),
  }}
/>
```

O documento é um JSON serializável — salve como `jsonb` no banco, no localStorage, ou em um arquivo.

## Internacionalização

```tsx
import { setLocale, getAvailableLocales } from '@pdf-block/react';

setLocale('en');        // Muda para inglês
getAvailableLocales();  // ['pt-BR', 'en']

// Ou via config:
<PDFBuilder config={{ locale: 'en' }} />
```

## Tipos exportados

Todos os tipos da DSL são exportados para uso em TypeScript:

```ts
import type {
  Document, StripeBlock, StructureBlock, ContentBlock,
  TextBlock, ImageBlock, ButtonBlock, DividerBlock,
  SpacerBlock, BannerBlock, TableBlock, QRCodeBlock,
  ChartBlock, PageBreakBlock, BlockStyles, BlockMeta,
  PageSettings, GlobalStyles, PaperSize, EdgeValues,
} from '@pdf-block/react';
```

## Desenvolvimento

```bash
# No monorepo root
pnpm install
pnpm dev              # Sobe o playground na porta 3000

# Build do pacote
pnpm build:react      # Gera dist/ com ES + CJS + tipos

# Testes
pnpm test:react
```

## Requisitos

- React ≥ 18.2
- Navegador moderno (Chrome, Firefox, Safari, Edge)

## Licença

MIT
