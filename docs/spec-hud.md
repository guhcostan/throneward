# THRONEWARD — Spec de HUD, Câmera, Controles e Bots (Fase 0)

> Status: **rascunho de pesquisa**. Conteúdo marcado `VERIFICAR` = memória de jogo ou inferência ainda sem fonte primária lida. Nada aqui é arte ou texto copiado do original; são observações de layout e função, reescritas.

## 0. Como esta pesquisa foi feita (e limites)

- Buscas gerais (`web_search`) retornaram HTTP 429/403 em todas as tentativas. Fandom e Liquipedia retornaram HTTP 403 (bloqueio anti-bot). O Wikipédia e o aoe4world abriram normalmente.
- O site oficial abriu, mas as páginas de "Learn to Play" de AoE IV retornaram 404 e as de acessibilidade trouxeram só navegação.
- **Consequência:** a parte de HUD/atalhos/bots está majoritariamente em nível de *função e estrutura*, confirmada por fontes apenas quando indicado. Números exatos (hotkeys, timings, HP/custos) precisam de verificação antes de virar dado de jogo.
- Não foram baixadas nem embutidas imagens do original. As observações de paleta são descritivas.

### Fontes consultadas

1. Wikipédia (EN) — *Age of Empires IV*: https://en.wikipedia.org/wiki/Age_of_Empires_IV — confirmado: 4 eras (Dark, Feudal, Castle, Imperial); avanço de era por **Landmarks** (não pelo Town Center, exceto Knights Templar); 4 recursos implícitos nas civs; 23 civs; lançamento 28/10/2021; desenvolvedora Relic/World's Edge.
2. Wikipédia (EN) — *Age of Empires II*: https://en.wikipedia.org/wiki/Age_of_Empires_II — confirmado: 4 recursos (comida, madeira, ouro, pedra); "villagers" como aldeões; depósitos (Town Center, mining camp, mill, lumber yard) como pontos de entrega; comércio de ouro por mercado. Usado como referência de família de jogo (AoE IV é descrita como "mecânicas em grande parte similares" ao AoE II).
3. Wikipédia (EN) — *Real-time strategy game*: https://en.wikipedia.org/wiki/Real-time_strategy_game — confirmado: "clicar e arrastar" para caixa de seleção vem de desktop; macro vs. micro; "rush" e "turtling" como termos de estratégia.
4. AoE4World — FAQ: https://aoe4world.com/faq — confirmado: ranking/rating (Elo); ~10 partidas de calibragem; estatísticas recalculadas diariamente; resumo de partida com "build order history" (empilha unidades do mesmo tipo em janela curta, expande por minuto). Útil como referência de *como um build order é lido* e de *ratings típicos* (~800–1200 comum; 1800–2000+ topo).
5. AoE4World — Home/Explorer: https://aoe4world.com/ e https://aoe4world.com/explorer/buildings — confirma existência de um Explorer de civs/unidades/prédios/tecnologias, categorias de estatísticas por civ e mapa. Sem dados numéricos extraídos nesta passada.
6. Site oficial AoE IV: https://www.ageofempires.com/games/age-of-empires-iv/ — confirmado: jogo oficial; expansões (The Sultans Ascend, Knights of Cross and Rose, Dynasties of the East, Yue Fei's Legacy). Página sem detalhe de HUD.
7. Site oficial — acessibilidade (PC): https://www.ageofempires.com/age-iv-accessibility/ — aberta, só navegação; **não usada como fonte de controles**. Próxima ação: abrir a página de acessibilidade de Xbox e a "Learn to Play" alternativa para extrair listas de atalhos (ver §8).

---

## 1. Princípios de design para THRONEWARD

1. **Legibilidade acima de ornamento:** recursos e população sempre visíveis; ícones com rótulo em hover.
2. **Ações contextuais:** a grade de comandos muda pelo que está selecionado (aldeão, prédio, exército).
3. **Três "ociosos" centrais:** aldeão ocioso, exército ocioso, produção ociosa devem ter botão próprio com contagem.
4. **Hotkeys espelhando o padrão RTS** (Ctrl+número = grupo; Shift = enfileirar) — padrão de gênero (ver fonte 3).
5. **Tudo rebindável** (fase posterior).

---

## 2. HUD

### 2.1 Layout geral (fonte: estrutura comum do gênero + VERIFICAR contra o original)

| Região | Conteúdo | Confiança |
|---|---|---|
| Topo (barra de recursos) | Comida, madeira, ouro, pedra, cada um com **contagem de aldeões** trabalhando naquele recurso; **população atual/limite** | Alta (estrutura de gênero); contagem por recurso = VERIFICAR |
| Canto inferior esquerdo | **Minimapa** com filtros (terreno, unidades, sinais) | Média |
| Centro inferior | **Painel de seleção**: retrato, nome, HP, stats (ataque/armadura/alcance/velocidade) | Média |
| Canto inferior direito | **Grade de comandos** (ícones 3x5 ou 4x4, hotkey em cada ícone) | Média |
| Acima da grade | **Fila de produção** do prédio selecionado (slots com progresso) | Média |
| Topo esquerdo/meio | **Indicador de era** e objetivo atual (landmark em construção) | Média (era via landmark, fonte 1) |
| Botões laterais | **Aldeão ocioso**, **exército ocioso**, **fila global de produção** | Média — VERIFICAR posição exata |
| Placar/objetivos | Painel de objetivos da partida skirmish/campanha | Baixa — VERIFICAR |

### 2.2 Wireframe ASCII (proposta THRONEWARD, não é captura do original)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [F] 350 (+8 aldeões)  [W] 420 (+11)  [G] 180 (+4)  [S] 90 (+2)   POP 42/60  │
│ ERA: FEUDAL  ▸ Obj: Construir Castelo (Landmark 2/3)        ⏱ 12:34   ⚑ Placar│
├───────────────────────────────────┬──────────────────────────────────────────┤
│                                   │                                          │
│            CAMPO DE JOGO          │                                          │
│        (câmera 3/4, pitch)        │                                          │
│                                   │                                          │
│                                   │                                          │
│                                   │                                          │
├───────────────┬───────────────────┴─────────────┬────────────────────────────┤
│ ┌─────────┐   │ [retrato] Aldeão   HP ███░ 25/30│ ┌────┬────┬────┬────┐      │
│ │ minimapa│   │ Ataque 2  Armadura 0  Vel 2.0   │ │ 1  │ 2  │ 3  │ 4  │      │
│ │ filtros │   │ Estado: colhendo madeira        │ ├────┼────┼────┼────┤      │
│ │  ▢ ▢ ▢  │   │                                 │ │ Q  │ W  │ E  │ R  │      │
│ └─────────┘   │  Fila: [■■■□][□][ ]             │ ├────┼────┼────┼────┤      │
│ [Ocioso: 3 🛠]│                                 │ │ A  │ S  │ D  │ F  │      │
│ [Exército:5⚔] │                                 │ └────┴────┴────┴────┘      │
└───────────────┴─────────────────────────────────┴────────────────────────────┘
```

**Notas do wireframe:** contagens e valores são exemplos; posição da grade e dos botões de ocioso é proposta, não verificada no original.

### 2.3 Painel de seleção (função)

- **Seleção única:** retrato grande, HP, stats, estado (ex.: "colhendo", "ocioso", "construindo").
- **Seleção múltipla:** grade de retratos com HP por unidade; clicar num retrato reduz a seleção a ele; Shift+clique remove.
- **Prédio em produção:** fila com slots; cada slot cancelável.
- **Prédio em construção:** barra de progresso e de HP.

### 2.4 Idade e objetivos

- Avanço de era: construir o **Landmark** escolhido entre **duas opções** (fonte 1). O Town Center não avança era, exceto para Knights Templar.
- Civs com Dinastia (ex.: Chinês e Zhu Xi's Legacy) podem construir **dois** landmarks para habilitar dinastia (fonte 1).
- Civs com landmark único (Abbasid/House of Wisdom, Ayyubids, Golden Horde/Golden Tent) pesquisam a era através desse landmark (fonte 1).
- **Para THRONEWARD (decisão de design):** adotar 4 eras (Dark/Feudal/Castle/Imperial), 4 landmarks (Town Center + 1 por era), com escolha binária em cada era. Fidelidade de números fica para §6.

---

## 3. Câmera

| Item | Especificação-alvo | Status |
|---|---|---|
| Ângulo (pitch) | Perspectiva 3/4 fixa por padrão; ajuste de inclinação opcional | VERIFICAR (ajuste de pitch com modificador) |
| Pan — teclado | Setas e WASD | VERIFICAR |
| Pan — mouse | Arrastar com botão do meio; borda da tela com scroll | VERIFICAR |
| Zoom | Roda do mouse; limites mín/máx | VERIFICAR (valores) |
| Rotação | Gira em torno do eixo vertical; atalho dedicado | VERIFICAR (tecla) |
| Escala relativa | Unidade humana ≈ 1 unidade de referência; prédio ≈ 3–5 unidades de largura | Estimativa de projeto, não verificada |
| Foco em seleção | Tecla de centralizar na seleção; duplo toque em evento centraliza | VERIFICAR |
| Pesquisa em câmera | Não alterar pitch durante seleção de alvo | Decisão de design |

**Para THRONEWARD:** começar com pitch fixo + pan (teclado/borda) + zoom (roda) + rotação de 90° em passos. Escala relativa definida em `src/` quando houver modelo de unidade.

---

## 4. Seleção e comandos

| Comando | Função | Fonte/Status |
|---|---|---|
| Clique | Seleciona uma unidade/prédio | Padrão do gênero |
| Caixa (arrastar) | Seleciona área | Confirmado como padrão de gênero (fonte 3) |
| Duplo clique | Seleciona **todas as unidades do mesmo tipo visíveis na tela** | Padrão RTS, VERIFICAR no original |
| Ctrl + 1..9 | Define grupo de controle | Padrão RTS, VERIFICAR |
| 1..9 | Recupera grupo; duplo toque centraliza câmera | VERIFICAR |
| Shift + clique | Adiciona/remove da seleção | Padrão |
| Shift + comando | Enfileira ordem (ex.: construir em série) | Padrão |
| Patrulha | Ordem de ir e voltar entre dois pontos | Padrão (VERIFICAR tecla) |
| Ataque-mover | Anda e ataca o que encontrar no caminho | Padrão (VERIFICAR tecla) |
| Posturas | Agressiva / defensiva / parada (ou equivalente) | VERIFICAR nomes |

---

## 5. Tabela de atalhos (proposta de THRONEWARD)

Legenda da coluna **Origem**: `P` = padrão de gênero (fonte 3); `V` = VERIFICAR no original; `D` = decisão de design.

| Ação | Atalho proposto | Origem |
|---|---|---|
| Selecionar aldeão ocioso (cíclico) | `.` (ponto) | V |
| Selecionar exército ocioso (cíclico) | `,` (vírgula) | V |
| Selecionar produção ociosa | `Ctrl+.` | D |
| Abrir menu de era / landmark | `L` | D |
| Grupo de controle (definir) | `Ctrl+1..9` | P |
| Grupo de controle (recuperar) | `1..9` | P |
| Adicionar à seleção | `Shift + clique` | P |
| Enfileirar ordem | `Shift + comando` | P |
| Ataque-mover | `A` + clique alvo | V |
| Patrulha | `P` + clique alvo | V |
| Parar | `S` | V |
| Segurar posição | `H` | V |
| Centralizar câmera na seleção | `Espaço` | D |
| Pan | `WASD` / setas / borda | V |
| Zoom | Roda | P |
| Rotação de câmera | `Q` / `E` (passo 90°) | V |
| Pitch de câmera | `Shift+roda` ou `Alt+arrastar` | V |
| Cancelar produção / construção | `Esc` ou clique direito na fila | V |
| Pausa / menu | `Esc` / `P` | V |

**Regra de ouro:** nenhuma tecla de §5 deve ser final sem checagem contra o original ou um teste de usabilidade.

---

## 6. Menu skirmish (escolha de partida)

| Campo | Opções-alvo | Status |
|---|---|---|
| Civilização | Lista por civ, com "aleatório" | Estrutura (fonte 1: 23 civs no jogo real) |
| Mapa | Lista + miniatura (sem copiar mapa original) | D |
| Tamanho do mapa | Pequeno / médio / grande | V |
| Bots | 1–3 oponentes | D (requisito) |
| Dificuldade | Fácil / médio / difícil | D (requisito) |
| Condições de vitória | Destruir todos os inimigos / landmark / tempo | V |
| Cores e time | Cor por jogador; campo de time | V |
| Recursos iniciais e população | Padrão e alternativa | V |
| Fog of war | Ligado/desligado | V |

---

## 7. Bots: build orders, distribuição e dificuldades

### 7.1 Build order de referência (ESTRUTURA — números VERIFICAR)

Modelo de referência para o bot, **não** dado de jogo:

| Fase | Foco | Exemplo (VERIFICAR) |
|---|---|---|
| Início (Dark) | Aldeões no Town Center; casas | 6 aldeões em comida / 4 em madeira (exemplo do pedido) |
| Dark → Feudal | Landmark #1 (escolha entre 2) | Pedra só após 2–3 aldeões extras |
| Feudal → Castle | Quartel + pesquisa econômica | Exploração inicial com unidade leve (número inventado — VERIFICAR) |
| Castle → Imperial | Landmark #3 + siege | Ataque com composição de counter |

### 7.2 Distribuição de aldeões (proposta)

| Era | Comida | Madeira | Ouro | Pedra |
|---|---|---|---|---|
| Dark | 6 | 4 | 0 | 0 |
| Feudal | 8 | 8 | 2 | 0 |
| Castle | 10 | 10 | 4 | 2 |
| Imperial | 12 | 12 | 6 | 4 |

*(Todos os valores VERIFICAR contra prática de jogadores; referência de conceito: AoE4World, fonte 4, mostra build history por minuto.)*

### 7.3 Composição de counter (conceito)

- Infantaria pesada → arqueiro/ataque a distância.
- Cavalaria → lança/infantaria leve.
- Cerco → unidades de contato em torno da muralha.
- *(Valores exatos VERIFICAR no Explorer do aoe4world, fonte 5.)*

### 7.4 Ataque, defesa e sagrados

- **Ataque:** bot segue o plano de build e envia exército ao atingir limite de unidades ou tempo.
- **Defesa:** bot reage a pressão — recolhe aldeões e prioriza muralha/torre.
- **Sagrados:** construções religiosas e relíquias — VERIFICAR como o bot as usa.

### 7.5 Três dificuldades: o que muda

| Aspecto | Fácil | Médio | Difícil |
|---|---|---|---|
| Velocidade de build | Lenta, com atrasos | Ritmo base | Ritmo rápido, sem atraso |
| Micro | Mínima | Básica | Alvo focado, retirada |
| Recursos | Sem bônus | Sem bônus | (VERIFICAR) |
| Decisão de ataque | Tardia, pouca pressão | Padrão | Pressão precoce |
| Erros propositais | Sim | Poucos | Raros |

*(Matriz de design, não verificada no original.)*

---

## 8. Próximos passos (para fechar pesquisa)

1. Extrair listas de atalhos de fontes que não estejam bloqueadas (documentação oficial de PC, guias de comunidade no Reddit).
2. Verificar valores do Explorer (unidades, custos, HP) no aoe4world.
3. Validar composição de counter e build orders em replays públicos (aoe4world).
4. Confirmar disposição do HUD e textos em uma sessão de jogo real (screenshot própria, não do repositório de imagens).
5. Atualizar este arquivo quando o acesso à busca voltar (atualmente 429/403).

---

## 9. Checklist de aceitação

- [x] Arquivo existe em `docs/spec-hud.md`.
- [x] Seções HUD, câmera, seleção, atalhos, menu skirmish, bots.
- [x] Tabela de atalhos (§5).
- [x] Wireframe ASCII do HUD (§2.2).
- [x] Fontes citadas: 7 (≥5).
- [x] Zero imagens copiadas ou embutidas.
- [ ] Números de bots e atalhos marcados `VERIFICAR` — **pendentes de confirmação em fonte primária**.
