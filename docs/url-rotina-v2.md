# Proposta local: URL legível v2 (issue 19)

Formato implementado para revisão Hermes e aprovação de Guto; não publicado.
Ao salvar, o app agora propõe v2. A leitura canônica de v1 (pontos e formato antigo
com pipes) permanece exatamente igual; [contrato e exemplos v1](url-rotina.md).
Não há botão de compartilhamento, backend, shortener ou payload inteiro em base64.

## Gramática exata

```text
query      = ?rotina=2.periodo.tarefa[.tarefa...][.hhmm]
periodo    = m | n
catalogo   = id[-id...]-minutos
custom     = ~nome-minutos
nome       = unidade+ (1..80 unidades UTF-16 depois da expansão)
unidade    = letra ASCII | dígito ASCII | - | _ | Unicode não ASCII | escape
escape     = ~HH (dois dígitos hexadecimais MAIÚSCULOS; somente pontuação ASCII)
```

`.` separa tarefas; o último `-` de cada tarefa separa duração. Hífens anteriores
fazem parte do nome customizado ou combinam IDs. `~` inicial marca um nome custom.
O último token de quatro dígitos é HHMM, 00:00..23:59, opcional. Sem horário:
manhã 06:30, noite 21:00. IDs e combinações são os mesmos de v1; `ma-de-7`
representa sete minutos totais. Entre 1 e 40 tarefas, até 40 IDs por combinação,
1..180 minutos inteiros sem zeros iniciais, soma até 720, query bruta até 6000
caracteres. Um único parâmetro `rotina`, sem importação parcial.

`_` significa exatamente um espaço U+0020, inclusive espaços repetidos/iniciais/finais.
**Underscore literal no nome não é suportado:** o serializer rejeita com mensagem
explícita, nunca converte silenciosamente. Nome vazio/só whitespace, controles
U+0000..001F/007F, mais de 80 unidades UTF-16 e surrogate isolado são inválidos.
Acentos e emoji não são normalizados para outro texto. Não há trimming nem NFC.

Escapes são exclusivamente caracteres ASCII U+0021..007E que NÃO sejam letras,
dígitos, `-` ou `_`. Espaço usa `_`, não `~20`. Assim:

| Texto | Wire v2 |
| --- | --- |
| `.` | `~2E` |
| `~` | `~7E` |
| `%` | `~25` |
| `+` | `~2B` |
| `&` | `~26` |
| `#` | `~23` |
| `=` | `~3D` |
| `/` | `~2F` |
| `?` | `~3F` |
| `'` | `~27` |

A mesma regra cobre toda pontuação ASCII, incluindo `<`, `>`, aspas, parênteses,
vírgula e pipe. `~41`, `~5F`, `~20`, controles e escapes em minúsculas são inválidos.
Literal `~2E` no nome vira `~7E2E`, e só uma expansão retorna `~2E`.
Literal `%20` vira `~2520`, nunca é tratado como espaço: nenhum percent escape
interno é usado para pontuação. React continua renderizando nomes como texto.

## Transporte e interpretação limitada

O gerador escreve o wire diretamente na query de `new URL`, sem
`encodeURIComponent` do payload. O navegador percent-encoda Unicode **uma vez**
(`pré` → `pr%C3%A9`, 🍄 → `%F0%9F%8D%84`). A query canônica não depende de `%25`.
O parser v2 reconhece prefixo literal `2.`, aceita Unicode literal ou sequências
percent de UTF-8 estritamente válido que decodificam exclusivamente para não ASCII.
Uma única passagem sobre essas sequências ocorre antes de separar os tokens.
Escapes percent ASCII, incluindo `%25`, `%20`, `%2E`, `%2D`, são rejeitados;
não tentamos adivinhar/double-decode nem aceitar um payload totalmente URL-encoded.
`+` bruto não é convertido em espaço no v2 e é inválido em nomes: use `~2B`.
`&`/`#` brutos têm significado de URL; devem ser `~26`/`~23` nos nomes.
Parâmetros externos a `rotina` continuam seguindo o tratamento de query existente.

Isso suporta o link original e o comportamento observado de remover uma camada
percent antes de entregar a URL. Os testes removem uma e duas camadas com
`decodeURIComponent(search)`, reconstruindo a cada vez um **new URL real**; o
navegador pode recodificar Unicode na normalização. Também testam Unicode literal
junto com bytes percent. Nenhuma gramática finita garante resistência a toda
transformação possível: substituir `~HH`, remover caracteres, tratar `_` de outro
modo, truncar links ou recodificar o payload completo não faz parte deste contrato.
Um link manual com `&` pode representar outro parâmetro e sua intenção original
não é recuperável. A gramática garante separação para os links gerados, não uma
inferência sobre texto arbitrário transformado externamente.

Troca manual: `http://localhost:3000/?rotina=2.n.ma-5.ma-de-7.2030`
para `http://localhost:3000/?rotina=2.n.ma-2.ma-de-7.1900`.

Exemplo completo com nomes comuns:
`http://localhost:3000/?rotina=2.n.~pr%C3%A9-treino-5.~Asa-delta-4.~0~2E5_litros-2.~%F0%9F%8D%84_Cogumelos_m%C3%A1gicos-3.2030`

Pontuação custa legibilidade (`0~2E5`), mas hífens e espaços permanecem simples,
IDs/durações/horário permanecem editáveis, e separadores não se confundem com nomes.
Escolhemos isso em vez de restringir pontos/percent/plus/ampersand ou adotar um
payload opaco. Underscore literal é a única restrição adicional deliberada de nomes.

## Compatibilidade e editor

Links v1 válidos continuam com sua interpretação canônica exata, inclusive `%20`
literal, hífens/pontos escapados e Unicode com encoding aninhado. Nenhum fallback
v1 foi adicionado. A aventura capturada no Android (camada a menos, término 1429)
continua rejeitada; o novo link v2 para as mesmas sete tarefas passa nas simulações.
Não é possível recuperar toda transformação externa de v1: `%20` literal e espaço
podem chegar com bytes idênticos. Abrir um v1 válido e salvar produz v2.
`serializeLegacyRoutineUrl` permanece disponível para verificação exata de v1;
`serializeRoutineUrl` gera v2. Diagnóstico local e aviso de link inválido continuam.

Os editores preservam a política existente: alterações fora do formato ficam
salvas no aparelho, a URL anterior permanece e aparece aviso. Underscore literal
ou Unicode inválido acrescentam explicação específica. Corrija o nome e salve de
novo antes de copiar. Outros períodos/dias, chaves do storage, query duplicada não
relacionada, hash e estado/tamanho do histórico permanecem; somente `rotina` é
substituído. Atalho `/HHMM` vira `/` ao salvar. Ícones/cores continuam locais.
Não há mudanças em importação, restauração, sessão, design ou compartilhamento.

## Exemplos executáveis

Estes exemplos geram dois links completos; os testes executam JS e Python e passam
cada resultado pelo parser real. O primeiro preserva IDs, o segundo inclui nomes.
Use a API do app para validação de duração/horário e construção de rotinas completas.

```js
const base = 'http://localhost:3000/';
function nameWire(name) {
  if (!name.trim() || name.length > 80 || name.includes('_') || !name.isWellFormed() || /[\x00-\x1F\x7F]/.test(name)) throw new Error('Nome não suportado');
  return Array.from(name, char => {
    if (char === ' ') return '_';
    if (/^[A-Za-z0-9-]$/.test(char) || char.charCodeAt(0) >= 128) return char;
    return '~' + char.charCodeAt(0).toString(16).toUpperCase();
  }).join('');
}
function link(value) {
  const url = new URL(base);
  url.searchParams.delete('rotina');
  const other = url.searchParams.toString();
  url.search = (other ? other + '&' : '') + 'rotina=' + value;
  return url.href;
}
console.log(link('2.n.ma-5.ma-de-7.2030'));
console.log(link('2.n.~' + nameWire('pré-treino + 0.5 litros 🍄 & 50%') + '-5.1900'));
```

```python
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode, quote
base = 'http://localhost:3000/'
def name_wire(name):
    units = len(name.encode('utf-16-le')) // 2
    if not name.strip() or units > 80 or '_' in name or any(ord(c) < 32 or ord(c) == 127 for c in name):
        raise ValueError('Nome não suportado')
    return ''.join('_' if c == ' ' else c if ord(c) >= 128 or c.isascii() and (c.isalnum() or c == '-') else '~' + format(ord(c), '02X') for c in name)
def link(value):
    u = urlsplit(base)
    params = [(k, v) for k, v in parse_qsl(u.query, keep_blank_values=True) if k != 'rotina']
    other = urlencode(params)
    query = (other + '&' if other else '') + 'rotina=' + quote(value, safe='.-~_')
    return urlunsplit((u.scheme, u.netloc, u.path, query, u.fragment))
print(link('2.n.ma-5.ma-de-7.2030'))
print(link('2.n.~' + name_wire('pré-treino + 0.5 litros 🍄 & 50%') + '-5.1900'))
```

Verificação: Node 22.23.3 + Python 3; `npm ci`,
`npm run lint -- --max-warnings=0`, `npm test -- --run`, `npm run build` em `app/`.
Chromium em preview de produção verifica edição/reload e SW offline. Isso não
reproduz Telegram nem instalação/launch Android físico: repetir lá após revisão
e eventual aprovação/publicação autorizada. A issue permanece aberta.
