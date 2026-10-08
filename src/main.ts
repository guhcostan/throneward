import * as THREE from 'three';
import { Sim } from './sim/sim';
import { Game } from './sim/game';
import { generateTerrain, type TerrainData } from './sim/terrain';
import { createCamera, attachCamera, cameraPos, type CameraState } from './render/camera';
import { heightColor, forestInstances, minimapImage } from './render/world';
import { Settlement, buildingFootprint } from './render/settlement';
import type { BuildingKind } from './render/buildings';
import { popCap, getDef } from './sim/construction';
import { canBuild } from './sim/ages';
import { clickSelect, boxSelect, doubleClickSelect, ControlGroups } from './sim/selection';

// Fase 1 integration: seeded terrain mesh + forest instancing + RTS camera + minimap + units.

const SEED = 1234;
const MAP_SIZE = 64;

function buildGround(t: TerrainData): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(t.size, t.size, t.size - 1, t.size - 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    // PlaneGeometry lies in XY; after rotation -PI/2, x->x, y->-z. Map to tile:
    const tx = Math.max(0, Math.min(t.size - 1, Math.round(px + t.size / 2)));
    const ty = Math.max(0, Math.min(t.size - 1, Math.round(py + t.size / 2)));
    const h = t.height[ty * t.size + tx];
    pos.setZ(i, h * 2);
    const [r, g, b] = heightColor(h);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function groundH(t: TerrainData, x: number, z: number): number {
  const tx = Math.max(0, Math.min(t.size - 1, Math.round(x + t.size / 2)));
  const ty = Math.max(0, Math.min(t.size - 1, Math.round(z + t.size / 2)));
  return t.height[ty * t.size + tx] * 2;
}

// Base minimap (terrain) rendered once; live dots + camera rect each refresh.
let baseMap: HTMLCanvasElement | null = null;

function drawMinimapBase(t: TerrainData): void {
  const px = 128;
  const img = minimapImage(t, px);
  baseMap = document.createElement('canvas');
  baseMap.width = px;
  baseMap.height = px;
  const ctx = baseMap.getContext('2d');
  if (!ctx) return;
  const data = new ImageData(px, px);
  data.data.set(img);
  ctx.putImageData(data, 0, 0);
}

const PLAYER_COLORS = [0x2f6df6, 0xd83a2a, 0x2fae5f, 0xe0a020];

function updateMinimap(t: TerrainData, sim: Sim, cam: CameraState): void {
  const canvas = document.getElementById('minimap') as HTMLCanvasElement | null;
  if (!canvas || !baseMap) return;
  const mctx = canvas.getContext('2d');
  if (!mctx) return;
  mctx.imageSmoothingEnabled = false;
  mctx.clearRect(0, 0, canvas.width, canvas.height);
  mctx.drawImage(baseMap, 0, 0, canvas.width, canvas.height);
  const sx = canvas.width / t.size;
  // Units.
  for (const u of sim.state.units) {
    mctx.fillStyle = '#' + PLAYER_COLORS[u.player % PLAYER_COLORS.length].toString(16).padStart(6, '0');
    mctx.fillRect((u.x + t.size / 2) * sx - 1, (u.y + t.size / 2) * sx - 1, 3, 3);
  }
  // Camera viewport rect (approx by dist).
  const half = cam.dist * 0.45;
  mctx.strokeStyle = '#ffffff';
  mctx.strokeRect((cam.tx + t.size / 2 - half) * sx, (cam.tz + t.size / 2 - half) * sx, half * 2 * sx, half * 2 * sx);
}

export function boot(civ = 'albion'): { sim: Sim; renderer: THREE.WebGLRenderer; cam: CameraState } {
  const container = document.getElementById('app')!;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87a5c8);

  const cam = createCamera();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
  const applyCamera = (): void => {
    const p = cameraPos(cam);
    camera.position.set(p.x, p.y, p.z);
    camera.lookAt(cam.tx, 0, cam.tz);
  };
  applyCamera();
  // Botão esquerdo livre para seleção; pan no botão do meio, rotate no direito.
  attachCamera(renderer.domElement, () => cam, applyCamera, { panButtons: [1] });

  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(20, 30, 10);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  scene.add(new THREE.HemisphereLight(0xbdd7ff, 0x3a6b35, 0.6));

  const terrain = generateTerrain({ seed: SEED, size: MAP_SIZE, players: 2 });
  scene.add(buildGround(terrain));

  // Forest instancing (cones — low-poly placeholder; procedural models in later phases).
  const trees = forestInstances(terrain).slice(0, 6000);
  const treeMesh = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.6, 2.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x3f7d36, roughness: 1 }),
    Math.max(1, trees.length)
  );
  const dummy = new THREE.Object3D();
  trees.forEach((tr, i) => {
    dummy.position.set(tr.x - terrain.size / 2, tr.y * 2 + 1.1, tr.z - terrain.size / 2);
    dummy.updateMatrix();
    treeMesh.setMatrixAt(i, dummy.matrix);
  });
  treeMesh.count = trees.length;
  treeMesh.instanceMatrix.needsUpdate = true;
  scene.add(treeMesh);

  const game = new Game(SEED, 2, [civ, 'generic']);
  const sim = game.sim;
  const home = terrain.spawns[0];
  const foe = terrain.spawns[1] ?? { x: terrain.size - 8, y: terrain.size - 8 };
  const W = (tx: number, ty: number): { x: number; y: number } => ({ x: tx - terrain.size / 2, y: ty - terrain.size / 2 });
  // Jogador: 6 aldeões + batedor. Inimigo (base neutra passiva): TC + 3 arqueiros + 2 lanceiros.
  for (let i = 0; i < 6; i++) {
    const p = W(home.x + (i % 3) - 1, home.y + Math.floor(i / 3) - 1);
    sim.spawnUnit('villager', 0, p.x, p.y);
  }
  sim.spawnUnit('scout', 0, 0, 0);
  const enemyUnits: string[] = ['archer', 'archer', 'archer', 'spearman', 'spearman'];
  enemyUnits.forEach((t, i) => {
    const p = W(foe.x + (i % 3) - 1, foe.y + Math.floor(i / 3));
    sim.spawnUnit(t, 1, p.x, p.y);
  });
  const completeInstant = (id: number): void => {
    const b = game.buildings.get(id);
    if (b) {
      b.progress = 1;
      b.built = true;
      b.hp = b.maxHp;
    }
  };
  // Initial town centers (custo 0, prontos — setup de cenário).
  completeInstant(game.orderBuild(0, 'towncenter', W(home.x, home.y).x, W(home.x, home.y).y));
  completeInstant(game.orderBuild(1, 'towncenter', W(foe.x, foe.y).x, W(foe.x, foe.y).y));

  // Fase 6: relíquias e sagrados do terreno.
  terrain.relics.forEach((r, i) => game.addRelic(5000 + i, r.x - terrain.size / 2, r.y - terrain.size / 2));
  terrain.sacred.forEach((s, i) => game.addSacredSite(i + 1, s.x - terrain.size / 2, s.y - terrain.size / 2));

  const settlement = new Settlement();
  scene.add(settlement.group);
  const asKind = (t: string): BuildingKind => t as BuildingKind;
  const syncSettlement = (): void => {
    for (const b of game.buildings.values()) {
      settlement.upsert({
        id: b.id,
        kind: asKind(b.type),
        x: b.x,
        z: b.y,
        groundY: groundH(terrain, b.x, b.y),
        progress: b.progress,
        built: b.built
      });
    }
  };

  drawMinimapBase(terrain);
  updateMinimap(terrain, sim, cam);

  // window.__game — reading state + sending commands (used by tests).
  type Cmd =
    | { type: 'move'; unitIds: number[]; x: number; y: number; queue?: boolean }
    | { type: 'gather'; unitId: number; kind: string; x: number; y: number; dx: number; dy: number }
    | { type: 'build'; player: number; building: string; x: number; y: number }
    | { type: 'addbuilder'; buildingId: number; unitId: number }
    | { type: 'train'; buildingId: number; unit: string; time: number }
    | { type: 'instant'; buildingId: number }
    | { type: 'attack'; unitId: number; targetId: number }
    | { type: 'spawn'; unit: string; player: number; x: number; y: number }
    | { type: 'advance'; player: number; slot: 0 | 1 }
    | { type: 'agebuilder'; player: number; unitId: number }
    | { type: 'research'; player: number; id: string }
    | { type: 'relic'; op: 'pickup' | 'drop' | 'garrison'; unitId: number; relicId: number; x?: number; y?: number; buildingId?: number }
    | { type: 'route'; unitId: number; from: number; to: number }
    | { type: 'grant'; player: number; resource: 'food' | 'wood' | 'gold' | 'stone'; amount: number }
    | { type: 'tick'; seconds: number };
  (window as unknown as { __game: unknown }).__game = {
    sim,
    game,
    debug: { project: (x: number, z: number) => project(x, z) },
    terrain: { seed: SEED, size: MAP_SIZE, spawns: terrain.spawns },
    getState: () => JSON.parse(JSON.stringify({
      tick: sim.state.tick,
      units: sim.state.units,
      resources: sim.state.resources,
      pop: game.popUsed(),
      ages: game.ages.map((a) => ({ age: a.age, advancing: a.advancing, progress: a.progress })),
      researched: game.techs.map((t) => [...t.researched]),
      winner: game.winner,
      relics: [...game.relics.relics.values()],
      sacred: {
        sites: [...game.sacred.sites.values()],
        timer: game.sacred.timer,
        winner: game.sacred.winner
      },
      buildings: [...game.buildings.values()],
      gatherers: [...game.gatherers.values()]
    })),
    command: (cmd: Cmd) => {
      if (cmd.type === 'move' && cmd.unitIds && cmd.x !== undefined && cmd.y !== undefined) {
        sim.commandMove(cmd.unitIds, cmd.x, cmd.y, !!cmd.queue);
        return { ok: true };
      }
      if (cmd.type === 'gather') {
        const ok = game.assignGather(cmd.unitId, { kind: cmd.kind, x: cmd.x, y: cmd.y }, { x: cmd.dx, y: cmd.dy });
        return { ok };
      }
      if (cmd.type === 'build') {
        const id = game.orderBuild(cmd.player, cmd.building, cmd.x, cmd.y);
        return id === -1 ? { ok: false, error: 'no funds' } : { ok: true, id };
      }
      if (cmd.type === 'addbuilder') {
        game.addBuilder(cmd.buildingId, cmd.unitId);
        return { ok: true };
      }
      if (cmd.type === 'train') {
        return { ok: game.trainUnit(cmd.buildingId, cmd.unit, cmd.time) };
      }
      if (cmd.type === 'instant') {
        // TEST HOOK: complete a building instantly (e2e only).
        const b = game.buildings.get(cmd.buildingId);
        if (!b) return { ok: false, error: 'unknown building' };
        b.progress = 1;
        b.built = true;
        b.hp = b.maxHp;
        return { ok: true };
      }
      if (cmd.type === 'attack') {
        return { ok: game.orderAttack(cmd.unitId, cmd.targetId) };
      }
      if (cmd.type === 'spawn') {
        // TEST HOOK: spawn a unit (e2e only).
        const u = sim.spawnUnit(cmd.unit, cmd.player, cmd.x, cmd.y);
        return { ok: true, id: u.id };
      }
      if (cmd.type === 'advance') {
        return { ok: game.advanceAge(cmd.player, cmd.slot) };
      }
      if (cmd.type === 'agebuilder') {
        game.addAgeBuilder(cmd.player, cmd.unitId);
        return { ok: true };
      }
      if (cmd.type === 'research') {
        return { ok: game.researchTech(cmd.player, cmd.id) };
      }
      if (cmd.type === 'relic') {
        if (cmd.op === 'pickup') return { ok: game.relicPickup(cmd.unitId, cmd.relicId) };
        if (cmd.op === 'drop') return { ok: game.relicDrop(cmd.relicId, cmd.x ?? 0, cmd.y ?? 0) };
        return { ok: game.relicGarrison(cmd.unitId, cmd.relicId, cmd.buildingId ?? -1) };
      }
      if (cmd.type === 'route') {
        const id = game.assignRoute(cmd.unitId, cmd.from, cmd.to);
        return id === -1 ? { ok: false } : { ok: true, id };
      }
      if (cmd.type === 'grant') {
        // TEST HOOK: concede recursos (e2e only).
        const stock = game.stocks[cmd.player];
        if (!stock) return { ok: false };
        stock.stock[cmd.resource] += cmd.amount;
        return { ok: true };
      }
      if (cmd.type === 'tick') {
        // TEST HOOK: avança a simulação N segundos de uma vez (e2e only).
        // Testa o pipeline sem espera de parede; durações são cobertas por testes unitários.
        const seconds = Math.min(1200, Math.max(0, Number(cmd.seconds ?? 0)));
        const steps = Math.round(seconds * 60);
        for (let i = 0; i < steps; i++) game.tick(1 / 60);
        return { ok: true, ticks: steps };
      }
      return { ok: false, error: 'unknown command' };
    },
    version: '0.3-hud-vivo'
  };

  const unitMesh = new THREE.InstancedMesh(
    new THREE.CapsuleGeometry(0.3, 0.8, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffff }),
    512
  );
  scene.add(unitMesh);
  const unitColor = new THREE.Color();

  // ---- Seleção e ordens (mouse; jogador = player 0) ----
  const raycaster = new THREE.Raycaster();
  const mouseV = new THREE.Vector2();
  let selected: number[] = [];
  let selectedB: number[] = [];
  let placeMode: { building: string } | null = null;
  let choosingAge = false;
  const groups = new ControlGroups();
  let lastClick = { t: 0, x: 0, y: 0 };
  let dragStart: { x: number; y: number } | null = null;
  const boxEl = document.createElement('div');
  boxEl.style.cssText = 'position:fixed;border:1px solid #fff;background:rgba(255,255,255,.12);z-index:7;display:none';
  document.body.appendChild(boxEl);

  const selView = (): { id: number; player: number; type: string; x: number; y: number }[] =>
    sim.state.units.filter((u) => u.player === 0).map((u) => ({ id: u.id, player: u.player, type: u.type, x: u.x, y: u.y }));

  const groundPoint = (cx: number, cy: number): { x: number; z: number } | null => {
    mouseV.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(mouseV, camera);
    const dy = raycaster.ray.direction.y;
    if (Math.abs(dy) < 1e-6) return null;
    const t = -raycaster.ray.origin.y / dy;
    if (!isFinite(t) || t < 0) return null;
    const p = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(t));
    return { x: p.x, z: p.z };
  };

  const project = (x: number, z: number): { x: number; y: number } => {
    const v = new THREE.Vector3(x, 0, z).project(camera);
    return { x: ((v.x + 1) / 2) * window.innerWidth, y: ((1 - v.y) / 2) * window.innerHeight };
  };

  const refreshSelection = (): void => {
    const el = document.getElementById('selection');
    if (!el) return;
    if (selected.length === 0 && selectedB.length === 0) {
      el.textContent = 'No selection';
      return;
    }
    const types = new Map<string, number>();
    for (const id of selected) {
      const u = sim.state.units.find((v) => v.id === id);
      if (u) types.set(u.type, (types.get(u.type) ?? 0) + 1);
    }
    el.textContent = [...types.entries()].map(([t, n]) => `${n}x ${t}`).join(' + ');
    if (el.textContent === '') el.textContent = 'No selection';
    const blds = selectedB.map((id) => game.buildings.get(id)).filter((b) => b !== undefined);
    if (blds.length > 0) {
      const info = blds.map((b) => {
        const q = b.queue.length > 0 ? ` [${b.queue.length} na fila]` : '';
        return `${b.type}${b.built ? '' : ` ${(b.progress * 100) | 0}%`}${q}`;
      }).join(' + ');
      el.textContent = el.textContent === 'No selection' ? info : el.textContent + ' | ' + info;
    }
  };

  // ---- Grade de comandos contextual ----
  const TRAINABLE: Record<string, { unit: string; label: string; time: number }[]> = {
    towncenter: [{ unit: 'villager', label: 'Aldeão', time: 20 }],
    barracks: [{ unit: 'spearman', label: 'Lanceiro', time: 15 }],
    archerrange: [
      { unit: 'archer', label: 'Arqueiro', time: 15 },
      { unit: 'longbow', label: 'Arco Longo', time: 15 }
    ],
    stable: [{ unit: 'scout', label: 'Batedor', time: 25 }]
  };
  const BUILDABLE = ['house', 'farm', 'mill', 'barracks', 'archerrange', 'stable', 'market'];

  const setHint = (t: string | null): void => {
    const h = document.getElementById('hint');
    if (!h) return;
    if (!t) {
      h.style.display = 'none';
      return;
    }
    h.textContent = t;
    h.style.display = 'block';
  };

  const canAfford = (cost: { food?: number; wood?: number; gold?: number; stone?: number }): boolean => {
    const s = sim.state.resources[0];
    return (cost.food ?? 0) <= s.food && (cost.wood ?? 0) <= s.wood && (cost.gold ?? 0) <= s.gold && (cost.stone ?? 0) <= s.stone;
  };

  const refreshGrid = (): void => {
    const grid = document.getElementById('cmd-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const btn = (act: string, label: string, title: string, enabled: boolean, onClick: () => void): void => {
      const b = document.createElement('button');
      b.dataset.act = act;
      b.textContent = label;
      b.title = title;
      b.disabled = !enabled;
      b.addEventListener('click', onClick);
      grid.appendChild(b);
    };
    if (placeMode) {
      btn('cancel', 'Cancelar', 'Cancelar posicionamento (Esc)', true, () => {
        placeMode = null;
        setHint(null);
        refreshGrid();
      });
      return;
    }
    if (choosingAge) {
      const pair = game.ageChoices(0);
      if (pair) {
        pair.forEach((lm, i) => {
          btn(`landmark-${i}`, lm.name, `${lm.effect} — F:${lm.cost.food ?? 0} M:${lm.cost.wood ?? 0} O:${lm.cost.gold ?? 0} P:${lm.cost.stone ?? 0}`, canAfford(lm.cost), () => {
            if (game.advanceAge(0, i as 0 | 1)) {
              // Auto-designa até 5 aldeões selecionados para a obra.
              const vils = sim.state.units.filter((u) => selected.includes(u.id) && u.type === 'villager').slice(0, 5);
              for (const v of vils) game.addAgeBuilder(0, v.id);
              setHint(`Era avançando: ${lm.name}`);
            }
            choosingAge = false;
            refreshGrid();
          });
        });
      }
      btn('cancel', 'Voltar', 'Voltar', true, () => {
        choosingAge = false;
        refreshGrid();
      });
      return;
    }
    const selUnits = sim.state.units.filter((u) => selected.includes(u.id));
    const hasVillager = selUnits.some((u) => u.type === 'villager');
    if (hasVillager) {
      for (const bt of BUILDABLE) {
        let ok = false;
        let title = bt;
        try {
          const def = getDef(bt);
          ok = canBuild(game.ageOf(0), bt) && canAfford(def.cost);
          title = `${bt} — M:${def.cost.wood ?? 0} F:${def.cost.food ?? 0} O:${def.cost.gold ?? 0} P:${def.cost.stone ?? 0}`;
        } catch {
          ok = false;
        }
        btn(`build-${bt}`, bt, title, ok, () => {
          placeMode = { building: bt };
          setHint(`Clique no terreno para construir: ${bt} (Esc cancela)`);
          refreshGrid();
        });
      }
      const st = game.ages[0];
      btn('advance', 'Era ↑', 'Avançar de era (landmark)', st.age < 4 && !st.advancing, () => {
        choosingAge = true;
        refreshGrid();
      });
    }
    for (const bid of selectedB) {
      const b = game.buildings.get(bid);
      if (!b || b.player !== 0 || !b.built) continue;
      for (const t of TRAINABLE[b.type] ?? []) {
        btn(`train-${t.unit}`, t.label, `Treinar ${t.label}`, true, () => {
          game.trainUnit(bid, t.unit, t.time);
          refreshGrid();
          refreshSelection();
        });
      }
    }
    if (grid.children.length === 0) {
      btn('noop', '—', 'Selecione aldeões ou prédios', false, () => undefined);
    }
  };

  const nearestNode = (x: number, z: number): { kind: string; x: number; y: number } | null => {
    let best: { kind: string; x: number; y: number; d: number } | null = null;
    const consider = (kind: string, tx: number, ty: number): void => {
      const wx = tx - terrain.size / 2;
      const wy = ty - terrain.size / 2;
      const d = Math.hypot(wx - x, wy - z);
      if (d <= 5 && (!best || d < best.d)) best = { kind, x: wx, y: wy, d };
    };
    for (const n of terrain.gold) consider('gold', n.x, n.y);
    for (const n of terrain.stone) consider('stone', n.x, n.y);
    for (const n of terrain.berries) consider('berry', n.x, n.y);
    const ftx = Math.round(x + terrain.size / 2);
    const fty = Math.round(z + terrain.size / 2);
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const tx = ftx + dx;
        const ty = fty + dy;
        if (tx < 0 || ty < 0 || tx >= terrain.size || ty >= terrain.size) continue;
        if (terrain.forest[ty * terrain.size + tx] === 1) consider('wood', tx, ty);
      }
    }
    return best;
  };

  const orderAt = (wx: number, wz: number, additive: boolean): void => {
    const mine = sim.state.units.filter((u) => selected.includes(u.id) && u.hp > 0);
    if (mine.length === 0) return;
    const foe = sim.state.units.find((u) => u.player !== 0 && u.hp > 0 && Math.hypot(u.x - wx, u.y - wz) <= 1.5);
    const military = mine.filter((u) => u.type !== 'villager' && u.type !== 'monk' && u.type !== 'trader' && u.type !== 'scout');
    if (foe && military.length > 0) {
      for (const m of military) game.orderAttack(m.id, foe.id);
      const rest = mine.filter((u) => !military.includes(u));
      if (rest.length > 0) sim.commandMove(rest.map((u) => u.id), wx, wz, additive);
      return;
    }
    const villagers = mine.filter((u) => u.type === 'villager');
    if (villagers.length > 0) {
      const node = nearestNode(wx, wz);
      if (node) {
        for (const v of villagers) {
          game.assignGather(v.id, { kind: node.kind, x: node.x, y: node.y }, { x: node.x, y: node.y });
          sim.commandMove([v.id], node.x, node.y, additive);
        }
        const rest = mine.filter((u) => u.type !== 'villager');
        if (rest.length > 0) sim.commandMove(rest.map((u) => u.id), wx, wz, additive);
        return;
      }
    }
    sim.commandMove(mine.map((u) => u.id), wx, wz, additive);
  };

  const el = renderer.domElement;
  el.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button === 0) dragStart = { x: e.clientX, y: e.clientY };
  });
  el.addEventListener('mousemove', (e: MouseEvent) => {
    if (!dragStart) return;
    const w = Math.abs(e.clientX - dragStart.x);
    const h = Math.abs(e.clientY - dragStart.y);
    if (w + h < 6) return;
    boxEl.style.display = 'block';
    boxEl.style.left = Math.min(e.clientX, dragStart.x) + 'px';
    boxEl.style.top = Math.min(e.clientY, dragStart.y) + 'px';
    boxEl.style.width = w + 'px';
    boxEl.style.height = h + 'px';
  });
  el.addEventListener('mouseup', (e: MouseEvent) => {
    if (e.button !== 0 || !dragStart) return;
    const sx = dragStart.x;
    const sy = dragStart.y;
    dragStart = null;
    boxEl.style.display = 'none';
    const g = groundPoint(e.clientX, e.clientY);
    if (!g) return;
    const now = performance.now();
    const isDouble = now - lastClick.t < 400 && Math.hypot(e.clientX - lastClick.x, e.clientY - lastClick.y) < 8;
    lastClick = { t: now, x: e.clientX, y: e.clientY };
    if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) < 6) {
      if (placeMode) {
        const id = game.orderBuild(0, placeMode.building, g.x, g.z);
        if (id !== -1) {
          for (const uid of selected) {
            const u = sim.state.units.find((v) => v.id === uid);
            if (u && u.type === 'villager') game.addBuilder(id, uid);
          }
          setHint(`${placeMode.building} em construção`);
        } else {
          setHint('Sem fundos ou era insuficiente');
        }
        placeMode = null;
        refreshSelection();
        refreshGrid();
        return;
      }
      const hit = clickSelect(selView(), 0, g.x, g.z);
      if (isDouble && hit.length > 0) {
        const u = sim.state.units.find((v) => v.id === hit[0]);
        if (u) selected = doubleClickSelect(selView(), 0, u.type, g.x, g.z);
        else selected = hit;
        selectedB = [];
      } else if (hit.length > 0) {
        selected = hit;
        selectedB = [];
      } else {
        // Seleção de prédio próprio pela pegada.
        selected = [];
        selectedB = [];
        for (const b of game.buildings.values()) {
          if (b.player !== 0) continue;
          let w = 2;
          let h = 2;
          try {
            const fp = buildingFootprint(b.type as BuildingKind);
            w = fp.w;
            h = fp.h;
          } catch {
            w = 3;
            h = 3;
          }
          if (Math.abs(b.x - g.x) <= w / 2 + 0.5 && Math.abs(b.y - g.z) <= h / 2 + 0.5) {
            selectedB = [b.id];
            break;
          }
        }
      }
    } else {
      const c1 = groundPoint(sx, sy);
      if (c1) {
        selected = boxSelect(selView(), 0, c1.x, c1.z, g.x, g.z);
        selectedB = [];
      }
    }
    refreshSelection();
    refreshGrid();
  });
  el.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    if (placeMode) {
      placeMode = null;
      setHint(null);
      refreshGrid();
      return;
    }
    const g = groundPoint(e.clientX, e.clientY);
    if (g) orderAt(g.x, g.z, e.shiftKey);
  });
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      placeMode = null;
      choosingAge = false;
      setHint(null);
      refreshGrid();
      return;
    }    if (/^[0-9]$/.test(e.key)) {
      const n = Number(e.key);
      if (e.ctrlKey || e.metaKey) {
        groups.set(n, [...selected]);
        e.preventDefault();
      } else {
        selected = groups.get(n).filter((id) => sim.state.units.some((u) => u.id === id));
        selectedB = [];
        refreshSelection();
        refreshGrid();
      }
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let frameN = 0;
  const bannerShown = { v: false };
  function frame(): void {
    game.tick(1 / 60);
    // Aniquilação: base inimiga destruída (unidades + prédios prontos do player 1).
    if (!game.winner && sim.state.tick > 120) {
      const foeAlive =
        sim.state.units.some((u) => u.player === 1 && u.hp > 0) ||
        [...game.buildings.values()].some((b) => b.player === 1 && b.built);
      if (!foeAlive) game.winner = { player: 0, reason: 'annihilation' };
    }
    sim.state.units.forEach((u, i) => {
      dummy.position.set(u.x, groundH(terrain, u.x, u.y) + 0.7, u.y);
      dummy.updateMatrix();
      unitMesh.setMatrixAt(i, dummy.matrix);
      unitMesh.setColorAt(i, unitColor.setHex(PLAYER_COLORS[u.player % PLAYER_COLORS.length]));
    });
    unitMesh.count = sim.state.units.length;
    unitMesh.instanceMatrix.needsUpdate = true;
    if (unitMesh.instanceColor) unitMesh.instanceColor.needsUpdate = true;
    if (frameN++ % 15 === 0) {
      updateMinimap(terrain, sim, cam);
      syncSettlement();
      refreshGrid();
      if (game.winner && !bannerShown.v) {
        bannerShown.v = true;
        const banner = document.getElementById('banner');
        const card = document.getElementById('banner-card');
        if (banner && card) {
          card.textContent = game.winner.player === 0 ? `Vitória! (${game.winner.reason})` : 'Derrota…';
          banner.style.display = 'flex';
        }
      }
      // HUD vivo: lê do MESMO estado que o __game expõe.
      const stock = sim.state.resources[0];
      const setText = (id: string, v: string): void => {
        const el = document.getElementById(id);
        if (el) el.textContent = v;
      };
      if (stock) {
        setText('res-food', `Food ${Math.floor(stock.food)}`);
        setText('res-wood', `Wood ${Math.floor(stock.wood)}`);
        setText('res-gold', `Gold ${Math.floor(stock.gold)}`);
        setText('res-stone', `Stone ${Math.floor(stock.stone)}`);
        setText('res-pop', `Pop ${game.popUsed()[0] ?? 0}/${popCap([...game.buildings.values()])}`);
      }
      const ageEl = document.getElementById('age');
      if (ageEl) ageEl.textContent = 'Age ' + (['I', 'II', 'III', 'IV'][game.ages[0]?.age - 1] ?? 'I');
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();

  return { sim, renderer, cam };
}

// Menu: ?test=1 inicia direto (e2e); senão o jogador clica em Iniciar.
const TEST_MODE = typeof location !== 'undefined' && location.search.includes('test=1');
if (TEST_MODE) {
  const menu = document.getElementById('menu');
  if (menu) menu.style.display = 'none';
  boot('albion');
} else {
  const start = document.getElementById('btn-start');
  const help = document.getElementById('btn-help');
  const helpBox = document.getElementById('help');
  help?.addEventListener('click', () => {
    if (helpBox) helpBox.style.display = helpBox.style.display === 'block' ? 'none' : 'block';
  });
  start?.addEventListener('click', () => {
    const menu = document.getElementById('menu');
    if (menu) menu.style.display = 'none';
    boot('albion');
  }, { once: true });
}
