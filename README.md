# Pace Nomogram

Conversor visual de **pace ↔ velocidade**, com tempos por distância, cálculo de metas e calculadora de durações. Interface em português, adaptada a celular, desktop, teclado e leitores de tela.

## Executar

Requer Node.js 22.12+ (CI usa Node 24).

```sh
npm ci
npm run dev
```

Abra o endereço exibido pelo Vite, no caminho `/nomogram/`.

```sh
npm test                # Regressões, unidades, conversões e validação do estado
npm run build          # Verificação de tipos e geração de dist/
npm run test:browser   # Navegação, teclado, toque, persistência, PWA e atualização
npm run preview        # Servir o build local
npm run icons          # Regerar ícones PNG a partir da imagem original
```

Os testes de navegador usam Chrome ou Edge instalado, sem baixar um navegador. Defina `CHROME_PATH` se necessário. `npm run check` executa todos os checks, incluindo auditorias automáticas de acessibilidade com axe em telas claras/escuras e no celular. Capturas e relatórios ficam em `artifacts/` (não versionados).

## Funcionalidades

- Arraste o mostrador circular, use os botões de ajuste ou as setas do teclado. Shift + seta ajusta 10 segundos; Page Up/Down, 1 minuto; Home/End, os limites da escala.
- Digite pace (`5:35`) ou velocidade (`10,8`) e confirme com Enter ou Aplicar. A agulha e o outro campo se atualizam juntos. O pace é arredondado ao segundo mais próximo; o campo de velocidade mostra uma aproximação.
- Consulte tempos para 5 km, 10 km, meia maratona (21,0975 km), maratona (42,195 km) e distância personalizada, supondo pace constante e sem paradas.
- Informe distância e tempo desejado para obter o pace e aplicá-lo ao mostrador. Metas fora de 2:00–15:00 min/km são calculadas, mas não podem ser aplicadas à escala.
- Ao aplicar um pace válido fora da escala selecionada, a escala se expande. Ao reduzir a escala nas configurações, o pace é ajustado ao limite mais próximo quando necessário.
- Tema automático/claro/escuro, escala, pace, expressão, últimos 12 cálculos e campos do planejamento persistem apenas no navegador. Navegar entre abas ou abrir configurações preserva os valores.

## Calculadora

Tempos usam `m:ss` ou `h:mm:ss`. Também são aceitos apóstrofos (`4'30"`) e ponto ou vírgula para decimais. Números sem `:` são escalares, não minutos implícitos.

| Expressão | Resultado |
| --- | --- |
| `3:55 × 10` | `39:10` |
| `1:45:00 ÷ 42.195` | `2:29` |
| `(4:00 + 5:00) ÷ 2` | `4:30` |
| `5:00 ÷ 5:00` | `1` (número) |
| `4:59 + 0:00.6` | `5:00` |

O parser valida a expressão inteira, precedência, parênteses, sinais, divisão por zero e unidades. Soma/subtração exigem unidades iguais. Tempo × número e tempo ÷ número retornam tempo; tempo ÷ tempo retorna número. Tempo × tempo e número ÷ tempo não são suportados. Resultados intermediários preservam a precisão; só a exibição de duração arredonda para segundos. Calcular salva o histórico e mantém a expressão original.

## Estrutura

```text
src/domain/       Cálculos puros, parser, formato de estado e testes
src/components/   Mostrador, entrada direta, planejamento e calculadora
src/App.tsx       Estado compartilhado, persistência, tema, abas e atualização
src/styles.css    Interface responsiva e temas
public/           Ícones para instalação, cabeçalho e favicon
assets/brand/     Imagem original e prompt de geração do novo ícone
scripts/          Testes em navegador real
```

O repositório original continha apenas o bundle publicado. Esta versão reconstrói fontes editáveis mantendo o mostrador circular, a paleta laranja, a calculadora e as opções de escala e aparência. O novo ícone mantém o conceito do instrumento circular, com menos detalhes para legibilidade em tamanhos pequenos. O commit `b736cf6` preserva a versão compilada anterior no histórico. A imagem original e seu prompt estão em [assets/brand](assets/brand/README.md); `npm run icons` gera as versões de 32, 48, 180, 192 e 512 px.

## Offline e atualizações

O service worker é gerado no build e funciona em HTTPS ou localhost. Depois de um primeiro acesso conectado e da preparação do cache, as ferramentas abrem sem conexão. O cache usa o identificador `pace-nomogram` e o escopo `/nomogram/`. A aplicação não apaga caches nem remove registros de outros aplicativos na origem.

Uma versão nova gera o aviso **Atualizar agora / Depois**. A atualização é aplicada quando o usuário escolhe e preserva os dados já salvos. A limpeza automática fica limitada aos caches gerenciados pelo Workbox deste aplicativo. Não há service worker no modo de desenvolvimento; use o build e preview para testar offline. O navegador pode remover dados por política de armazenamento ou ação do usuário.

## Publicação no GitHub Pages

O workflow `.github/workflows/pages.yml` valida pull requests. Pushes na `main` executam os mesmos checks e publicam apenas `dist/` no GitHub Pages.

Na primeira migração do site antigo, configure **Settings → Pages → Build and deployment → Source → GitHub Actions** antes de publicar a nova `main`. Isso substitui a publicação direta dos arquivos compilados da raiz. O workflow requer Pages habilitado e permissão do ambiente `github-pages` para a branch `main`.

Para publicar em outro caminho, ajuste `base`, `manifest.id/start_url/scope` e `navigateFallback` em `vite.config.ts`, além dos links absolutos em `index.html` e da base de teste em `scripts/browser-tests.mjs`.
