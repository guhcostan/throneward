# SPEC — Unidades e combate (Throneward, mecânicas espelhadas de AoE IV)

> Arte/nomes THRONEWARD são originais. Números e regras espelham Age of Empires IV.
> Fontes: Age of Empires Wiki (aoe4), aoe4world.com, patch notes oficiais (Season updates).
> Marcação `VERIFICAR` = confirmar em playtest/balanceamento. Nomes originais entre parênteses.

## 1. Triângulo de counters
- Lanceiro (Spearman) > Cavalaria (incl. Knight/Cavaleiro, Scout) — bônus pesado vs cavalaria.
- Cavalaria > Arqueiro (Archer/Longbow) — fecha distância, bonus vs infantaria leve à distância.
- Arqueiro > Lanceiro — kite à distância, lanceiro lento sem armadura ranged.
- Besta (Crossbowman) > infantaria pesada (Homem de armas/Men-at-Arms, Knight) — alto dano ranged vs armadura pesada.
- Homem de armas (Men-at-Arms) > infantaria leve (lanceiro, arqueiro no corpo a corpo) — armadura alta.
- Cerco: Mangonel > infantaria agrupada; Trabuco/Bombarda > prédios/navios; Aríete > prédios com infantaria dentro (tanky); Torre de cerco > muralhas (transporte).
- Monge cura e captura relíquias/sagrados; não luta. Batedor (Scout) explora, caça veados, carrega carcaça de ovelha VERIFICAR.

## 2. Tabela de unidades (Feudal–Imperial; valores base sem upgrade)

| Unidade (THR) | Idade | Custo F/M/O/P | HP | Atk | Armadura M/R | Alcance | Vel. | Treino | Prédio | Counter |
|---|---|---|---|---|---|---|---|---|---|---|
| Aldeão (Villager) | I | 50F | 50 | 6 melee | 0/0 | 0 | 1.18 t/s VERIFICAR | 20s | TC | — |
| Batedor (Scout) | I | 60F | 90 | 5 melee | 0/0 | 0 | 1.62 | 25s | Estábulo | arqueiros |
| Lanceiro | II | 60F 20M | 80 | 7 melee (+17 vs cavalaria VERIFICAR) | 0/0 | 0 | 1.19 | 15s | Quartel | >cavalaria, <arqueiro/MAA |
| Arqueiro | II | 30F 50M | 70 | 5 ranged | 0/0 | 5 | 1.25 | 15s | Arqueria | >lanceiro, <cavalaria |
| Arco Longo (Albion UU) | II | 30F 50M | 70 | 6 ranged | 0/0 | 6 (palissade stake VERIFICAR) | 1.25 | 15s | Arqueria | >lanceiro, <cavalaria |
| Besta | III | 80F 40O | 80 | 12 ranged (+9 vs pesada VERIFICAR) | 0/0 | 5 | 1.25 | 22s | Arqueria | >pesada, <cavalaria |
| Homem de armas | III | 100F 20O | 155 | 12 melee | 3/3 VERIFICAR | 0 | 1.05 | 22s | Quartel | >leve, <besta/mangonel |
| Cavaleiro | III | 140F 100O | 230 | 24 melee | 3/3 | 0 | 1.55 | 35s | Estábulo | >arqueiro, <lanceiro/besta |
| Cavaleiro Real (Gallia UU) | II–III | 140F 100O | 250 | 26 melee (charge bonus) | 4/4 | 0 | 1.62 | 35s | Estábulo/Escola de cavalaria | >arqueiro, <lanceiro/besta |
| Arqueiro a cavalo VERIFICAR | IV | 140F 100O | 180 | 14 ranged | 2/2 | 4.5 | 1.62 | 35s | Estábulo | harass, <lanceiro/besta |
| Arbaleteiro (Gallia UU) | III | 80F 40O | 80 | 13 ranged (+escudo frontal VERIFICAR) | 0/1+pavise | 5 | 1.25 | 22s | Arqueria | >pesada |
| Monge | III | 150O | 90 | — (cura 1 HP/s VERIFICAR, conversão n/a) | 0/0 | 4 cura | 1.12 | 30s | Mosteiro | — |
| Mercador (Trader) | II | 60M 60O? VERIFICAR (60F 60M em THR v0) | 90 | — | 0/0 | — | 1.2 | 20s | Mercado | — |
| Aríete (Ram) | III | 200M | 420 | 200 cerco vs prédio | 0/0? (tanky ranged armor alta) | 0 | 0.75 | 35s | Oficina | >prédios, <melee |
| Torre de cerco | III | 150M 150O? VERIFICAR | 450 | — (descarrega 8) | — | — | 0.75 | 40s | Oficina | >muralhas |
| Mangonel | III | 400M 200O? VERIFICAR (300M 200O em THR v0) | 240 | 12×3 projéteis área | 0/0 | 9 mín 3 | 0.75 | 45s | Oficina | >massa, <cavalaria |
| Trabuco | IV | 400M 400O? VERIFICAR | 250 | 200 vs prédio | — | 12 | 0.7 imóvel ao atirar | 60s | Oficina | >prédios/keep |
| Bombarda | IV | 600O? VERIFICAR (500M 500O em THR v0) | 260 | 160 cerco + dano área | — | 10 | 0.75 | 60s | Oficina/Fundição | >tudo terrestre, cara |
| Springald VERIFICAR | III | 250M 250O | 200 | 30 vs cerco | — | 10 | 0.75 | 40s | Oficina | >cerco |

Notas: valores exatos variam por patch; travar em `BALANCE.md` na Fase 3 com playtest. THR v0 usa os números acima.

## 3. Upgrades (Ferraria + Universidade)
- Ferraria melee: +1 atk / +1 armadura melee por idade (II/III/IV), custo crescente F+O.
- Ferraria ranged: +1 atk / +1 armadura ranged por idade.
- Universidade: balística, química (+dano pólvora/cerco), muralhas reforçadas, cura monge, etc. Detalhe em spec-buildings.
- Albion: arco longo com +alcance por idade VERIFICAR. Gallia: cavaleiro cura passiva / charge.

## 4. Fórmulas (THR v0, espelham original)
- Dano = max(1, (Atk + bônusCounter) − ArmaduraCorrespondente). Melee usa armadura M; ranged usa R.
- Cadência: ~1.5s infantaria, ~2s cavalaria charge, projétil com travel time.
- Kite manual supera auto-attack; ataque-mover para ao primeiro alvo no cone.
- Monge cura 1 HP/s em área, carrega relíquia (1 por vez, -velocidade VERIFICAR).
- Bônus de terreno: muralha de pedra +alcance/visão para ranged em cima; floresta furtiva esconde (não bloqueia projétil).

## 5. Fontes
- https://aoe4.fandom.com/wiki/Units — stats base
- https://aoe4world.com — winrates/counters
- Patch notes oficiais (worldsedge) — ajustes por season
