# Throneward — Realms of Crown & Hearth

RTS de navegador inspirado em mecânicas de Age of Empires IV, com arte/áudio/nome originais.
Mecânicas e números espelham o original; arte, áudio e marcas são originais e procedurais.

## Decisões (Fase 0)
- Nome do projeto: **THRONEWARD** (subtítulo: Realms of Crown & Hearth). Não usar nome, logos, modelos, texturas ou sons do original.
- Civilizações (2, assimétricas, nomes originais, mecânicas análogas ao original):
  - **Albion** (análoga a English): bônus defensivos, fazendas baratas, homem de armas e arco longo.
  - **Gallia** (análoga a French): bônus de cavalaria, cavaleiro real, mantém economia de comércio.
- Repo pretendido: `github.com/guhcostan/throneward` (usuário autenticado via `gh`: guhcostan; criar na Fase 1).
- Deploy: Cloudflare Workers/Pages via wrangler (pendente: `wrangler` ausente + sem token Cloudflare — instalar e pedir `CLOUDFLARE_API_TOKEN` antes do primeiro deploy).
- Arquitetura obrigatória: TypeScript + Vite; Three.js/WebGL2 com instancing; sim determinística em tick fixo separada do render e headless em Node; `window.__game`.
- Modelo fixo para todos os subagentes: provider=`opencodex`, model=`Merge/anthropic-claude-haiku-5-5` (Claude Haiku 5.5). Se indisponível, parar e avisar, sem trocar.
- Gauntlet: builder nunca avalia o próprio trabalho; críticos recebem só SPEC + critérios + URL + screenshots + diff; suíte só cresce; máx 5 rodadas/fase.
- Escala: pop 200, 4 idades via landmark (escolha 1 de 2), vitória por landmarks/sagrados/maravilha.

## Estado da Fase 0 (R1/5 — 2026-10-08)
Parcial honesto: fontes com números bloqueadas (Fandom 403, Liquipedia 403, web_search 429).
Estrutura + landmarks + aldeão + tecnologias de coleta VERIFICADOS ([V] nos arquivos).
Taxas de coleta, mapa, sagrados/relíquias/comércio/vitória, custos de prédios e hotkeys seguem `VERIFICAR`.
Nada disso bloqueia o scaffold/Fase 1: implementar com valores THR v0 e convergir no balanceamento (Fase 3/7).
- `docs/spec-units.md` — unidades/counters/tabela base THR v0 (58 linhas, Lead; pesquisador de unidades sem entrega — nova rodada na Fase 3).
- `docs/spec-buildings.md` — estrutura + landmarks confirmadas, números VERIFICAR (203 linhas).
- `docs/spec-economy.md` — aladeão/landmark/tecs [V], resto VERIFICAR (199 linhas).
- `docs/spec-hud.md` — layout/função + wireframe ASCII, hotkeys VERIFICAR (240 linhas).

## Regras de fidelidade
- Pesquisar wikis/patch notes/tabelas/vídeos/screenshots à vontade; citar fontes.
- Copiar mecânicas e números; NÃO copiar arte/áudio/nome/logo.
- Toda afirmação numérica no SPEC deve ter fonte ou marcar `VERIFICAR`.
- Não declarar nada como funcionando sem evidência (teste, log ou screenshot).
