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

Node **26.13.0 LTS (Lithium)**, com npm **11.20.0** incluído no runtime oficial,
é a escolha atual, explicitamente autorizada por Guto para a mesma branch e PR32.
O [índice oficial](https://nodejs.org/dist/index.json), consultado em 2026-10-28,
confirma a versão, o npm e a entrada em LTS nessa data. O
[cronograma oficial](https://github.com/nodejs/Release/blob/main/schedule.json)
prevê suporte da linha 26 até **2029-04-30**. A decisão amplia o horizonte de suporte;
a compatibilidade da troca de major foi verificada com a suíte e o build existentes.
O runtime foi baixado de `nodejs.org/dist/v26.13.0/` para a pasta de evidências e o
SHA256 do tarball foi conferido com o `SHASUMS256.txt` oficial antes da extração.
Nenhum runtime ou configuração global de Node/CLI foi alterado.

Histórico: a primeira etapa desta manutenção escolheu Node 22.23.4/npm 10.9.9,
um patch de segurança sobre 22.23.3, para limitar a mudança de runtime.
Essa recomendação de permanecer na linha 22 foi substituída pela autorização de
migrar para 26.13.0. As correções de vulnerabilidades daquela etapa foram preservadas.
Nesta migração, somente `packages[""].engines.node` muda no lockfile; nenhuma resolução,
versão, integridade ou dependência foi alterada pelo npm 11.

`.nvmrc`, engines e documentação usam o mesmo pin; o workflow já lê
`node-version-file: .nvmrc`, portanto recebe a atualização sem duplicar o número.
ESLint 9.39.5 continua depreciado: os plugins atuais React 7.37.5 e JSX a11y 6.10.2
só declaram suporte até ESLint 9. A migração para 10 permanece pendente de peers
compatíveis, sem desabilitar regras nem forçar instalação incompatível.

## Verificação atual — Node 26

Evidências desta migração: `/home/ubuntu/.hermes/cache/scratch/ver-o-tempo-node26-evidence`.
O PR32 já está aberto; Hermes fará a verificação independente, o push na mesma branch
e a atualização desse PR. Este follow-up produz commit local, sem push, edição de PR,
merge ou deploy. A issue permanece aberta até o merge.

No runtime oficial isolado Node 26.13.0/npm 11.20.0 passaram, em sequência:
`npm ci`, `npm run lint -- --max-warnings=0`, `npm test -- --run` (491/491 em
25 arquivos, 72,47 s, sem skip/todo ou mudança de testes/assertions/timeouts),
`npm run build`, `npm audit --json` e `npm audit --omit=dev --json` (ambos zero).
`git diff --check` também passou. Código funcional, CSS e testes não foram alterados.

Chromium: 552/552 verificações em 360×740, 390×844, 1366×768 e 1920×1080;
8/8 capturas iguais pixel a pixel ao baseline, geometria e estilos computados iguais.
PWA em preview: manifest HTTP 200, worker controlando após reload, navegação e
abertura/cancelamento do editor offline em `/0720`, `/1930` e queries v1/v2,
sem erros de página. Suites executadas sem concorrência entre Vitest e browsers.
Não houve teste em hardware Android/iOS, WebKit ou implantação remota nesta migração.

Comparação com o build baseline de main `5148034`: `index-EkGWOnXY.js` e
`index-Bp3UgflG.css` byte a byte iguais. Apenas `instrucoes.md` e
`instrucoes/index.html` mudam pelo pin atualizado no guia; os demais assets,
incluindo o worker, permanecem iguais.
Logs: `runtime.txt`, `checksum-verification.txt`, `npm-ci.log`, `lint.log`,
`test.log`, `build.log`, `audit.json`, `audit-prod.json`, `lock-comparison.json`,
`build-comparison.json`, `browser.log`, `browser-results.json`, `pwa-results.json`,
`visual-comparison.json` e `diff-check.log`; scripts e capturas `node26-*.png`
estão na pasta desta migração acima, separados das evidências históricas.

`npm ci` com npm 11.20.0 preservou o lockfile. Além da depreciação conhecida do
ESLint 9, informou scripts de instalação de esbuild/workerd ainda não cobertos por
`allowScripts`; nenhuma aprovação ou configuração global foi adicionada. O build
com os binários instalados passou. Não foi necessário mudar dependências ou CI.

## Histórico de verificação — etapa Node 22

Evidências completas, scripts e capturas ficam fora do Git em
`/home/ubuntu/.hermes/cache/scratch/ver-o-tempo-28-evidence`.
Na execução original dessa etapa não houve push, criação de PR, merge ou deploy;
posteriormente o PR32 foi aberto. O status operacional atual está na seção acima.

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
