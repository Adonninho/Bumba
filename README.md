# BUMBA — Sem cunha. Só bumba.

**Experimentar a app:** https://bumba-jade.vercel.app/

**Bumbar é trabalhar.** A BUMBA junta numa só app o biscato de hoje, o trabalho fixo em casas e famílias, e a carreira nas empresas angolanas. Do kota que precisa de jardineiro para sábado ao banco que contrata no Huambo: aqui mostras o que sabes fazer, não quem conheces.

## Entrar na demonstração

1. Abre o link acima, no telemóvel ou no computador.
2. Na caixa **«Conta de demonstração»**, toca em **«Usar»**: preenche o número **923 456 789** (Edna Mbala, electricista).
3. Toca em **«Receber código»**. O SMS é simulado: o código aparece no topo do ecrã. Toca nele para o preencher.

Para ver o lado da empresa, escolhe **«Sou empresa»** antes de tocar em «Usar» (Kwanza Seguros).
Qualquer outro número começado por 9 cria uma conta nova.

## O que a app faz

- **Cartão Bumba** — escreves o que sabes fazer e fica logo um cartão profissional. Quem nunca fez um CV passa a ter um.
- **Biscatos, trabalho fixo e vagas** — com o pagamento ou o salário sempre à vista e o selo «Para ti» no que combina contigo.
- **Publica e contrata** — precisas de um canalizador? Publicas, quem sabe mostra interesse e tu escolhes.
- **Provas, não cunhas** — cada trabalho feito vira uma prova pública (fotos, PDF, links) com a avaliação de quem contratou.
- **Perto de ti** — mapa de Luanda com os biscatos, trabalhos fixos e empresas à volta.
- **Mural, Pessoas e Mensagens** — rede profissional com conexões, grupos, eventos e conversas com quem te contrata.
- **Empresas** — publicam vagas e cursos, vêem os candidatos com as provas e respondem a todos.
- **Qualquer telemóvel** — sem dados nem smartphone: \*444# para receber biscatos por SMS (simulado na demo).

No computador a app abre com menu lateral e colunas; no telemóvel fica igual à app do Expo.

## Como está feito

| Ficheiro | O que é |
|---|---|
| `app.html` | A app inteira, legível (HTML + JavaScript). É aqui que se altera. |
| `mapa.html` | O mapa «Perto de ti» (Leaflet + mosaicos Esri). |
| `fotos/` | Fotos da demo. Créditos e licenças em [fotos/CREDITOS.md](fotos/CREDITOS.md). |
| `build.js` | `node build.js` junta `app.html`, `mapa.html` e `fotos/` e gera os ficheiros abaixo. |
| `index.html` | O site (alojado na Vercel), com título e imagem de partilha (`partilha.png`). Gerado. |
| `bumba.html` | A app num só ficheiro, para abrir no navegador. Gerado. |
| `bumba-html.js`, `bumba/` | A app no telemóvel: projecto Expo (React Native) com a app numa WebView. Ver [LEIA-ME.md](LEIA-ME.md). |
| `BACKEND.md` | Guia para o servidor: modelo de dados, regras e onde ligar a API. |

Esta versão é uma demonstração sem servidor: as contas e publicações ficam guardadas no próprio aparelho (`localStorage`) e o SMS é simulado. O [BACKEND.md](BACKEND.md) descreve o que falta para a versão real.

## Correr localmente

```
node build.js          # depois de alterar app.html ou mapa.html
```

Abre `bumba.html` no navegador. Para o telemóvel: `cd bumba`, `npm install`, `npx expo start` e lê o QR com o Expo Go.
