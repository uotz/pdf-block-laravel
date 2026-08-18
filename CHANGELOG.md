# @pdf-block/laravel

## 3.3.1

### Patch Changes

- [#41](https://github.com/accusense-tech/pdf-block/pull/41) [`e100a5d`](https://github.com/accusense-tech/pdf-block/commit/e100a5d095608cd29cf87c764642d91881b5d35d) Thanks [@Jonathas-Augusto](https://github.com/Jonathas-Augusto)! - Corrige o PDF **paginando no modo contínuo**, com uma 2ª folha carregando a cauda
  do documento.

  As imagens com `height:auto` levavam `max-height:100vh` (`blocks/image.blade.php`).
  No print, porém, o viewport **é a folha** — e no contínuo a folha tem a altura do
  documento inteiro, medida por JS. O teto então valia uma coisa na MEDIÇÃO (viewport
  do driver, 800px de altura) e outra no PDF (a folha inteira): a imagem era medida
  truncada em 800px, voltava ao tamanho natural no print e o excedente empurrava uma
  página nova. Aumentar a folha não resolvia — sendo `vh`, a imagem crescia junto.

  Medido no documento real: imagem de 1333px medida como 800px, folha de 1044,6mm
  para 1185,6mm de conteúdo, 2 páginas. Agora sai 1.

  O teto passa a vir de `--pdfb-img-max-h`, definida no `document.blade.php`: altura
  da folha no paginado (equivalente ao que `100vh` valia lá no print) e `none` no
  contínuo, onde limitar não faz sentido. No paginado com motor `css` o PDF sai
  byte a byte idêntico; com o motor `js` o corte das folhas fica mais fiel, porque o
  paginador materializa a partir da tela e agora ela mede o mesmo que o print aplica.

  Trava de regressão em `tests/viewport_units_check.php`: nenhum blade pode
  dimensionar altura em unidade de viewport.
