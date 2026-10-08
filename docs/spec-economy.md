# SPEC — Economia, Mapa, Relíquias/Sagrados/Comércio e Vitória (THRONEWARD)

Status: **rascunho de Fase 0 — parcialmente verificado**. Mecânicas e números espelham o Age of Empires IV (AoE4); nomes, arte e textos são originais.

Legenda:
- **[V]** = número/regra confirmada em fonte citada nesta pesquisa.
- **[VERIFICAR]** = não confirmado nesta sessão (fontes bloqueadas, 403/404, ou dado de memória). Não implementar como definitivo antes de confirmar.

## 0. Limitações da pesquisa (leia primeiro)

Nesta sessão, a maior parte das páginas de referência retornou bloqueio:
- Fandom `ageofempires.fandom.com` — páginas de *Resource*, *Relic*, *Sacred Site*, *Town Center*, *Monastery*, *Farm*, *Mill*, *House*, *Market*, *Victory Conditions*, *Trade*, *Population* retornaram **403** ("Just a moment..."), e *Gold (AoE4)* / *Gilded Villager* retornaram 404 ou 403.
- Liquipedia — **403** (verificação humana).
- ageofempires.com (notícias de patch) — **404** nas URLs tentadas.
- aoe4world.com — páginas de `/explorer/units/villager`, `/explorer/buildings/monastery` e `/explorer/content` respondem 200 mas o HTML não contém os dados (renderizado via JS). A API `/api/v0/leaderboards/rm_solo` responde, mas não traz dados de economia.
- Busca web (`web_search`) — falhou por rate limit (429) e 403 em todas as fontes keyless, exceto uma busca genérica sem relevância.

**Consequência:** as tabelas de taxas de coleta por fonte, tempos de entrega, relíquias, sagrados, comércio e condições de vitória **não foram verificadas** nesta sessão. Estão com `VERIFICAR` e precisam de nova rodada (fontes alternativas listadas na seção 9, ou rodada manual com acesso a navegador) antes da Fase 1.

## 1. Fontes consultadas

1. [Villager (AoE4) — Fandom Age of Empires Wiki, `action=raw`](https://ageofempires.fandom.com/wiki/Villager_(Age_of_Empires_IV)?action=raw) — **fonte principal de dados** do aldeão, de tecnologias de coleta e de tempos de construção de landmarks. Acessada com sucesso.
2. [Age of Empires IV — Wikipedia (EN), `action=raw`](https://en.wikipedia.org/w/index.php?title=Age_of_Empires_IV&action=raw) — idades via landmarks, lista de prédios, civilizações, landmarks. Acessada com sucesso. Não tem números de economia.
3. [Age of Empires IV — página oficial](https://www.ageofempires.com/games/age-of-empires-iv/) — acessada (200); só índice de conteúdo e expansões, sem números.
4. [AoE4 World — home](https://aoe4world.com/) — acessada (200); fonte da comunidade, usada para confirmar que o jogo tem ladder ativo e modos (Solo Ranked, Team Ranked, Quick Match 1v1–4v4, FFA). Sem dados numéricos.
5. [AoE4 World — API de leaderboard rm_solo](https://aoe4world.com/api/v0/leaderboards/rm_solo) — acessada (200); confirma temporada 14 do ladder, mas não traz economia.

Tentadas e bloqueadas (não contam como fontes): Fandom (várias páginas, 403/404), Liquipedia (403), ageofempires.com/news (404), Wikipedia (páginas de Sacred Site/Relic inexistentes ou 404), busca web (429/403).

## 2. Recursos

| Recurso | Obs. |
|---|---|
| Comida | Fazendas, frutas (berry bush), ovelhas, cervos, javalis, peixe |
| Madeira | Árvores, abatidas pelo aldeão |
| Ouro | Mina de ouro (grande/pequena) |
| Pedra | Mina de pedra (grande/pequena) |

### 2.1 Capacidade de carga e entrega do aldeão

| Item | Valor | Status |
|---|---|---|
| Carga padrão (comida, madeira, ouro, pedra) | **10** | [V] Fandom Villager |
| Carga de carne caçada (cervo/javali/ovelha caçada) | **25** | [V] Fandom Villager; mudança do Season One Update |
| Tempo de entrega (ida/volta até o ponto de depósito) | depende do mapa | [VERIFICAR] |
| Carga de fazenda | ≠ carga padrão | [VERIFICAR] |

### 2.2 Taxas de coleta por fonte

**Não verificado.** A página de referência ("Resource#Gather rates & bonuses", citada no Fandom) está bloqueada.

| Fonte | Taxa base (unidade/s) | Status |
|---|---|---|
| Fazenda | VERIFICAR | — |
| Fruta (berry bush) | VERIFICAR (fonte cita mudança de 0,66 → 0,69 comida/s, [V] changelog Fandom) | parcial |
| Ovelha | VERIFICAR | — |
| Cervo (caça) | VERIFICAR | — |
| Javali (caça) | VERIFICAR | — |
| Árvore (madeira) | VERIFICAR | — |
| Ouro (mina grande/pequena) | VERIFICAR | — |
| Pedra (mina grande/pequena) | VERIFICAR | — |

Observação [V]: aldeões de civilizações islâmicas (Abbasid, Ayyubids, Delhi, Malians, Ottomans, Tughlaq) **não coletam javali**. Equivalente no THRONEWARD: restrição por civilização, opcional.

### 2.3 Bônus de coleta/transporte por tecnologia [V]

Dados da página Fandom Villager (seção "Further statistics"), para referência de tecnologias genéricas a implementar:

| Tecnologia (AoE4) | Efeito | Grupo |
|---|---|---|
| Horticulture | +10% coleta de comida exceto caça/peixe | Comida |
| Fertilization | +10% comida exceto caça/peixe | Comida |
| Precision Cross-Breeding | +10% comida exceto caça/peixe | Comida |
| Survival Techniques | +15% coleta de carne caçada | Caça |
| Hunting Tradition | +20% carne caçada (civ-específica) | Caça |
| Double Broadax | +15% madeira | Madeira |
| Lumber Preservation | +15% madeira | Madeira |
| Crosscut Saw | +15% madeira; +5 carga de madeira | Madeira |
| Specialized Pick | +15% ouro/pedra | Mineração |
| Shaft Mining | +15% ouro/pedra | Mineração |
| Cupellation | +15% ouro/pedra de depósito (drop-off) | Mineração |
| Wheelbarrow | +5 carga; +15% velocidade de movimento | Geral |
| Woven Baskets / Carrying Frame / Elephant Harness | +5% coleta geral (civ-específica Tughlaq) | Geral |
| Forestry | Árvores derrubadas em metade do tempo | Madeira |
| Fresh Foodstuffs | -40% custo do aldeão (civ-específica Abbasid) | Economia |

Os valores acima são **bônus percentuais de tecnologia** (não as taxas base). As taxas base continuam **[VERIFICAR]**.

## 3. Aldeão

| Atributo | Valor | Status |
|---|---|---|
| Custo | **50 comida** | [V] Fandom Villager |
| Tempo de treino | **20 s** | [V] Fandom Villager |
| Vida (HP) | **50** | [V] Fandom Villager |
| Velocidade | **1,12 tiles/s** | [V] Fandom Villager |
| População ocupada | 1 | [V] Fandom Villager |
| Edifício de treino | Town Center (e King's Palace, Palace of Swabia, Jiangnan Tower em civs específicas) | [V] Fandom Villager |
| Alcance de ataque corpo-a-corpo / distância | 3 tiles (arco); faca 6 / lança 12 | [V] Fandom Villager |
| Visão (LOS) | 6,22 tiles | [V] Fandom Villager |
| Armadura | 0 / 0 | [V] Fandom Villager |
| Dano de tocha vs prédio | 10 | [V] Fandom Villager |
| Dano de faca / lança | 6 / 12 | [V] Fandom Villager |
| Tempo de reparo de prédio (base) | 25 HP/s (patch 8.2.218) | [V] Fandom Villager |
| Tempo de reparo de siege | 5 HP/s (Season 2 Update 17718) | [V] Fandom Villager |
| Civilizações sem aldeão padrão | Order of the Dragon (usa "Gilded Villager") | [V] Fandom Villager |

### 3.1 Tempo de construção de landmark (fórmula) [V]

A fórmula observada na página Fandom é `t = 3/(N+2)` (fração do tempo de 1 aldeão), com `N` = número de aldeões construindo. Exemplos (segundos) [V]:

| Aldeões | % do tempo base | Landmark Dark Age | Feudal | Castle |
|---|---|---|---|---|
| 1 | 100% | 190 | 220 | 250 |
| 2 | 75% | 143 | 165 | 188 |
| 3 | 60% | 114 | 132 | 150 |
| 4 | 50% | 95 | 110 | 125 |
| 5 | 43% | 81 | 94 | 107 |
| 6 | 38% | 71 | 83 | 94 |
| 7 | 33% | 63 | 73 | 83 |
| 8 | 30% | 57 | 66 | 75 |
| 9 | 27% | 52 | 60 | 68 |
| 10 | 25% | 48 | 55 | 63 |

Nota [V]: cada aldeão adicional dá ~33% de velocidade de construção, com retornos decrescentes.

## 4. População

| Item | Valor | Status |
|---|---|---|
| Limite de população | 200 | [VERIFICAR] (decisão do SPEC índice) |
| Casa (+pop) | +10 | [VERIFICAR] |
| Town Center (+pop) | VERIFICAR | — |

## 5. Mapa

**Não verificado.** Dados de tamanho de mapa, relevo, florestas (incl. furtivas/stealth), distribuição de ouro/pedra/frutas/ovelhas/cervos/javalis, fog of war e minimapa dependem de fontes bloqueadas.

| Item | Valor | Status |
|---|---|---|
| Tamanhos de mapa disponíveis | VERIFICAR | — |
| Seeds / geração aleatória | VERIFICAR | — |
| Florestas furtivas (stealth) | VERIFICAR (o jogo tem floresta/arbusto que oculta unidades) | — |
| Visão do aldeão | 6,22 tiles | [V] |
| Fog of war | VERIFICAR | — |
| Minimapa | VERIFICAR | — |

## 6. Relíquias, monges e locais sagrados

**Não verificado.** Fontes sobre relíquias (Relic), mosteiros (Monastery), sagrados (Sacred Site) e captura estão bloqueadas.

| Item | Valor | Status |
|---|---|---|
| Quantidade de relíquias por mapa | VERIFICAR | — |
| Como capturar (monge? unidade?) | VERIFICAR | — |
| Bônus de relíquia (ouro/fé) | VERIFICAR | — |
| Colocação em mosteiro / landmark | VERIFICAR | — |
| Número de locais sagrados por mapa | VERIFICAR | — |
| Timer de vitória por sagrados | VERIFICAR | — |
| Regra de disputa (contestação) | VERIFICAR | — |

Contexto [V]: a Wikipedia confirma que AoE4 tem **Monastery** como prédio religioso (lista "Religious - Monastery, Mosque, Prayer Tent") e que civilizações têm "Sacred Site" próximos a algumas unidades (ex.: bônus de Kingdom of Castille). Isto **não** confirma as regras de captura.

## 7. Comércio

**Não verificado.** Mercador, mercado, distância × ouro e comércio de pedra não foram confirmados.

| Item | Valor | Status |
|---|---|---|
| Edifício | Market [V] (listado na Wikipedia como "Economic - ... Market") | parcial |
| Mercador (unidade) | VERIFICAR | — |
| Ouro por rota (distância) | VERIFICAR | — |
| Pedra via mercado | VERIFICAR | — |

## 8. Condições de vitória

**Não verificado.** Fontes sobre destruição de landmarks, controle de sagrados, maravilha (custo/timer) e condições de skirmish estão bloqueadas.

| Item | Valor | Status |
|---|---|---|
| Vitória por destruir todos os landmarks | VERIFICAR | — |
| Vitória por sagrados (timer) | VERIFICAR | — |
| Vitória por maravilha (custo/tempo/timer) | VERIFICAR | — |
| Configurações de skirmish | VERIFICAR | — |

Contexto [V]: a Wikipedia confirma que **Wonder** é um tipo de construção do jogo, e que avanços de idade são feitos por **landmarks** (escolha de 1 entre 2 na Feudal, Castle e Imperial), não pelo Town Center.

## 9. Próximos passos para fechar a Fase 0

1. Nova rodada de pesquisa com acesso a navegador (ou com fontes que não bloqueiem): páginas de Resource/Gather rates, Relic, Sacred Site, Monastery, Town Center, Market, Victory Conditions e Population do Fandom; Liquipedia; aoe4world (página de unidade renderizada com JS).
2. Possível fonte alternativa: dados de jogo extraídos de patch notes em `ageofempires.com/news` (URLs atuais, não as 404 testadas).
3. Após confirmar, substituir cada `VERIFICAR` por valor com fonte; manter `[V]` somente para o que foi citado.
4. Não usar nomes, arte, textos ou sons do original na implementação; manter só números e mecânicas.

## 10. Resumo de status

- Verificado [V]: aldeão (custo, HP, tempo de treino, velocidade, alcance, visão, carga 10/25, bônus de tecnologia), fórmula de construção de landmark, idades por landmark, existência de Monastery/Market/Wonder.
- Não verificado: taxas de coleta por fonte, tempos de entrega, mapa, relíquias, sagrados, comércio, população (200/casa/TC), condições de vitória.
- Critério de aceite da Fase 0 (≥5 fontes, tabelas de taxas/custos/tempos, regras de mapa/sagrados/relíquias/comércio/vitória): **parcialmente atendido** — 5 fontes foram acessadas, mas só 2 forneceram dados numéricos, e as tabelas de economia (taxas), sagrados, relíquias, comércio e vitória continuam em `VERIFICAR`.
