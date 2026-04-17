# Temas e Customização Visual

O `@pdf-block/react` utiliza **CSS Custom Properties** (variáveis CSS) para toda a UI do editor. Isso permite customização completa de cores, tipografia, espaçamento, bordas e sombras sem modificar o código-fonte.

## Tema Claro (Padrão)

O tema claro é aplicado automaticamente via `:root`. Baseado no design system do Airbnb com a cor accent **Rausch Red** (`#ff385c`).

## Tema Escuro

O tema escuro é ativado quando o atributo `data-pdfb-theme="dark"` está presente no elemento raiz. Todos os tokens são sobrescritos automaticamente.

### Ativação via Config

```tsx
import { PDFBuilder } from '@pdf-block/react';

<PDFBuilder config={{ theme: 'dark' }} />
```

### Ativação via Store (programática)

```tsx
import { useEditorStore } from '@pdf-block/react';

// Em qualquer componente dentro do PDFBuilder
const setTheme = useEditorStore(s => s.setTheme);
setTheme('dark');
```

### Toggle light/dark

O editor já inclui um botão de toggle na toolbar (ícone sol/lua). O usuário pode alternar livremente entre os temas.

---

## Customização de Tokens

Sobrescreva qualquer variável CSS para criar um tema personalizado:

```css
/* Tema custom — aplicar ao container do editor ou globalmente */
.meu-editor {
  --pdfb-color-accent: #6366f1;          /* Indigo no lugar do vermelho */
  --pdfb-color-accent-hover: #4f46e5;
  --pdfb-color-accent-light: rgba(99, 102, 241, 0.15);
  --pdfb-color-accent-subtle: rgba(99, 102, 241, 0.08);
  --pdfb-color-bg: #fafafa;
  --pdfb-radius-md: 12px;                /* Mais arredondado */
}
```

```tsx
<PDFBuilder className="meu-editor" />
```

---

## Referência Completa de Tokens

### Cores de Fundo

| Token | Light | Dark | Descrição |
|---|---|---|---|
| `--pdfb-color-bg` | `#f5f5f5` | `#111111` | Background principal do editor |
| `--pdfb-color-canvas-bg` | `#ebebeb` | `#0d0d0d` | Background da área do canvas |
| `--pdfb-color-toolbar-bg` | `#222222` | `#111111` | Background da toolbar superior |
| `--pdfb-color-sidebar-bg` | `#ffffff` | `#1a1a1a` | Background da sidebar esquerda |
| `--pdfb-color-panel-bg` | `#ffffff` | `#1a1a1a` | Background do painel direito |
| `--pdfb-color-panel-border` | `#ebebeb` | `#2a2a2a` | Borda do painel |

### Superfícies (inputs, cards, popups)

| Token | Light | Dark | Descrição |
|---|---|---|---|
| `--pdfb-color-surface` | `#ffffff` | `#222222` | Background de inputs e cards |
| `--pdfb-color-surface-hover` | `#f7f7f7` | `#2a2a2a` | Hover em superfícies |
| `--pdfb-color-surface-2` | `#f2f2f2` | `#1e1e1e` | Superfície secundária |

### Cor Accent (Rausch Red)

| Token | Light | Dark | Descrição |
|---|---|---|---|
| `--pdfb-color-accent` | `#ff385c` | `#ff385c` | Cor principal de destaque |
| `--pdfb-color-accent-hover` | `#e00b41` | `#e00b41` | Hover no accent |
| `--pdfb-color-accent-light` | `rgba(255,56,92,0.15)` | `rgba(255,56,92,0.2)` | Background leve com accent |
| `--pdfb-color-accent-subtle` | `rgba(255,56,92,0.08)` | `rgba(255,56,92,0.1)` | Background sutil com accent |

### Semânticas

| Token | Light | Dark | Descrição |
|---|---|---|---|
| `--pdfb-color-danger` | `#c13515` | `#c13515` | Ações destrutivas |
| `--pdfb-color-danger-light` | `#fef2f2` | `rgba(193,53,21,0.15)` | Background de perigo |
| `--pdfb-color-success` | `#22c55e` | `#22c55e` | Sucesso |
| `--pdfb-color-success-light` | `#f0fdf4` | `rgba(34,197,94,0.12)` | Background de sucesso |
| `--pdfb-color-warning` | `#f59e0b` | `#f59e0b` | Aviso |
| `--pdfb-color-warning-light` | `#fffbeb` | `rgba(245,158,11,0.12)` | Background de aviso |

### Texto

| Token | Light | Dark | Descrição |
|---|---|---|---|
| `--pdfb-color-text-primary` | `#222222` | `#e2e2e2` | Texto principal |
| `--pdfb-color-text-secondary` | `#6a6a6a` | `#888888` | Texto secundário |
| `--pdfb-color-text-disabled` | `#929292` | `#555555` | Texto desabilitado |
| `--pdfb-color-text-inverse` | `#ffffff` | `#ffffff` | Texto sobre fundo escuro |
| `--pdfb-color-text-on-dark` | `#ffffff` | `#ffffff` | Texto sobre superfícies escuras |

### Sidebar / Tree

| Token | Light | Dark | Descrição |
|---|---|---|---|
| `--pdfb-tree-text` | `#6a6a6a` | `#888888` | Texto de items na árvore |
| `--pdfb-tree-text-hover` | `#222222` | `#e2e2e2` | Texto hover na árvore |
| `--pdfb-tree-text-selected` | `#ff385c` | `#ff385c` | Texto selecionado |
| `--pdfb-tree-bg-hover` | `rgba(255,56,92,0.07)` | `rgba(255,56,92,0.1)` | Background hover |
| `--pdfb-tree-bg-selected` | `rgba(255,56,92,0.12)` | `rgba(255,56,92,0.18)` | Background selecionado |

### Tipografia

| Token | Valor | Descrição |
|---|---|---|
| `--pdfb-font-family-ui` | `'Airbnb Cereal VF', 'DM Sans', Circular, ...` | Fonte da UI |
| `--pdfb-font-family-mono` | `'Fira Code', 'Cascadia Code', Menlo, ...` | Fonte monospace |
| `--pdfb-font-size-xs` | `11px` | Extra-small |
| `--pdfb-font-size-sm` | `12px` | Small |
| `--pdfb-font-size-base` | `13px` | Base |
| `--pdfb-font-size-md` | `14px` | Medium |
| `--pdfb-font-size-lg` | `16px` | Large |
| `--pdfb-font-size-xl` | `18px` | Extra-large |

### Espaçamento (base 8px)

| Token | Valor | Descrição |
|---|---|---|
| `--pdfb-space-1` | `4px` | 0.5× |
| `--pdfb-space-2` | `8px` | 1× |
| `--pdfb-space-3` | `12px` | 1.5× |
| `--pdfb-space-4` | `16px` | 2× |
| `--pdfb-space-5` | `20px` | 2.5× |
| `--pdfb-space-6` | `24px` | 3× |
| `--pdfb-space-8` | `32px` | 4× |

### Bordas e Raio

| Token | Light | Dark | Descrição |
|---|---|---|---|
| `--pdfb-radius-sm` | `4px` | — | Raio pequeno |
| `--pdfb-radius-md` | `8px` | — | Raio médio |
| `--pdfb-radius-lg` | `14px` | — | Raio grande |
| `--pdfb-radius-xl` | `20px` | — | Raio extra-grande |
| `--pdfb-border-color` | `#e8e8e8` | `#2a2a2a` | Borda padrão |
| `--pdfb-border-color-hover` | `#c1c1c1` | `#3a3a3a` | Borda hover |

### Sombras

| Token | Light | Dark | Descrição |
|---|---|---|---|
| `--pdfb-shadow-sm` | 3-layer warm | `0 1px 4px rgba(0,0,0,0.3)` | Sombra pequena |
| `--pdfb-shadow-md` | `rgba(0,0,0,0.08)` | `rgba(0,0,0,0.4)` | Sombra média |
| `--pdfb-shadow-lg` | `rgba(0,0,0,0.14)` | `rgba(0,0,0,0.5)` | Sombra grande |
| `--pdfb-shadow-page` | 3-layer warm | `rgba(0,0,0,0.5)` | Sombra da página |
| `--pdfb-shadow-focus` | `rgba(255,56,92,0.30)` | — | Ring de foco |

### Overlays e Superfícies Escuras

| Token | Valor | Descrição |
|---|---|---|
| `--pdfb-color-overlay-bg` | `#222222` | Background de toolbars flutuantes |
| `--pdfb-color-overlay-text` | `#ffffff` | Texto em overlays |
| `--pdfb-color-overlay-text-muted` | `rgba(255,255,255,0.70)` | Texto secundário em overlays |
| `--pdfb-color-overlay-hover` | `rgba(255,255,255,0.10)` | Hover em overlays |

### Dimensões

| Token | Valor | Descrição |
|---|---|---|
| `--pdfb-toolbar-height` | `52px` | Altura da toolbar |
| `--pdfb-sidebar-icon-width` | `48px` | Largura do rail de ícones |
| `--pdfb-sidebar-panel-width` | `280px` | Largura do painel da sidebar |
| `--pdfb-right-panel-width` | `280px` | Largura do painel direito |
| `--pdfb-canvas-page-width` | `794px` | Largura da página A4 no canvas |

### Transições

| Token | Valor | Descrição |
|---|---|---|
| `--pdfb-transition-fast` | `100ms ease` | Transição rápida |
| `--pdfb-transition-base` | `150ms ease` | Transição padrão |
| `--pdfb-transition-slow` | `250ms ease` | Transição lenta |

---

## Exemplos de Personalização

### Mudar cor accent para azul

```css
:root {
  --pdfb-color-accent: #3b82f6;
  --pdfb-color-accent-hover: #2563eb;
  --pdfb-color-accent-light: rgba(59, 130, 246, 0.15);
  --pdfb-color-accent-subtle: rgba(59, 130, 246, 0.08);
  --pdfb-color-accent-deep: #1d4ed8;
  --pdfb-shadow-focus: 0 0 0 2px rgba(59, 130, 246, 0.30);
  --pdfb-tree-text-selected: #3b82f6;
  --pdfb-tree-bg-hover: rgba(59, 130, 246, 0.07);
  --pdfb-tree-bg-selected: rgba(59, 130, 246, 0.12);
}
```

### Tema escuro customizado

```css
[data-pdfb-theme="dark"] {
  --pdfb-color-bg: #0f172a;           /* Slate 900 */
  --pdfb-color-canvas-bg: #020617;    /* Slate 950 */
  --pdfb-color-sidebar-bg: #1e293b;   /* Slate 800 */
  --pdfb-color-panel-bg: #1e293b;
  --pdfb-color-surface: #334155;      /* Slate 700 */
  --pdfb-color-text-primary: #f1f5f9; /* Slate 100 */
}
```

### Mudar fonte da UI

```css
:root {
  --pdfb-font-family-ui: 'Inter', -apple-system, system-ui, sans-serif;
}
```

---

## Prefixo CSS

Todas as classes CSS do editor usam o prefixo `pdfb-`:

- `.pdfb-root` — container raiz
- `.pdfb-toolbar` — toolbar superior
- `.pdfb-sidebar` — sidebar esquerda
- `.pdfb-canvas-area` — área do canvas
- `.pdfb-page` — página do documento

Isso garante zero conflitos com CSS da aplicação host.

## Arquitetura dos Estilos

| Arquivo | Conteúdo |
|---|---|
| `styles/tokens.css` | Design tokens (variáveis CSS) — light + dark |
| `styles/editor.css` | Estilos da UI do editor |
| `styles/print.css` | Estilos específicos para impressão/export |

Todos são bundled em `dist/style.css` no build.

## Notas

- O tema escuro **não** afeta o conteúdo do documento — apenas a UI do editor. O documento sempre renderiza com suas próprias cores.
- A toolbar superior é sempre escura (dark surface) em ambos os temas.
- Portais (modais, overlays) usam o atributo `data-pdfb-theme` no `<html>` para herdar o tema correto.
