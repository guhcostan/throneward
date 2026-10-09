# Crítica de balanceamento v9 — THRONEWARD (Gauntlet)

Escopo: `docs/SPEC.md`, `docs/BALANCE.md`, `docs/spec-units.md` (§1.2–1.3, §3, §5), `src/sim/combat.ts`, `src/sim/sim.ts`, `src/sim/game.ts`, `src/sim/techs.ts`, `src/sim/civs/gallia.ts`, `src/sim/ages.ts`, `src/main.ts` (grade de treino). Diff desde v8: `git log v8..HEAD`.

Severidade: **B** = bloqueante (muda resultado de batalha/economia) · **m** = menor (cosmético / UI / documentação).

## Divergências

1. **[B] Cerco nasce com 100 HP, não com o HP do SPEC.** `sim.ts` `UNIT_HP` não contém `mangonel`, `trebuchet`, `bombard`, `ram`; `spawnUnit` usa `UNIT_HP[type] ?? 100` e `hpForAge` não cobre cerco. SPEC §1.4: mangonel 130, trabuco 140, bombarda 210, aríete 370. `UNIT_COMBAT` tem os valores certos, mas `spawnUnit` nunca os lê.
   Correção: incluir em `UNIT_HP` (sim.ts) `mangonel:130, trebuchet:140, bombard:210, ram:370`, ou derivar de `UNIT_COMBAT[type].hp`.

2. **[B*] Cavaleiro (Knight) recebe bônus de counter de lanceiro.** *Ambiguidade no SPEC: §1.2 diz lanceiro +17..+28 vs "cavalaria", e §1.3 diz Cavaleiro "sem bônus de classe". Decidir a regra antes de corrigir.* `COUNTER_BONUS.spearman.knight = 17` e `BONUS_BY_AGE.spearman.knight = [17,20,23,28]`. SPEC §1.3, Cavaleiro (Knight): "Sem bônus de classe". O bônus de lanceiro vale para cavalaria leve (`cavalry`), não para o cavaleiro (Knight).
   Correção: remover `knight` de `COUNTER_BONUS.spearman` e de `BONUS_BY_AGE.spearman`. Manter `royalknight` só se o SPEC §1.3 (Cavaleiro real) der bônus de classe (não dá: a linha cita só carga). Ver item 3.

3. **[B] Cavaleiro real recebe +17..+28 de lanceiro (`royalknight`).** `COUNTER_BONUS.spearman.royalknight = 17`. SPEC §1.3 (Cavaleiro real) lista só carga, não bônus de counter de lanceiro. Mesmo problema do item 2.
   Correção: remover `royalknight` de `spearman` em `COUNTER_BONUS` e `BONUS_BY_AGE`.

4. **[B] Técnicas de dano/armadura são multiplicativas (×1,1), SPEC é aditivo (+1).** `techs.ts` usa `mult: 1.1` (`tierLine(..., 1.1)`) para melee/ranged atk e armor. SPEC §3.1: "+1 dano melee/distância", "+1 armadura melee/distância". Em dano baixo (ex.: arqueiro 5), ×1,1 dá +0,5, o SPEC dá +1; a diferença muda o resultado de batalha.
   Correção: trocar a aplicação para soma fixa de +1 por tech (ou documentar explicitamente o desvio em BALANCE.md).

5. **[B] Carga do cavaleiro real é fixa (+3), SPEC escala.** `KNIGHT_CHARGE_BONUS = 3` (gallia.ts) aplicado em `game.ts` (~L617). SPEC §1.3: "+3 → +10 com Cantled Saddles, idade 3". O código não tem a tech nem o escalonamento.
   Correção: tornar o bônus dependente da idade (3 na II, 10 com Cantled Saddles na III) ou documentar como pendência em BALANCE.md (hoje está como "VERIFICAR").

6. **[m] Velocidade do mercador: 1,2 vs SPEC 1,0.** `sim.ts` `UNIT_SPEED.trader = 1.2`; SPEC §1.5 Mercador: Vel. 1,0. Não afeta a rota econômica (`trade.ts` usa `tripTime`, não `UNIT_SPEED`); impacto só no movimento visual/deslocamento.
   Correção: `trader: 1.0`.

7. **[m] Velocidade do aldeão 1,12 vs SPEC 1,125.** `UNIT_SPEED.villager = 1.12`; SPEC §1.1 Vel. 1,125. Diferença de 0,005 tiles/s.
   Correção: `villager: 1.125`.

8. **[m] Velocidade do monge 1,12 vs SPEC 1,125.** `UNIT_SPEED.monk = 1.12`; SPEC §1.5 Vel. 1,125.
   Correção: `monk: 1.125`.

9. **[m] Treino do batedor na UI é 25 s; SPEC é 23 s (ing.) / 21 s (fr.).** `main.ts` `TRAINABLE.stable` usa `time: 25`.
   Correção: `time: 23` (ou `21` se a civ for Gallia).

12. **[m] `UNIT_COMBAT.trebuchet` / `bombard` / `ram` — armadura/resistência não modelada.** SPEC §1.4 dá resistência percentual (80/85/95%). O código usa armadura 0 (documentado como VERIFICAR). Não é divergência de número direto, mas o alvo "dano com resistência" está ausente.
   Correção: documentar em BALANCE.md (já está como VERIFICAR).

## Conferidos sem divergência (números batem com SPEC)

- Lanceiro HP 80/90/110/140, dano 7/8/9/11, cd 1,88, M/R 0 (`HP_BY_AGE`, `STATS_BY_AGE`, `UNIT_COMBAT`).
- Arqueiro HP 70/70/80/95, dano 5/5/7/8, alcance 5, bônus vs lanceiro 4/5/7/8 (SPEC §1.2: +5/+7/+8 vs infantaria leve; I=4 é valor de base de tabela, não contraditório).
- Arco longo HP 70/70/80/95, dano 6/6/8/9, alcance 7, bônus 6/6/8/9.
- Besta HP 80/80/80/95, dano 11/11/11/14, bônus vs homem de armas e cavaleiro 10/10/10/12.
- Homem de armas HP 100/120/155/180, dano 8/10/12/14, armadura M 2/3/4/5, R 3/3/4/5 (SPEC I–IV). **Sem bônus de classe** (correto).
- Cavaleiro HP 230/230/230/270, dano 24/24/24/29, M/R 4/4/4/5 (SPEC III/IV batem).
- Cavaleiro real HP 190/190/230/270, dano 19/19/24/29, M/R 3/3/4/5 (SPEC II–IV batem).
- Batedor HP 110, vel 1,625, dano 1, cd 2,0 (SPEC §1.1 OK).
- Velocidade lanceiro 1,25, arqueiro 1,25, arco longo/besta/homem de armas 1,125, cavaleiro 1,625 (SPEC OK).
- Custos: lanceiro F60 W20; arqueiro F30 W50; arco longo F40 W50; besta F80 G40; homem de armas F90 G20; cavaleiro F140 G100; cavaleiro real F140 G100; monge G150; mercador W60 G60; aríete W200; batedor F65; aldeão F50 (todos batem com SPEC §1.1–1.5, exceto a divergência de lanceiro/arco longo indicada abaixo).
- Monge HP 90 (`UNIT_HP`, SPEC OK).

## Custos (checados contra SPEC)

14. **[B] Mangonel/trabuco/bombarda/aríete custos.** `TRAIN_COSTS` só tem `ram: { wood: 200 }`. SPEC §1.4: mangonel W400 G200; trabuco W400 G150; bombarda W350 G500. Não há entrada para mangonel/trebuchet/bombard, então `cost` é `undefined`, `spendStock` nunca é chamado (game.ts `trainUnit`) e o cerco sai de graça. BALANCE.md diz trabuco 400M/400O; SPEC §1.4 diz W400 G150 — usar o SPEC.
    Correção: adicionar `mangonel: { wood: 400, gold: 200 }`, `trebuchet: { wood: 400, gold: 150 }`, `bombard: { wood: 350, gold: 500 }` (na pesquisa spec-units §1.4 o trabuco custa W400 G150; o BALANCE.md diz 400M/400O, divergindo do SPEC).
    **Severidade: B** (economia).

## Resumo

- **Divergências: 11** (itens 1–9, 12 e 14).
- **Bloqueantes (B): 6** — itens 1, 2 (B*, ambíguo), 3, 4, 5, 14.
- **Menores (m): 5** — itens 6, 7, 8, 9, 12.
- Maior impacto: cerco sem HP correto e sem custo (1, 14); bônus de lanceiro vs cavaleiro/cavaleiro real (2, 3); técnicas ×1,1 em vez de +1 (4).

Nenhum teste ou código foi alterado.
