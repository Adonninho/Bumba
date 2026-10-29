# BUMBA — guia para o backend

O front-end da BUMBA está feito e funciona como demonstração, mas **não tem servidor**: as contas, publicações e candidaturas ficam no `localStorage` do telemóvel, e o SMS de login é falso. Este guia explica o que existe, como os dados estão organizados, que regras o servidor tem de garantir e onde trocar cada parte do código por chamadas à API.

---

## 1. Como o projecto está montado

```
BUMBA-expo/
├── app.html            ← A APP. Todo o código (HTML + JavaScript) está aqui.
├── build.js            ← empacota app.html + fotos/ em bumba.html e bumba-html.js
├── bumba.html          ← gerado (abre no browser para testar)
├── bumba-html.js       ← gerado (o mesmo, como módulo JS para o Expo)
├── fotos/              ← fotos de demonstração + CREDITOS.md
├── App.js              ← ecrã do Expo (cópia em bumba/App.js)
├── bumba/              ← projecto Expo (SDK 58): WebView em ecrã inteiro
└── LEIA-ME.md          ← como correr e o que a app faz
```

- **Editar:** só o `app.html`. Depois `node build.js` (verifica a sintaxe do JS e regenera os ficheiros, incluindo `bumba/bumba-html.js`).
- **Testar no browser:** abrir `bumba.html`.
- **Testar no telemóvel:** `cd bumba`, `npm install`, `npx expo start --tunnel`, ler o QR com o Expo Go.
- A app corre dentro de uma **WebView** (`react-native-webview`) com `baseUrl: 'https://bumba.app/'`. A WebView fala com o React Native por `window.ReactNativeWebView.postMessage(...)`:
  - `bumba:exit` — fechar a app (botão voltar do Android);
  - `bumba:open:<url>` — abrir um link fora da app (links das provas, `tel:`).
- O JavaScript da app está no `<script type="text/x-dc">` do fim do `app.html`: uma classe `Component` com o estado (`state`) e uma função `renderVals()` que calcula tudo o que o ecrã mostra. Os ecrãs usam `{{ valor }}`, `<sc-if>` e `<sc-for>`.

---

## 2. O que é real e o que é simulado

| Parte | Hoje | Precisa de servidor |
|---|---|---|
| Login por telemóvel + código | Código gerado no próprio telemóvel e mostrado num «SMS» falso | Envio de SMS (OTP) e verificação |
| Contas (pessoa / empresa) | `localStorage`, chave `bumba.accounts` | Sim |
| Sessão | `localStorage`, chave `bumba.session` (o número) | Token (JWT ou sessão) |
| Cartão (CV), provas e anexos | `localStorage` (fotos em base64) | Sim + armazenamento de ficheiros |
| Biscatos e trabalhos fixos publicados | `localStorage`, na conta do dono | Sim |
| Vagas e cursos das empresas | `localStorage`, na conta da empresa | Sim |
| Candidaturas, interesses, inscrições | Escritos directamente na conta do dono (só funciona no mesmo telemóvel) | Sim |
| Verificação do NIF | Fica verificado 6 s depois de criar a conta | Backoffice / validação real |
| Candidatos e inscrições «automáticos» | Simulados com temporizadores (pessoas da demo) | Remover |
| Mural, mensagens, conexões, recomendações, grupos, eventos | Dados fixos de demonstração + estado em memória | Fase 2 (ver §8) |

---

## 3. Modelo de dados

Os nomes abaixo são os que o front-end usa hoje. O servidor pode usar outros, desde que a API devolva este formato (ou se ajuste o `renderVals()`).

### 3.1 Conta

Identificada pelo **número de telemóvel** (9 dígitos, começa por 9, indicativo +244). **Um número só pode ter um tipo de conta.**

**Pessoa** — [`userFor`](app.html#L1871)
```js
{
  type: 'pessoa',
  nome: 'Edna Mbala',
  cv: Cartao,                 // ver 3.2
  provas: [Prova],            // só as que a pessoa juntou (ver 3.3)
  posts: [Trabalho],          // biscatos/fixos que publicou (ver 3.4)
  act: {                      // o que a pessoa enviou (ver 3.7)
    jobs: [Pedido], applied: [id], accepted: [id], enrolled: [{ id, p }]
  },
  tourDone: true              // já viu o tutorial
}
```

**Empresa** — [`createCompany`](app.html#L2120), [`registerCo`](app.html#L2001)
```js
{
  type: 'empresa',
  nome: 'Kwanza Seguros',
  nif: '5417028493',          // 9–14 dígitos
  sector: 'Seguros',
  cidade: 'Talatona',
  resp: 'Nzinga Afonso',      // quem gere a conta
  verified: false,            // passa a true quando o NIF é validado
  coPosts: [Vaga | Curso],    // ver 3.5 e 3.6
  posts: [Trabalho],          // empresas também publicam biscatos
  tourDone: false
}
```

### 3.2 Cartão Bumba (CV)
```js
{ nome, titulo: 'Electricista e canalizadora', resumo: '…',
  competencias: ['Instalação eléctrica', …],   // até 6
  anos: 6, zonas: ['Cazenga', 'Viana'],        // até 3 zonas
  faixa: '180–260 mil Kz/mês' }                // texto livre; «A combinar» se vazio
```

### 3.3 Prova (trabalho que a pessoa mostra no perfil)
```js
{ id: 'mp…', mine: true, t: 'Instalação eléctrica de uma loja',
  who: 'Loja do Sr. Kiala, Cazenga', desc: '…',
  files: [
    { kind: 'img',  name: 'quadro.jpg', url: 'data:image/jpeg;base64,…' },
    { kind: 'pdf',  name: 'certificado.pdf', size: 230000, url: 'data:application/pdf;base64,…' },
    { kind: 'link', name: 'youtube.com/watch', url: 'https://…' }
  ] }
```
As provas que nascem de um biscato terminado têm outro formato: `{ slot, t, who, r: '5,0', q: 'comentário do cliente' }` (avaliação).

### 3.4 Trabalho publicado (biscato ou fixo)
```js
{ id: 'mj…', created: 1761200000000, kind: 'biscato' | 'fixo',
  title, desc, where, when,          // when = data/hora (biscato) ou horário (fixo)
  pay: 15000,                        // Kz inteiros; no fixo é o salário mensal
  status: 'open' | 'hired',          // 'done' e cancelado = apagado
  applicants: [chave],               // ver 3.8
  hired: chave | null }
```

### 3.5 Vaga de carreira (só empresas)
```js
{ id: 'cv…', kind: 'vaga', created, status: 'open' | 'closed' | 'deleted',
  title, desc, where,
  mode: 'Presencial' | 'Híbrido' | 'Remoto' | 'Turnos',
  salary: '200–280 mil Kz/mês',      // hoje é texto; no servidor guardem salMin/salMax (mil Kz) e gerem o texto
  req: ['12ª classe', …],            // até 6
  apps: [{ key: chave, step: 'novo' | 'entrevista' | 'contratado' | 'recusado', at: timestamp }] }
```

### 3.6 Curso (só empresas, sempre grátis)
```js
{ id: 'cc…', kind: 'curso', created, status: 'open' | 'closed' | 'deleted',
  title, desc, where, dur: '6 aulas', format: 'Online' | 'Presencial' | 'Presencial e vídeo',
  selo: 'Excel essencial',           // aparece no Cartão de quem acaba
  lessons: 6,                        // 1–30
  base: 5310,                        // inscritos de demonstração (no servidor: contar inscrições)
  enrolled: [chave] }
```

### 3.7 Pedido (o que a pessoa enviou) — `act.jobs`
```js
{ id: <id do trabalho/vaga>, kind: 'biscato' | 'fixo' | 'carreira',
  title, client: 'Kwanza Seguros', where,
  step: 1..4,                        // ver STEPS em app.html#L1746
  live: true }                       // true = publicado por outra conta (o estado vem do dono)
```
O passo mostrado à pessoa é **calculado a partir do estado do lado do dono** (ver `renderVals`, bloco `const jobs = s.jobs.map(...)`):

| Do lado do dono | A pessoa vê |
|---|---|
| Vaga: `novo` | Enviado |
| Vaga: `entrevista` | Entrevista marcada |
| Vaga: `contratado` | Contratado |
| Vaga: `recusado` | Não seleccionado |
| Vaga fechada antes de entrevista | Vaga fechada |
| Biscato: `hired` = esta pessoa | Aceite → «Terminei — pedir avaliação» |
| Biscato: `hired` = outra pessoa | Escolheram outra pessoa |
| Biscato apagado antes de escolher | Fechado |

### 3.8 Chave de candidato
Hoje um candidato é identificado por:
- `'t:<telefone>'` — conta real (guardada no telemóvel);
- `'helder'`, `'wilson'`… — pessoa fictícia da demo (`PEOPLE`, [app.html#L1747](app.html#L1747)).

No servidor basta um `userId`. As pessoas fictícias desaparecem.

---

## 4. Regras que o servidor tem de garantir

**Login e contas**
- Número: 9 dígitos, começa por 9. Guardar sempre com +244.
- Código OTP de 4 dígitos. Reenvio só passados 30 s. Limitar tentativas.
- Login com o tipo errado (número de pessoa na aba «Sou empresa», ou o contrário) → erro.
- Nome da pessoa e do responsável: o front-end já normaliza maiúsculas («joão da silva» → «João da Silva»).
- Empresa: NIF com 9–14 dígitos, obrigatório. Começa com `verified: false`.

**Biscatos e trabalhos fixos** (ver também a tabela no `LEIA-ME.md`)
- Valor obrigatório, mínimo 500 Kz. Título, onde e quando obrigatórios.
- **Biscato aberto há 48 h sem ninguém escolhido → apagado**, com notificação ao dono. Hoje isto só corre com a app aberta ([`purgeExpired`](app.html#L2283)); no servidor tem de ser uma tarefa agendada. O trabalho fixo não expira.
- Quando o dono **escolhe alguém** (`hired`), o trabalho sai do feed de toda a gente e **deixa de poder ser cancelado**.
- **Cancelar** só com `status: 'open'` → apaga de vez.
- **«Trabalho feito»** → apaga de vez e cria uma prova (avaliação) no perfil de quem trabalhou. Hoje a avaliação é sempre ★ 5,0; falta deixar o cliente escolher.
- Ninguém responde ao próprio trabalho.

**Vagas e cursos**
- Só contas de empresa publicam vagas e cursos. Só contas de pessoa se candidatam ou se inscrevem.
- Vaga: salário mínimo obrigatório (mil Kz/mês); máximo opcional mas ≥ mínimo.
- Etapas da candidatura: `novo → entrevista → contratado`, ou `novo/entrevista → recusado`. Não se volta atrás.
- Vaga ou curso `closed` → deixa de aparecer às pessoas (as candidaturas existentes ficam). `deleted` → some.
- Curso: selo obrigatório; quem completa todas as aulas ganha o selo no Cartão.

**Feed de uma pessoa**
- Biscatos e fixos abertos de **outras** contas (os próprios aparecem marcados «O teu pedido»).
- Vagas e cursos abertos de todas as empresas.
- Um biscato a que a pessoa respondeu sai do feed dela quando o dono escolhe alguém.
- «Para ti»: o front-end compara palavras do trabalho com o Cartão (`hits`, `stems`). Pode ficar no cliente ou passar para o servidor.

**Ficheiros das provas**
- Fotos: o cliente já reduz para 900 px em JPEG 0,8 ([`readImage`](app.html#L1939)).
- PDF até 2 MB. Até 8 anexos por prova. Links só `http(s)`.

---

## 5. Proposta de API (REST)

Todas as rotas, menos `/auth/*`, levam `Authorization: Bearer <token>`.

**Autenticação e contas**
| Método | Rota | Corpo / resposta |
|---|---|---|
| POST | `/auth/otp` | `{ phone, role }` → envia SMS. Erro se o número for de outro tipo |
| POST | `/auth/verify` | `{ phone, code }` → `{ token, user }` ou `{ token, needsSignup: true }` |
| POST | `/accounts/pessoa` | `{ nome }` → `user` |
| POST | `/accounts/empresa` | `{ nome, nif, sector, cidade, resp }` → `user` |
| GET | `/me` | conta + Cartão + estado do tutorial |
| PATCH | `/me` | `{ tourDone }` |

**Cartão e provas**
| Método | Rota | |
|---|---|---|
| PUT | `/me/cartao` | Cartão (3.2) |
| GET | `/users/:id` | perfil público (Cartão + provas) |
| POST | `/uploads` | devolve URL de envio (ex.: S3 pré-assinado) → `{ uploadUrl, fileUrl }` |
| POST | `/me/provas` | `{ t, who, desc, files: [{ kind, name, url }] }` |
| DELETE | `/me/provas/:id` | |

**Biscatos e trabalhos fixos**
| Método | Rota | |
|---|---|---|
| GET | `/trabalhos?kind=biscato\|fixo` | feed (sem os do próprio) |
| POST | `/trabalhos` | publicar (3.4) |
| GET | `/me/trabalhos` | os que publiquei, com os interessados |
| DELETE | `/trabalhos/:id` | cancelar (só `open`) |
| POST | `/trabalhos/:id/interesse` | pessoa mostra interesse |
| POST | `/trabalhos/:id/escolher` | `{ userId }` (dono) |
| POST | `/trabalhos/:id/concluir` | `{ rating, comentario }` (dono) → apaga e cria prova |

**Vagas**
| Método | Rota | |
|---|---|---|
| GET | `/vagas` | vagas abertas |
| POST | `/vagas` | publicar (empresa) |
| PATCH | `/vagas/:id` | `{ status: 'open' \| 'closed' }` |
| DELETE | `/vagas/:id` | |
| POST | `/vagas/:id/candidaturas` | pessoa candidata-se |
| GET | `/me/vagas` | as vagas da empresa com candidatos |
| PATCH | `/candidaturas/:id` | `{ step: 'entrevista' \| 'contratado' \| 'recusado' }` |

**Cursos**
| Método | Rota | |
|---|---|---|
| GET | `/cursos` | |
| POST | `/cursos` | publicar (empresa) |
| PATCH / DELETE | `/cursos/:id` | fechar, reabrir, apagar |
| POST | `/cursos/:id/inscricao` | pessoa inscreve-se |
| PATCH | `/inscricoes/:id` | `{ aulasFeitas }` |

**Pedidos, empresas e notificações**
| Método | Rota | |
|---|---|---|
| GET | `/me/pedidos` | candidaturas, interesses e inscrições da pessoa, com o estado calculado (3.7) |
| GET | `/empresas/:id` | página pública: dados + vagas + cursos abertos |
| GET | `/me/notificacoes` | |
| POST | `/me/notificacoes/lidas` | |

Notificações a gerar: candidatura nova, interesse novo, etapa mudou (entrevista, contratado, recusado), foste escolhido para um biscato, biscato expirou, NIF verificado, inscrições num curso.

---

## 6. Onde mexer no `app.html`

Hoje tudo é síncrono (`localStorage`). Com a API passa a ser `async/await` com `fetch`: mostrar «a carregar», tratar erros e voltar a pedir os dados.

**Armazenamento e sessão**
| Hoje | Linha | Passa a ser |
|---|---|---|
| `store`, `accounts()`, `saveAccount()` | [1854](app.html#L1854) | chamadas à API; o `localStorage` fica só para o token |
| `userFor(phone)`, `accountType(phone)` | [1865](app.html#L1865) | `GET /me` / resposta do `/auth/verify` |
| `appState(user)` | [1905](app.html#L1905) | estado inicial vazio + carregar da API |
| `componentDidUpdate` (guarda `act`) | [2445](app.html#L2445) | apagar — o servidor já sabe as candidaturas |

**Login**
| Hoje | Linha | Passa a ser |
|---|---|---|
| `sendCode` | [2102](app.html#L2102) | `POST /auth/otp`; apagar o «SMS» falso (`smsShow`, `useSms`) |
| `verifyCode` | [2113](app.html#L2113) | `POST /auth/verify` |
| `createAccount`, `createCompany` | [2132](app.html#L2132), [2120](app.html#L2120) | `POST /accounts/*` |
| `login`, `logout` | [2138](app.html#L2138), [2239](app.html#L2239) | guardar/apagar o token; tirar a verificação automática do NIF |

**Mercado (o que outras contas publicaram)**
| Hoje | Linha | Passa a ser |
|---|---|---|
| `loadMarket(self)` + `refreshMarket()` (a cada 20 s) | [2016](app.html#L2016), [2155](app.html#L2155) | `GET /trabalhos`, `/vagas`, `/cursos`, `/me/pedidos` |
| `toOpp(x)` | [2033](app.html#L2033) | manter: converte para o formato que os ecrãs usam |
| `marketWrite(o, fn)` | [2159](app.html#L2159) | as rotas de candidatura / interesse / inscrição |
| `confirmOpp` | [2364](app.html#L2364) | `POST …/candidaturas`, `…/interesse`, `…/inscricao`; tirar os `later(...)` simulados |

**Publicar (pessoa e empresa)**
| Hoje | Linha | Passa a ser |
|---|---|---|
| `publishJob`, `persistMine` | [2249](app.html#L2249), [2241](app.html#L2241) | `POST /trabalhos` |
| `hire`, `finishMine`, `removeMine` | [2266](app.html#L2266)–[2276](app.html#L2276) | `/escolher`, `/concluir`, `DELETE` |
| `purgeExpired` | [2283](app.html#L2283) | tarefa agendada no servidor; no cliente só voltar a pedir a lista |
| `addApplicant`, `candidatesFor` | [2260](app.html#L2260), [1966](app.html#L1966) | apagar (são os interessados simulados) |
| `publishCo`, `updateCo`, `setCoStatus`, `deleteCoPost` | [2179](app.html#L2179)–[2231](app.html#L2231) | `POST/PATCH/DELETE /vagas`, `/cursos` |
| `setAppStep` | [2222](app.html#L2222) | `PATCH /candidaturas/:id` |
| `addCoApp` | [2216](app.html#L2216) | apagar (candidatos simulados) |
| `finishJob` | [2389](app.html#L2389) | do lado da pessoa só pede a avaliação; a prova é criada quando o cliente conclui |

**Cartão e provas**
| Hoje | Linha | Passa a ser |
|---|---|---|
| `saveCV` | [2582](app.html#L2582) | `PUT /me/cartao` |
| `onPickImages`, `onPickPdf` | [2293](app.html#L2293), [2302](app.html#L2302) | enviar o ficheiro para `/uploads` e guardar só o URL |
| `saveProva`, `removeProva` | [2322](app.html#L2322) | `POST/DELETE /me/provas` |

---

## 7. Dados de demonstração a tirar

Quando o servidor estiver ligado, tirar ou trocar por dados reais:
- Trabalhos, vagas e cursos fixos: `BISC`, `FIXO`, `CARR`, `CURSOS` ([1681](app.html#L1681)–[1793](app.html#L1793)).
- Pessoas e empresas fictícias: `PEOPLE`, `EXTRA`, `COMPANIES`.
- Conteúdo social de exemplo: `POSTS`, `THREADS`, `NOTIFS0`, `MYRECS0`, `RECS`, `GROUPS`, `EVENTS`, `VIEWERS`.
- Contas demo: `EDNA`, `DEMO_PHONE` (923 456 789), `DEMO_CO` (923 000 111), `DEMO_JOBS`, `DEMO_PROVAS`, `DEMO_CO_POSTS`, `ensureDemoCo`, `STATIC_IDS`.
- Os botões «Usar» da conta de demonstração no login.
- Todos os `this.later(...)` que inventam respostas (aceites, candidatos, inscrições, mensagens, recomendações).
- As fotos em `fotos/` (são do Wikimedia Commons; créditos em `fotos/CREDITOS.md`).

---

## 8. Fora deste guia (fase 2)

Estas partes funcionam no ecrã mas só com dados de demonstração e estado em memória (perde-se ao fechar a app):
- **Mural:** publicar, «Força», comentários, partilhar (`publish`, `toggleForca`, `addComment`).
- **Mensagens:** `sendChat` responde com frases fixas. Precisa de tempo real (WebSocket) ou de push.
- **Conexões e convites:** `connect`, `ignore`.
- **Recomendações:** `askRec`, `publishRec`.
- **Grupos e eventos:** `joinGroup`, `toggleGoing`.
- **Seguir empresas:** `toggleFollow`.
- **USSD *444#:** só a maquete na página de apresentação; o real é com uma operadora.
- **Mapa «Perto de ti»:** página fixa com marcadores de exemplo; precisa das coordenadas reais dos trabalhos.

---

## 9. Notas para o Expo / WebView

- **Pedidos à API:** a WebView pode fazer `fetch` directamente. Como a página carrega com `baseUrl: 'https://bumba.app/'`, o servidor tem de aceitar CORS dessa origem (e de `null` para testar o `bumba.html` aberto do disco).
- **Token:** o mais simples é guardá-lo no `localStorage` da WebView. Para algo mais seguro, guardar no `expo-secure-store` e passá-lo à página por `injectJavaScript` / `postMessage` (o `App.js` já tem esta ponte para o botão voltar e os links).
- **Push:** com `expo-notifications`. O React Native recebe a notificação e avisa a página com `postMessage`.
- **Upload de ficheiros:** o `<input type="file">` já funciona dentro da WebView (Android e iOS).

---

## 10. Perguntas em aberto

- Como se valida o NIF de verdade (manualmente num backoffice, ou com alguma base de dados oficial)?
- Que fornecedor de SMS usar em Angola, e quanto custa cada código?
- A avaliação no fim de um biscato: só estrelas, ou estrelas e comentário?
- Pagamentos: hoje combinam-se fora da app. Fica assim?
- Moderação do que as pessoas publicam (mural, biscatos, provas).
