# THRONEWARD — Spec de Unidades e Combate (Fase 0)

> Pesquisa de referência. Contém **apenas números e mecânicas** (análogo ao Age of Empires IV). Nenhum texto, imagem ou áudio do original foi copiado. Nomes e arte serão originais no THRONEWARD.
>
> **Fonte dos números:** repositório `aoe4world/data` (dados parseados dos arquivos do jogo, ver seção 8). Wikis Fandom e Liquipedia retornaram bloqueio (HTTP 403) e a busca web falhou (HTTP 429/403), então a base são os dados do repositório. Pontos sem confirmação estão marcados `VERIFICAR`.

**Convenções**
- Custos: **F** comida, **W** madeira, **G** ouro, **S** pedra. **T** = tempo de treino (s). **Pop** = população ocupada.
- Armadura: **M** melee, **R** à distância (pontos de armadura).
- **Cadência** = ciclo completo de ataque (aim + windup + attack + winddown + reload + cooldown), em segundos.
- **Alcance** em unidades do jogo (mín–máx). **Vel.** = `movement.speed` do dado.
- Idades: 1 Dark, 2 Feudal, 3 Castelo, 4 Imperial.
- Valores por civilização estão indicados quando diferem.

---

## 1. Unidades genéricas por idade

### 1.1 Trabalhadores e batedores

| Unidade | Idade | Custo | HP | Ataque | Cadência | Arm M/R | Alcance | Vel. | Treino | Prédio | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Aldeão (ing.) | 1 | F50 | 50 | Faca melee d6 | 3,88 s | 0/0 | 0–0,29 | 1,125 | 20 s | Centro urbano / Vila | Coleta, constrói e repara. Tocha d10 (alcance 1) |
| Aldeão (fr.) | 1 | F50 | 50 | Faca melee d6 | 3,88 s | 0/0 | 0–0,29 | 1,125 | 19 s | Centro urbano | Mesmo perfil; treino mais rápido |
| Batedor (ing.) | 1 | F65 | 110 | Espada curta d1 | 2,0 s | 0/0 | 0–0,29 | 1,625 | 23 s | Centro urbano / Estábulo | +10 melee vs batedor e cerco |
| Batedor (fr.) | 1 | F65 | 110 | Machado d1 | 2,0 s | 0/0 | 0–0,29 | 1,625 | 21 s | Centro urbano / Estábulo | +10 melee vs batedor e cerco |

### 1.2 Infantaria

| Unidade | Idade | Custo | HP | Ataque | Cadência | Arm M/R | Alcance | Vel. | Treino | Prédio | Bônus de counter |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Lanceiro** (Spearman) | 1 (fr.) / 2 (ing.) | F60 W20 | 80 / 90 / 110 / 140 (I/II/III/IV) | Lança melee d7 / d8 / d9 / d11 | 1,88 s | 0/0 | 0–0,29 | 1,25 (IV: 1,30) | 15 s | Quartel | **+17 / +20 / +23 / +28 vs cavalaria**; +3..+6 vs guerra/elefante; +20..+34 vs trabalhador/elefante |
| **Homem de armas** (Man-at-Arms) | 1 (ing.) / 3 (fr.) | F90 G20 | 100 / 120 / 155 / 180 (I–IV) | Espada melee d8 / d10 / d12 / d14 | 1,38 s | M 2/3 → 3/3 → 4/4 → 5/5 (ing.) | 0–0,30 | 1,125 | 14,65 s (ing.) / 20,5 s (fr.) | Quartel / Castelo | Sem bônus contra classes; **vs cavaleiro, lanceiro, besta: fraco** (pela descrição) |
| **Arqueiro** (Archer, fr.) | 2 | F30 W50 | 70 / 80 / 95 (II/III/IV) | Arco d5 / d7 / d8 | 1,62 s | 0/0 | 0–5 | 1,25 | 15 s | Campo de tiro | **+5 / +7 / +8 vs infantaria leve melee e de pólvora** |
| **Arco longo** (Longbowman, ing.) | 2 | F40 W50 | 70 / 80 / 95 (II/III/IV) | Arco longo d6 / d8 / d9 | 1,62 s | 0/0 | 0–7 | 1,125 | 15 s | Campo de tiro / Castelo | **+6 / +8 / +9 vs infantaria leve melee e de pólvora**; alcance 7 (vs 5) |
| **Besta** (Crossbowman, ing.) | 3 | F80 G40 | 80 (III) / 95 (IV) | Besta d11 / d14 | 2,12 s | 0/0 | 0–5 | 1,125 | 22,5 s | Campo de tiro / Castelo | **+10 / +12 vs pesada** |
| **Arbaletrier** (fr., única) | 3 | F80 G40 | 80 (III) / 95 (IV) | Besta d11 / d14 | 2,12 s | M 1 (III) / 2 (IV); R 0 | 0–5 | 1,125 | 22,5 s | Campo de tiro | **+10 / +12 vs pesada**; armadura melee própria |

### 1.3 Cavalaria

| Unidade | Idade | Custo | HP | Ataque | Cadência | Arm M/R | Alcance | Vel. | Treino | Prédio | Bônus de counter |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Cavaleiro leve** (Horseman) | 2 | F100 W20 | 125 / 155 / 180 (II/III/IV) | Lança melee d9 / d11 / d13 | 1,75 s | M 0 / R 2 → 3 → 5 | 0–0,375 | 1,875 | 22,5 s | Estábulo / Castelo / Torre branca | **+9 / +11 / +13 vs à distância e vs cerco** |
| **Cavaleiro** (Knight, ing.) | 3 | F140 G100 | 230 / 270 (III/IV) | Espada melee d24 / d29 | 1,5 s | 4/4 → 5/5 | 0–0,29 | 1,625 | 35 s | Estábulo / Castelo | Sem bônus de classe; fraco vs lanceiro e besta (pela descrição) |
| **Cavaleiro real** (Royal Knight, fr.) | 2 | F140 G100 | 190 / 230 / 270 (II/III/IV) | Espada melee d19 / d24 / d29 | 1,5 s | M3/R3 → 4/4 → 5/5 | 0–0,29 | 1,625 | 35 s | Escola de cavalaria / Estábulo | Carga: bônus de dano (+3 → +10 com *Cantled Saddles*, idade 3) |
| **Arqueiro a cavalo** (Horse Archer) | 3 | — (by) / F80 W40 (ru) | 85 / 100 (III/IV) | Arco d10 / d12 | 1,75 s | 0/0 | 0–4,5 | 1,625 | 22,5 s (ru) / 60 s (by) | Estábulo | Não existe em ing./fr.; **referência** bizantina/russa |
| **Lanceiro** (Lancer, ab/ch/de/ot/tug/zx) | 3 | F140 G100 | 230 / 270 (III/IV) | Espada d24 / d29 | 1,5 s | 4/4 → 5/5 | 0–0,29 | 1,625 | 35 s | Estábulo | Não existe em ing./fr.; **referência** |

### 1.4 Cerco

| Unidade | Idade | Custo | HP | Ataque | Cadência | Resist. R | Alcance | Vel. | Treino | Pop | Prédio | Bônus de dano |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Mangonel** (ing./fr.) | 3 | W400 G200 | 130 | Catapulta d10 em rajada de 3; incendiário d2 ×10 | 7,88 s | 85% | 3–8 (Adjustable Crossbars: 3–9) | 0,75 | 40 s | 3 | Castelo / Oficina de cerco | Edifício +30; naval/unidade +30; à distância +10 |
| **Trabuco** (Counterweight Trebuchet, ing./fr.) | 3 | W400 G150 | 140 | Trabuco d40 | 16,38 s | 80% | 2,75–16 | 0,625 | 30 s | 2 | Castelo / Oficina de cerco | Edifício +350; unidade +200 (VERIFICAR) |
| **Bombarda** (Bombard, ing.) | 4 | W350 G500 | 210 | Canhão d55 | 6,38 s | 85% | 3,75–10 | 0,75 | 45 s | 3 | Castelo / Oficina de cerco | Naval/unidade +410; edifício +375; infantaria +50 |
| **Aríete** (Battering Ram, ing./fr.) | 2 | W200 | 370 | Aríete d200 | 5,12 s | 95% | 0–0,54 | 0,75 | 35 s | 1 | Castelo / Oficina de cerco | Muralha +300 |
| **Torre de cerco** (Siege Tower, ing./fr.) | 2 | W125 | 480 | Transporte (sem ataque) | — | 95% | — | 0,81 | 30 s | 1 | Castelo / Oficina de cerco | Transporta tropas até a muralha |
| **Springald** (ing./fr.) | 3 | W150 G100 | 85 | Balista d15, cad. 3,38 s | 3,38 s | 55% (armadura M 3) | 0–7,5 | 0,875 | 20 s | 2 | Castelo / Oficina de cerco | Infantaria +12; naval/unidade +65 |
| **Ribauldequin** (ing./fr.) | 4 | W350 G500 | 215 | Rajada d42 ×12 | 5,75 s | 35% (armadura M 10) | 0–3,75 | 0,875 | 45 s | 3 | Castelo / Oficina de cerco | — |
| **Bombardeiro de mão** (Handcannoneer, ing./fr.) | 4 | F120 G120 | 130 | Arma de mão d38 | 2,12 s | 0/0 | 0–4 | 1,125 | 35 s | 1 | Campo de tiro / Castelo | Pólvora |

### 1.5 Religiosos e mercadores

| Unidade | Idade | Custo | HP | Ataque | Arm M/R | Alcance | Vel. | Treino | Prédio | Notas |
|---|---|---|---|---|---|---|---|---|---|---|
| **Monge** (Monk, ing./fr.) | 3 | G150 | 90 | Nenhum | 0/0 | — | 1,125 | 30 s | Mosteiro | Cura aliados (taxa **VERIFICAR**). Converte inimigos, pega relíquias. Pop 1 |
| **Mercador** (Trader, ing./fr.) | 2 | W60 G60 | 90 | Nenhum | 0/0 | — | 1,0 | 30 s | Mercado | Rota de comércio |

---

## 2. Unidades únicas

| Civ | Unidade | Base | Idade | Diferença principal |
|---|---|---|---|---|
| Inglaterra | Arco longo | Arqueiro | 2–4 | Alcance 7 (vs 5); +6..+9 vs leve; constrói *palings* (VERIFICAR) |
| França | Arbaletrier | Besta | 3–4 | Armadura melee M1/M2 (vs M0) |
| França | Cavaleiro real | Cavaleiro | 2–4 | HP 190/230/270 (vs 230/270); M3/R3 → M5/R5; carga |

> Outras únicas (Janízaro, Samurai, Gilded, etc.) ficam para a próxima revisão (`VERIFICAR`).

---

## 3. Upgrades de ferraria e universidade (combate)

### 3.1 Dano e armadura (todas as unidades não-cerco)

| Tech | Idade | Efeito | Custo | Tempo | Prédio |
|---|---|---|---|---|---|
| Bloomery | 2 | +1 dano melee | F50 G125 | 60 s | Ferraria |
| Decarbonization | 3 | +1 dano melee | F100 G250 | 60 s | Ferraria |
| Damascus Steel | 4 | +1 dano melee | F150 G350 | 60 s | Ferraria |
| Fitted Leatherwork | 2 | +1 armadura melee | F50 G125 | 60 s | Ferraria |
| Insulated Helm | 3 | +1 armadura melee | F100 G250 | 60 s | Ferraria |
| Master Smiths | 4 | +1 armadura melee | F150 G350 | 60 s | Ferraria |
| Steeled Arrow | 2 | +1 dano à distância | W50 G125 | 60 s | Ferraria |
| Balanced Projectiles | 3 | +1 dano à distância | W100 G250 | 60 s | Ferraria |
| Platecutter Point | 4 | +1 dano à distância | W150 G350 | 60 s | Ferraria |
| Iron Undermesh | 2 | +1 armadura à distância | W50 G125 | 60 s | Ferraria |
| Wedge Rivets | 3 | +1 armadura à distância | W100 G250 | 60 s | Ferraria |
| Angled Surfaces | 4 | +1 armadura à distância | W150 G350 | 60 s | Ferraria |

### 3.2 Upgrades específicos

| Tech | Idade | Efeito | Custo | Tempo | Prédio |
|---|---|---|---|---|---|
| Billmen | 2 | Lanceiros reduzem armadura inimiga em −1 ao atacar | W175 G100 | 25 s | Ferraria |
| Armor-clad | 3 | Homem de armas: +2 melee e +2 à distância | F150 G350 | 60 s | Ferraria |
| Gambesons | 3 | Arbaletrier: +5 armadura melee | W100 G250 | 45 s | Ferraria |
| Padded Jack | 4 | Lanceiros e Yeomen: +3 armadura melee | F200 G500 | 45 s | Ferraria |
| Cranequins | 4 | Bestas: +2 dano (melee/distância/cerco/fogo) e +0,5 alcance | W300 G700 | 60 s | Ferraria |
| Silk Bowstrings | 4 | Arqueiros +1 alcance (cav. arco +0,5); versão cara: +1,5 / +0,75 | W200 G500 | 60 s | Universidade (VERIFICAR) |
| Royal Bloodlines | 3 | Cavalaria +35% HP | F300 G700 | 90 s | Universidade (VERIFICAR) |
| Biology | 4 | Cavalaria +25% HP | F500 G1000 | 90 s | Universidade (VERIFICAR) |
| Elite Army Tactics | 4 | Infantaria melee: +15% dano e +15% HP | F500 G1000 | 90 s | Universidade (VERIFICAR) |
| Piety | 4 | Religiosos e curadores +40 HP | G325 | 45 s | Mosteiro (VERIFICAR) |
| Herbal Medicine | 3 | Religiosos e curadores: cura ×1,6 | G275 | 45 s | Mosteiro (VERIFICAR) |
| Military Academy | 3 | Produção de tropas: tempo ×0,8 | W100 G250 | 60 s | Universidade (VERIFICAR) |
| Siege Works | 4 | Cerco +20% HP | W300 G600 | 90 s | Universidade (VERIFICAR) |
| Geometry | 4 | Trabucos +20% dano | W100 G225 | 45 s | Oficina de cerco |
| Greased Axles | 3 | Cerco +15% velocidade | W150 G350 | 60 s | Oficina de cerco |
| Fanaticism | 4 | Unidades de Templários/Commanderie: +10% dano (todos os tipos) | F300 G700 | 60 s | Universidade (VERIFICAR) |

---

## 4. Triângulo de counters

```
            LANCEIRO ──(+17..+28 vs cavalaria)──▶ CAVALARIA
               ▲                                     │
               │                                     │ (+9..+13 vs à distância)
   (+5..+9 vs infantaria leve melee)                 ▼
               │                                   ARQUEIRO
               └────────────────────────────────────┘
```

- **Lanceiro > Cavalaria:** +17 a +28 de dano melee (cresce com a idade).
- **Cavalaria > Arqueiro:** +9 a +13 vs unidades à distância.
- **Arqueiro > Lanceiro:** +5 a +9 vs infantaria leve melee (lanceiro é leve).

### 4.1 Papel de cada unidade

| Unidade | Forte contra | Fraca contra |
|---|---|---|
| Lanceiro | Cavalaria, elefantes | Homem de armas, arqueiros (distância) |
| Cavalaria leve | Arqueiros, bestas, cerco | Lanceiros |
| Cavaleiro / lanceiro montado | Infantaria melee | Lanceiros, bestas |
| Arqueiro / arco longo | Infantaria leve (lanceiros, batedores) | Cavalaria |
| Besta / arbaletrier | Homem de armas, cavaleiro (pesados) | Cavalaria leve |
| Homem de armas | Tanque; lento | Bestas, cavaleiros, lanceiros |
| Cerco (mangonel / trabuco / bombarda) | Edifícios, massas | Cavalaria rápida, unidades próximas (alcance mínimo) |
| Monge | Suporte | Qualquer dano direto |

**Besta e homem de armas:** a besta é o counter de pesados (+10/+12); o homem de armas é o tanque que a cavalaria evita. **Cavaleiro:** counter de infantaria melee, mas vulnerável a lanceiro e besta. **Cerco:** counter de edifícios e massas, vulnerável a cavalaria rápida.

---

## 5. Fórmulas e regras de combate

### 5.1 Dano

```
dano_base  = dano_da_arma + bônus_de_counter + upgrades_de_dano (+1, +2, ×1,15 ...)
dano_final = dano_base − armadura_efetiva   (mínimo 1)   [forma provisória; VERIFICAR]
```

- `bônus_de_counter` depende da **classe** do alvo (ex.: lanceiro +20 vs `cavalry`).
- Upgrades "+1 dano" somam antes da armadura; upgrades "×1,15" multiplicam.
- Cerco usa **resistência percentual** (ex.: mangonel 85% a dano à distância), não armadura comum.

> `VERIFICAR`: a fórmula real de armadura do AoE IV usa redução multiplicativa/percentual, não subtração. Confirmar antes de implementar.

### 5.2 Cadência e DPS

```
cadência = aim + windup + attack + winddown + reload + setup + teardown + cooldown
DPS      = dano_final / cadência
```

- Ex.: besta = aim 0,25 + attack 0,125 + reload 1,75 = **2,125 s** (= `speed` do dado).
- Cerco com `burst` dispara N projéteis por ciclo.

### 5.3 Alcance

- `min`: abaixo do mínimo a unidade não ataca (mangonel 3). Respeitar na IA e no jogador.
- `max`: alcance máximo; upgrades de alcance somam ao `max` (ex.: Silk Bowstrings +1).

### 5.4 Armadura

- **M** reduz dano melee; **R** reduz dano à distância.
- Cerco ignora armadura comum e usa **resistência %**.
- Billmen (ferraria, idade 2): reduz armadura inimiga em −1 ao atacar.

### 5.5 Cura (monge)

- Monge não ataca (`weapons: []`).
- A taxa de cura **não está nos dados** (`VERIFICAR`). Herbal Medicine = ×1,6 sobre a taxa base.
- Cura só aliados religiosos ou unidades marcadas.

### 5.6 Pop e pré-requisitos

- Pop: cerco 2–3; infantaria e cavalaria 1.
- Idade 3+ exige Castelo; idade 4 exige Imperial.
- Unidades únicas exigem o prédio/civilização específica.

---

## 6. Pendências (`VERIFICAR`)

1. Fórmula real de armadura (multiplicativa ou subtrativa) e base.
2. Taxa de cura do monge.
3. Alvo do bônus +200 do trabuco (unidades ou naval).
4. Prédio exato de Silk Bowstrings, Royal Bloodlines, Biology, Piety, Military Academy, Siege Works e Fanaticism.
5. Unidades únicas faltantes (Janízaro, Samurai, Gilded, Yeomen, etc.).
6. Versão de patch do dado (o calculador de counters cita a 16.2, jun/2026).
7. Arqueiro a cavalo e lanceiro: não existem em ing./fr.; usados só como referência.

---

## 7. Notas de implementação para THRONEWARD

- Usar os números como **referência de balanceamento**, não como texto ou arte.
- Renomear todas as unidades e civilizações (nomes originais).
- Manter os valores em uma tabela de dados (JSON/CSV) separada para ajuste.
- Este documento não contém arte, áudio ou textos copiados.

---

## 8. Fontes

1. [aoe4world/data — `units/unified/spearman.json`](https://raw.githubusercontent.com/aoe4world/data/main/units/unified/spearman.json) — lanceiro
2. [aoe4world/data — `units/unified/horseman.json`](https://raw.githubusercontent.com/aoe4world/data/main/units/unified/horseman.json) — cavaleiro leve
3. [aoe4world/data — `units/unified/archer.json`](https://raw.githubusercontent.com/aoe4world/data/main/units/unified/archer.json) — arqueiro
4. [aoe4world/data — `units/english/crossbowman-3.json`](https://raw.githubusercontent.com/aoe4world/data/main/units/english/crossbowman-3.json) — besta
5. [aoe4world/data — `units/english/knight-3.json`](https://raw.githubusercontent.com/aoe4world/data/main/units/english/knight-3.json) — cavaleiro
6. [aoe4world/data — `units/english/mangonel-3.json`](https://raw.githubusercontent.com/aoe4world/data/main/units/english/mangonel-3.json) — mangonel
7. [aoe4world/data — `units/english/monk-3.json`](https://raw.githubusercontent.com/aoe4world/data/main/units/english/monk-3.json) — monge
8. [aoe4world/data — `units/english/longbowman-4.json`](https://raw.githubusercontent.com/aoe4world/data/main/units/english/longbowman-4.json) — arco longo
9. [aoe4world/data — `units/english/man-at-arms-3.json`](https://raw.githubusercontent.com/aoe4world/data/main/units/english/man-at-arms-3.json) — homem de armas
10. [aoe4world/data — `units/french/` (listagem)](https://github.com/aoe4world/data/tree/main/units/french) — arbaletrier, cavaleiro real
11. [aoe4world/data — `technologies_all.json`](https://raw.githubusercontent.com/aoe4world/data/main/technologies/all-baseids.json) — upgrades de ferraria/universidade
12. [aoe4world/data — README](https://raw.githubusercontent.com/aoe4world/data/main/README.md) — origem e licença
13. [AoE4 World — Counter Calculator](https://aoe4world.com/tools/counter_calculator) — referência de patch (16.2)
14. [Wikipedia — Age of Empires IV](https://en.wikipedia.org/wiki/Age_of_Empires_IV) — contexto
15. [Age of Empires (site oficial) — AoE IV](https://www.ageofempires.com/games/age-of-empires-iv/) — referência oficial

> **Limitações:** Fandom e Liquipedia retornaram 403; a busca web falhou (429/403). Os números vêm do repositório `aoe4world/data`. Itens `VERIFICAR` precisam de confirmação em wiki ou patch notes.
