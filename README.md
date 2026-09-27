# Rotina da Nina ⏰

Aplicativo web que mostra a rotina da Nina como uma **fita do tempo**: cada tarefa é um bloco colorido, e um marcador **AGORA** caminha pela fita em tempo real, mostrando onde ela está, o que vem a seguir e quanto falta para acabar.

Foi feito para ser olhado **de longe** (TV da sala) e **de perto** (celular/tablet na mão), com telas diferentes para cada caso.

> Este repositório é um **fork** de [gutogarrote/ver-o-tempo](https://github.com/gutogarrote/ver-o-tempo), adaptado para a rotina da Nina. O `README` anterior descrevia a versão original do app (antes do fork), com componentes e instruções que não existem mais aqui — esta é a versão atual.

---

## 🌟 O que o app faz

### Fita do tempo em tempo real
- Blocos proporcionais à duração de cada tarefa (minutos), com emoji e nome.
- Estados visuais: tarefas **já feitas** ficam apagadas com ✓, a **tarefa atual** ganha um anel branco, as próximas ficam em cor cheia.
- Marcador **AGORA** sobre a fita, andando conforme o relógio.
- Card **AGORA** com contagem regressiva da tarefa em andamento.
- Painel **A SEGUIR** com as próximas 2 tarefas e o horário previsto de cada uma.
- Estado ⏰ **"Quase acabando"** nos últimos 2 minutos da tarefa.
- Clicar em qualquer bloco **pula** para aquela tarefa (recalcula o horário limite / hora de início).

### Dois layouts (design "Fita")
- **TV (paisagem)** — `components/fita/RoutineTV.js`: palco fixo de 1440×810 escalado para caber na tela (letterbox), fita proporcional na horizontal, card AGORA grande com contagem e painel "A seguir". Fonte: design **1a**.
- **Celular (retrato / telas estreitas)** — `components/fita/RoutinePhone.js`: card AGORA no topo e fita **vertical** na proporção de 11 px por minuto, que **acompanha** a tarefa atual (~40% abaixo do topo) e pausa por 10 s se o adulto rolar a tela na mão. Fonte: design **2a**.
- A escolha é automática por `matchMedia('(max-width: 767px), (max-aspect-ratio: 1/1)')` em `src/pages/Home.js`.

### Zona de fechamento e "hora extra"
- No fim da fita existe uma zona de encerramento: **"Hora de sair"** 🚗 (manhã) e **"Hora de dormir"** 🛏️ (noite) — customizável por rotina com a chave `closing`.
- Passou do horário limite, a rotina **não reinicia**: a zona de fechamento acende, o card conta **para cima** (`+mm:ss DEPOIS DA HORA`) e o botão **↺ Recomeçar** reinicia.
- A tolerância para "hora extra" é de 180 minutos (`OVERTIME_WINDOW_MIN`); depois disso o app entende que a rotina é do dia seguinte.

### Manhã e noite
- Alternância ☀️ Manhã / 🌙 Noite direto no cabeçalho.
- Cada rotina tem seu horário limite próprio (`endTime`).

### Menu dos pais (badge ✨)
Os controles de adulto ficaram escondidos atrás do badge ✨, para a tela da criança ficar limpa:
- **✏️ Editar esta rotina** — edita tarefas da rotina atual (nome, emoji, cor, minutos, ordem).
- **⚙️ Rotinas** — editor geral: cria/edita/apaga rotinas por dia e período, muda horários limite.
- **Horário limite** — liga/desliga e escolhe o horário; com ele ligado, o app calcula a posição da fita para a rotina terminar exatamente nesse horário.

### Edição de tarefas
- Adicionar, remover e reordenar tarefas (setas ↑↓ no toque; **arrastar e soltar** com alça no desktop).
- Escolha de cor e emoji por tarefa, duração em minutos.
- Tudo salva no `localStorage` do navegador — nada sai da máquina.

---

## 🚀 Como rodar

### Requisitos
- **Node.js** (o projeto foi validado com Node 26; `react-scripts` 5 pede Node ≥ 14) e **npm**.

### Passo a passo

```bash
# 1. Clonar este repositório (e não o ver-o-tempo)
git clone https://github.com/camerafilme/ninarotina.git
cd ninarotina/app          # ⚠️ o app React vive na subpasta app/

# 2. Instalar dependências
npm install

# 3. Subir o servidor de desenvolvimento
npm start
```

O navegador abre em **http://localhost:3000**.

### Scripts disponíveis (rodar dentro de `app/`)

```bash
npm start        # servidor de desenvolvimento em http://localhost:3000 (recarrega ao salvar)
npm test         # testes em modo watch (Jest + React Testing Library)
npm run build    # build de produção em app/build/
npm run eject    # ⚠️ irreversível, expõe a configuração do CRA (evite)
```

> Não existe `npm run lint` neste projeto: o lint vem embutido no `npm start`/`npm run build` pelos presets `react-app` do CRA.
>
> ⚠️ Com `CI=true` os *warnings* de lint passam a ser **erro** e o build quebra. Hoje existe um warning em `src/components/AudioAlerts.js` (variável `taskStartTime` não usada), então build em CI falha até isso ser limpo.

Verificado nesta versão: `npm test` → 10 testes passando em 2 suítes; `npm run build` gera `app/build/` (≈69 kB gzip de JS).

---

## 📁 Estrutura do projeto

```
ninarotina/
├── app/                              # aplicação React (CRA + Tailwind)
│   ├── public/
│   │   ├── routines.json             # rotinas padrão (fonte inicial dos dados)
│   │   └── sounds/                   # 1-minute-remaining.mp3, 5-minutes-remaining.mp3, task-complete.mp3
│   ├── src/
│   │   ├── App.js                    # carrega rotinas, mantém o relógio (1 s), normaliza dados
│   │   ├── pages/Home.js             # escolhe TV ou celular, monta o view model, salva edições
│   │   ├── components/
│   │   │   ├── fita/
│   │   │   │   ├── RoutineTV.js      # layout 1a (TV / paisagem)
│   │   │   │   ├── RoutinePhone.js   # layout 2a (celular / retrato)
│   │   │   │   ├── ParentMenu.js     # badge ✨ com os controles de adulto
│   │   │   │   └── theme.js          # cores, fontes e utilitários visuais da fita
│   │   │   ├── RoutineEditor.js      # editor da rotina atual
│   │   │   ├── DefaultRoutineEditor.js # editor geral de todas as rotinas
│   │   │   └── AudioAlerts.js        # alertas sonoros (ver "Limitações conhecidas")
│   │   └── lib/
│   │       ├── timeline.js           # helpers puros: computeElapsed, locateTask, hhmm, toToday…
│   │       ├── routineView.js        # view model da fita (estados, contagem, fechamento)
│   │       └── routineView.test.js   # testes dos helpers
│   ├── CHANGES.MD                    # changelog do app
│   └── package.json
├── specifications.md                 # especificação funcional
├── original_specification.md         # especificação da versão original (pré-fork)
├── PROGRESS.md                       # diário de desenvolvimento
├── ver-o-tempo-ui-handoff.md         # handoff de design da fita (1a/2a)
├── to-do.md                          # pendências conhecidas
├── AGENTS.md / CLAUDE.md             # convenções para agentes de IA
└── README.md                         # este arquivo
```

### Stack

- **React 19.1.1** (componentes funcionais e hooks), **Create React App** (`react-scripts` 5).
- **Tailwind CSS 3.4.17** (configurado em `app/tailwind.config.js`; os componentes da fita usam estilos inline + tokens em `components/fita/theme.js`).
- **Fontes** Fredoka e Nunito (Google Fonts, carregadas em `public/index.html`).
- **Persistência**: `localStorage` (chave `routines`) — sem servidor, sem banco, sem login.
- **Testes**: Jest + React Testing Library (`src/App.test.js`, `src/lib/routineView.test.js`).

---

## 🗂️ Dados das rotinas

`app/public/routines.json` é o ponto de partida:

```json
{
  "monday": {
    "morning": {
      "name": "Manhã",
      "endTime": "06:30",
      "tasks": [
        { "id": 1, "name": "Acordar",         "icon": "🌞", "color": "#06b6d4", "minutes": 10 },
        { "id": 2, "name": "Café da manhã",   "icon": "☕️", "color": "#f97316", "minutes": 20 }
      ]
    },
    "evening": { "name": "Noite", "endTime": "21:00", "tasks": [/* … */] }
  }
}
```

- Estrutura: `dia → período (morning | evening) → { name, endTime, tasks[] }`.
- Cada tarefa: `{ id, name, icon, color, minutes }`. O app também aceita o campo antigo `duration` e **normaliza para `minutes`** na carga (`normalizeMinutes` em `src/App.js`).
- Chaves opcionais por rotina: `bufferMinutes` (buffer mostrado no layout de TV, padrão 25 min) e `closing` (sobrescreve a zona de fechamento).
- Na primeira execução o app lê o JSON, copia para o `localStorage` e passa a usar o `localStorage` como fonte. **Se você editar o `routines.json`, limpe o `localStorage`** (ou apague a chave `routines` no DevTools) para as mudanças aparecerem.

---

## 📱 Como usar no dia a dia

1. Abra o app (TV, tablet ou celular) — ele já entra na rotina **Manhã** (☀️). Toque em 🌙 para a rotina da **Noite**.
2. A fita mostra o progresso em tempo real. O card **AGORA** diz o que é para fazer agora e quanto falta.
3. Ajustou o horário? Toque no badge **✨** → **Horário limite** e escolha o horário: a fita se reposiciona para a rotina terminar naquela hora.
4. Quer mudar as tarefas? Toque no mesmo badge **✨** → **✏️ Editar esta rotina** (só a rotina atual) ou **⚙️ Rotinas** (todas). Salve no fim — as mudanças ficam gravadas no navegador.
5. Terminou antes ou depois da hora? **↺ Recomeçar** reinicia a fita; se passar do horário, a zona de fechamento indica a hora de sair/dormir.

---

## ⚠️ Limitações conhecidas

- **Só segunda-feira**: `src/pages/Home.js` fixa `todayKey = 'monday'`; o seletor ainda não escolhe o dia da semana automaticamente.
- **Alertas sonoros inertes**: o componente `AudioAlerts` e os arquivos em `public/sounds/` existem, mas `App.js` passa `routine={null}`, então nenhum som é disparado hoje.
- **Dados por navegador**: cada dispositivo tem seu próprio `localStorage` — não há sincronização entre TV e celular.
- **Manifest/ícones genéricos**: `public/manifest.json` (nome "React App") e os logos ainda são os padrões do Create React App.
- **Sem licença**: não há arquivo `LICENSE` neste repositório (a versão original do projeto se declarava MIT).

### Próximos passos (de `to-do.md` e do changelog)
- Rotina por dia da semana (seletor dinâmico).
- Alertas sonoros de verdade (5 min, 1 min, tarefa concluída).
- Exportar/importar rotinas para levar de um aparelho a outro.
- Melhorias de PWA / instalação e nomes/ícones próprios.

---

## 🔒 Privacidade

Tudo roda no navegador: rotinas ficam no `localStorage`, nenhum dado é enviado para servidores, sem login, sem analytics. Como não há service worker, não é um app instalável/offline; as fontes Fredoka e Nunito vêm do Google Fonts.

## 🙏 Origem e agradecimentos

- Fork de [gutogarrote/ver-o-tempo](https://github.com/gutogarrote/ver-o-tempo) — o app original de visualização de tempo para rotinas com crianças.
- Design da fita **1a / 2a**: ver `ver-o-tempo-ui-handoff.md`.
