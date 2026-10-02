# Rotina por URL — versão 1

## Gramática

```text
?rotina=1.periodo.tarefa[.tarefa...][.hhmm]
periodo = m | n
simples = id-minutos
combinada = id1-id2[-id3...]-minutos
customizada = ~nomeEscapado-minutos
```

Use exatamente um parâmetro `rotina`. Pontos e hífens são delimitadores literais,
sem percent-encoding no formato comum: `1.n.ba-20.ja-25.ma-de-5.1930`.
O último segmento após hífen é a duração TOTAL da tarefa combinada, não por ID.
Os anteriores são IDs exatos do catálogo. Ordem e repetições são preservadas.
`ma-de-5` tem label “Lavar as mãos + Escovar os dentes”, ícone `🧼🪥`
(sem espaços), cor do primeiro ID e cinco minutos no total.

Versão somente `1`; `m` = `monday.morning`, `n` = `monday.evening`.
Entre 1 e 40 tarefas, até 40 IDs por combinação, duração inteira 1..180,
sem zeros iniciais, sinais ou frações; soma até 720 minutos. Valor bruto de
query limitado a 6000 caracteres. IDs não mudaram:

| ID | Nome | Ícone |
| --- | --- | --- |
| ac | Acordar | 🌞 |
| cf | Café da manhã | ☕️ |
| ma | Lavar as mãos | 🧼 |
| de | Escovar os dentes | 🪥 |
| ro | Trocar de roupa | 👕 |
| mo | Arrumar mochila | 🎒 |
| xi | Fazer xixi | 🚽 |
| sa | Tênis e sair | 👟 |
| ba | Banho | 🛁 |
| ja | Jantar | 🍽️ |
| co | Fazer cocô | 💩 |
| do | Dormir | 😴 |
| br | Brincar | 🧸 |
| li | Ler livro | 📚 |
| bo | Arrumar brinquedos | 🧸 |
| ca | Arrumar cama | 🛏️ |


## Customizadas e escaping

Interpretamos “prefixo til” como `~` obrigatório, inclusive no exemplo música:
`~musica-10`. Sem til, `musica` seria um ID desconhecido e é inválido.
Nomes têm 1..80 unidades UTF-16, não só espaços, sem controles U+0000..001F/007F.
Usam ícone ✨ e cor #CCCCCC. React renderiza nomes como texto, sem HTML ou eval.

Escaping interno: `encodeURIComponent(nome)`, substituindo também `.` por `%2E`
e `-` por `%2D` (a função padrão não escapa esses caracteres).
Depois use `encodeURIComponent(valorInteiro)` como camada externa da query.
Assim pontos e hífens do NOME chegam ao parser como escapes internos, enquanto
os delimitadores continuam literais. `%`, acentos, espaços e símbolos têm duas
camadas quando necessário. Não decodifique novamente antes de gerar o link.
IDs e delimitadores comuns não recebem `%2E`/`%2D`.

## Horário final, pathname e temporização

Somente o ÚLTIMO token exatamente `^\d{4}$` é horário: HH 00..23, MM 00..59.
`0720` vira `07:20`; `1920` vira `19:20`; `0000`/`2359` válidos,
`2400`/`1260` inválidos. Token de horário em outra posição invalida o link.
Sem horário, permanece o comportamento anterior: limite 06:30 para manhã,
21:00 para noite. O código atual de Home já usa limite no relógio local,
calcula início subtraindo a soma das tarefas, mantém atraso por 180 minutos e
então avança ao dia seguinte. Isso não era um cronômetro relativo automático;
não foi introduzido prazo absoluto novo. O menu permite modo relativo ao início
e ajustes como antes. O link não transporta data, progresso ou início em andamento.

Atalhos somente `/hhhh`, sem barra final ou segmentos extras:
[/0720 — padrão manhã](http://localhost:3000/0720),
[/1930 — padrão noite](http://localhost:3000/1930),
[/2045 — padrão noite](http://localhost:3000/2045),
[/1200 — limiar noite](http://localhost:3000/1200).
Antes de 12h seleciona manhã, a partir de 12h noite. Sempre carrega tarefas do
arquivo padrão, nunca tarefas personalizadas do localStorage. O atalho não
sobrescreve storage ao carregar; salvar explicitamente no editor continua possível.

Query `rotina` válida tem prioridade sobre qualquer pathname, inclusive inválido.
Query `rotina` inválida não recorre ao atalho: usa padrão seguro com erro amigável.
Sem `rotina`, `/` mantém fluxo local/padrão; outros caminhos são atalhos inválidos.
A carga de link inválido ignora dados locais e não grava nem apaga storage.
Se o fetch falhar, uma cópia embarcada do padrão garante o fallback seguro;
o teste de sincronização exige igualdade com `app/public/routines.json`.
Query válida substitui só seu período, preserva o outro e persiste como antes.
Ao clicar **Save Routine** ou **Salvar Alterações**, a barra recebe o link da
rotina selecionada via `history.replaceState`, sem reload nem entrada extra no
histórico. Copie a URL da barra **depois de salvar** e guarde ou compartilhe esse
novo link. Reload reproduz ordem, minutos, nomes das tarefas, combinações e
horário final salvos. O editor completo grava todas as rotinas no aparelho;
o link representa somente o período selecionado na tela antes de abrir o editor.
No menu, **Salvar horário** persiste o horário final e atualiza a configuração
completa do link. Alterar o campo sem salvar, pular tarefas e recomeçar não
reescrevem a URL. A URL é importada uma vez por montagem, não a cada render.

Ao salvar a rotina aberta por `/0900` ou `/2045`, o pathname passa a `/` e a
query contém tarefas completas e final `.0900` ou `.2045`. Assim o atalho não
pode reaplicar o padrão depois da edição. Outros parâmetros (inclusive repetidos)
e o fragmento são preservados; salvar uma rotina mantém as outras rotinas locais
e outras chaves do storage.

Exemplo: abra `http://localhost:3001/?rotina=1.n.ma-5.co-5.ba-20.ja-25.ma-de-5.2040`,
mova Jantar para segundo, mude Fazer cocô para 10 minutos e salve. Copie
`http://localhost:3001/?rotina=1.n.ma-5.ja-25.co-10.ba-20.ma-de-5.2040`.
O final continua **20:40**, inclusive após recarregar.

Edições locais fora dos limites do formato continuam salvas no aparelho, com
aviso de que o link não foi atualizado. Nesse caso a URL anterior não representa
a edição; ajuste os valores e salve novamente antes de copiar.
Parâmetros irrelevantes e fragmento são ignorados/preservados pelo gerador.

CRA serve os caminhos pelo fallback SPA no `npm start`. Em hospedagem estática,
configure rewrite de caminhos para `/index.html` com status 200, preservando
assets reais. Não há servidor de produção neste repositório; a configuração
desse rewrite depende da hospedagem. Refresh direto é validado no servidor CRA.

## Exemplos abríveis

[Simples noite](http://localhost:3000/?rotina=1.n.ba-15.ja-20.ro-10)

[Composta e final](http://localhost:3000/?rotina=1.n.ba-20.ja-25.ma-de-5.1930)

[Manhã repetida](http://localhost:3000/?rotina=1.m.xi-5.ro-10.xi-5.0720)

[Custom simples](http://localhost:3000/?rotina=1.n.~musica-10)

[Custom “Água. música-quente”](http://localhost:3000/?rotina=1.n.~%25C3%2581gua%252E%2520m%25C3%25BAsica%252Dquente-5)

JavaScript completo (base pode ter query e fragmento):

```js
const url = new URL('http://localhost:3000/');
function setRoutine(value) {
  url.searchParams.delete('rotina');
  const other = url.searchParams.toString();
  url.search = (other ? other + '&' : '') + 'rotina=' + encodeURIComponent(value);
  console.log(url.href);
}
setRoutine('1.n.ba-20.ja-25.ma-de-5.1930');
const name = encodeURIComponent('Água. música-quente').replace(/\./g, '%2E').replace(/-/g, '%2D');
setRoutine('1.n.~' + name + '-5');
```

Python completo equivalente, sem encoding desnecessário de delimitadores:

```python
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode, quote
base = 'http://localhost:3000/'
u = urlsplit(base)
params = [(k, v) for k, v in parse_qsl(u.query, keep_blank_values=True) if k != 'rotina']
def link(value):
    query = urlencode(params)
    query += ('&' if query else '') + 'rotina=' + quote(value, safe=".-~!*'()_")
    return urlunsplit((u.scheme, u.netloc, u.path, query, u.fragment))
print(link('1.n.ba-20.ja-25.ma-de-5.1930'))
name = quote('Água. música-quente', safe="~!*'()_").replace('.', '%2E').replace('-', '%2D')
print(link('1.n.~' + name + '-5'))
```

API: `serializeRoutineUrl(baseUrl, period, tasks, endTime?)`, período
`morning`/`evening`, tarefas `{name, minutes, catalogIds?}`, horário `HH:MM`.
Parser `parseRoutineUrl(search, pathname='/')` retorna `absent`, `invalid` ou
`valid`, com `source` query/path. `catalogIds` preserva combinações e repetições
na serialização e nos editores. Ao mudar o nome, o gerador passa a usar custom
para preservar a edição. Ícones/cores editados não são transportados por links.
Para repetir ontem, guarde e reabra a URL: não há histórico global por data.

Compatibilidade isolada: links antigos `1|n|ba:15,ja:20` continuam aceitos,
com nomes customizados escapados internamente e query escapada externamente.
Não aceitam combinações nem horário opcional. Toda serialização nova usa pontos
e hífens. Encoding inválido, versão/ID desconhecidos, duplicação de parâmetro,
limites excedidos ou tarefa inválida rejeitam toda a lista, nunca importam parcial.

Os testes executam TODOS os links, os blocos JS/Python e usam o parser real.

```bash
cd app
npm ci
CI=true npm test -- --watchAll=false --runInBand
npm run build
```
