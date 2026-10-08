# PROGRESS — Throneward

## Fase atual
Fase 0 — Pesquisa e SPEC (rodada 1/5)

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
