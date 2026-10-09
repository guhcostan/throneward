# Crítica de fidelidade — THRONEWARD v9 (HEAD após tag v8; commits até b0941f0)

Crítico: agente Gauntlet (Claude Haiku 5.5). Entrada: `docs/SPEC.md`, `docs/spec-hud.md` (§2 HUD, §3 câmera, §5 atalhos, §6 menu), `docs/PROGRESS.md` (incl. B-001), `docs/PRONTO.md`, `git log v8..HEAD`, `git show --stat HEAD~3..HEAD`, e leitura de `index.html`, `src/main.ts`, `src/render/camera.ts`, `src/render/warriors.ts`.

## Limitação de evidência (leia primeiro)

- **Não consegui inspecionar nenhum PNG.** `read_image` recusou `menu.png`, `hud-prod.png`, `fog.png` e `warriors.png` com: *"model Merge/anthropic-claude-haiku-5-5 does not declare image input"*. Não foi feita leitura visual.
- Por isso, toda divergência abaixo vem de **código-fonte, HTML e documentação**. Itens marcados **"verificar no PNG"** são suposições de código que precisam de confirmação visual por um crítico com visão ou pelo Lead.
- Não usei a referência do original (conforme a tarefa). A comparação é com `spec-hud.md` §2 e §5–6.
- Nenhum comando de escrita foi executado; apenas leitura de arquivos e git.

## Veredito resumido

| Item | Situação pelo código/doc | Veredito |
|---|---|---|
| Painel de seleção centro-baixo (§2.1) | `#selection` com `left:50%` + `bottom:12px` | OK (posição) |
| Painel de seleção com HP/stats/retrato (§2.3) | Só texto `"2x archer + …"` | **Não atende** (D1) |
| Fila de produção com slots e progresso (§2.1/2.2) | Só texto `[n na fila]` e linha "Produção:" | **Não atende** (D2) |
| Grade de comandos com hotkey visível (§2.2) | 8 botões, hotkey só em `title` (tooltip) | **Parcial** (D6) |
| Recursos/era/pop (§2.1, §2.4) | Pop real OK; "Age I" sem nome de era nem objetivo | **Parcial** (D4, D5) |
| Minimapa com filtros (§2.1) | Canvas 220px sem nenhum filtro | **Parcial** (D8) |
| Câmera Q/E 90° (§3, §5) | Rotação só botão direito | **Parcial** (D10) |
| Menu skirmish (§6) | Civ/bots/dificuldade/vitória; sem mapa, tamanho, aleatório, cores, fog | **Parcial** (D11) |
| B-001 documentado como ambiental | Ver seção própria | **Não sustentado** (D13) |
| Evidência "hud-prod" (PRONTO item 12) | `hud-prod.png` e `hud-live.png` têm **o mesmo SHA-256** | **Não sustentado** (D14) |

## Divergências numeradas

Severidade: **B** = bloqueante (quebra spec ou aceite); **m** = menor.

### HUD — painel de seleção e produção

**D1 [B] Painel de seleção sem informação de unidade.** `refreshSelection()` (main.ts ~535–557) escreve só `"${n}x ${tipo}"` e o estado de prédio (`% construção`, `[N na fila]`). Não há HP, ataque, armadura, alcance, velocidade, retrato nem estado ("colhendo/ocioso"). `spec-hud.md` §2.3 pede exatamente isso para seleção única e múltipla (retrato, HP por unidade, clique no retrato reduz a seleção).
*Correção (1 linha):* renderizar, para seleção única, nome + barra `hp/maxHp` + ataque/armadura/alcance/velocidade + estado; para múltipla, grade de mini-retratos com HP.

**D2 [B] Fila de produção sem slots nem progresso.** `spec-hud.md` §2.1 e §2.2 pedem "fila de produção do prédio selecionado (slots com progresso)" acima da grade. Só existe texto `[N na fila]` (selection) e `Produção: tipo:unit,unit` (`#global-queue`, sem progresso). Não há slot cancelável (§2.3).
*Correção:* 5 slots por prédio selecionado, barra de progresso por slot, clique cancela.

### HUD — topo, era e grade

**D3 [m] Recursos sem contagem de aldeões por recurso.** `#res-food`/`#res-wood` etc. (main.ts ~957–961) mostram só o estoque (`Food ${stock.food}`). §2.1 pede contagem de aldeões trabalhando naquele recurso (`[F] 350 (+8 aldeões)`).
*Correção:* somar `game.units` com `gather.kind` por recurso e exibir `(+N)`.

**D4 [m] Era sem nome nem objetivo.** `#age` recebe `Age I…IV` (main.ts ~966). §2.4 e §2.1 pedem nomenclatura Dark/Feudal/Castle/Imperial e o objetivo atual (landmark em construção, ex.: "Obj: Construir Castelo 2/3"). A spec (§2.4, decisão de design) usa 4 eras com esses nomes.
*Correção:* trocar por `ERA: FEUDAL` e `Obj:` com o landmark pendente, lido de `game.ages`.

**D5 [m] Timer e objetivo ausentes do topo.** §2.2 põe `⏱ tempo` e `⚑ Placar` na barra superior. Tempo não aparece no topo; placar/objetivos estão no painel lateral direito (`#side-panel`, top:48px), que é uma escolha defensável mas diverge do wireframe.
*Correção:* mostrar tempo de partida no `#hud-top`.

**D6 [m] Grade de comandos: 8 botões em 4×2, hotkey só em tooltip.** `#cmd-grid` usa `grid-template-columns:repeat(4,56px)` e a lista de ações (`Move/Atk/Build/Gather/...`) é texto em inglês, sem hotkey visível. §2.2 pede grade 3×5 ou 4×4 com hotkey em cada ícone; §5 lista atalhos (A/P/S/H/Espaço/Q/E) que não batem com os `title` de `index.html` (M/A/B/G/P/S/R/Esc).
*Correção:* grade 4×4, rótulo de hotkey no canto de cada botão e alinhar atalhos com §5 (ou atualizar §5).

**D7 [m] Botões de ociosos fora da posição do wireframe.** §2.2 põe "Ocioso/Exército" sob o minimapa (canto inferior esquerdo). Estão no painel lateral direito (`#btn-idle-vil`, `#btn-idle-mil`). §2.1 marca a posição como VERIFICAR, então é divergência só em relação ao wireframe.
*Correção:* mover para abaixo do minimapa ou atualizar §2.2.

### HUD — minimapa e legibilidade

**D8 [m] Minimapa sem filtros.** §2.1 pede filtros (terreno / unidades / sinais). `updateMinimap` desenha sempre terreno + unidades + retângulo da câmera; não há controle de filtro.
*Correção:* três toggles acima do canvas, mesmo que só um liga/desliga unidades.

**D9 [m] Retângulo de câmera no minimapa aproximado.** `updateMinimap` usa `half = cam.dist * 0.45` (comentário: "approx by dist"), e não o frustum real da câmera 3/4. Pode mostrar área maior ou menor que a tela.
*Correção:* projetar os 4 cantos da viewport no plano do terreno.

**D12 [m] Legibilidade do painel lateral e do topo.** `#side-panel` usa `font-size:12px` e `#hud-top` usa `system-ui` sem escala. Em 1280×800 os rótulos "Objetivos/Placar/Produção" ficam pequenos. Contraste de texto (#e8e6df sobre rgba(10,10,12,.72)) está ok. *Verificar no PNG:* legibilidade de `hud-prod.png`.

### Câmera

**D10 [m] Rotação sem teclado.** §3 e §5 prescrevem Q/E em passos de 90°. `camera.ts` só rotaciona com botão direito arrastando (`onDown`: `e.button === 2` → `mode='rotate'`); `keyDir` trata apenas WASD/setas. Espaço (centralizar na seleção, §5) também não existe no código.
*Correção:* em `onKeyDown`, Q/E → `rotate(s, ±π/2)`; Espaço → centralizar `tx/tz` na seleção.

### Menu skirmish

**D11 [m] Menu sem campos de mapa, tamanho, aleatório, cores, fog e recursos iniciais.** `index.html` (#menu) tem civ (Albion/Gallia/Genérica), bots (0–3), dificuldade e 4 checkboxes de vitória. §6 pede lista de civ "com aleatório", mapa com miniatura, tamanho, cores/time, recursos iniciais e toggle de fog. Algumas são V/D na spec, então é menor, não bloqueante.
*Correção:* adicionar "Aleatória" ao select de civ e um toggle de fog; o resto fica como VERIFICAR explícito.

**D13b [m] Versão antiga no menu.** `index.html` diz `"RTS jogável (v0.4)"`, mas as tags já chegam a v8 (`PRONTO.md` diz "Tags: v1–v8"). Texto visível ao usuário desatualizado.
*Correção:* trocar por `v8` (ou remover o número) e sincronizar com `package.json`.

**D15 [m] Estilo do menu. Verificar no PNG.** Botões do menu são `<button>` padrão (`#menu-card button{padding:10px 22px;font-size:15px}`), sem tratamento de paleta; o único acento dourado (`#c9a227`) aparece só no banner de vitória. Paleta do corpo (#0e0f12, #14161a, borda #5a5348) é consistente, mas o menu pode parecer "formulário padrão" frente à referência. *Verificar no PNG:* `docs/screenshots/menu.png`.

### B-001 e evidências

**D13 [B] B-001 fechado como "ambiental" sem prova reprodutível.** A tarefa afirma que há "prova em pixels". A documentação não sustenta isso:
- `docs/PROGRESS.md` linha 17 (bloco de estado inicial, antes do Round 8): status "aberto", "**Suspeita**: compositor headless", e próximo passo explícito "Verificar em browser real/prod".
- Nenhum registro posterior mostra essa verificação. Linha 168 (Round 30) fecha como "ambiental (mira 222x222 em (12,12), compositor headless)" sem citar teste, comando ou diff de pixels.
- Commit `0e8d1ee` tem corpo de uma linha ("causa ambiental isolada … reverte experimentos") e não contém análise; os PNGs `b001-game.png` e `b001-fixed.png` foram adicionados sem nenhuma referência de texto que os descreva.
- O código (`src/main.ts` ~linhas 76–80) **redesenha o minimapa** como workaround ("DOM e conteúdo verificados corretos — sem mudança de produto justificada"). Isso é mudança de produto, o que contradiz o próprio comentário.
- Atribuir ao compositor do headless sem reproduzir o retângulo em browser real é hipótese, não fechamento. Se o artefato aparecer em produção, o fechamento está errado.
*Correção:* manter B-001 aberto até um teste em browser real (ou no job e2e-prod com `page.screenshot` e comparação de pixels da região 0..240×0..240) e registrar o comando e o resultado; remover o redesenho se não for necessário.
*Verificar no PNG:* `b001-game.png` e `b001-fixed.png` (existe retângulo preto em (12,12) em algum deles?).

**D14 [B] `hud-prod.png` é cópia de `hud-live.png`.** SHA-256 idêntico: `9bf6dabc4fa429b815710f710774b1865d1a0569` para ambos, mesmo tamanho (238153 B). Não há como essa imagem ser "produção" e "live" ao mesmo tempo se as capturas foram feitas em momentos diferentes. `PRONTO.md` item 12 usa `hud-live.png` como prova de layout; o nome `hud-prod` pode estar sendo usado como evidência de produção sem ser.
*Correção:* recapturar `hud-prod.png` do `https://throneward.pages.dev` e registrar o hash e a data no PRONTO; ou renomear/apagar a duplicata.

## Itens visuais a verificar no PNG (sem leitura por este crítico)

- `menu.png`: contraste e hierarquia dos botões (D15); se o cabeçalho "👑 THRONEWARD" tem escala adequada.
- `hud-prod.png`: layout real das regiões (topo, minimapa, painel, grade); legibilidade do texto 12px (D12); se o retângulo preto de B-001 aparece nele.
- `fog.png`: véu preto sobre inexplorado e opacidade do nevoeiro em `world.ts`/`main.ts` (~linhas 262–290). Não há spec de estilo de fog; só checar se parece intencional.
- `warriors.png`: paleta dos guerreiros (`warriors.ts` usa tons terrosos + cor de jogador) e escala relativa à grade/terreno (spec §3 sugere unidade ≈ 1, prédio ≈ 3–5).
- Escala geral: unidades vs. prédios vs. árvores (6000 cones de floresta).

## Contagem

- **Bloqueantes: 4** — D1 (seleção sem HP/stats), D2 (fila sem slots/progresso), D13 (B-001 fechado sem prova), D14 (hud-prod = hud-live).
- **Menores: 12** — D3, D4, D5, D6, D7, D8, D9, D10, D11, D12, D13b, D15.
- Itens visuais "verificar no PNG": 5 (ver seção acima).

*(Os IDs D13b e D15 foram usados fora de ordem na escrita; a contagem acima é a definitiva.)*

## Como testar

- `ls docs/critica-fidelidade-v9.md`
- Para confirmar D14: `shasum docs/screenshots/hud-prod.png docs/screenshots/hud-live.png`
- Para confirmar D13: `grep -n "B-001" docs/PROGRESS.md` e `git show 0e8d1ee --stat`
- Para confirmar D1/D2: `grep -n "refreshSelection" -A25 src/main.ts` (não há HP nem slots)
