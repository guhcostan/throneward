# Crítica de balanceamento v11 — THRONEWARD (Gauntlet)

Escopo: `docs/SPEC.md`, `docs/BALANCE.md`, `docs/PROGRESS.md` (blocos r33–r60), `docs/spec-units.md` (§1, §3, §4, §5), `docs/spec-economy.md` (§2–§3, §7–§8), `src/sim/combat.ts`, `src/sim/sim.ts`, `src/sim/game.ts`, `src/sim/techs.ts`, `src/sim/resources.ts`, `src/sim/defenses.ts`, `src/sim/trade.ts`, `src/sim/ages.ts`, `src/sim/civs/gallia.ts`, `src/sim/civs/albion.ts`, `src/sim/bot.ts`, `src/main.ts`. Diff: `git log v9..HEAD`. Análise só por leitura; nenhum teste foi executado.

Severidade: **B** = bloqueante (muda resultado de batalha, economia ou ritmo) · **m** = menor (composição, UI, documentação, tempo de treino ou pesquisa).

Já corrigido desde a v9 (conferido no código, não repetido): cerco com HP do SPEC (`sim.ts` `UNIT_HP`), custo de mangonel/trabuco/bombarda (`TRAIN_COSTS`), lanceiro sem bônus vs cavaleiro/cavaleiro real (`COUNTER_BONUS`/`BONUS_BY_AGE`), techs +1 flat (`techs.ts`), Cantled Saddles ×10/3 (`game.ts`), velocidades de aldeão/monge/mercador/cavaleiro.

## Divergências

1. **[B] Muralhas e portões são indestrutíveis.** `placeWall` (`game.ts` ~L509) inicializa `hp`, mas nenhuma rotina reduz `w.hp`. O cerco (`game.ts` ~L841–873) só aceita `buildingId` vindo de `this.buildings` (`orderSiege`, L447). Efeito: paliçada (500 HP) e pedra (2000 HP) nunca caem. SPEC §1.4 dá "Muralha +300" para o aríete. *Correção:* aceitar `walls` em `orderSiege`/`siegeTargets` e aplicar dano em `w.hp`, removendo a muralha em `hp<=0`.

2. **[B] Ritmo Feudal: BALANCE diz ~4 min, a conta com ciclo a pé dá mais.** `BALANCE.md` ("Ritmo", r56) diz "Feudal aos ~4 min". Estimativa por leitura, com premissas: 8 aldeões (4 fruta / 2 madeira / 2 ouro), carga 10, vel. 1,125, taxas nominais, landmark Albion 300M/150O (`albion.ts` L36) + 90–120 s de obra. A 2 tiles de distância, o pagamento leva ~268 s (≈4,5 min) mais a obra (≈6,5 min total); a 8 tiles, ~428 s + obra (≈9 min). Nota: `e550a2b` dizia "~1 min"; o `4e19efc` a anulou. O PROGRESS r58 (Feudal 5 min) só bate com 2 tiles e sem contar a obra. O SPEC não fixa ritmo; o pedido "3–4 min" só fecha com distância curta e obra mínima. *Correção:* trocar o texto do BALANCE por "Feudal ~6–9 min com ciclo real" ou ajustar distância/taxas, e medir uma partida real antes de mexer nas taxas.

3. **[B] Resistência percentual do cerco ausente.** `combat.ts` `dealDamage` = `max(1, atk+bônus−armadura)`, e `UNIT_COMBAT` põe armadura 0 em mangonel, trabuco, bombarda e aríete. SPEC spec-units §1.4 dá resistência R 85% (mangonel), 80% (trabuco), 85% (bombarda), 95% (aríete); spec-units §5.4: "cerco ignora armadura comum e usa resistência %". Efeito: o aríete (370 HP) recebe dano integral de melee, quando deveria receber ~5%. *Correção:* para alvos de cerco, multiplicar o dano por (1 − resistência) em `attackTick`/`fighterOf`, ou marcar pendência em BALANCE.md.

4. **[B] Velocidade de cerco cai no padrão 1,2.** `sim.ts` L143: `UNIT_SPEED[u.type] ?? 1.2`, e `UNIT_SPEED` não tem mangonel, trebuchet, bombard nem ram. Resultado: cerco anda a 1,2 t/s. SPEC §1.4: mangonel 0,75, trabuco 0,625, bombarda 0,75, aríete 0,75; `BALANCE.md` diz 0,75/0,7/0,75/0,75. *Correção:* adicionar `mangonel: 0.75, trebuchet: 0.625, bombard: 0.75, ram: 0.75` em `UNIT_SPEED` e alinhar o 0,7 do BALANCE com 0,625.

5. **[B] Bônus de cerco vs prédio é um fator único (×5).** `game.ts` L112: `SIEGE_VS_BUILDING = 5` aplicado a todo cerco (`SIEGE_UNITS`), sem distinção por tipo. SPEC spec-units §1.4 dá bônus por classe: mangonel "Edifício +30", trabuco "Edifício +350", bombarda "Edifício +375", aríete "Muralha +300" (sem bônus de prédio explícito). Efeito: o mangonel faz 50 contra prédio (10×5) contra ~40 no SPEC (10+30); o trabuco faz 200 (40×5) contra ~390 (40+350). *Correção:* tabela de bônus por tipo e alvo (edifício/muralha) a partir de spec-units §1.4, substituindo o ×5.

6. **[m] Reparo de cerco (5 HP/s) não existe.** `game.ts` ~L864–873: reparo só para prédios, 25 HP/s (bate com spec-economy §3). spec-economy §3 dá 5 HP/s para "reparo de siege" (Season 2). Não há alvo para reparo de muralha (ver item 1). *Correção:* após o item 1, incluir muralha no reparo com 5 HP/s, ou marcar pendência em BALANCE.md.

7. **[m] Alcance mínimo do cerco ausente.** spec-units §1.4 dá mangonel mín. 3 e trabuco mín. 2,75; spec-units §5.3: "abaixo do mínimo a unidade não ataca". `inRange` (`combat.ts`) não tem mínimo. *Correção:* campo `minRange` em `UnitCombatStats` e checagem em `inRange`.

8. **[m] Cooldown compartilhado entre modos de ataque (suspeita).** `cooldowns` é um mapa por id de unidade (`game.ts` ~L145, 797, 853–858), usado por melee, distância e cerco. Como cada unidade tem um só modo, o efeito é pequeno; o risco é o cerco herdar `cdLeft` de um alvo anterior. *Correção:* documentar em BALANCE.md ou testar troca de alvo antes de mudar código.

9. **[m] Bônus do arqueiro vs batedor sem base no SPEC.** `combat.ts` `BONUS_BY_AGE.archer.scout = [4,5,7,8]`. SPEC §1.2 dá +5/+7/+8 do arqueiro só vs infantaria leve melee e de pólvora; batedor é cavalaria leve (spec-units §1.1). *Correção:* remover `scout` de `archer` (ou justificar em BALANCE.md).

10. **[m] Entrada morta de counter: `spearman.cavalry`.** `combat.ts` L13: `spearman: { ..., cavalry: 12 }` e `BONUS_BY_AGE` idem. Não existe tipo `cavalry` no sim (só `scout`, `knight`, `royalknight`). *Correção:* remover `cavalry` ou renomear para `scout`, se a intenção for o +10 de batedor.

11. **[m] Bombardeiro (`handcannoneer`) fora das listas de exército e ociosos.** `game.ts` `MILITARY_TYPES` (L104–110) e `IDLE_COMBAT` (L767), e `bot.ts` `MILITARY` (L30), não incluem `handcannoneer`. Efeito: não conta para o teto de exército nem reage na auto-defesa. *Correção:* incluir `handcannoneer` nas três listas.

12. **[m] Aríete do bot treina em 30 s; SPEC 35 s.** `bot.ts` L186: `{ unit: 'ram', building: 'siegeworkshop', time: 30 }`. spec-units §1.4: aríete 35 s. *Correção:* `time: 35`.

13. **[m] Besta fora da UI e tempo do bot arredondado.** `main.ts` TRAINABLE `archerrange` (L707–709) tem arqueiro, arco longo e bombardeiro, sem besta; `bot.ts` L~200 usa `crossbow` com `time: 22` (SPEC 22,5 s). *Correção:* adicionar `{ unit: 'crossbow', label: 'Besta', time: 22.5 }` em `main.ts`, e `22.5` no bot.

14. **[m] Tempo de tech tier I: 30 s vs SPEC 60 s.** `techs.ts` `TIERS` = 30/45/60 s. spec-units §3.1 dá 60 s para todos os tiers de dano e armadura (Bloomery, Fitted Leatherwork, Steeled Arrow, Iron Undermesh = 60 s). *Correção:* `TIERS` 60/60/60, ou documentar o desvio em BALANCE.md.

15. **[m] Muralha de pedra sem botão na UI.** `main.ts` `BUILDABLE` (L715) só tem `palisade`; a pedra só entra por comando (`placeWall(..., 'stone')`, L519). Custo P:5/tile existe em `WALL_DEFS`, mas não aparece para o jogador. *Correção:* adicionar botão "stone wall" com "P:5/tile".

## Pendências (VERIFICAR no SPEC, sem número para comparar — não contam como divergência)

- **Cura do monge:** 1 HP/s em 4 tiles (`game.ts` ~L811). SPEC §1.5 e spec-units §5.5 dão "VERIFICAR". Herbal Medicine (×1,6), Piety (+40 HP) e a Catedral (`civs/gallia.ts`: "cura unidades próximas fora de combate") não existem no sim. Registrar em BALANCE.md.
- **Custos de muro/portão:** paliçada M2/tile (`WALL_DEFS`, bate com a UI), pedra P5/tile. Portão usa o mesmo custo da muralha (`placeWall` com `gate`), sem custo próprio. spec-buildings não dá número. Registrar.
- **Caça 100/250/300 e taxas 0,9–1,0 (`main.ts` seed, `resources.ts`):** THR v0; spec-economy §2.2 está VERIFICAR para todas as fontes. Carga 25 bate com spec-economy §2.1.
- **Comércio:** `goldFor(d) = round(d × 0,15 × 10)`, viagem contada só na ida (`trade.ts`). O ×10 não está em BALANCE.md. SPEC §7 VERIFICAR.
- **Torres/outpost/keep** (`defenses.ts` L79–81), **landmarks** Albion/Gallia, **relíquia 0,5 ouro/s**, **sagrado** `CAPTURE_TIME 120` / `VICTORY_HOLD 600`, **maravilha** `WONDER_HOLD 600`: todos VERIFICAR, internamente consistentes.
- **Raio da auto-defesa** (`game.ts` ~L770–781: alcance+3 para distância, 4 para melee): decisão de jogo, não está no SPEC. Documentar em BALANCE.md.
- **Batedor:** d1, cd 2,0 s, treino 23 s e +10 vs batedor (`spearman.scout`) batem com spec-units §1.1; faltava a linha no BALANCE.md.

## Conferidos sem divergência

- HP/dano/alcance/cadência/M-R: aldeão (50/6/3,88), batedor (110/1/2,0), lanceiro (80/90/110/140; 7/8/9/11; 1,88), arqueiro (70/70/80/95; 5/5/7/8; alcance 5), arco longo (70/70/80/95; 6/6/8/9; alcance 7), besta (80/80/80/95; 11/11/11/14; alcance 5; 2,12), homem de armas (100/120/155/180; 8/10/12/14; M2/3→5/5; 1,38), cavaleiro (230/230/230/270; 24/24/24/29; M4→5; 1,5), cavaleiro real (190/230/270 II–IV; 19/19/24/29; M3→5; 1,5), monge (90), mercador (90), bombardeiro (130; 38; alcance 4; 2,12), aríete (370; 200; 5,12), trabuco (140; 40; alcance 16; 16,38), bombarda (210; 55; alcance 10; 6,38).
- Custos: aldeão F50; batedor F65; lanceiro F60 W20; arqueiro F30 W50; arco longo F40 W50; besta F80 G40; homem de armas F90 G20; cavaleiro e cavaleiro real F140 G100; monge G150; mercador W60 G60; aríete W200; mangonel W400 G200; trabuco W400 G150; bombarda W350 G500; bombardeiro F120 G120.
- Treino: aldeão 20 s, lanceiro 15 s, arqueiro/arco longo 15 s, batedor 23 s, mercador 30 s, monge 30 s, bombardeiro 35 s, cavaleiro 35 s.
- Techs: +1 flat por nível de dano/armadura (SPEC §3.1); custos melee F50/100/150 G125/250/350 e ranged W50/100/150 G125/250/350.
- Carga 10 (25 para caça); reparo de prédio 25 HP/s (spec-economy §3); pop 200, +10 por casa; Cantled Saddles +3 → +10.
- Velocidades: aldeão 1,125; batedor 1,625; lanceiro 1,25; arqueiro 1,25; arco longo/besta/homem de armas/monge 1,125; cavaleiro e cavaleiro real 1,625; mercador 1,0.
- Counters: lanceiro vs cavalaria +17/+20/+23/+28 (knight/royalknight removidos da regra de classe; `scout` +10; `cavalry` na entrada morta do item 10); arqueiro vs lanceiro +4/+5/+7/+8; arco longo vs lanceiro +6/+6/+8/+9; besta vs homem de armas e cavaleiro +10/+10/+10/+12.
- Mangonel: dano 10, cd 7,88 s, alcance 8 — SPEC dá 10 em rajada de 3 (não modelado; cobrir no item 5 ou 7).

## Resumo

- **Divergências: 15** — **5 bloqueantes (B)**: itens 1 (muralhas indestrutíveis), 2 (ritmo Feudal), 3 (resistência % do cerco), 4 (velocidade do cerco 1,2), 5 (bônus de cerco vs prédio por tipo). **10 menores (m)**: itens 6–15.
- Maior impacto: cerco sem alvo válido (1), cerco sem resistência nem velocidade corretas (3, 4) e bônus de prédio sem tipo (5). Juntos, esses quatro mudam o resultado de qualquer ataque de cerco.
- Ritmo (2) depende de premissas de distância e obra; é estimativa por leitura e precisa de medição antes de mexer nas taxas.

Nenhum código ou teste foi alterado. Este arquivo é o único escrito.
