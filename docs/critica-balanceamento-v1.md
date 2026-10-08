# Crítica de balanceamento — THRONEWARD v1 (Gauntlet, Fase 1)

Crítico: Claude Haiku 5.5 (`Merge/anthropic-claude-haiku-5-5`). Material: `docs/SPEC.md`, `docs/spec-units.md`, `docs/spec-economy.md`, `src/sim/{sim,terrain,pathfind,selection}.ts`, `git show v1 --stat`. Não há raciocínio do builder neste documento.

Escopo: o SPEC não enumera a Fase 1. Usei a lista de `docs/PROGRESS.md`: terreno com seed, câmera RTS, seleção, A*, world render, e2e. **Não auditei** `src/render/camera.ts`, `src/render/world.ts` nem os e2e, pois estão fora do material recebido.

Resultado da suíte: `npx vitest run` → 8 arquivos, **83/83 passando**. A suíte cresce; nada foi alterado nem afrouxado.

## Resumo

- Divergências numeradas: **14** (1 bloqueante, 13 menores).
- Fora de escopo (Fases 2–3, não contadas como divergência): taxas de coleta, custos de prédios, dano/armadura, cadências, counters, sagrados/relíquias/comércio/vitória, população.
- Determinismo: mulberry32, A* e hash com seed verificados (ver seção 3).

## 1. Constantes da sim

Verificação feita: leitura do código, comparação com SPEC, e uma checagem temporária de determinismo (arquivo removido após a execução; nenhum arquivo de teste foi deixado).

1. **[BLOQUEANTE] Velocidade de movimento fixa em 4 tiles/s para todas as unidades.** `sim.ts` `tickOnce`: `const speed = 4 * dt;`. O SPEC dá aldeão 1,12 tiles/s ([V], `spec-economy.md` §3) e `Vel.` 1,125 em `spec-units.md` §1.1. O lanceiro é 1,25 e o cavaleiro leve 1,875. Divergência de ~3,5× no aldeão, e a velocidade não depende do tipo.
   **Correção:** guardar `speed` por tipo em tabela de dados e usar `speed * dt` por unidade, com os valores do SPEC.

2. **[menor] `SimConfig.tickRate` ignorado.** `config.tickRate = 60` é aceito e não é usado; `tickOnce(dt = 1/60)` define o tempo por parâmetro, com default hardcoded.
   **Correção:** derivar `dt = 1 / config.tickRate` dentro do Sim e remover o default mágico.

3. **[menor] HP padrão 100 hardcoded em `spawnUnit`.** `main.ts` spawna `'villager'` e `'scout'` sem HP, então ambos ficam com 100. O SPEC dá aldeão 50 ([V], `spec-economy.md` §3) e batedor 110 (`spec-units.md` §1.1). Como o combate é Fase 2–3, o impacto é só de placeholder.
   **Correção:** ler HP da tabela de unidades; enquanto isso, marcar o 100 como placeholder explícito.

4. **[menor] Recursos iniciais `200/200/100/100` sem base no SPEC.** Hardcoded em `Sim` construtor. Nenhum dos docs fixa esses valores.
   **Correção:** colocar em config de partida e marcar `VERIFICAR` até a rodada de economia.

5. **[menor] Tamanho de mapa inconsistente.** `main.ts` usa `MAP_SIZE = 64`. O default de `terrain.ts` (`size > 0 ? ... : 128`) e o comentário "default 128" apontam 128. O SPEC §5 marca tamanho de mapa como VERIFICAR.
   **Correção:** definir um único valor de partida e documentá-lo como VERIFICAR no SPEC.

6. **[menor] Número de jogadores fixo em 2 em `main.ts`.** O SPEC fala em "pop 200" e em escala, mas não fixa 2 jogadores. Não há base no SPEC para o valor.
   **Correção:** parametrizar e documentar 2 como escolha de skirmish, não como regra.

7. **[menor] Limiar de floresta 0.62 e chance de furtividade 0.10 sem base no SPEC.** `terrain.ts` `FOREST_THRESHOLD`, `STEALTH_CHANCE`. O SPEC §5 marca florestas e stealth como VERIFICAR.
   **Correção:** marcar como placeholder de balanceamento com comentário "VERIFICAR".

8. **[menor] Quantidades de recursos por spawn sem base.** `terrain.ts`: 2 ouros de 800–999, 1 pedra de 700–899, 1 frutas de 200–299, 1 ovelha, em anel de 8–12 tiles. O SPEC §5 marca amounts e distribuição como VERIFICAR.
   **Correção:** centralizar as constantes numa tabela de balanceamento marcada VERIFICAR.

9. **[menor] Recursos neutros do centro sem base.** `CENTER_NEUTRAL_COUNT = 4` com ouro 1000–1299 e pedra 900–1199. Sem base no SPEC.
   **Correção:** mesma correção da 8.

10. **[menor] Contagem de caça sem base.** `DEER_COUNT = 10`, `BOAR_COUNT = 8`. `spec-economy.md` §2.2 lista os tipos de caça mas não as contagens.
    **Correção:** marcar como placeholder VERIFICAR.

11. **[menor] Relíquias 5 e sagrados 3 hardcoded.** `RELIC_COUNT = 5`; sagrados fixos em 3 com raio `size * 0.2`. `spec-economy.md` §6 marca quantidade de relíquias e sagrados como VERIFICAR.
    **Correção:** marcar como VERIFICAR; o número real deve vir da rodada de Fase 3.

12. **[menor] Geometria hardcoded sem base.** `ringR = 0.36*size`, clareiras de raio 7 (spawn) e 5 (centro), espaçamento de relíquias `0.15*size` (spawn) e `0.12*size` (entre relíquias). Nenhuma base no SPEC.
    **Correção:** documentar como decisão de layout, não de balanceamento.

13. **[menor] Limite de A* `maxVisited = 20000` sem base.** Para `size=128` (16384 tiles) o limite nunca é atingido, mas está hardcoded sem justificativa.
    **Correção:** documentar o cálculo `size*size*1.2` ou similar.

14. **[menor] Raios de seleção hardcoded.** `clickSelect` raio 0,8 e `doubleClickSelect` raio 12. Não há base no SPEC/HUD verificada no material.
    **Correção:** colocar em config de UI e marcar como decisão de UX.

Observação adicional (menor, não numerada): `selection.ts` `MILITARY_TYPES` inclui `'cerco'`, que é categoria e não tipo de unidade, e não inclui `'cavaleiro leve'` (que é `horseman` no SPEC). Isso pode quebrar seleção militar quando esses tipos forem criados. Os nomes também misturam português (`'maa'`, `'lanceiro'`) com inglês (`'villager'`, `'scout'`).

## 2. Itens do SPEC Fase 1 (checados)

| Item Fase 1 | Status | Observação |
|---|---|---|
| Terreno com seed | OK | Mesmo seed gera mesmas relíquias e mesmo terreno (verificado). |
| A* | OK | Caminho idêntico em duas chamadas; `smoothPath` consistente. |
| Seleção | Parcial | Ver item 14 e observação sobre `MILITARY_TYPES`. |
| Movimento de unidades | **Divergente** | Ver item 1 (bloqueante). |
| Câmera RTS | Não auditado | `src/render/camera.ts` fora do material. |
| World render | Não auditado | `src/render/world.ts` fora do material. |
| e2e | Não auditado | Fora do material. |

Fora de escopo (Fases 2–3, não divergência): taxas de coleta, custos de prédios, combate e counters, sagrados/relíquias/comércio/vitória, população (200 / casa +10 / TC).

## 3. Determinismo

- **mulberry32:** `sim.ts` e `terrain.ts` usam o mesmo algoritmo, com cópia local. Testes de terreno com mesmo seed geram mesmas relíquias. OK. Dívida menor: duplicação de código.
- **A\* determinístico:** ordem fixa de vizinhos e heap com comparação total `(f, h, x, y)`. Duas chamadas com mesma entrada produziram o mesmo caminho. OK.
- **Hash com seed:** duas `Sim` com mesmo seed e mesmos comandos deram o mesmo `hash()` após 300 ticks. OK. Dívida menor: `hash()` cobre só `[seed, tick, id, x, y, hp]`. Não cobre `queue`, `resources` nem o estado do PRNG, então divergência nesses campos passa despercebida (sugestão: incluir queue e resources).
- **Risco residual (menor):** `Math.hypot`, `Math.cos` e `Math.sin` não garantem bits idênticos entre motores JS. Headless Node e navegador podem divergir em casos limite. Não observado nos testes.

## 4. Veredito

- Bloqueante: **1** (item 1 — velocidade fixa de 4 tiles/s, contra 1,12 do aldeão no SPEC).
- Menores: **13** (itens 2–14, mais a observação de `MILITARY_TYPES` e a cobertura do hash).
- Para a Fase 1 avançar, corrigir o item 1 antes do gate. Os demais podem ir para a rodada de economia, marcados como VERIFICAR.
