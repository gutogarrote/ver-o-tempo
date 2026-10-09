# Rotina ⏰ — o tempo que dá pra ver

**Um app gratuito que mostra a rotina da manhã e da noite como uma fita colorida, para crianças que ainda não sabem ler as horas no relógio.**

Cada tarefa (acordar, tomar café, escovar os dentes, trocar de roupa…) vira um bloco colorido. Quanto mais longa a tarefa, maior o bloco. Um marcador **AGORA** anda pela fita no ritmo do relógio. Assim a criança vê onde está, o que vem depois e quanto tempo ainda tem, sem precisar perguntar "falta muito?".

![A fita da manhã na TV](docs/screenshots/tv-manha.png)

---

## 💛 Por que isso ajuda

Manhãs e noites com crianças costumam ser uma corrida: "já escovou os dentes?", "anda, que a gente vai se atrasar!", "cinco minutinhos pra dormir…". O problema é que, para uma criança pequena, **o tempo é invisível**. "Dez minutos" não quer dizer nada para quem ainda não entende o relógio.

Este app transforma o tempo em algo que dá para **ver**:

- **Tempo vira espaço.** Um bloco grande quer dizer tempo de sobra; um bloco estreito quer dizer que é rápido. A criança entende isso de olhar, sem ler números.
- **Menos bronca, mais autonomia.** Quem avisa que está na hora é a fita, não o adulto. A criança olha para a tela e sabe sozinha o que fazer.
- **Nada de surpresa.** Saber o que vem depois deixa as mudanças de atividade mais tranquilas, o que ajuda muito crianças que sofrem com transições.
- **Conquistas à vista.** Cada tarefa terminada ganha um ✓ e fica mais clarinha. Dá para ver o quanto já foi feito.
- **Serve para toda a família.** Os adultos também enxergam de relance se a manhã está no horário ou atrasada.

---

## 👀 O que aparece na tela

### A fita
Todas as tarefas da rotina, em ordem, cada uma com emoji, nome e duração.

- Tarefas **já feitas** ficam claras e ganham um ✓.
- A **tarefa de agora** tem uma borda branca e vai escurecendo aos poucos conforme o tempo passa.
- A linha **AGORA** mostra exatamente onde vocês estão.

### O cartão AGORA
Um cartão grande diz **o que fazer agora** e **quanto tempo falta** (por exemplo, `2:26`). Nos **últimos 2 minutos** ele fica vermelho e avisa: **"⏰ Quase acabando — corre!"**

![Cartão AGORA avisando que está quase acabando](docs/screenshots/tv-quase-acabando.png)

### A seguir
Ao lado, as **próximas duas tarefas** e a hora em que cada uma começa.

### E se passar da hora?
Sem drama. No fim da fita existe um espaço de encerramento: **"Hora de sair" 🚗** de manhã e **"Hora de dormir" 🛏️** à noite.

Se o horário acabar e ainda faltar alguma coisa, o app **mantém o encerramento por até três horas após o prazo**. O espaço de encerramento acende e mostra com calma onde vocês deveriam estar ("É hora de estar saindo pra escola — se ainda falta algo, pega no caminho"). O cartão mostra há quanto tempo passou da hora (`+16:48`). Após essa janela, o plano passa para a próxima ocorrência. Você também pode tocar em **↺ Recomeçar**.

![Depois do horário: a zona de "Hora de sair" acesa](docs/screenshots/tv-passou-da-hora.png)

### Na TV ou no celular
O app se ajusta sozinho à tela:

- **TV, computador ou tablet deitado:** a fita fica na horizontal, com letras grandes para ler do outro lado da cozinha.
- **Celular ou tablet em pé:** a fita fica na vertical e rola sozinha para acompanhar a tarefa de agora. Você pode rolar com o dedo para ver as outras tarefas; depois de alguns segundos ela volta a acompanhar.

<p>
  <img src="docs/screenshots/celular-manha.png" alt="Rotina da manhã no celular" width="260">
  &nbsp;&nbsp;
  <img src="docs/screenshots/celular-noite.png" alt="Rotina da noite no celular" width="260">
</p>

---

## 🧭 Como usar no dia a dia

1. **Abra o app** na TV, no tablet ou no celular. Ele começa na rotina da **manhã** (☀️). Toque em **🌙** para ver a rotina da **noite**.
2. **Deixe a tela onde a criança possa ver**: na cozinha, perto da mesa do café, no corredor do banheiro…
3. **Pronto.** A fita anda sozinha, seguindo o relógio. É só acompanhar.

### Se vocês estiverem adiantados ou atrasados
Toque no bloco da tarefa que vocês estão fazendo **agora**. O app entende "estamos aqui" e ajusta o horário de término para essa tarefa começar neste momento.

### Menu dos adultos (o botão ✨)
Para a tela da criança ficar limpa, os ajustes ficam escondidos atrás do botão amarelo **✨**, ao lado do nome do app:

![Menu dos adultos aberto](docs/screenshots/tv-menu-pais.png)

- **✏️ Editar esta rotina:** mude as tarefas da rotina que está na tela. Dá para trocar nome, emoji, cor e duração (em minutos), além de adicionar, apagar e mudar a ordem das tarefas.
- **⚙️ Rotinas:** o editor completo, com todas as rotinas e o horário em que cada uma deve terminar.
- **Horário limite:** a hora em que a rotina precisa acabar (por exemplo, a hora de sair para a escola). O app calcula de trás para frente quando cada tarefa deve começar.

As mudanças ficam guardadas **no próprio aparelho**, no navegador. Ao salvar no editor, o link da barra é atualizado sem recarregar: copie e guarde esse novo endereço para reabrir ou compartilhar tarefas, ordem, durações, nomes e horário final. No menu, use **Salvar horário** para incluir o prazo no link.

### Configuração por URL

Abra um link como `/?rotina=1.n.ba-20.ja-25.ma-de-5.1930` para carregar tarefas simples ou combinadas, ordem, minutos e final opcional. Os atalhos `/0720` e `/1930` abrem o padrão da manhã/noite com esse horário final. Consulte o [guia completo para gerar links de rotina](docs/url-rotina.md), com catálogo, exemplos e regras de edição e recarga.

### Dicas para funcionar melhor
- **Comece com poucas tarefas.** Quatro ou cinco já fazem diferença. Dá para aumentar depois.
- **Deixe a criança escolher** os emojis e as cores das tarefas dela. Ela vai se sentir dona da rotina.
- **Use durações realistas.** Se o café sempre leva 25 minutos, coloque 25, não 15.
- **Comemore os ✓.** Chegar ao "Hora de sair" com tudo feito é uma vitória!

---

## 💻 Como instalar

Por enquanto o app roda **a partir de um computador da casa**. Você instala uma vez e depois abre na TV, no tablet ou no celular pela rede Wi-Fi.

### PELO TERMINAL

Para quem já tem [Git](https://git-scm.com/) e [Node.js](https://nodejs.org/) (22.23.3 LTS, conforme `.nvmrc`) instalados:

```bash
git clone https://github.com/camerafilme/ninarotina.git
cd ninarotina/app
npm ci
npm start
```

O app abre em **http://localhost:3000**. Para usar na TV ou no celular (na mesma rede Wi-Fi), use o endereço **On Your Network** que o `npm start` mostra, por exemplo `http://192.168.0.15:3000`.

### OU ENTÃO

Não é preciso saber programar: basta seguir os passos.

#### 1. Instale o Node.js (só na primeira vez)
O Node.js é um programa gratuito que faz o app funcionar.

1. Entre em **[nodejs.org](https://nodejs.org/)**.
2. Baixe a versão **22.23.3 LTS** e instale como qualquer outro programa (pode ir clicando em "Avançar"/"Continuar").

#### 2. Baixe o app
1. No topo desta página, clique no botão verde **`<> Code`** e depois em **Download ZIP**.
2. Descompacte o arquivo baixado numa pasta fácil de achar, como **Documentos**.
3. Dentro dela haverá uma pasta chamada **`app`**. É essa que importa.

#### 3. Abra o "terminal" dentro da pasta `app`
O terminal é uma janela onde se digitam comandos. Não se assuste: são só dois.

- **Windows:** abra a pasta `app` no Explorador de Arquivos, clique na barra de endereço lá em cima, apague o que estiver escrito, digite `cmd` e aperte **Enter**.
- **Mac:** abra o app **Terminal**, digite `cd` seguido de um espaço, **arraste a pasta `app`** para dentro da janela e aperte **Enter**.

#### 4. Instale e ligue o app
No terminal, digite o comando abaixo e aperte **Enter**. Ele baixa o que o app precisa e só é necessário na primeira vez; pode levar alguns minutos.

```
npm ci
```

Quando terminar, digite:

```
npm start
```

O navegador vai abrir sozinho com o app. 🎉 (Se não abrir, entre em **http://localhost:3000**.)

> Se o Windows perguntar se o Node.js pode usar a rede, clique em **Permitir**. Isso é o que deixa a TV e o celular abrirem o app.

#### 5. Abra na TV, no tablet ou no celular
Depois do `npm start`, o terminal mostra algo assim:

```
  Local:            http://localhost:3000
  On Your Network:  http://192.168.0.15:3000
```

Com o aparelho **na mesma rede Wi-Fi** do computador, abra o navegador dele e digite o endereço da linha **On Your Network** (o número será diferente na sua casa). Numa smart TV, use o navegador da própria TV.

#### Das próximas vezes
Basta abrir o terminal na pasta `app` (passo 3) e digitar `npm start`. O computador precisa ficar ligado, com a janela do terminal aberta, enquanto vocês usam o app. Para desligar, feche a janela do terminal (ou aperte **Ctrl + C** nela).

---

## 🚧 O que ainda não tem

Este é um projeto em andamento. Por enquanto:

- **Sons de aviso ainda não tocam.** Os avisos sonoros ("faltam 5 minutos", "falta 1 minuto", "tarefa concluída") estão planejados, mas ainda não funcionam.
- **Uma rotina de manhã e uma de noite, iguais todos os dias.** Ainda não dá para ter rotinas diferentes para cada dia da semana (por exemplo, sábado sem escola).
- **Cada aparelho guarda suas próprias mudanças.** Se você editar a rotina no celular, a TV não fica sabendo. Faça as mudanças no aparelho que fica à vista da criança.
- **Precisa de um computador ligado** para funcionar (veja "Como instalar").

## 🔒 Privacidade

O app não tem cadastro, login ou backend de rotinas. As configurações ficam no navegador de cada aparelho. Fontes são carregadas do Google Fonts; um link compartilhado pode expor os nomes e horários que transporta.

## 🙏 De onde veio

Este projeto nasceu do [ver-o-tempo](https://github.com/gutogarrote/ver-o-tempo), um app para visualizar o tempo em rotinas com crianças, e foi redesenhado para ficar mais claro, mais divertido e fácil de ler de longe.

*Quer mexer no código?* Veja [`app/CHANGES.MD`](app/CHANGES.MD) e [`CLAUDE.md`](CLAUDE.md) para detalhes técnicos.

---

## 🇺🇸 Summary (English)

**Rotina** is a free web app that shows your family's morning and bedtime routines as a colorful timeline, made for kids who can't read a clock yet.

- Each task (wake up, breakfast, brush teeth, get dressed…) is a colored block sized by how long it takes. A **NOW** marker moves along in real time.
- A big card shows the current task and a countdown. It turns red in the last 2 minutes and lists what's coming next.
- After the deadline, it keeps the closing zone for up to three hours before rolling to the next occurrence. It calmly shows where you should be by now ("time to leave" / "time to sleep") until you tap **Recomeçar** (restart).
- It adapts to the screen: a horizontal ribbon on a TV, a vertical scrolling list on a phone.
- Parents can edit tasks, emojis, colors, durations and the deadline behind the ✨ button.
- **Install:** get [Node.js](https://nodejs.org/) (22.23.3 LTS, pinned in `.nvmrc`), download this repo as a ZIP, open a terminal in the `app` folder and run `npm ci`, then `npm start`. To use it on a TV or phone on the same Wi-Fi, open the "On Your Network" address that `npm start` prints.
- **Not yet available:** sound alerts, different routines per weekday, and syncing between devices. Settings stay in each device's browser, with no accounts, login or routines backend. Fonts load from Google Fonts; shared URLs can expose the names and schedules they contain.

## Manutenção e verificações

A fase 1 mantém Create React App, React e Tailwind, sem mudança de interface ou contratos.
Use Node **22.23.3** (`nvm use` na raiz) e Python 3 no PATH para os exemplos executáveis de URL.
Em `app/`: `npm ci`, `npm run lint -- --max-warnings=0`,
`CI=true npm test -- --watchAll=false --runInBand` e `CI=true npm run build`.
O CI executa esses quatro checks; a suíte contém 220 cenários em 8 arquivos, sem skip/todo.
`npm audit` é uma triagem separada: a dívida transitiva do CRA continua e não se promete audit zero.

Configurações usam a chave `routines` de localStorage por navegador/origem; a sessão
(conclusões, saltos e ajustes) fica em memória e é recalculada ao recarregar.
Links transportam somente o período selecionado, sem backup completo de cores/ícones.
Uma query válida prevalece sobre storage; query inválida usa padrões sem gravar;
`/0720` e `/1930` usam padrões sem carregar ou gravar configurações locais.
Não há sincronização, backend, service worker ou garantia de abertura offline.
Fontes externas e links compartilhados também devem ser considerados ao avaliar privacidade.
