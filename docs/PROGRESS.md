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
