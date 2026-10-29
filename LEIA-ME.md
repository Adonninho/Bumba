# BUMBA no Expo Go

> Para quem vai fazer o servidor: ver [BACKEND.md](BACKEND.md).

## 1. Criar o projecto (uma vez só)
Já está feito: a pasta `bumba` é o projecto Expo (SDK 58), com `react-native-webview`, `expo-constants` e `expo-status-bar` instalados.

Se um dia precisares de o criar de novo, no terminal do VS Code:

```
npx create-expo-app@latest bumba --template blank
cd bumba
npx expo install react-native-webview expo-constants expo-status-bar
```

## 2. Copiar os ficheiros
Já está feito. Dentro da pasta `bumba` estão:

- `App.js`
- `bumba-html.js`

## 3. Abrir no telemóvel
```
cd bumba
npx expo start
```
Lê o código QR com a app **Expo Go** (no iPhone, com a câmara). O telemóvel e o computador têm de estar na mesma rede Wi-Fi. Se não der, usa `npx expo start --tunnel` (o `@expo/ngrok` já está instalado no projecto, não precisa de o baixar).

Se aparecer «project is incompatible with this version of Expo Go», a versão do Expo Go no telemóvel é diferente do SDK do projecto. Vê que SDK o Expo Go pede e ajusta a linha `"expo"` no `bumba/package.json` (depois `npx expo install --fix`).

## Como funciona
A app BUMBA corre inteira dentro de um ecrã do React Native (WebView), já em ecrã completo e sem a moldura do telemóvel.

- `app.html` — **a app BUMBA, legível. É aqui que se altera o desenho e os textos.**
- `build.js` — reconstrói os ficheiros abaixo a partir do `app.html`. Corre `node build.js` depois de cada alteração.
- `bumba.html` — a app empacotada (abre num navegador para testar). Gerado pelo `build.js`.
- `bumba-html.js` — o mesmo, em módulo JavaScript para o Expo. Gerado pelo `build.js`, que também o copia para `bumba/`.
- `fotos/` — as fotos das provas e das publicações (`nome.jpg`). O `build.js` mete-as dentro da app como recurso `foto-nome`; a lista `PHOTOS` no `app.html` diz que foto vai em cada sítio. Créditos em `fotos/CREDITOS.md`.
- `App.js` — o ecrã do Expo (cópia em `bumba/App.js`). No Android, o botão «voltar» do telemóvel fecha painéis e volta ao Início antes de sair da app.

Não edites o `bumba.html` nem o `bumba-html.js` à mão: as alterações perdem-se no próximo `node build.js`.

## Entrar na app
A app abre num ecrã de login: número de telemóvel angolano (9 dígitos, começa por 9) e um código de 4 números por SMS. Não há servidor nem SMS de verdade: o código aparece numa notificação falsa no topo do ecrã (toca nela para preencher).

- **923 456 789** é a conta de demonstração: entra como Edna Mbala, com tudo preenchido (botão «Usar» no ecrã de login).
- **Qualquer outro número** cria uma conta nova: pede só o nome, e a pessoa começa com o Cartão vazio, sem provas, pedidos nem conversas.
- As contas e a sessão ficam guardadas no próprio telemóvel (localStorage). Fechar e abrir a app mantém a pessoa dentro; «Sair da conta» está no fim do separador Eu.

Depois do primeiro login aparece um tutorial de 9 passos com balões por cima da app (Início, Pedidos, Cartão, Mural, Pessoas, Eu, mapa e mensagens). Contas novas acabam no formulário do Cartão. Só aparece uma vez por conta; «Rever o tutorial» está no fim do separador Eu.

## Contas de empresa
No login há duas abas: **Sou pessoa** e **Sou empresa**. A empresa entra com o telemóvel de quem gere a conta + código SMS. Um número só pode ser de um tipo de conta.

- **923 000 111** é a empresa de demonstração: **Kwanza Seguros** (responsável Nzinga Afonso), já com a vaga «Analista de Dados Júnior», o curso «Excel para o primeiro emprego» e um candidato (Wilson).
- **Outro número** cria uma empresa nova: nome, NIF (9–14 números), sector, cidade e o nome do responsável. Fica «NIF por verificar» e, na demo, é verificada sozinha passados uns segundos.

A empresa tem um painel próprio (sem biscatos para trabalhar nem Cartão):

| Separador | O que tem |
|---|---|
| **Vagas** | As vagas abertas (candidatos e novos), os cursos (inscritos), os biscatos publicados, e as fechadas (reabrir / apagar) |
| **Publicar** (botão vermelho) | **Vaga de carreira** (salário mín.–máx. obrigatório, modalidade, requisitos), **Curso** grátis que dá selo, ou **Biscato** |
| **Candidatos** | Por vaga: Novo → Marcar entrevista → Contratar, ou Recusar. Ver o Cartão e as provas, mandar mensagem ou ligar. Os biscatos funcionam como os das pessoas |
| **Mural** | Igual ao das pessoas, publicado em nome da empresa |
| **Empresa** | Dados, NIF, responsável, números, página pública, tutorial e sair |

O tutorial da empresa tem 6 passos e acaba em «Publicar a primeira vaga».

**Entre contas no mesmo telemóvel:** tudo o que uma conta publica aparece às outras contas guardadas no mesmo telemóvel. Uma empresa publica uma vaga → uma pessoa vê-a em Carreira e candidata-se → a empresa vê a pessoa em Candidatos e marca entrevista/contrata → a pessoa vê «Entrevista marcada» / «Contratado» em Pedidos. O mesmo para cursos (inscrições) e biscatos (interesse → escolhido). As candidaturas, os interesses e os cursos de cada pessoa ficam guardados na conta dela. Sem servidor, isto só funciona entre contas do **mesmo** telemóvel.

Enquanto a empresa está com a sessão aberta aparecem também candidatos simulados (pessoas da demo cujo perfil combina com a vaga) e inscrições simuladas nos cursos.

## Publicar trabalho
Qualquer conta pode publicar um **biscato** ou um **trabalho fixo** (botão «Precisas de alguém?» no Início): o que precisa, detalhes, onde, quando/horário e quanto paga (o valor é obrigatório). Vagas de carreira continuam a ser só das empresas.

O pedido aparece no topo do Início, marcado «O teu pedido», e em Pedidos › «Publicados por mim». Passados uns segundos aparecem interessados (simulados: pessoas da rede cujo perfil combina com o pedido). Para cada um: ver o perfil e as provas, mandar mensagem e escolher.

Regras de vida de um biscato (os pedidos são apagados de vez, sem histórico):

| Momento | Início (feed) | Pedidos |
|---|---|---|
| Publicado, à procura | Aparece | Aparece, com «Apaga-se daqui a …» |
| 2 dias sem ninguém escolhido | Sai | Apagado (aviso nas notificações) |
| O dono cancela (pede confirmação) | Sai | Apagado |
| Alguém é escolhido | Sai | Fica, como «A trabalhar» — **já não dá para cancelar** |
| «Trabalho feito — avaliar ★ 5,0 e fechar» | — | Apagado; quem trabalhou ganha a prova |

Trabalhos fixos publicados seguem as mesmas regras, menos a dos 2 dias.

Do lado de quem trabalha: um biscato de outra pessoa sai do Início assim que o cliente aceita o interesse, e sai dos Pedidos quando o trabalho termina e é avaliado. A prova fica no perfil. Os biscatos de demonstração (Sr. Mário, Dona Teresa…) não expiram.

## Provas
Em Eu › Provas › «+ Adicionar», a pessoa junta um trabalho que já fez, como no LinkedIn: título, para quem, descrição e anexos — fotos (reduzidas a 900 px), PDF até 2 MB e links. Pode partilhar também no Mural. Tocar numa foto ou PDF abre-a em ecrã inteiro; os links abrem no browser do telemóvel.

As provas e os pedidos publicados ficam guardados no telemóvel (localStorage, cerca de 5 MB no total). Se encher, aparece um aviso para usar ficheiros mais pequenos. No Android o PDF pode não aparecer dentro da app (o WebView do Android não mostra PDF); no iPhone e no computador aparece.

## O Cartão Bumba
O CV é escrito pela própria pessoa, num formulário: profissão, sobre ti, competências, anos de experiência, onde trabalha e salário pretendido. No fim vê o Cartão e guarda-o no perfil. Há três exemplos para preencher o formulário de uma vez (Canalizador, Estudante, Cozinheira).

A app não usa inteligência artificial nem microfone.

## Notas
- As fontes, o React e a página do mapa vêm dentro da app; só os azulejos do mapa («Perto de ti», OpenStreetMap) precisam de internet. O resto funciona sem dados.
- A página de apresentação (texto «Sem cunha. Só bumba.», painel USSD *444#, «Como a BUMBA ganha dinheiro») está no `app.html` mas fica escondida no telemóvel: o CSS no fim do `<style>` põe o telemóvel em ecrã completo.
