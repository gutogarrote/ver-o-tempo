# Guia técnico do repositório

## Estado e arquitetura atuais

Rotina da Nina visualiza manhã/noite em uma fita para famílias. Este guia vale para
qualquer implementador; AGENTS.md contém as convenções de contribuição.

- `app/src/App.jsx`: carregamento e normalização `duration → minutes`, precedência URL/storage,
  fallback público/embarcado e relógio por timestamp.
- `pages/Home.jsx`: seleção manhã/noite, prazo, operações da sessão, editores e gravação.
- `components/fita/RoutineTV.jsx`, `RoutinePhone.jsx`, `ParentMenu.jsx`, `theme.js`: UI aprovada.
- `RoutineEditor.jsx`, `DefaultRoutineEditor.jsx`: editores; AudioAlerts permanece inativo.
- `lib/schedule.js`: agenda e operações; `routineView.js` e `trackLayout.js`: apresentação/geometria;
  `timeline.js`: helpers de horário; `routineUrl.js` e `taskCatalog.json`: contrato de links.
- `public/routines.json` e `lib/defaultRoutines.json`: padrões semanticamente iguais,
  protegidos por teste. Não remover a cópia embarcada, usada no fallback.

Storage usa `routines`; sessão em memória não sobrevive ao reload. Queries válidas vencem
storage e persistem; inválidas não gravam; atalhos usam padrões sem gravação inicial.
A tela principal lê `monday`; outros dias do editor não implicam seleção automática.
O encerramento dura até 180 minutos após o prazo. Não há backend, PWA/offline garantido,
notificações, sincronização ou serviço de deploy configurado.

## Comandos

Node 22.23.3 (`.nvmrc`, engines); Python 3 no PATH é necessário ao teste da documentação.
Todos os comandos npm são executados em `app/`:

```bash
npm ci
npm start
npm run lint -- --max-warnings=0
npm test -- --run
npm run build
npm audit
```

A suíte tem 228 cenários em 8 arquivos, sem skip/todo. Preserve seus asserts e contratos.
Exceções de acesso DOM são por linha e justificadas para geometria em jsdom; não desligue
regras globalmente. Vite/Vitest substituem CRA nesta fase; audit/deprecações transitivas são dívida de
ferramentas, não resolvidas pela classificação devDependencies. Não use audit fix --force.
PROGRESS e specifications distinguem o estado atual do histórico; CHANGES.MD é histórico.
