# Configurar rotina por URL (versão 1)

Este documento é suficiente para um agente gerar links sem abrir o editor. A URL
transporta tarefas, ordem, durações e escolha de manhã/noite. Não transporta
contador, progresso, início em andamento ou conclusão de tarefas. Não requer
sincronização, banco de dados, criptografia ou serviços externos.

## Gramática exata

Use exatamente um parâmetro de query chamado `rotina`. Seu valor, **antes do
encoding externo**, segue esta gramática:

```text
valor = "1" "|" periodo "|" tarefa ("," tarefa)*
periodo = "m" | "n"
tarefa = id ":" minutos | "~" nomeCodificado ":" minutos
```

- `1`: versão obrigatória. Outras versões são inválidas.
- `m`: manhã (`monday.morning`); `n`: noite (`monday.evening`). A arquitetura
  atual usa esses mesmos períodos todos os dias, não configura dia da semana.
- `id`: um identificador exato do catálogo abaixo, sensível a maiúsculas.
- `minutos`: inteiro decimal de 1 a 180, sem sinal, fração, espaços, expoente
  ou zeros à esquerda. Cada tarefa precisa informar sua duração; não há duração implícita.
- Entre 1 e 40 tarefas; soma máxima de 720 minutos (12 horas).
- A ordem na lista é a ordem de execução. Repetir uma tarefa é permitido:
  `ba:10,ba:5` representa duas ocorrências com IDs internos distintos.
- `nomeCodificado`: nome personalizado com `encodeURIComponent(nome)` (UTF-8),
  de 1 a 80 unidades UTF-16 depois de decodificado, não só espaços e sem controles
  U+0000–U+001F/U+007F. O prefixo `~` distingue nomes de IDs.
- Encode o **valor inteiro** como um valor de query com `URLSearchParams` ou
  `encodeURIComponent`. Nomes personalizados passam por duas camadas de encoding:
  a interna protege `,`, `:` e `|`; a externa protege a query. Não use Base64.
- Limite de 6000 caracteres no valor bruto de query (antes do decoding externo).

Não há parâmetros opcionais da feature na versão 1. Outros parâmetros e o
fragmento são ignorados e podem coexistir. `rotina` vazio ou repetido é inválido.
A ordem dos demais parâmetros não importa. Use preferencialmente a forma
canônica produzida por `URLSearchParams`, ilustrada abaixo.

A configuração importada tem nome `Manhã` ou `Noite`, horário limite `06:30` ou
`21:00`, respectivamente, e apresentação do catálogo. Esses valores são fixos
na versão 1, para não depender de configurações do aparelho receptor. Tarefas
personalizadas usam emoji `✨` e cor `#CCCCCC`. Ícones, cores personalizados,
nome da rotina e horários diferentes não são transportados nesta versão; podem
ser editados localmente pelos controles existentes.

## Catálogo completo

Fonte versionada e usada diretamente pelo parser:
[`app/src/lib/taskCatalog.json`](../app/src/lib/taskCatalog.json).
IDs e significados são estáveis na versão 1; o JSON contém nome, emoji e cor.
Nenhum banco de dados ou fetch adicional é necessário.

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

“Se trocar” usa `ro`; “escovar dentes” usa `de`; “arrumar a cama” usa `ca`.
`xi` corresponde ao antigo “Xixi tático”, com nome mais direto “Fazer xixi”.
Tarefas personalizadas existentes continuam funcionando no editor. Para
preservar exatamente o nome “Xixi tático” num link, use um nome personalizado.
O serializer escolhe ID pelo nome exato do catálogo; outros nomes usam `~`.

## Precedência, edição e persistência

1. Ao carregar a página, uma URL válida tem prioridade sobre o localStorage e
   o arquivo padrão. Substitui **somente o período indicado**, inclusive seu
   horário e nome, e seleciona esse período na tela.
2. A outra rotina e outros dias são preservados do browser. Na ausência de
   dados locais, vêm de `app/public/routines.json`. Se esse arquivo falhar e
   houver URL válida, o período do link ainda pode carregar.
3. A configuração resultante é salva na chave `routines` do localStorage.
   Se armazenamento estiver indisponível, o link funciona na sessão, sem
   persistência. Não há sincronização entre dispositivos.
4. A importação ocorre apenas na carga, não a cada render ou tick. Nome das
   tarefas, ordem, minutos, emoji e cor continuam editáveis. Use “Save Routine”
   ou “Salvar Alterações” no editor para guardar as mudanças no browser.
5. **Reload ou reabertura do link com `rotina`:** reaplica a configuração
   original do link e substitui as edições locais daquele período. O endereço
   não é atualizado automaticamente pelo editor. Para conservar edições na
   próxima carga, abra o endereço sem `rotina`, ou gere um novo link atualizado.
6. **Entrada sem `rotina`:** mantém o comportamento anterior, rotina local se
   existe, senão padrão; começa na manhã. Parâmetros irrelevantes não apagam dados.

O mesmo link reproduz os mesmos nomes, ordem, durações e metadados fixos do
**período transportado** em qualquer dispositivo. O outro período pode variar.
O relógio/progresso visual depende da hora atual, como antes.

## Gerar e modificar com base arbitrária

A base precisa ser uma URL absoluta de uma instalação do app. Pode conter
caminho, query e fragmento. Estes exemplos usam `http://localhost:3000/`, uma
base real do servidor de desenvolvimento; troque pela origem da sua instalação
para abrir em outro dispositivo. Os exemplos abaixo são validados pelos testes
com o parser real, inclusive a lista de tarefas e o catálogo.

**Banho → jantar → trocar de roupa** (15, 20 e 10 minutos, noite):

[Banho, jantar e roupa](http://localhost:3000/?rotina=1%7Cn%7Cba%3A15%2Cja%3A20%2Cro%3A10)

**Adicionar vinte minutos de brincadeira** depois de trocar de roupa:

[Com brincadeira](http://localhost:3000/?rotina=1%7Cn%7Cba%3A15%2Cja%3A20%2Cro%3A10%2Cbr%3A20)

**Dez minutos de livro antes de dormir** (dormir com 5 minutos):

[Livro antes de dormir](http://localhost:3000/?rotina=1%7Cn%7Cba%3A15%2Cja%3A20%2Cro%3A10%2Cbr%3A20%2Cli%3A10%2Cdo%3A5)

**Manhã**, café e dentes:

[Café e dentes](http://localhost:3000/?rotina=1%7Cm%7Ccf%3A20%2Cde%3A5)

**Nome personalizado com acentos e delimitadores**, “Abraço, água: sim”:

[Nome personalizado](http://localhost:3000/?rotina=1%7Cn%7C%7EAbra%25C3%25A7o%252C%2520%25C3%25A1gua%253A%2520sim%3A5)

JavaScript padrão, sem bibliotecas:

```js
const url = new URL('http://localhost:3000/'); // substitua pela base desejada
url.searchParams.set('rotina', '1|n|ba:15,ja:20,ro:10');
console.log(url.href);
// Modificar o mesmo link: preservar query/fragmento, substituir só rotina.
url.searchParams.set('rotina', '1|n|ba:15,ja:20,ro:10,br:20,li:10,do:5');
// Nome personalizado (não encode manualmente a camada externa):
url.searchParams.set('rotina', '1|n|~' + encodeURIComponent('Abraço, água: sim') + ':5');
```

Python padrão (mesmo formato; `quote` interno com `safe=''`):

```python
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode, quote
base = 'http://localhost:3000/'
u = urlsplit(base)
params = [(k, v) for k, v in parse_qsl(u.query, keep_blank_values=True) if k != 'rotina']
params.append(('rotina', '1|n|ba:15,ja:20,ro:10'))
link = urlunsplit((u.scheme, u.netloc, u.path, urlencode(params), u.fragment))
print(link)
# Nome personalizado: substituir rotina e recalcular o link completo.
custom = '~' + quote('Abraço, água: sim', safe='') + ':5'
params = [(k, v) for k, v in params if k != 'rotina']
params.append(('rotina', '1|n|' + custom))
link = urlunsplit((u.scheme, u.netloc, u.path, urlencode(params), u.fragment))
print(link)
```

No código do projeto, `serializeRoutineUrl(baseUrl, period, tasks)` em
`app/src/lib/routineUrl.js` recebe `morning`/`evening` e tarefas `{name, minutes}`,
preserva outros parâmetros/fragmento, valida e retorna URL determinística.
O parser devolve status `absent`, `invalid` ou `valid` (período e rotina).

**Gerar a mesma rotina novamente / repetir ontem:** guarde a URL anterior e
reutilize-a literalmente. Se quiser reconstruí-la, guarde também as tarefas,
ordem, durações e período. O agente precisa guardar a URL anterior para repetir
ontem; **não há histórico global automático**, nem recuperação por data. Por
exemplo, para repetir o primeiro exemplo, abra novamente:

[Repetir banho, jantar e roupa](http://localhost:3000/?rotina=1%7Cn%7Cba%3A15%2Cja%3A20%2Cro%3A10)

## Validação e erros

Versão/período desconhecido, ID desconhecido, separadores incorretos, encoding
percentual/UTF-8 malformado, duração inválida, lista vazia ou limites excedidos
invalidam **toda** a importação. Não se aplica uma lista parcial. Duplicação do
parâmetro `rotina` é rejeitada; repetição de tarefa na lista é permitida.

A tela mostra “Não foi possível carregar a rotina do link. Confira o formato;
sua rotina salva ou padrão continua disponível.” e usa configuração local ou
padrão. A carga inválida não escreve no localStorage, nem apaga a outra rotina.
Salvar uma edição explicitamente depois do fallback continua permitido.
Parâmetros irrelevantes, inclusive malformados, são ignorados.
Nomes são texto renderizado pelo React, sem `eval` ou injeção de HTML.

Para verificar exemplos, parser, catálogo, persistência e interface em DOM, use
os comandos abaixo. Os testes executam o bloco Python acima e passam as URLs geradas ao parser real;
por isso, `python3` precisa estar disponível no PATH.

```bash
cd app
CI=true npm test -- --watchAll=false --runInBand
npm run build
```
