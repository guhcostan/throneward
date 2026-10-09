# PRONTO — auditoria de aceite (Throneward)

Atualizado: 2026-10-09. Unidade: 318 testes (24 arquivos). E2E: 33 testes (19 arquivos).
CI: build + e2e + e2e-prod (https://throneward.pages.dev). Tags: v1–v10.

## Escopo mínimo → evidência

1. **Menu skirmish** (civ, bots 0–3, dificuldade, vitórias): `e2e/skirmish.spec.ts` + `menu.spec.ts` (menu inicia, botões, 2 bots hard).
2. **2 civs assimétricas** (Albion/Gallia): `tests/albion.test.ts` (12), `tests/gallia.test.ts` (10), `game.test.ts` (Gallia/eras).
3. **Mapa 3D por seed** (relevo, florestas, ouro/pedra, ovelhas/cervos/javalis/frutas; fog; minimapa): `tests/terrain.test.ts`, `tests/world.test.ts`, `tests/fog.test.ts`, `e2e/fog.spec.ts`.
4. **Câmera 3D** (pan/zoom/rotate): `tests/camera.test.ts` (21).
5. **Seleção** (clique/caixa/duplo/grupos/shift): `tests/selection.test.ts` (15) + `e2e/menu.spec.ts` (mouse) + `e2e/selection.spec.ts`.
6. **Economia** (4 recursos, aldeões, fazendas, entrega, pop 200): `tests/resources.test.ts`, `tests/construction.test.ts`, `tests/game.test.ts`, `e2e/economy.spec.ts`.
7. **4 idades via landmark 1-de-2**: `tests/ages.test.ts` (15) + `e2e/ages.spec.ts` + `e2e/ui.spec.ts` (pela UI).
8. **Combate com counters/armadura/upgrades/cerco**: `tests/combat.test.ts` (15, baseline I + escala) + `e2e/combat.spec.ts` + `e2e/siege.spec.ts`.
9. **Defesas** (paliçada/pedra com render, portões, unidades no alto, torres, keep): `tests/defenses.test.ts` (13) + `e2e/walls.spec.ts` + `e2e/gates.spec.ts` + `e2e/walltop.spec.ts`.
10. **Furtivas/relíquias/monges/sagrados/comércio**: `tests/relics.test.ts`, `tests/sacred.test.ts`, `tests/trade.test.ts`, `e2e/relics.spec.ts`.
11. **Vitória** (landmarks/sagrados/maravilha/aniquilação): `e2e/victory.spec.ts` (3) + `e2e/siege.spec.ts` (landmark) + bot-vs-bot com vencedor (`tests/bot.test.ts`).
12. **HUD layout**: `e2e/boot.spec.ts` (identidade), `hud-live.png`, painel lateral (ociosos/placar/objetivos/produção).
13. **Bots** (build order, counters, 3 dificuldades, bot vs bot): `tests/bot.test.ts` (6) + `e2e/bot.spec.ts`.
14. **Determinismo**: `tests/sim.test.ts`, headless-sim, hashes iguais em bot.test.
15. **Áudio procedural + mute**: `tests/audio.test.ts`.

## Critérios Pronto
- [x] E2E contra produção (job e2e-prod verde).
- [x] Menu→vitória em cada condição (e2e) + bot vs bot com vencedor.
- [ ] 60fps/200u: medido só em SwiftShader (22–57fps); sim 0.007ms/tick. Sem GPU real — NÃO PASSA aqui.
- [x] CI verde na main (3 jobs).
- [x] Relatório: esta auditoria + docs/PROGRESS.md + docs/BALANCE.md + docs/SPEC.md.

## Dívidas abertas
B-001 (compositor headless, prova pixelada de origem ambiental); tuning contínuo de bots/dificuldades; conversão de monges (fora do mínimo).
