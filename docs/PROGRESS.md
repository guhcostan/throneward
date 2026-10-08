# PROGRESS — Throneward

## Fase atual
Fase 1 — Terreno/câmera/seleção/pathfinding (rodada 1/5, builders em paralelo)
- terreno: `src/sim/terrain.ts` + `tests/terrain.test.ts`
- pathfinding: `src/sim/pathfind.ts` + `tests/pathfind.test.ts`
- câmera: `src/render/camera.ts` + `tests/camera.test.ts`
- seleção: `src/sim/selection.ts` + `tests/selection.test.ts`
Modelo fixo: opencodex/Merge/anthropic-claude-haiku-5-5. LANDED em 2c0794c: terreno (7t), pathfind (10t), seleção (15t), sim (1t) = 33 testes, tsc 0.
Pendente Fase 1: tests/camera.test.ts DONE (35dd027, builder, 10t — adotada versão do builder, convenção sin/cos documentada no arquivo) → 43/43 testes, tsc 0.
Em paralelo: world render (src/render/world.ts) + e2e seleção/movimento → próxima rodada, depois integração main.ts + críticos.

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
