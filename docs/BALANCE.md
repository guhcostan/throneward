# BALANCE — Throneward (auditoria contínua contra docs/SPEC.md)

Legenda: [V] = igual ao SPEC verificado · [V-SPEC] = segue o SPEC (fonte aoe4world/data, patch a confirmar) · `VERIFICAR` = palpite THR v0.

Escala por idade implementada (dano/armadura/HP/bônus via STATS_BY_AGE/BONUS_BY_AGE/HP_BY_AGE; Fighter.age; linha de base I preservada nos testes).

## Unidades (base = estágio I salvo indicação)
| Unidade | HP | Dano | Alcance | Armadura M/R | Vel. | Treino | Custo | Status |
|---|---|---|---|---|---|---|---|---|
| Aldeão | 50 | 6 | 0 | 0/0 | 1.12 | 20s | 50F | [V] |
| Batedor | 110 | 1 | 0 | 0/0 | 1.625 | 23s | 65F | [V-SPEC] (era 90/1.62/60) |
| Lanceiro | 80/90/110/140 | 7/8/9/11 (+17/20/23/28 cav) | 0 | 0/0 | 1.25 | 15s | 60F/20M | [V-SPEC] |
| Arqueiro | 70/70/80/95 | 5/5/7/8 (+5/7/8 leve) | 5 | 0/0 | 1.25 | 15s | 30F/50M | [V-SPEC] |
| Arco longo | 70/70/80/95 | 6/6/8/9 (+6/8/9) | 7 | 0/0 | 1.125 | 15s | 40F/50M | [V-SPEC] |
| Besta | 80/80/80/95 | 11/11/11/14 (+10/12 pes) | 5 | 0/0 | 1.125 | 22s | 80F/40O | [V-SPEC] |
| Homem de armas | 100/120/155/180 (I–IV) | 8/10/12/14 | 0 | 2/3→5/5 | 1.125 | 15–20s | 90F/20O | [V-SPEC] |
| Cavaleiro | 230/230/230/270 | 24/24/24/29 (sem bônus) | 0 | 4/4→5/5 | 1.625 | 35s | 140F/100O | [V-SPEC] |
| Cavaleiro real | 190/230/270 (II–IV) | 19/19/24/29 | 0 | 3/3→5/5 | 1.625 | 35s | 140F/100O | [V-SPEC]; carga VERIFICAR |
| Monge | 90 | — (cura ?) | 4 | 0/0 | 1.125 | 30s | 150O | cura VERIFICAR |
| Mercador | 90 | — | — | 0/0 | 1.0 | 30s | 60M/60O | [V-SPEC] |
| Bombardeiro | 130 | 38 | 4 | 0/0 | 1.125 | 35s | 120F/120O | [V-SPEC] |
| Aríete | 370 | 200 (×5 prédios) | 0 | 0/0 | 0.75 | 35s | 200M | [V-SPEC]; resistência % VERIFICAR |
| Mangonel | 240 | 12×3 área | 9 (mín 3) | 0/0 | 0.75 | 45s | 400M/200O | [V-SPEC]; resto VERIFICAR |
| Trabuco | 250 | 200 prédios | 12 | — | 0.7 | 60s | 400M/150O | [V-SPEC]; resto VERIFICAR |
| Bombarda | 260 | 160 | 10 | — | 0.75 | 60s | 350M/500O | [V-SPEC]; resto VERIFICAR |

Fórmula de dano: `max(1, atk + bônus − armadura)` — percentual do original em aberto.
Techs militares: +1 fixo por nível (SPEC §3.1); coleta e cerco em %; carga +3, ×(10/3) com Cantled Saddles.

## Decisões de regra
- Lanceiro > cavaleiro/cavaleiro real MANTIDO (§1.2 "vs cavalaria" + triângulo mandatório vencem a leitura "sem bônus de classe" do §1.3, que vale para o cavaleiro em si).

## Economia
Carga 10 (25 caça) [V]; taxas: fruta 0.69 [V changelog], fazenda 0.75, madeira 0.7, ouro 0.7, pedra 0.65, caça 0.9–1.0 (VERIFICAR); techs +10/+15% [V]; relíquia 0.5 ouro/s VERIFICAR; comércio 0.15/tile VERIFICAR.

## Ritmo (medido 2026-10-09, atualizado r56)
Ciclo de coleta real (anda ao nó, acumula, anda à entrega, descarrega) — taxas nominais valem sem compensação. Feudal aos ~4 min, compatível com o gênero.

## Construção e eras
Fórmula (N+2)/3 [V]; pop 10 +10/casa até 200 [V]; landmark por escolha 1-de-2 [V]; custos de landmark Albion/Gallia VERIFICAR; maravilhas/tempos VERIFICAR.

## Vitória
Sagrados: 3 locais, captura 120s, hold 600s (VERIFICAR); maravilha hold 600s (VERIFICAR); aniquilação e landmarks implementados.
