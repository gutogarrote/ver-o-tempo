# Especificação vigente — Rotina da Nina

- Duas rotinas visíveis: manhã e noite, da estrutura `monday`; o editor completo
  pode armazenar outros dias/períodos, mas a tela principal não alterna por dia da semana.
- Tarefas com nome, emoji, cor e minutos; compatibilidade de leitura com `duration`.
- Prazo determina o início; concluir, saltar, acrescentar cinco minutos e reiniciar
  ajustam a sessão. Após o prazo há janela de encerramento de 180 minutos.
- TV usa fita horizontal; celular usa lista vertical com acompanhamento e rolagem manual.
- Editores salvam configuração em localStorage e atualizam o link sem reload.
- URL: contrato detalhado em [docs/url-rotina.md](docs/url-rotina.md); não alterar parser,
  precedência, atalhos ou conteúdo padrão como parte da manutenção da fase 1.
- Configuração persistente por origem; sessão volátil; sem sincronização entre aparelhos.
- Sons inativos, sem backend, service worker, offline garantido, notificações ou deploy.
- Stack preservada: CRA 5, React 19, Tailwind 3, Jest/Testing Library e ESLint do CRA.
  Node 22.23.3 e Python 3; checks documentados em README e AGENTS.

## Histórico — visão inicial, não requisitos implementados

O texto abaixo foi preservado para contexto. Áudio, dias da semana e PWA mencionados
nele são propostas históricas, não compromissos desta fase.

# Project: Linear Day Timeline

## 1. Vision

A web application to visualize daily routines on a linear timeline, designed for children and families. The app will make time tangible by representing tasks as colored blocks, with real-time progress indicators and audio alerts.

## 2. Core Features

- **Timeline:** A zoomed-in, horizontal timeline that scrolls from right to left. A fixed vertical line positioned 25% from the left of the screen will represent "Now."
- **Tasks:** Tasks are displayed as colored blocks on the timeline. The width of each block is proportional to its duration. Each block will have a label and an icon.
- **Routines:**
    - The app will support different routines for each day of the week.
    - Routines are defined in a `routines.json` file.
    - Users can edit routines (add, edit, reorder, delete tasks).
- **Time Calculation:** The user sets an end time for a routine, and the app calculates the start time based on the total duration of the tasks.
- **Alerts:** Audio alerts will notify users of task milestones (e.g., "5 minutes remaining," "task complete").
- **Visual Feedback:** Completed tasks will be visually distinct (e.g., grayscale with a checkmark) to provide a sense of accomplishment.
- **Responsive Design:** The app will be accessible and usable on TVs, tablets, phones, and PCs.

## 3. Technical Implementation

- **Frontend:** React with Tailwind CSS.
- **Data Storage:** `localStorage` will be used to store routine data, loaded from a `routines.json` file.
- **No Backend:** The application will be a pure client-side application.
- **Local Network Access:** The app will be accessible on the local network by running a local development server.
- **Progressive Web App (PWA):** The app will be configured as a PWA to allow for installation on supported devices.

## 4. Next Steps

1.  Set up the React project with `create-react-app`.
2.  Integrate Tailwind CSS.
3.  Create the `routines.json` data structure.
4.  Implement the core components: `RoutineSelector`, `Timeline`, `TaskBlock`, `TimeIndicator`.
5.  Implement the timeline logic with smooth scrolling.
6.  Develop the routine editing functionality.
7.  Add audio alerts.
