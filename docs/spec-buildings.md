# THRONEWARD — Especificação de Construções, Landmarks, Tecnologias e Bônus de Civilização

Status: **RASCUNHO PARCIAL — fase 0 não concluída.** Estrutura completa; números em grande parte pendentes (`VERIFICAR`).
Escopo de referência: Age of Empires IV (mecânicas e números fiéis; nomes e arte originais).
Regra: só números e mecânicas. Nenhum nome, texto, arte ou ícone do original deve ser copiado para o produto.

---

## 0. Estado da pesquisa (leia primeiro)

Tentativa de coleta em 8/10/2026. Fontes com números de construções **não foram acessíveis**:

| Fonte | Resultado |
|---|---|
| Age of Empires Wiki (Fandom) — Town Center, Age of Empires IV, English, Civilization | HTTP 403 (bloqueio anti-bot) |
| Age of Empires Wiki (Fandom) — Town Center (AoE4) | HTTP 404 (URL inexistente) |
| Liquipedia AoE4 | HTTP 403 (verificação humana) |
| aoe4world.com/explorer/buildings e /technologies | HTTP 200, mas a tabela é renderizada no cliente — sem dados no HTML |
| aoe4world.com/api/v0/* | HTTP 404 (endpoints não existem nesse caminho) |
| web_search (várias consultas) | HTTP 429 (limite de taxa) |
| en.wikipedia.org — "Age of Empires IV" (raw) | **OK** — ver fonte [W1] |
| en.wikipedia.org — "House of Wisdom" (raw) | **OK** — ver fonte [W2] |
| ageofempires.com — /civilizations/english/ e /french/ | HTTP 200, mas só navegação visível (conteúdo truncado) — [A1][A2] |
| ageofempires.com — notícia Update 24916 (temporada 3) | HTTP 200, conteúdo truncado — [A3] |
| aoe4world.com (home) | HTTP 200 — [AW1] (só contexto de expansões) |

**Consequência:** o critério de aceite "tabelas completas com números" **não está atendido**. A estrutura, a mecânica de landmarks e a lista de civilizações estão confirmadas. Os valores numéricos ficam marcados `VERIFICAR` até haver acesso a uma fonte de dados (Fandom com outro cliente, Liquipedia, ou patch notes em texto simples) ou uma extração manual feita pelo projeto.

---

## 1. Fatos confirmados por fonte

### 1.1 Estrutura de idades e landmarks [W1]
- Quatro idades: Dark Age, Feudal Age, Castle Age, Imperial Age.
- **Avançar de idade não acontece no Town Center** (exceto Knights Templar), e sim ao construir **Landmarks**.
- Cada civilização tem 4 landmarks: o Town Center inicial + um em cada idade Feudal, Castle e Imperial.
- Cada landmark de avanço é **escolhido entre dois** (uma escolha por idade). Isso bate com a regra já prevista em `docs/SPEC.md` ("4 idades via landmark, escolha 1 de 2").
- Exceções confirmadas em [W1]:
  - Abbasid Dynasty, Ayyubids e Golden Horde: **um único landmark** (House of Wisdom ou Golden Tent), e a próxima idade é pesquisada nele.
  - Knights Templar: **sem landmarks**; avançam pesquisando no Town Center inicial.
  - Chinese e Zhu Xi's Legacy: podem construir **os dois landmarks** para habilitar uma Dinastia.

### 1.2 Roster padrão de construções [W1]
Para a maioria das civilizações:
- **Econômicas:** Farm, House, Lumber Camp, Mill, Mining Camp, Market, Town Center.
- **Militares:** Archery Range, Barracks, Dock, Siege Workshop, Stable.
- **Tecnologia:** Blacksmith, University/Madrasa.
- **Defensivas:** Keep, Outpost, Palisade Wall, Palisade Gate, Stone Wall, Stone Wall Gate, Stone Wall Tower.
- **Religiosas:** Monastery, Mosque, Prayer Tent.
- **Maravilha** (Wonder).
- Civilizações têm **construções substitutas** (mesmo papel, implementação diferente, exclusivas) e algumas **construções únicas**.

### 1.3 Civilizações de referência [W1][A1][A2]
- Inglesa (English) e francesa (French) fazem parte do elenco base.
- Civilizações mapeadas para THRONEWARD: **English → Albion**, **French → Gallia** (já decidido em `docs/SPEC.md`).

### 1.4 Landmark de House of Wisdom [W2]
- House of Wisdom: biblioteca/academia abássida em Bagdá, destruída em 1258. Serve de referência de **função** (landmark de centro de estudo), não de número.

---

## 2. Construções genéricas — tabela (VERIFICAR)

Legenda: `VERIFICAR` = valor não confirmado. Não usar nenhum número desta tabela no jogo antes de confirmar.

| Construção | Custo | HP | Tempo de construção | Função | Capacidade / Efeito | Visão | Ataque |
|---|---|---|---|---|---|---|---|
| Town Center | VERIFICAR | VERIFICAR | VERIFICAR | Produz aldeões, depósito de recursos, **não avança idade** (exceto Knights Templar) | Capacidade de pop: VERIFICAR (+15?) | VERIFICAR | VERIFICAR (flechas) |
| Casa (House) | VERIFICAR | VERIFICAR | VERIFICAR | Capacidade de população | +10 pop cada, até pop 200 (**ver SPEC**) | — | — |
| Fazenda (Farm) | VERIFICAR | VERIFICAR | VERIFICAR | Comida infinita por aldeão | Nº de aldeões por fazenda: VERIFICAR | — | — |
| Moinho (Mill) | VERIFICAR | VERIFICAR | VERIFICAR | Melhora coleta de comida em fazendas | Bônus: VERIFICAR | — | — |
| Campo de madeira (Lumber Camp) | VERIFICAR | VERIFICAR | VERIFICAR | Depósito de madeira | — | — | — |
| Mina (Mining Camp) | VERIFICAR | VERIFICAR | VERIFICAR | Depósito de ouro/pedra | — | — | — |
| Pedreira (Stone) | VERIFICAR | VERIFICAR | VERIFICAR | Depósito de pedra (mina própria ou "Mining Camp" conforme versão) | — | — | — |
| Quartel (Barracks) | VERIFICAR | VERIFICAR | VERIFICAR | Infantaria | — | — | — |
| Campo de arqueiros (Archery Range) | VERIFICAR | VERIFICAR | VERIFICAR | Arqueiros | — | — | — |
| Estábulo (Stable) | VERIFICAR | VERIFICAR | VERIFICAR | Cavalaria | — | — | — |
| Oficina de cerco (Siege Workshop) | VERIFICAR | VERIFICAR | VERIFICAR | Máquinas de cerco | — | — | — |
| Ferraria (Blacksmith) | VERIFICAR | VERIFICAR | VERIFICAR | Tecnologias militares e de armadura | — | — | — |
| Universidade / Madrasa | VERIFICAR | VERIFICAR | VERIFICAR | Tecnologias econômicas e de ciência | — | — | — |
| Mosteiro (Monastery) | VERIFICAR | VERIFICAR | VERIFICAR | Religioso (monges, relíquias) | — | — | — |
| Mercado (Market) | VERIFICAR | VERIFICAR | VERIFICAR | Comércio, troca de recursos | — | — | — |
| Torre (Stone Wall Tower) | VERIFICAR | VERIFICAR | VERIFICAR | Defesa | — | VERIFICAR | VERIFICAR |
| Posto avançado (Outpost) | VERIFICAR | VERIFICAR | VERIFICAR | Visão e defesa leve | — | VERIFICAR | VERIFICAR |
| Muralha de paliçada (Palisade Wall) | VERIFICAR | VERIFICAR | VERIFICAR | Barreira leve | — | — | — |
| Portão de paliçada (Palisade Gate) | VERIFICAR | VERIFICAR | VERIFICAR | Passagem controlada | — | — | — |
| Muralha de pedra (Stone Wall) | VERIFICAR | VERIFICAR | VERIFICAR | Barreira forte | — | — | — |
| Portão de pedra (Stone Wall Gate) | VERIFICAR | VERIFICAR | VERIFICAR | Passagem controlada | — | — | — |
| Fortaleza / Keep | VERIFICAR | VERIFICAR | VERIFICAR | Defesa principal, guarnição | Guarnição: VERIFICAR | VERIFICAR | VERIFICAR (flechas) |
| Maravilha (Wonder) | VERIFICAR | VERIFICAR | VERIFICAR | Condição de vitória | — | — | — |
| Docas (Dock) | — | — | — | **Fora de escopo** (naval, citado apenas) | — | — | — |

---

## 3. Landmarks — 2 por idade × 3 idades (Feudal, Castle, Imperial) por civilização

Regra de escopo: 6 opções por civilização no total (2 por passagem II/III/IV), mais o Town Center inicial.

### 3.1 Albion (análoga a English)
| Idade | Opção A (nome original) | Opção B (nome original) | Função | HP | Desbloqueia / Produz | Por que a escolha importa |
|---|---|---|---|---|---|---|
| Feudal | VERIFICAR (proposta: "Pátio do Arco") | VERIFICAR (proposta: "Guilda do Ferro") | VERIFICAR | VERIFICAR | VERIFICAR | VERIFICAR |
| Castle | VERIFICAR | VERIFICAR | VERIFICAR | VERIFICAR | VERIFICAR | VERIFICAR |
| Imperial | VERIFICAR | VERIFICAR | VERIFICAR | VERIFICAR | VERIFICAR | VERIFICAR |

### 3.2 Gallia (análoga a French)
| Idade | Opção A (nome original) | Opção B (nome original) | Função | HP | Desbloqueia / Produz | Por que a escolha importa |
|---|---|---|---|---|---|---|
| Feudal | VERIFICAR | VERIFICAR | VERIFICAR | VERIFICAR | VERIFICAR | VERIFICAR |
| Castle | VERIFICAR | VERIFICAR | VERIFICAR | VERIFICAR | VERIFICAR | VERIFICAR |
| Imperial | VERIFICAR | VERIFICAR | VERIFICAR | VERIFICAR | VERIFICAR | VERIFICAR |

Os nomes originais acima são **propostas**, não confirmadas. Cada landmark precisa de função idêntica à do original, depois de confirmada a função.

---

## 4. Tecnologias por prédio — VERIFICAR

Formato por tecnologia: `Prédio | Nome original | Tipo (econômica/militar/idade) | Custo | Efeito | Tempo`.

| Prédio | Tipo | Custo | Efeito | Tempo |
|---|---|---|---|---|
| Town Center | Econômica | VERIFICAR | VERIFICAR | VERIFICAR |
| Fazenda / Moinho | Econômica | VERIFICAR | VERIFICAR | VERIFICAR |
| Campo de madeira | Econômica | VERIFICAR | VERIFICAR | VERIFICAR |
| Mina | Econômica | VERIFICAR | VERIFICAR | VERIFICAR |
| Mercado | Econômica | VERIFICAR | VERIFICAR | VERIFICAR |
| Universidade | Econômica/ciência | VERIFICAR | VERIFICAR | VERIFICAR |
| Ferraria | Militar (armas/armadura) | VERIFICAR | VERIFICAR | VERIFICAR |
| Quartel / Arqueiros / Estábulo / Cerco | Militar | VERIFICAR | VERIFICAR | VERIFICAR |
| Torre / Keep / Muralhas | Defensiva | VERIFICAR | VERIFICAR | VERIFICAR |
| Mosteiro | Religiosa | VERIFICAR | VERIFICAR | VERIFICAR |
| Landmarks (avanço de idade) | Idade | VERIFICAR | VERIFICAR | VERIFICAR |

---

## 5. Bônus de civilização — VERIFICAR

Fatos mencionados como exemplos no pedido, **não confirmados por fonte**:
- English: fazendas mais baratas; "Network of Citadels" (keep/torre conectadas). VERIFICAR.
- French: bônus de cavalaria e cavaleiro real; economia de comércio. VERIFICAR.

| Civilização | Bônus 1 | Bônus 2 | Unidade única | Landmark único |
|---|---|---|---|---|
| English → Albion | VERIFICAR | VERIFICAR | VERIFICAR | VERIFICAR |
| French → Gallia | VERIFICAR | VERIFICAR | VERIFICAR | VERIFICAR |

---

## 6. Tabela de renomeação THRONEWARD (propostas)

Princípio: nome original, função idêntica ao original, arte nova. Nada de nomes oficiais do jogo.

| Conceito do original | Nome THRONEWARD (proposto) | Status |
|---|---|---|
| English | **Albion** | Decidido (`docs/SPEC.md`) |
| French | **Gallia** | Decidido (`docs/SPEC.md`) |
| Town Center | Pátio Central / Solar | Proposta |
| House | Casa Comum | Proposta |
| Farm | Roça | Proposta |
| Mill | Moinho de Vento | Proposta |
| Lumber Camp | Acampamento de Lenha | Proposta |
| Mining Camp | Poço de Minério | Proposta |
| Barracks | Quartel de Lanceiros | Proposta |
| Archery Range | Campo de Arco | Proposta |
| Stable | Estábulo | Proposta |
| Siege Workshop | Oficina de Engenhos | Proposta |
| Blacksmith | Ferraria | Proposta |
| University | Escola de Sábios | Proposta |
| Monastery | Mosteiro | Proposta |
| Market | Praça de Trocas | Proposta |
| Keep | Torre-Forte / Fortaleza | Proposta |
| Landmarks | Grandes Obras (Obra Maior) | Proposta |
| Unidades únicas e landmarks específicos | — | **Pendente** (depende de confirmar função) |

---

## 7. Fontes

Acessíveis e usadas:
- [W1] Wikipedia (EN), "Age of Empires IV" — versão raw: https://en.wikipedia.org/w/index.php?title=Age_of_Empires_IV&action=raw — estrutura de idades, landmarks, roster de construções.
- [W2] Wikipedia (EN), "House of Wisdom" — versão raw: https://en.wikipedia.org/w/index.php?title=House_of_Wisdom&action=raw — referência de landmark abássida.
- [A1] Age of Empires (oficial), civilização English: https://www.ageofempires.com/games/age-of-empires-iv/civilizations/english/ — página carregou, conteúdo truncado (sem números).
- [A2] Age of Empires (oficial), civilização French: https://www.ageofempires.com/games/age-of-empires-iv/civilizations/french/ — idem.
- [A3] Age of Empires (oficial), Update 24916 Season Three: https://www.ageofempires.com/news/age_of_empires_iv_update_24916_season3/ — carregou, conteúdo truncado.
- [AW1] aoe4world.com (home): https://aoe4world.com/ — contexto de expansões.

Tentadas e bloqueadas (não usadas como fonte de números):
- Fandom (ageofempires.fandom.com; age-of-empires-4.fandom.com) — 403 / 404.
- Liquipedia AoE4 — 403.
- aoe4world.com/explorer/buildings e /technologies — renderização no cliente, sem dados.
- aoe4world.com/api/v0/* — 404.
- Busca web — 429.

---

## 8. Próximos passos (para fechar a fase 0)

1. Obter acesso aos números: tentar novamente a busca (rate limit) ou fornecer manualmente os valores da wiki/patch notes ao projeto.
2. Preencher `VERIFICAR` de cada tabela (seções 2, 3, 4, 5) com fonte por linha.
3. Confirmar função de cada landmark (seção 3) antes de nomear.
4. Confirmar bônus de civilização (seção 5) — hoje são exemplos do pedido, não fatos.
5. Só então considerar o critério de aceite atendido (tabelas completas + landmarks + tecnologias + bônus + renomeação + ≥5 fontes). Hoje: ≥5 fontes acessíveis (W1, W2, A1, A2, A3, AW1), mas sem os números.
