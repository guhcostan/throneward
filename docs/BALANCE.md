# BALANCE — Throneward (auditoria contínua contra docs/SPEC.md)

Legenda: [V] = igual ao SPEC verificado · [V-SPEC] = segue o SPEC (fonte aoe4world/data, patch a confirmar) · `VERIFICAR` = palpite THR v0.

## Unidades (base = estágio I salvo indicação)
| Unidade | HP | Dano | Alcance | Armadura M/R | Vel. | Treino | Custo | Status |
|---|---|---|---|---|---|---|---|---|
| Aldeão | 50 | 6 | 0 | 0/0 | 1.12 | 20s | 50F | [V] |
| Batedor | 110 | 1 | 0 | 0/0 | 1.625 | 23s | 65F | [V-SPEC] (era 90/1.62/60) |
| Lanceiro | 80 | 7 (+17 cav) | 0 | 0/0 | 1.25 | 15s | 60F/20M | [V-SPEC] |
| Arqueiro | 70 | 5 | 5 | 0/0 | 1.25 | 15s | 30F/50M | [V-SPEC] |
| Arco longo | 70 | 6 | 7 | 0/0 | 1.25 | 15s | 30F/50M | [V-SPEC] |
| Besta | 80 | 11 (+9 pes) | 5 | 0/0 | 1.25 | 22s | 80F/40O | [V-SPEC] |
| Homem de armas | 100/120/155/180 (I–IV) | 8→14 | 0 | 2/3→5/5 | 1.125 | 15–20s | 90F/20O | [V-SPEC] HP/era; dano/armadura por era VERIFICAR |
| Cavaleiro | 230 | 24 | 0 | 3/3–4/4 | 1.55 | 35s | 140F/100O | [V-SPEC]; escala por era VERIFICAR |
| Cavaleiro real | 190/230/270 (II–IV) | 19→29 | 0 | 3/3→5/5 | 1.625 | 35s | 140F/100O | [V-SPEC] HP/era; dano/armadura/carga VERIFICAR |
| Monge | 90 | — (cura ?) | 4 | 0/0 | 1.12 | 30s | 150O | cura VERIFICAR |
| Mercador | 90 | — | — | 0/0 | 1.2 | 20s | 60M/60O | VERIFICAR |
| Aríete | 370 | 200 (×5 prédios) | 0 | 0/0 | 0.75 | 35s | 200M | [V-SPEC]; resistência % VERIFICAR |
| Mangonel | 240 | 12×3 área | 9 (mín 3) | 0/0 | 0.75 | 45s | 300M/200O | VERIFICAR |
| Trabuco | 250 | 200 prédios | 12 | — | 0.7 | 60s | 400M/400O | VERIFICAR |
| Bombarda | 260 | 160 | 10 | — | 0.75 | 60s | 500M/500O | VERIFICAR |

Fórmula de dano: `max(1, atk + bônus − armadura)` — percentual do original em aberto.

## Economia
Carga 10 (25 caça) [V]; taxas: fruta 0.69 [V changelog], fazenda 0.75, madeira 0.7, ouro 0.7, pedra 0.65, caça 0.9–1.0 (VERIFICAR); techs +10/+15% [V]; relíquia 0.5 ouro/s VERIFICAR; comércio 0.15/tile VERIFICAR.

## Construção e eras
Fórmula (N+2)/3 [V]; pop 10 +10/casa até 200 [V]; landmark por escolha 1-de-2 [V]; custos de landmark Albion/Gallia VERIFICAR; maravilhas/tempos VERIFICAR.

## Vitória
Sagrados: 3 locais, captura 120s, hold 600s (VERIFICAR); maravilha hold 600s (VERIFICAR); aniquilação e landmarks implementados.
