# Crítica de fidelidade — THRONEWARD v1 (tag `v1`, commit a0b069d)

Crítico: agente Gauntlet (Claude Haiku 5.5). Entrada: SPEC, spec-hud.md (§2 HUD, §3 câmera), PROGRESS.md (B-001), `git show v1 --stat`, diff de `src/main.ts`, `index.html`, `src/render/camera.ts`, `src/render/world.ts`.

## Limitação de evidência (leia primeiro)

- **Não inspecionei visualmente `docs/screenshots/fase1-terreno.png`.** O modelo deste crítico não declara entrada de imagem (`read_image` recusou o arquivo). Metadados confirmados: PNG 1280×800 RGB.
- Portanto, as divergências abaixo vêm do **código/HTML** e da **spec**, não da imagem. Itens marcados "verificar no PNG" precisam de confirmação visual por um crítico com visão (ou pelo Lead).
- Não consultei a referência do original (conforme a tarefa). A comparação usa a descrição de `spec-hud.md` §2 e o conhecimento de gênero.

## Critério de aceite da Fase 1 — veredito preliminar

| Item | Situação pelo código | Veredito |
|---|---|---|
| Terreno 3D com relevo | `buildGround` aplica `h*2` e vertexColors | Provável OK (verificar no PNG) |
| Florestas visíveis | 6000 cones InstancedMesh, cor 0x3f7d36 sobre grama | Parcial (ver D7) |
| Câmera 3/4 pan/zoom/rotate | pitch 0.96 rad ≈ 55°; pan WASD/arrastar; zoom 10–80; rotate botão direito | OK funcional; rotate sem teclado (D6) |
| Unidades visíveis e distinguíveis | capsule bege 0xd8c48a, y fixo 1.0 | **Não atende** (D4, D5) |
| Minimapa funcional | canvas 220px com terreno; sem unidades nem retângulo de câmera | **Parcial** (D3) |
| HUD esqueleto no layout AoE IV | topo/minimapa/grade presentes; seleção fora do centro; grade vazia | **Parcial** (D1, D2) |

## Divergências numeradas

Severidade: **B** = bloqueante para aceite da Fase 1; **m** = menor.

### Layout HUD

1. **[B] Painel de seleção fora do centro-baixo.** `#selection{left:244px}` ancora à esquerda, após o minimapa. A spec (`spec-hud.md` §2.1) pede centro-baixo. *Correção:* `left:50%; transform:translateX(-50%)` com `bottom:12px`, e largura fixa.

2. **[B] Grade de comandos vazia.** `#cmd-grid` existe no DOM, mas não há botões gerados em `main.ts` (o grid não aparece no diff). A spec pede grade 3×5/4×4 com hotkey por ícone (§2.1, §2.2). *Correção:* renderizar 12–16 botões com rótulo e hotkey (ex.: Q/W/E/R/A/S/D/F conforme §2.2), mesmo que desabilitados.

3. **[m] Recursos do topo estáticos.** `Food 0 / Wood 0 / Gold 0 / Stone 0 / Pop 0/0 / Age I` são texto fixo, sem ligação ao `sim.state`. A spec pede contagem de aldeões por recurso (§2.1) e população atual/limite. *Correção:* atualizar a cada frame a partir de `sim.state`; no mínimo "Pop N/M" real.

4. **[m] Rótulo de era em texto genérico.** `Age I` não segue a nomenclatura da spec (Dark/Feudal/Castle/Imperial, §2.4) nem mostra o objetivo do landmark. *Correção:* trocar por "ERA: DARK" e o objetivo atual, mesmo que estático.

5. **[m] Sem indicador de ociosos** (aldeão/exército/produção, §2.1 e §1.3). *Correção:* dois botões com contagem à esquerda da grade.

### Câmera

6. **[m] Rotação só por botão direito.** A spec propõe Q/E em passos de 90° (§5). `keyDir` só trata pan. *Correção:* adicionar Q/E com `rotate(s, ±π/2)`.

7. **[m] Pitch fixo sem ajuste.** §3 admite ajuste de pitch com modificador (VERIFICAR). O valor 0.96 rad (≈55°) está dentro da faixa típica de 3/4 do gênero, então o ângulo em si não é divergência. *Correção:* manter; ajuste de pitch fica para fase posterior.

### Escala e unidades

8. **[B] Unidades flutuam ou afundam: y fixo.** `dummy.position.set(u.x, 1.0, u.y)` ignora a altura do terreno (`h*2`). Em vale, a unidade fica suspensa; em morro, fica enterrada. A spec exige unidades legíveis sobre o terreno (critério). *Correção:* amostrar `terrain.height` na posição da unidade (`y = h*2 + metade da altura da cápsula`).

9. **[B] Unidades pouco distinguíveis da grama.** Cápsula bege `0xd8c48a` (raio 0.3, altura ~1.4) contra grama de `GRASS_HIGH (0.66,0.78,0.36)`, que é amarelo-esverdeado claro. Contraste baixo, principalmente em zonas altas. A spec pede unidades distinguíveis (critério). *Correção:* cor saturada por jogador (ex.: azul/vermelho) ou contorno/sombra; manter a cápsula como placeholder.

10. **[m] Escala unidade vs. árvore.** Unidade ~1.4 de altura contra árvore cone de 2.2, sem prédios. Proporção plausível, mas o cone de 2.2 com raio 0.6 é quase do tamanho de uma unidade em largura. *Correção:* reduzir o raio das árvores (~0.4) para reforçar a leitura de escala. Confirmar no PNG.

### Paleta e legibilidade

11. **[m] Florestas e grama com verde parecido.** Árvores `0x3f7d36` sobre grama com faixa verde-escura (`GRASS_LOW 0.14,0.32,0.1`). A floresta pode sumir no mapa, reduzindo a legibilidade. Critério: florestas visíveis. *Correção:* tom mais escuro e saturado para árvores ou variação de cor por bioma. Confirmar no PNG.

12. **[m] Fundo azul-céu sem horizonte definido.** `scene.background = 0x87a5c8` sem névoa. Com câmera a 55°, o céu ocupa a faixa superior e contrasta com o HUD escuro de forma pouco coesa com o resto da paleta. *Correção:* névoa `Fog` com cor próxima do horizonte, ou fundo escuro.

13. **[m] HUD com fonte e tamanho padrão.** `system-ui` sem hierarquia (texto de recurso e de seleção do mesmo tamanho). A spec pede legibilidade acima de ornamento (§1.1). *Correção:* 14–16px para recursos e 12px para rótulos de grade.

### Minimapa

14. **[B] Minimapa sem unidades e sem retângulo da câmera.** `drawMinimap` desenha só o terreno (`minimapImage`), uma vez, no boot. Um minimapa RTS precisa de pontos de unidades (cor do jogador) e de retângulo de visão, e atualizar em tempo real. Critério: "minimapa funcional". *Correção:* redesenhar a cada N frames com pontos de unidades e um retângulo da viewport.

15. **[m] Filtros do minimapa ausentes.** `spec-hud.md` §2.1 cita filtros (terreno/unidades/sinais). *Correção:* três toggles pequenos sob o minimapa.

### Interação

16. **[m] Seleção não ligada ao sim.** `#selection` contém "No selection" fixo; `selection.ts` não é usado pela UI. Painel de seleção (§2.3) não tem retrato, HP nem estado. *Correção:* atualizar o painel a partir da seleção atual; mostrar tipo, HP e estado mesmo que básicos.

### Integridade técnica

17. **[B] Sem tratamento de resize.** `renderer.setSize(window.innerWidth, ...)` e `camera.aspect` são definidos só no boot. Ao redimensionar a janela, o canvas e a projeção ficam com a proporção original (distorção). Afeta qualquer avaliação visual em viewport diferente de 1280×800. *Correção:* `window.addEventListener('resize', ...)` com `renderer.setSize`, `camera.aspect = w/h` e `updateProjectionMatrix()`.

### B-001 — retângulo preto top-left (~220 px)

18. **[B] B-001 é defeito do artefato de aceite.** Mesmo que seja só da captura headless, o PNG `docs/screenshots/fase1-terreno.png` é a evidência de aceite e está com o retângulo. Não dá para declarar o critério visual atendido com esse PNG.

    **Hipótese do crítico (própria, não confirmada):** o retângulo tem o tamanho do `#minimap` (220 px, mesma dimensão CSS e de atributo), mas está no canto superior esquerdo, onde não há elemento de minimapa. Duas explicações compatíveis com o relato do PROGRESS:
    - (a) **Canvas WebGL sem `preserveDrawingBuffer`** combinado com captura headless: a área coberta pelo `#minimap` (que tem `z-index:5`) é reamostrada num frame anterior ou vazio. O canto não coincidir com a posição CSS sugere, porém, que a área é outra, o que enfraquece essa hipótese.
    - (b) **Viewport/scissor do WebGL** com `renderer.setSize` antes do primeiro frame: a região 220×220 do canto superior não é limpa pelo `clear` do renderer. Compatível com o fato de sumir só com o minimapa oculto, já que o `display:none` força recomposição.

    **Teste sugerido, em ordem:** (1) capturar com `new THREE.WebGLRenderer({ preserveDrawingBuffer: true })`; (2) capturar com `#minimap` removido via `page.evaluate`; (3) renderizar um `clear` com cor conhecida no primeiro frame e comparar; (4) capturar em navegador com GPU real (não headless). Se (1) ou (4) eliminar o retângulo, é artefato de captura e o aceite pode ser reexpresso com screenshot corrigido. Se persistir com `preserveDrawingBuffer` e GPU real, é defeito de render.

## Contagem

- **Bloqueantes: 7** — itens 1, 2, 8, 9, 14, 17, 18.
- **Menores: 11** — itens 3, 4, 5, 6, 7, 10, 11, 12, 13, 15, 16.
- Total: 18 divergências concretas.

## Recomendação ao parent

Não aceitar a Fase 1 com base só no PNG atual. Corrigir os bloqueantes (layout da seleção e grade, minimapa com unidades, unidades sobre o relevo e com contraste, resize) e regerar o screenshot após resolver B-001. Confirmar visualmente os itens 10, 11 e 12, que dependem do PNG.
