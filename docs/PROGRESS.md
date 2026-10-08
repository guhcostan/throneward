# PROGRESS — Throneward

## Fase atual
Fase 2 — Economia e construção (rodada 1/5, 3 builders em paralelo)
- recursos: `src/sim/resources.ts` (GATHER_RATES THR v0, CARRY 10/25, dropoff, techBonus)
- construção: `src/sim/construction.ts` (BUILDINGS THR v0, fórmula (N+2)/3, fila produção, popCap 200)
- meshes: `src/render/buildings.ts` (procedural original, footprints, andaimes)
Críticos v1: fidelidade LANDED + 6 bloqueantes corrigidos (ef29758). Balanceamento LANDED (docs/critica-balanceamento-v1.md — 1 bloqueante + 13 menores): bloqueante corrigido (UNIT_SPEED/UNIT_HP por tipo em sim.ts; hash agora cobre queue+resources; determinismo mantido) — 127 unit + e2e 3/3, tsc 0. Menores viram VERIFICAR da Fase 2/3.
Fase 2 LANDED parcial: recursos (8t), construção (13t), meshes prédios (44t) → 127 unit + e2e 3/3, tsc 0.
- terreno: `src/sim/terrain.ts` + `tests/terrain.test.ts`
- pathfinding: `src/sim/pathfind.ts` + `tests/pathfind.test.ts`
- câmera: `src/render/camera.ts` + `tests/camera.test.ts`
- seleção: `src/sim/selection.ts` + `tests/selection.test.ts`
Modelo fixo: opencodex/Merge/anthropic-claude-haiku-5-5. LANDED em 2c0794c: terreno (7t), pathfind (10t), seleção (15t), sim (1t) = 33 testes, tsc 0.
Pendente Fase 1: tests/camera.test.ts DONE (35dd027 + extensão 21t). World render DONE (f20ec6a: world.ts + 8t) → 62/62 testes, tsc 0.
Pendente: rodar e2e DONE (3/3: boot + move + shift-queue, porta 5180; config agora lê E2E_PORT/E2E_BASE_URL e usa --host 127.0.0.1) + main.ts integrado (terreno 64² com relevo/vertexColors, 6000 árvores, câmera do builder, minimapa 128px, __game v0.1-fase1).
B-001 (visual, aberto): retângulo preto ~220px top-left SÓ em screenshots headless; minimapa em si renderiza correto (element screenshot 222px OK); elementFromPoint(100,150)=canvas WebGL fullscreen; some quando #minimap display:none; só 2 canvas no DOM; idêntico antes/depois de clareiras+hemi (não é árvore próxima). Suspeita: compositor headless. Verificar em browser real/prod. Não afeta sim/e2e.
spec-units.md atualizado pelo pesquisador (246l, fonte aoe4world/data, 19 VERIFICAR — fórmula de armadura subtração-vs-% em aberto p/ Fase 3).

## Feito
- 2026-10-08 R1: 3 pesquisadores Haiku 5.5 entregaram parcial (buildings 203l, economy 199l, hud 240l) com VERIFICAR; units sem entrega → THR v0 pelo Lead (58l).
- 2026-10-08 R1: git init + commit d53f911 + repo criado https://github.com/guhcostan/throneward + push main OK.
- 2026-10-08 R1: verificado tsc 0, vitest 1/1, headless OK (7bc10a4==7bc10a4≠99c960ac).

## Feito
- 2026-10-08: Gol criado; toolchain verificado (node 26, pnpm 11, gh auth guhcostan, wrangler ausente, playwright via npx).
- 2026-10-08: Decisões: nome THRONEWARD; civs Albion/ Gallia (análogas English/French); repo pretendido github.com/guhcostan/throneward; modelo fixo opencodex/Merge/anthropic-claude-haiku-5-5.
- 2026-10-08: Skeleton docs/SPEC.md + dirs src/sim, src/render, src/ui, tests, e2e.

## Pendente (Fase 0)
- [x] spec-units.md THR v0 (Lead; pesquisador sem entrega — reconverge na Fase 3)
- [x] spec-buildings.md parcial (estrutura [V], números VERIFICAR)
- [x] spec-economy.md parcial (aldeão/landmark/tecs [V], resto VERIFICAR)
- [x] spec-hud.md parcial (layout/função, hotkeys VERIFICAR)
- [ ] Consolidar tabelas em SPEC.md, revisar, commit inicial (nesta rodada)

## Decisões
- Ver SPEC.md. Wrangler + token Cloudflare pendentes — não bloqueiam Fase 0.

## Bugs abertos
- Nenhum ainda.

## Notas de rodada
- R1: 4 pesquisadores em paralelo (unidades, prédios, economia, HUD). Críticos só após consolidação.
- R1-lead: scaffold TS+Vite+Three OK; tsc limpo; vitest 1/1; headless determinístico OK (seed 1234 vs 9999 hashes distintos).
- Modelo: subagentes fixados em provider=`opencodex` model=`Merge/anthropic-claude-haiku-5-5` (Haiku 5.5). Lead roda no modelo da sessão (space-bunny-free) — divergência registrada; todo trabalho delegado usa Haiku 5.5.
- Pendente credencial: Cloudflare (wrangler ausente, sem token) — bloqueia só o primeiro deploy, não a Fase 0.

## Estado 2026-10-08 (Round 8)
- Fase 1: DONE + tag v1. Fase 2: game.ts + settlement.ts + resources + construction + meshes landed (141 unit? ver suite).
- CI VERDE na main (runs 37829372357 e 37829398161 success após remover pnpm-workspace.yaml fantasma + onlyBuiltDependencies).
- Deploy: Pages `throneward`, produção https://throneward.pages.dev/ HTTP 200 (curl). E2E-vs-prod neste sandbox bloqueado por TLS do Chromium; roda no CI.
- B-001 segue aberto (compositor headless).
- Próximo: ligar Game+Settlement no main.ts/__game + e2e economia, depois Fase 3 (combate).

## Estado 2026-10-08 (Round 9)
- Fase 2 integrada: Game+Settlement no main.ts; __game v0.2 (gather/build/addbuilder/train/instant+getState estendido); TC inicial renderizado (screenshot fase2-economia.png).
- E2E 6/6 (boot, move, shift-queue, build-house, gather, train). Train usa expect.poll (timing rAF headless marginal).
- B-001 persiste (compositor headless; TC/unidades/minimapa OK).
- Próximo: Fase 3 (combate e defesas) + tag v2.

## Estado 2026-10-08 (Round 10)
- Fase 3 aberta: combat.ts (counters/dano/armadura), defenses.ts (muralhas/portões/torres/keep), warriors.ts (meshes militares) — 3 builders em paralelo. Integração de dano + ordens de ataque na próxima.

## Estado 2026-10-08 (Round 11)
- Redeploy prod: d199a6ad (main c/ Fase 2 integrada); https://throneward.pages.dev/ 200.
- Fase 3 builders (combat/defenses/warriors) em voo, nada landed ainda.

## Estado 2026-10-08 (Round 11)
- Fase 3 landed: combat (13t), defenses (13t), warriors (36t) → 202 unit em 14 arquivos, tsc 0, commit 28ddaad.
- Próximo: integrar dano no Game (attack orders, flechas das torres, morte), guerreiros na cena, e2e combate + tag v2.

## Decisões Fase 3 (do builder combat, aceitas)
- royalknight HP 250→190 (SPEC estágio I). Cerco sem armadura plana (resistência % não modelada — VERIFICAR). scout dmg 1 literal do SPEC (confirmar). `cavalry` só como chave de counter (tipos reais: scout/knight/royalknight).

## Estado 2026-10-08 (Round 12)
- Fase 3 integrada + tag v2: orderAttack/placeTower/placeWall no Game; torres disparam (damage×arrows); mortes limpam ordens/coleta; __game attack/spawn; e2e combate 8/8 (kill em ~7-13s, friendly recusado).
- 203 unit, tsc 0, commit 7f5f8ad.
- Dívida Fase 3: guerreiros ainda cápsulas na cena (warriorMesh pronto, falta trocar); muralhas sem render; ambos vão ao polimento/integração visual.
- Próximo: Fase 4 (idades, landmarks, tecnologias).

## Estado 2026-10-08 (Round 13)
- Fase 4 aberta: ages.ts (motor eras/landmarks), techs.ts (ferraria/universidade), civs/albion.ts (dados Albion) — 3 builders em paralelo.

## Estado 2026-10-08 (Round 14)
- Redeploy prod: d0108051 (v2 c/ combate); 200. Fase 4 builders em voo.

## Estado 2026-10-08 (Round 14b)
- Albion landed (12t; longbow range 7 pelo SPEC). techs.ts landed SEM teste (builder sem entrega final — cobrar teste ou escrever na integração). ages.ts pendente.
- 215 unit, tsc 0, commit 5253884.

## Estado 2026-10-08 (Round 15)
- Fase 4 landed: ages (15t, cumulativo, valida par da próxima idade, 0 builders=nulo), techs + meu teste (5t), Albion (12t) → 235 unit, tsc 0, commit d9b4ecd.
- Próximo: integrar idades/techs/Albion no Game + __game + e2e era + tag v4. Depois Fase 5 (Gallia).

## Estado 2026-10-08 (Round 16)
- Fase 4 integrada + tag v4: ages/techs/Albion no Game (gates, desconto fazenda, castleBonus, mults), __game advance/agebuilder/research, HUD idade segue era, e2e era II 9/9 (58s c/ 5 builders; rAF headless ~60%).
- 237 unit, tsc 0, commit 389cb7a.
- Próximo: Fase 5 (Gallia) + deploy v4.

## Estado 2026-10-08 (Round 17)
- Deploy v4: 87cd927c; prod 200. Fase 5 aberta (gallia.ts + teste, builder em voo).

## Estado 2026-10-08 (Round 18)
- Fase 5 + tag v5: Gallia (10t) integrada (ageChoices gallia, stable 1.2x c/ teste); charge do cavaleiro pendente (exige perseguição — Fase 7).
- main.ts segue civ genérica (landmarks Albion/Gallia custam além do stock inicial — e2e usa genéricos; tuning de economia depois).
- 249 unit, tsc 0. Próximo: Fase 6 (relíquias/sagrados/comércio/vitória).

## Estado 2026-10-08 (Round 19)
- Fase 6 aberta: relics.ts, sacred.ts, trade.ts (+vitória) — 3 builders em paralelo.

## Estado 2026-10-08 (Round 20)
- Deploy v5 em prod (Fase 6 builders em voo).

## Estado 2026-10-08 (Round 20b)
- Fase 6 landed: relics (9t), sacred (8t), trade (11t) → 277 unit, tsc 0.
- Incidente: race lead×builder em sacred.ts (builder reescreveu o arquivo após meu fix) — resolvido adotando a API final pública `capturers`. Lição: após mensagem de conclusão de builder, reinspecionar arquivos antes de editar.

## Estado 2026-10-08 (Round 21)
- CI VERDE (37848559647 e 37848949346: build+e2e success). E2E determinístico via hook `tick` (suite 11/11 em ~12s; antes 4min+flakes).
- E2E isolado: porta 5216 própria, reuseExistingServer:false, guarda de identidade Throneward+versão no boot.
- Tag v6. B-001 segue aberto. Próximo: Fase 7 (bots).

## Estado 2026-10-08 (Round 22)
- JOGÁVEL v0.4: menu (Iniciar/Como jogar) + boot por clique (?test=1 p/ e2e); seleção clique/caixa/duplo + grupos Ctrl+0-9; ordens botão direito (mover/atacar/coletar c/ shift); pan botão do meio; base inimiga passiva (TC+3 arqueiros+2 lanceiros); vitória aniquilação + banner.
- E2E 13/13 (menu 2 + mouse select/order), CI verde 37850364645. Deploy prod com menu.
- Falta p/ loop completo: paleta de construção/treino/era na UI (botões ainda placeholders), monges/comércio no jogo humano.

## Estado 2026-10-08 (Round 23)
- Loop jogável completo pela UI: construir (paleta+posicionamento), treinar (TC/quartel/arqueria), era (2 landmarks+auto-designar), prédios selecionáveis, Esc/botão direito cancela.
- E2E 14/14 (ui.spec: select→build→train→advance por mouse em 3.9s), CI verde 37851107579. Deploy prod.
- Próximo: Fase 7 (bots) + polimento (guerreiros na cena, muros render).

## Estado 2026-10-08 (Round 24)
- Fase 7 jogável: bot medium no inimigo (economia/build-order/eras/counters/ataque/defesa/sagrados), 3 dificuldades, hook tick espelha frame.
- E2E 15/15, unit 282/282, CI verde 37851779751. Deploy prod (inimigo vivo).
- Falta Fase 7 plena: bot vs bot com vencedor (exige ataque a prédios + landmarks com HP) + dificuldades easy/hard em jogo + menu skirmish (Fase 8).

## Estado 2026-10-08 (Round 25)
- Tag v7: bots ativos + cerco a prédios + landmarks físicos + eliminação/aniquilação no Game.
- E2E 17/17 (siege: TC destruído + landmark criado/destruído), unit 286/286, CI verde 37852830464. Deploy prod.
- Próximo: Fase 8 (menu skirmish + HUD completo) e polimento.

## Estado 2026-10-08 (Round 26)
- Fase 8 completa: skirmish (civ/0–3 bots/dificuldade/4 vitórias) + HUD lateral (ociosos/placar/objetivos/produção global).
- Caça ao flake do ui.spec: causa raiz = #hint comia cliques de posicionamento (pointer-events:none) + grade reconstruída a cada 15 frames (assinatura) + teste com retry inválido e asserts de estado (placeMode). E2E 19/19 (3x estável), unit 286, CI verde 37859411169. Deploy prod.
- Próximo: Fase 9 (áudio, 60fps/200u, polimento visual) + relatório final.

## Estado 2026-10-08 (Round 27)
- Fase 9 parcial: áudio procedural WebAudio (7 SFX + mute, headless-safe) + meshes cerco/universidade/maravilha/landmark (55t) + mute no HUD.
- Perf medido: sim 0.007ms/tick (200u); render fill-bound no SwiftShader (57fps@640, 36fps@1280 sem extras, 22fps c/ 200u) — folga enorme em GPU real; instancing mantido (cápsulas) por 60fps.
- 298 unit, CI verde 37859886183. Deploy prod.
- Falta: guerreiros na cena (dívida), B-001, relatório final Pronto.

## Estado 2026-10-08 (Round 28)
- Todas as vitórias cobertas e2e (sacred/wonder/annihilation/landmarks-destruição): 22/22 e2e, 299 unit, tag v8, CI verde 37861191664. Deploy prod.
- Bots cercam (oficina+aríetes), finalizam prédios, teto de aldeões por dificuldade, ram liberado era III, teto pop SPEC aplicado.
- Bot vs bot: vencedor em ~11min (landmarks), determinístico. Próximo: relatório final + polimento restante (guerreiros na cena, B-001).

## Estado 2026-10-08 (Round 29)
- Guerreiros procedurais na cena (templates por tipo+jogador, cloak tingido, raycast c/ fallback).
  FPS 37 c/ 215u (SwiftShader; sem regressão vs cápsulas). Seleção por raycast exigiu fix no teste (unidade da frente).
- E2E 22/22, unit 299 (23 arq), CI verde 37861701073. Deploy prod.
- Próximo: B-001 + relatório final Pronto.
