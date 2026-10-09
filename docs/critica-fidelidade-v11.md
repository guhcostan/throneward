# Crítica de fidelidade — THRONEWARD v11 (delta v9→v11)

Crítico: agente Gauntlet (Claude Haiku 5.5). Entrada: `docs/SPEC.md`, `docs/PRONTO.md`, `docs/PROGRESS.md` (blocos Round 38→60), `docs/critica-fidelidade-v9.md`, `docs/spec-hud.md` (§2, §3, §5), `git log v9..HEAD` (25 arquivos, +1239/-48), e leitura de `index.html`, `src/main.ts`, `src/render/camera.ts`, `src/sim/game.ts`.

## Limitação de evidência (leia primeiro)

- **Não consegui ler nenhum PNG.** `read_image` recusou `hud-prod-ci.png` com: *"model Merge/anthropic-claude-haiku-5-5 does not declare image input"*. Mesma limitação da v9. Nenhum item visual foi verificado; todos marcados "verificar no PNG".
- Análise por código-fonte, HTML e spec. Nada foi executado (sem build, sem testes, sem browser).
- Nenhum arquivo de código ou teste foi alterado.

## Estado do D1–D15 da v9 (conferência rápida)

| Item v9 | Situação no HEAD (código) | Status |
|---|---|---|
| D1 painel de seleção sem HP/stats | `refreshSelection()` agora mostra HP, ATK/ARM/RNG por tipo e ícone | **Fechado** (ícone = emoji, não retrato) |
| D2 fila sem slots/progresso | Prédio selecionado mostra `[unit ▓▓░░░]` por slot | **Fechado parcialmente**: ainda sem cancelar por clique (§2.3) e slots só em texto |
| D4 era sem nome | Dark/Feudal citados (commit "eras Dark/Feudal") | **Fechado** (confirmar Castle/Imperial no texto de `#age`) |
| D6 hotkeys na grade | `title` ainda mostra `Move (M)`, `Attack (A)`... | **Não fechado** — ver B2 |
| D10 Q/E | `Q`/`E` agora giram, Espaço centra no TC | **Parcial** — ver B3 |
| D13b versão | `menu-version` vem de `GAME_VERSION` | **Fechado** |
| D14 hud-prod = hud-live | não reverificado (sem leitura de hash no delta) | **Aberto** |
| D13 B-001 | não tratado no delta | **Aberto** |

## Divergências (delta v9→v11)

Severidade: **B** = bloqueante (quebra aceite ou spec de UI/affordance de sistema novo); **m** = menor.

### Affordances de sistemas novos

**1 [B] Reparo sem botão na grade.** `refreshGrid()` (main.ts ~737–862) não tem `btn('repair', ...)`. Reparo só funciona por clique direito em prédio danificado (`orderAt`, ~930). A ajuda (`index.html` #help) cita "reparar" de passagem, mas não diz que é clique direito com aldeão selecionado nem que o prédio precisa estar ferido. Descoberta depende de ler a ajuda.
*Correção:* botão "Reparar" na grade quando há aldeão e prédio próprio com `hp < maxHp` selecionado, com `title` no formato `Reparar (R)`, e atualizar a ajuda.

**2 [B] Montar muralha sem botão e sem regra.** Montar só existe como clique direito com arqueiro/besta/longbow sobre muralha de pedra (`orderAt`, ~955). Não há botão na grade. A ajuda cita "montar muro" apenas na lista de clique direito, sem dizer que só arqueiros/bestas montam, que a muralha precisa ser de pedra e que a unidade desmonta ao mover. A unidade não tem nenhum sinal visual de que está em cima da muralha exceto a elevação (`main.ts` ~588, `u.elev > 0 ? 2.5`).
*Correção:* botão "Montar" enabled quando há arqueiro selecionado e muralha de pedra própria a ≤3 tiles, e dica explícita "Montar: clique direito na muralha de pedra" na ajuda.

**3 [B] Furtividade sem affordance nenhuma.** A tile furtiva é só cor roxa no chão (`world.ts` STEALTH_RGB) e grade de visão = 2 (`main.ts` ~177–181). Não há legenda, nem indicador de unidade oculta, nem botão de "entrar/sair de furtividade" e a ajuda não cita o conceito. Jogador vê uma cor sem explicação.
*Correção:* incluir na ajuda "Roxo = terreno furtivo: unidades dentro veem além de 2 tiles, inimigos não te veem fora dele" e legenda no minimapa para a cor roxa.

**4 [B] Portão: affordance só aparece com muralha própria.** O botão "Portão" só é criado se `ownWalls` (main.ts ~820). Sem muralha, não há como descobrir o recurso pela grade; a ajuda diz "Portão alterna o trecho" mas não diz o pré-requisito. Também: ao clicar em Portão, o hint diz "Portão: clique na sua muralha", mas a ajuda não cita o clique com Esc cancelar.
*Correção:* mostrar Portão desabilitado (com título "requer muralha própria") em vez de ocultar, e citar o pré-requisito na ajuda.

**5 [B] Rota de comércio: pré-requisito invisível.** Botão "Rota" aparece só com trader selecionado (main.ts ~831), e o trader só é treinado no mercado (era III/IV, `TRAINABLE.market`). A ajuda cita "mercado + Rota rende ouro" mas não diz que é preciso dois mercados próprios construídos, nem que a rota é dois cliques em mercados (e não clique em trader). Pelo código, `routeMode` pede origem e destino em `main.ts` ~1052–1064, mas o hint inicial diz só "clique o mercado de origem".
*Correção:* na ajuda, "Rota: selecione mercador → Rota → clique 2 mercados próprios construídos"; hint de rota deve citar o pré-requisito "2 mercados".

**6 [m] Ciclo de coleta a pé sem feedback.** Commit "Ciclo real de coleta (nó → entrega a pé)" muda o comportamento do aldeão, mas a UI não mostra se o aldeão está colhendo, andando para entregar, ou ocioso. `refreshSelection()` não mostra estado de coleta (SPEC §2.3 pede "estado" por unidade). A única pista é `idle-vil-n`.
*Correção:* linha de estado por unidade selecionada: "colhendo madeira", "entregando", "ocioso".

**7 [m] Auto-defesa invisível.** Tropa ociosa revida em alcance+3 (commit 783942d). Nenhum texto, ícone ou hint informa o jogador. O botão "Tropa ociosa" não diferencia "parada e defendendo".
*Correção:* incluir auto-defesa na ajuda ("tropa parada revida inimigos próximos") e não colocar em "Tropa ociosa" se estiver em combate.

### Ajuda (`#help`, index.html 66–72)

**8 [B] Ajuda não cobre sistemas novos de forma completa.** Verificado linha a linha contra os sistemas: reparo (só citado em clique direito, sem regra), montar (ausente), portão (ok, sem pré-requisito), rota (incompleta, ver 5), furtividade (ausente), auto-defesa (ausente), coleta a pé (ausente: "4 recursos esgotam", mas nada sobre aldeão andar até o nó), Q/E e Espaço (**nenhum dos dois aparece na ajuda**; a linha "Botão direito arrastar: girar" é o único texto sobre rotação), Shift/Ctrl (ok). Tela de "Como jogar" é o único tutorial. Os itens reparo e montar aparecem só como palavras na lista de clique direito, sem regra.
*Correção:* uma linha por sistema novo: Reparo, Montar, Furtividade, Auto-defesa, Coleta a pé, Q/E (girar 90°?), Espaço (centralizar TC).

**9 [m] "Shift = fila" é ambíguo na ajuda.** A ajuda (linha 1) diz "Shift = fila" junto de seleção, mas o código usa Shift também para adicionar à seleção e para enfileirar ordens (`orderAt(g.x, g.z, e.shiftKey)`). Spec §5 separa os dois casos.
*Correção:* distinguir "Shift+clique = adicionar à seleção" e "Shift+ordem = enfileirar".

### Atalhos de teclado vs grade vs spec

**B2 [B] Hotkeys anunciadas na grade não existem.** `index.html` 45–46 põe `title="Move (M)"`, `Attack (A)`, `Build (B)`, `Gather (G)`, `Patrol (P)`, `Stop (S)`, `Repair (R)`, `Cancel (Esc)`. O único handler de teclado (`main.ts` ~1168–1207) trata Esc, dígitos, Q/E e Espaço. **M, A, B, G, P, S, R não têm handler.** O `title` é a única affordance e promete um atalho que não funciona. Além disso, `index.html` tem os botões de grade estáticos `disabled` (linhas 45–46), e o JS reconstrói a grade; o HTML estático não tem efeito.
*Correção:* implementar os 7 atalhos (ou remover do `title`) e ligar a ajuda a eles.

**B3 [B] Q/E gira 0,2 rad (~11°), não 90°.** `main.ts` ~1192: `rotate(cam, kl === 'q' ? 0.2 : -0.2)`. Spec §5 (`spec-hud.md`, linha 146) prescreve "Q/E (passo 90°)" e §3 (linha 104) "rotação de 90° em passos". Commit d0b1592 diz "Q/E giram", não diz o passo. O passo está errado em ~8×: 90° = π/2 ≈ 1,571 rad.
*Correção:* trocar `0.2` por `Math.PI / 2` (ou atualizar spec-hud §3/§5 para o passo escolhido e documentar).

**10 [m] Espaço é mapeado ao TC mesmo sem TC, e não há atalho para "centralizar na seleção".** Spec §5 (linha 143) prescreve Espaço = centralizar na seleção; código centraliza no TC (main.ts ~1196–1204, comentário "como no original"). Divergência de intenção: o comentário diz "como no original" mas a spec §5 marca como `D` (decisão de design), não como fato do original.
*Correção:* alinhar com a spec: Espaço → centro da seleção; manter TC em tecla separada (ex.: `H`), ou corrigir a spec.

**11 [m] Pausa/menu e Ctrl+. (idle) não implementados.** Spec §5 lista `.`/`,` para ociosos e `Ctrl+.` para produção; no código os ociosos são só botões (`btn-idle-vil`, `btn-idle-mil`). Não há atalho. Menor, porque a spec marca como `V`/`D`.

### Legibilidade e layout (verificar no PNG)

**12 [m] Grade de comandos 4×2 com texto em inglês.** `index.html` 44–47 + `#cmd-grid` ainda 4 colunas e 8 botões, rótulos "Move/Atk/Build/Gather/Patrol/Stop/Repair/Cancel". Spec §2.2 (linha 43) pede grade 3×5 ou 4×4 com hotkey visível no ícone. Os rótulos são texto, não ícone, e o hotkey só aparece em tooltip. *Verificar no PNG:* se a grade está legível em 1280×800 e se o texto "Atk"/"Build" cabe nos botões.

**13 [m] Painel lateral (ociosos/placar/objetivos/produção) em 12–13px.** `index.html` 37 `font-size:13px`. Mesmo problema de D12 da v9, não tratado. *Verificar no PNG:* `hud-prod-ci.png`.

**14 [m] Minimapa: sem filtros e sem legenda da cor de furtividade/fog.** Ver 3. Commit "Minimapa filtrado" de fog existe (r31), mas não há controle de filtro de unidades/terreno (D8 da v9 ainda aberto). *Verificar no PNG:* `fog.png` (véu e minimapa).

**15 [m] Retângulo da câmera no minimapa ainda aproximado.** D9 da v9 não tratado. *Verificar no PNG.*

### Menu e evidências

**16 [B] D14 não reverificado.** Não há no delta nenhum registro de que `hud-prod.png` foi recapturado; `hud-prod-ci.png` (hash `ec60e5cd...`) é um arquivo novo, diferente de `hud-live.png` (`9bf6dabc...`). O nome "prod-ci" sugere captura do job CI, mas não há registro no PROGRESS de quando/de onde foi gerada. A duplicata antiga (`hud-prod.png`) não existe mais no diretório, o que resolve o problema de cópia. *Correção:* registrar no PRONTO o hash e a origem de `hud-prod-ci.png`.

**17 [B] B-001 continua aberto sem prova, e o delta não resolveu.** PROGRESS Round 30 fecha como "ambiental" sem teste; v9 D13 (B) não tratado. `docs/PRONTO.md` (linha 32) ainda lista "B-001 (compositor headless, prova pixelada de origem ambiental)" como dívida aberta, então a própria prova não existe. *Correção:* teste de pixel na região 0..240×0..240 em produção, ou manter B-001 explicitamente aberto como dívida.

**18 [m] Menu sem campos de mapa, tamanho, aleatório, cores e fog.** D11 da v9 não tratado (`index.html` 52–62 só tem civ/bots/dificuldade/vitória). Spec §6 pede mapa/tamanho/cores. *Correção:* manter como dívida explícita no PRONTO.

## Contagem

- **Bloqueantes: 10** — 1 (reparo sem botão), 2 (montar sem botão), 3 (furtividade sem affordance), 4 (portão sem pré-requisito visível), 5 (rota sem pré-requisito), 8 (ajuda incompleta), B2 (hotkeys M/A/B/G/P/S/R anunciadas e sem handler), B3 (Q/E gira ~11° em vez de 90°), 16 (D14 sem registro), 17 (B-001 sem prova).
- **Menores: 10** — 6, 7, 9, 10, 11, 12, 13, 14, 15, 18.
- Visuais "verificar no PNG": 12, 13, 14, 15 e `warriors.png`/`walls.png`/`fog.png` (sem leitura por este crítico).

Os itens 1–5 e 8 são o mesmo problema (affordance/descoberta de sistemas novos) vistos de ângulos diferentes; podem ser corrigidos juntos com a reescrita da grade e da ajuda.

## Como testar

- `ls docs/critica-fidelidade-v11.md`
- Hotkeys sem handler: `grep -n "e.key" src/main.ts` (só Esc, dígitos, q/e, espaço).
- Q/E: `grep -n "rotate(cam" src/main.ts` (passo 0.2).
- Botões de grade: `grep -n "btn('" src/main.ts` (sem repair/mount).
- Ajuda: `grep -n "help" index.html` e conferir linhas 66–72.
- Visual: abrir `docs/screenshots/hud-prod-ci.png` com modelo com visão e checar itens marcados "verificar no PNG".
