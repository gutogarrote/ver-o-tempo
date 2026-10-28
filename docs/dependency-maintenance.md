# Manutenção de dependências — issue 28

Consulta em 2026-10-28, baseline `5148034`. Escopo: dependências de ferramentas e
runtime local/CI; sem alterações em React, código funcional, estilos ou configuração remota.

## Auditoria atual e correções

| `npm audit --json` | Antes | Depois |
| --- | --- | --- |
| Completo | 5 pacotes: 3 moderate, 2 high | 0 |
| `--omit=dev` | 0 | 0 |

O baseline atual tem `postcss-selector-parser` (moderate), `undici` (high),
`zod` (high), `miniflare` e `wrangler` (moderate por propagação).
São caminhos de build, testes, lint e servidor local/publicação; essas ferramentas
não são entregues ao navegador pelo build estático. A classificação dev não elimina
a exposição ao executar ferramentas com entradas ou respostas não confiáveis.
Zero achados significa apenas ausência de advisories conhecidos retornados nessa consulta.

Os 7 pacotes históricos não são o baseline atual: o advisory
[GHSA-vfj7-8cjw-p6xm de braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
foi retirado em 23/10/2026. `braces` continua 3.0.3, sem alegação de correção desse
advisory por atualização. O advisory
[GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)
tem correção compatível na linha 6 de `postcss-selector-parser`.

| Caminho | Atualização |
| --- | --- |
| Tailwind 3.4.17 → postcss-nested 6.2.0 / parser | postcss-selector-parser 6.1.4 → 6.1.5 |
| jsdom 30.1.2 → undici | 8.11.2 → 8.12.3 |
| eslint-plugin-react-hooks 7.1.1 → zod (também zod-validation-error) | 4.6.5 → 4.6.7 |
| Wrangler | 4.149.0 → 4.155.0 |
| Wrangler → Miniflare | 5.20261006.1-alpha → 5.20261023.2-beta |
| Miniflare → undici | 7.29.1 → 7.30.1 |
| Wrangler / Miniflare / unenv-preset → workerd e seus 5 binários opcionais | 1.20261006.1 → 1.20261023.1 |

Wrangler está fixado em `package.json`; transitivas estão fixadas pelo lockfile,
respeitando os ranges dos pais. Não foram adicionados overrides, nomes de pacotes
ou dependências de navegador. O Miniflare beta é a dependência exata do Wrangler
estável selecionado (o baseline já usava uma versão alpha).

Foram consultados versões instaladas/disponíveis, `npm view repository.url maintainers`
e metadados `dist` das 12 entradas com nova versão, incluindo os binários opcionais
Darwin x64/arm64, Linux x64/arm64 e Windows x64. Todos usam tarballs de
`registry.npmjs.org`, com integridade igual à do registry. Origens declaradas:
Cloudflare (`workers-sdk`, `workerd`, mantenedores de publicação Cloudflare),
PostCSS (`postcss-selector-parser`), Node.js (`undici`) e Colin McDonnell (`zod`).
Isso verifica consistência e procedência declarada; não é revisão integral do código upstream.
Não houve novos nomes, remoções ou alterações das demais versões do lockfile.

## Alternativas e runtime

Foi preferida a correção compatível das transitivas à migração de Tailwind.
O registry oferece `tailwindcss@3.4.19` no tag `v3-lts` e `4.3.3` no tag `latest`;
não é necessário mudar Tailwind 3.4.17 para obter o parser corrigido dentro de seu
range. Tailwind 4 exigiria revisar plugin PostCSS, configuração, utilitários e
[alterações de estilo e requisitos de navegador](https://tailwindcss.com/docs/upgrade-guide).
Essa migração amplia o risco visual sem benefício necessário para estes achados.
Não foi executado `npm audit fix --force`.

Node **22.23.4**, npm **10.9.9**: patch de segurança da linha já utilizada.
[Release oficial](https://nodejs.org/en/blog/release/v22.23.4) corrige problemas em
DNS, TLS, Brotli, HTTP e dependências embutidas, posteriores ao pin 22.23.3.
O [índice oficial](https://nodejs.org/dist/index.json) indicava 22.23.4 como último 22;
Node 24.22.2 e 26.13.0 também estavam em LTS. Conforme o
[cronograma oficial](https://github.com/nodejs/Release/blob/main/schedule.json),
a linha 22 recebe manutenção até 2027-04-30, 24 até 2028-04-30 e 26 até 2029-04-30.
Escolher o patch da linha 22 reduz a mudança de runtime; a contrapartida é planejar
migração de major antes de abril de 2027. Não há alegação de segurança absoluta.
Os binários locais foram baixados de nodejs.org e conferidos com SHASUMS256.
Nenhum runtime/configuração global foi alterado.

`.nvmrc`, engines e documentação usam o mesmo pin; o workflow já lê
`node-version-file: .nvmrc`, portanto recebe a atualização sem duplicar o número.
ESLint 9.39.5 continua depreciado: os plugins atuais React 7.37.5 e JSX a11y 6.10.2
só declaram suporte até ESLint 9. A migração para 10 permanece pendente de peers
compatíveis, sem desabilitar regras nem forçar instalação incompatível.

## Verificação local

Evidências completas, scripts e capturas ficam fora do Git em
`/home/ubuntu/.hermes/cache/scratch/ver-o-tempo-28-evidence`.
Não houve push, PR, merge ou deploy; a issue deve permanecer aberta até o merge.

Com Node 22.23.4: `npm ci`, lint com zero warnings, 491 testes em 25 arquivos
(sem skip/todo e sem alterações nos testes) e build passaram. A primeira execução
em concorrência com browsers teve 490 passes e um timeout de 5s em App.test.jsx;
a repetição completa sem concorrência passou, sem mudar limites ou assertions.

Chromium via Playwright já disponível fora do projeto: 552/552 verificações nas
resoluções 360×740, 390×844, 1366×768 e 1920×1080. Incluem editar, cancelar sem
gravação, salvar/recarregar, reordenar por toque e teclado, duração mínima 1,
entradas inválidas, inserção entre vizinhos, horário final, resize e atraso.
Geometria, hit testing, clipping e tamanhos reais dos controles foram inspecionados,
incluindo scroll para tarefas curtas. Sem overflow horizontal ou erros de página.
Geometria e estilos computados coincidem com baseline nas quatro resoluções.
As oito capturas (normal/edição), com animações pausadas, são pixel a pixel iguais.

PWA em preview: manifest HTTP 200, worker controlando após reload, navegação offline
para `/0720`, `/1930` e queries v1/v2 com abertura/cancelamento do editor.
Wrangler 4.155.0 iniciou localmente e serviu `/0720` com fallback SPA HTTP 200.
Não foi testado hardware Android/iOS, WebKit ou implantação remota.

Antes da atualização documental, todo o build era byte a byte igual ao baseline
Node 22.23.3. A troca do pin no guia v2 atualiza somente a documentação gerada;
JS/CSS e comportamento do app permanecem iguais. Logs principais: `baseline-ci.log`,
`baseline-audit*.json`, `after-ci.log`, `after-audit*.json`, `after-lint.log`,
`after-test-final.log`, `after-build-final.log`, `build-comparison.json`,
`provenance.json`, `lock-changes.json`, `after-paths.txt`, `browser.log`,
`browser-results.json`, `visual-comparison.json` e `pwa-results.json`, todos no
diretório de evidências acima. Capturas `baseline-*.png` e `after-*.png` acompanham
os scripts externos usados para reprodução; nenhum pacote de teste de browser foi
adicionado ao projeto.
