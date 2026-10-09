import * as THREE from 'three';
import { Sim } from './sim/sim';
import { Game } from './sim/game';
import { generateTerrain, blockedGrid, type TerrainData } from './sim/terrain';
import { createCamera, attachCamera, cameraPos, rotate, type CameraState } from './render/camera';
import { heightColor, forestInstances, minimapImage } from './render/world';
import { Settlement, buildingFootprint } from './render/settlement';
import type { BuildingKind } from './render/buildings';
import { popCap, getDef } from './sim/construction';
import { UNIT_COMBAT } from './sim/combat';
import { canBuild, canTrain } from './sim/ages';
import { Bot, type WorldSites } from './sim/bot';
import { sfx, toggleMute, isMuted } from './ui/audio';
import { warriorMesh, setPlayerColor, type WarriorKind } from './render/warriors';

const WARRIOR_KINDS = new Set<string>([
  'spearman', 'archer', 'longbow', 'crossbow', 'manatarms',
  'knight', 'scout', 'monk', 'ram', 'mangonel'
]);
import { clickSelect, boxSelect, doubleClickSelect, ControlGroups } from './sim/selection';

// Versão exibida no menu e exposta no __game (fonte única).
export const GAME_VERSION = '0.4-jogavel';

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

// Minimapa 2D redesenhado no canvas (B-001: camada fixa com eco fantasma de
// 222x222 em (12,12) APENAS em screenshots do Chromium headless + SwiftShader;
// DOM e conteúdo verificados corretos — sem mudança de produto justificada).
function updateMinimap(
  t: TerrainData,
  sim: Sim,
  cam: CameraState,
  seen?: (u: { id: number; player: number; x: number; y: number }) => boolean
): void {
  const canvas = document.getElementById('minimap') as HTMLCanvasElement | null;
  if (!canvas) return;
  const mctx = canvas.getContext('2d');
  if (!mctx) return;
  if (!baseMap) return;
  mctx.imageSmoothingEnabled = false;
  mctx.clearRect(0, 0, canvas.width, canvas.height);
  mctx.drawImage(baseMap, 0, 0, canvas.width, canvas.height);
  const sx = canvas.width / t.size;
  // Units (inimigos fora do nevoeiro não aparecem).
  for (const u of sim.state.units) {
    if (u.player !== 0 && seen && !seen(u)) continue;
    mctx.fillStyle = '#' + PLAYER_COLORS[u.player % PLAYER_COLORS.length].toString(16).padStart(6, '0');
    mctx.fillRect((u.x + t.size / 2) * sx - 1, (u.y + t.size / 2) * sx - 1, 3, 3);
  }
  // Camera viewport rect (approx by dist).
  const half = cam.dist * 0.45;
  mctx.strokeStyle = '#ffffff';
  mctx.strokeRect((cam.tx + t.size / 2 - half) * sx, (cam.tz + t.size / 2 - half) * sx, half * 2 * sx, half * 2 * sx);
}

export interface SkirmishBot {
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SkirmishConfig {
  civ: string;
  bots: SkirmishBot[];
  victories: string[];
}

export const DEFAULT_SKIRMISH: SkirmishConfig = {
  civ: 'albion',
  bots: [{ difficulty: 'medium' }],
  victories: ['annihilation', 'landmarks', 'sacred', 'wonder']
};

export function boot(cfg: SkirmishConfig = DEFAULT_SKIRMISH): { sim: Sim; renderer: THREE.WebGLRenderer; cam: CameraState } {
  const container = document.getElementById('app')!;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
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

  const nPlayers = 1 + cfg.bots.length;
  const terrain = generateTerrain({ seed: SEED, size: MAP_SIZE, players: nPlayers });
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

  const game = new Game(SEED, nPlayers, [cfg.civ, ...cfg.bots.map(() => 'generic')]);
  game.victories = new Set(cfg.victories);
  game.initFog(MAP_SIZE);
  // Visão: tiles furtivos = 2 (escondem além de 2 tiles). Estático por partida.
  {
    const vg = new Uint8Array(MAP_SIZE * MAP_SIZE);
    for (let i = 0; i < vg.length; i++) {
      if (terrain.stealth[i] === 1) vg[i] = 2;
    }
    game.setVisionBlocked(vg);
  }
  const sim = game.sim;
  const home = terrain.spawns[0];
  const W = (tx: number, ty: number): { x: number; y: number } => ({ x: tx - terrain.size / 2, y: ty - terrain.size / 2 });
  // Câmera começa no TC do jogador.
  cam.tx = home.x - terrain.size / 2;
  cam.tz = home.y - terrain.size / 2;
  applyCamera();
  // Jogador: 6 aldeões + batedor.
  for (let i = 0; i < 6; i++) {
    const p = W(home.x + (i % 3) - 1, home.y + Math.floor(i / 3) - 1);
    sim.spawnUnit('villager', 0, p.x, p.y);
  }
  sim.spawnUnit('scout', 0, 0, 0);
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

  // Bots: TC + 3 aldeões + destacamento inicial, com sites próximos ao spawn.
  const sitesFor = (sx: number, sy: number): WorldSites => {
    const woods: { kind: string; x: number; y: number }[] = [];
    for (let dy = -10; dy <= 10 && woods.length < 3; dy++) {
      for (let dx = -10; dx <= 10 && woods.length < 3; dx++) {
        const tx = sx + dx;
        const ty = sy + dy;
        if (tx < 0 || ty < 0 || tx >= terrain.size || ty >= terrain.size) continue;
        if (terrain.forest[ty * terrain.size + tx] === 1) {
          woods.push({ kind: 'wood', x: tx - terrain.size / 2, y: ty - terrain.size / 2 });
        }
      }
    }
    const tw = (n: { x: number; y: number }): { x: number; y: number } => ({ x: n.x - terrain.size / 2, y: n.y - terrain.size / 2 });
    return {
      food: terrain.berries.slice(0, 3).map((n) => ({ kind: 'berry', ...tw(n) })),
      wood: woods,
      gold: terrain.gold.slice(0, 2).map((n) => ({ kind: 'gold', ...tw(n) })),
      stone: terrain.stone.slice(0, 1).map((n) => ({ kind: 'stone', ...tw(n) })),
      dropoff: { x: sx - terrain.size / 2, y: sy - terrain.size / 2 }
    };
  };
  const bots: Bot[] = [];
  cfg.bots.forEach((b, i) => {
    const p = i + 1;
    const sp = terrain.spawns[p] ?? { x: terrain.size - 8, y: terrain.size - 8 };
    completeInstant(game.orderBuild(p, 'towncenter', sp.x - terrain.size / 2, sp.y - terrain.size / 2));
    for (let v = 0; v < 3; v++) sim.spawnUnit('villager', p, sp.x - terrain.size / 2 + v, sp.y - terrain.size / 2 + 1);
    const camp: string[] = ['archer', 'archer', 'archer', 'spearman', 'spearman'];
    camp.forEach((t, k) => {
      sim.spawnUnit(t, p, sp.x - terrain.size / 2 + (k % 3) - 1, sp.y - terrain.size / 2 + 2 + Math.floor(k / 3));
    });
    bots.push(new Bot(game, p, b.difficulty, sitesFor(sp.x, sp.y)));
  });

  // Fase 6: relíquias e sagrados do terreno.
  terrain.relics.forEach((r, i) => game.addRelic(5000 + i, r.x - terrain.size / 2, r.y - terrain.size / 2));
  terrain.sacred.forEach((s, i) => game.addSacredSite(i + 1, s.x - terrain.size / 2, s.y - terrain.size / 2));
  // Estoques para esgotamento (caça com valores THR v0 VERIFICAR; fazenda infinita).
  game.seedNodes([
    ...terrain.gold.map((n) => ({ kind: 'gold', x: n.x - terrain.size / 2, y: n.y - terrain.size / 2, amount: n.amount })),
    ...terrain.stone.map((n) => ({ kind: 'stone', x: n.x - terrain.size / 2, y: n.y - terrain.size / 2, amount: n.amount })),
    ...terrain.berries.map((n) => ({ kind: 'berry', x: n.x - terrain.size / 2, y: n.y - terrain.size / 2, amount: n.amount })),
    ...terrain.sheep.map((n) => ({ kind: 'sheep', x: n.x - terrain.size / 2, y: n.y - terrain.size / 2, amount: 100 })),
    ...terrain.deer.map((n) => ({ kind: 'deer', x: n.x - terrain.size / 2, y: n.y - terrain.size / 2, amount: 250 })),
    ...terrain.boar.map((n) => ({ kind: 'boar', x: n.x - terrain.size / 2, y: n.y - terrain.size / 2, amount: 300 }))
  ]);

  const settlement = new Settlement();
  scene.add(settlement.group);
  const asKind = (t: string): BuildingKind => t as BuildingKind;
  // Muralhas: caixas por tile (paliçada marrom h1.5, pedra cinza h2.5).
  const wallsGroup = new THREE.Group();
  scene.add(wallsGroup);
  const wallGeo = new THREE.BoxGeometry(1, 1, 1);
  const wallMats: Record<string, THREE.MeshStandardMaterial> = {
    palisade: new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 1 })
  };
  let wallsSig = '';
  const syncWalls = (): void => {
    const sig = [...game.walls.values()].map((w) => `${w.id}:${w.hp}`).join(',');
    if (sig === wallsSig) return;
    wallsSig = sig;
    while (wallsGroup.children.length > 0) wallsGroup.remove(wallsGroup.children[0]);
    for (const t of game.wallTilesAll()) {
      const stone = t.kind === 'stone';
      const m = new THREE.Mesh(wallGeo, stone ? wallMats.stone : wallMats.palisade);
      const wx = t.x - terrain.size / 2;
      const wz = t.y - terrain.size / 2;
      m.position.set(wx, groundH(terrain, wx, wz) + (stone ? 1.25 : 0.75), wz);
      m.scale.set(1, stone ? 2.5 : 1.5, 1);
      wallsGroup.add(m);
    }
  };

  // Grade de bloqueio (terreno + muralhas + prédios) para o A* — refeita quando muda.
  // Portões próprios ficam abertos (grades por jogador no Game).
  let blockedSig = '';
  const syncBlocked = (): void => {
    const sig = `${game.walls.size}:${[...game.walls.values()].map((w) => `${w.hp}${w.gate ? 'g' : ''}`).join(',')}|${[...game.buildings.values()].map((b) => b.id).join(',')}`;
    if (sig === blockedSig) return;
    blockedSig = sig;
    const grid = blockedGrid(terrain);
    for (const b of game.buildings.values()) {
      let w = 2;
      let h = 2;
      try {
        const fp = buildingFootprint(b.type as BuildingKind);
        w = fp.w;
        h = fp.h;
      } catch {
        w = 2;
        h = 2;
      }
      const cx = Math.round(b.x + terrain.size / 2);
      const cy = Math.round(b.y + terrain.size / 2);
      for (let dy = -Math.floor(h / 2); dy <= Math.floor(h / 2); dy++) {
        for (let dx = -Math.floor(w / 2); dx <= Math.floor(w / 2); dx++) {
          const tx = cx + dx;
          const ty = cy + dy;
          if (tx >= 0 && ty >= 0 && tx < terrain.size && ty < terrain.size) {
            grid[ty * terrain.size + tx] = 1;
          }
        }
      }
    }
    game.setBlockedGrids(grid, terrain.size);
  };
  const syncSettlement = (): void => {
    const live = new Set<number>();
    for (const b of game.buildings.values()) {
      live.add(b.id);
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
    // Prédios destruídos saem da cena.
    for (const id of settlement.ids()) {
      if (!live.has(id)) settlement.remove(id);
    }
  };

  drawMinimapBase(terrain);
  updateMinimap(terrain, sim, cam);

  // Véu do nevoeiro: plano com textura de canvas (preto onde inexplorado,
  // translúcido onde explorado sem visão). Atualizado no sync.
  const shroudCanvas = document.createElement('canvas');
  shroudCanvas.width = 64;
  shroudCanvas.height = 64;
  const shroudTex = new THREE.CanvasTexture(shroudCanvas);
  const shroud = new THREE.Mesh(
    new THREE.PlaneGeometry(terrain.size, terrain.size),
    new THREE.MeshBasicMaterial({ map: shroudTex, transparent: true, depthWrite: false })
  );
  shroud.rotation.x = -Math.PI / 2;
  shroud.position.y = 2.3;
  shroud.renderOrder = 5;
  scene.add(shroud);

  const updateShroud = (): void => {
    if (!game.fog) return;
    const ctx = shroudCanvas.getContext('2d');
    if (!ctx) return;
    const S = 64;
    const img = ctx.createImageData(S, S);
    for (let py = 0; py < S; py++) {
      for (let px = 0; px < S; px++) {
        const tx = Math.floor((px / S) * terrain.size);
        const ty = Math.floor((py / S) * terrain.size);
        const seen = game.fog.seen[0][ty * terrain.size + tx] === 1;
        const exp = game.fog.explored[0][ty * terrain.size + tx] === 1;
        const i = (py * S + px) * 4;
        img.data[i] = 0;
        img.data[i + 1] = 0;
        img.data[i + 2] = 0;
        img.data[i + 3] = seen ? 0 : exp ? 110 : 215;
      }
    }
    ctx.putImageData(img, 0, 0);
    shroudTex.needsUpdate = true;
  };

  // window.__game — reading state + sending commands (used by tests).
  type Cmd =
    | { type: 'move'; unitIds: number[]; x: number; y: number; queue?: boolean }
    | { type: 'gather'; unitId: number; kind: string; x: number; y: number; dx: number; dy: number }
    | { type: 'build'; player: number; building: string; x: number; y: number }
    | { type: 'addbuilder'; buildingId: number; unitId: number }
    | { type: 'train'; buildingId: number; unit: string; time: number }
    | { type: 'instant'; buildingId: number }
    | { type: 'attack'; unitId: number; targetId: number }
    | { type: 'siege'; unitId: number; buildingId: number }
    | { type: 'gate'; player: number; wallId: number; gate: boolean }
    | { type: 'mount'; unitId: number; wallId: number }
    | { type: 'repair'; unitId: number; buildingId: number }
    | { type: 'spawn'; unit: string; player: number; x: number; y: number }
    | { type: 'advance'; player: number; slot: 0 | 1 }
    | { type: 'agebuilder'; player: number; unitId: number }
    | { type: 'research'; player: number; id: string }
    | { type: 'relic'; op: 'pickup' | 'drop' | 'garrison'; unitId: number; relicId: number; x?: number; y?: number; buildingId?: number }
    | { type: 'route'; unitId: number; from: number; to: number }
    | { type: 'wall'; player: number; kind: string; x1: number; y1: number; x2: number; y2: number }
    | { type: 'grant'; player: number; resource: 'food' | 'wood' | 'gold' | 'stone'; amount: number }
    | { type: 'tick'; seconds: number };
  (window as unknown as { __game: unknown }).__game = {
    sim,
    game,
    debug: {
      project: (x: number, z: number) => project(x, z),
      // Tiles furtivos em coords de mundo (e2e; máx 50).
      stealthTiles: () => {
        const out: { x: number; y: number }[] = [];
        for (let ty = 0; ty < terrain.size && out.length < 50; ty++) {
          for (let tx = 0; tx < terrain.size && out.length < 50; tx++) {
            if (terrain.stealth[ty * terrain.size + tx] === 1) {
              out.push({ x: tx - terrain.size / 2, y: ty - terrain.size / 2 });
            }
          }
        }
        return out;
      },
      ui: () => ({
        placeMode: placeMode?.building ?? null,
        choosingAge,
        routeMode: routeMode ? { traderId: routeMode.traderId, from: routeMode.from ?? null } : null,
        selected: [...selected],
        selectedB: [...selectedB]
      })
    },
    terrain: { seed: SEED, size: MAP_SIZE, spawns: terrain.spawns },
    getState: () => JSON.parse(JSON.stringify({
      tick: sim.state.tick,
      units: sim.state.units,
      resources: sim.state.resources,
      pop: game.popUsed(),
      ages: game.ages.map((a) => ({ age: a.age, advancing: a.advancing, progress: a.progress })),
      researched: game.techs.map((t) => [...t.researched]),
      winner: game.winner,
      scores: game.stocks.map((_, p) => game.score(p)),
      idleVil: game.idleVillagers(0),
      idleMil: game.idleMilitary(0),
      walls: [...game.walls.values()],
      visible: sim.state.units.filter((u) => u.player !== 0 && game.isSeenByUnit(u, 0)).map((u) => u.id),
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
        if (id !== -1) syncBlocked();
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
      if (cmd.type === 'siege') {
        return { ok: game.orderSiege(cmd.unitId, cmd.buildingId) };
      }
      if (cmd.type === 'gate') {
        return { ok: game.setGate(cmd.wallId, cmd.player, cmd.gate) };
      }
      if (cmd.type === 'mount') {
        return { ok: game.mountWall(cmd.unitId, cmd.wallId) };
      }
      if (cmd.type === 'repair') {
        return { ok: game.orderRepair(cmd.unitId, cmd.buildingId) };
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
      if (cmd.type === 'wall') {
        const id = game.placeWall(cmd.player, cmd.kind === 'stone' ? 'stone' : 'palisade', cmd.x1, cmd.y1, cmd.x2, cmd.y2);
        if (id !== -1) syncBlocked();
        return id === -1 ? { ok: false, error: 'no funds' } : { ok: true, id };
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
        // Espelha o frame (bot + sim); durações são cobertas por testes unitários.
        const seconds = Math.min(1200, Math.max(0, Number(cmd.seconds ?? 0)));
        const steps = Math.round(seconds * 60);
        for (let i = 0; i < steps; i++) {
          for (const b of bots) b.update(1 / 60);
          game.tick(1 / 60);
        }
        return { ok: true, ticks: steps };
      }
      return { ok: false, error: 'unknown command' };
    },
    version: GAME_VERSION
  };

  // Camada de unidades: um Group por unidade (templates por tipo+jogador).
  // Guerreiros usam warriorMesh procedural; demais, cápsula tingida.
  const unitLayer = new THREE.Group();
  scene.add(unitLayer);
  const unitTemplates = new Map<string, THREE.Group>();
  const unitNodes = new Map<number, THREE.Group>();

  const templateFor = (type: string, player: number): THREE.Group => {
    const key = `${type}:${player % PLAYER_COLORS.length}`;
    let t = unitTemplates.get(key);
    if (!t) {
      t = new THREE.Group();
      if (WARRIOR_KINDS.has(type)) {
        const w = warriorMesh(type as WarriorKind);
        setPlayerColor(w, PLAYER_COLORS[player % PLAYER_COLORS.length]);
        t.add(w);
      } else {
        const m = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.3, 0.8, 4, 8),
          new THREE.MeshStandardMaterial({ color: PLAYER_COLORS[player % PLAYER_COLORS.length], roughness: 0.8 })
        );
        m.position.y = 0.7;
        t.add(m);
      }
      unitTemplates.set(key, t);
    }
    return t;
  };

  const syncUnits = (): void => {
    const live = new Set<number>();
    for (const u of sim.state.units) {
      // Nevoeiro: inimigos fora de visão não renderizam (nem são clicáveis).
      if (u.player !== 0 && !game.isSeenBy(u.id, 0)) continue;
      live.add(u.id);
      let node = unitNodes.get(u.id);
      if (!node) {
        node = templateFor(u.type, u.player).clone(true);
        node.userData.unitId = u.id;
        unitNodes.set(u.id, node);
        unitLayer.add(node);
      }
      node.position.set(u.x, groundH(terrain, u.x, u.y) + (u.elev > 0 ? 2.5 : 0), u.y);
    }
    for (const id of [...unitNodes.keys()]) {
      if (!live.has(id)) {
        const n = unitNodes.get(id);
        if (n) unitLayer.remove(n);
        unitNodes.delete(id);
      }
    }
  };

  const pickUnit = (cx: number, cy: number): number[] => {
    mouseV.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(mouseV, camera);
    const hits = raycaster.intersectObjects(unitLayer.children, true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && o.userData.unitId === undefined) o = o.parent;
      if (o) {
        const u = sim.state.units.find((v) => v.id === o.userData.unitId);
        if (u && u.player === 0) return [u.id];
      }
    }
    return [];
  };

  // ---- Seleção e ordens (mouse; jogador = player 0) ----
  const raycaster = new THREE.Raycaster();
  const mouseV = new THREE.Vector2();
  let selected: number[] = [];
  let selectedB: number[] = [];
  let placeMode: { building: string; from?: { x: number; y: number } } | null = null;
  let routeMode: { traderId: number; from?: number } | null = null;
  let gateMode = false;
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

  // Painel de seleção: retrato (emoji), HP, stats e fila com progresso (SPEC HUD §2).
  const ICONS: Record<string, string> = {
    villager: '🧑‍🌾', scout: '🐎', spearman: '🔱', archer: '🏹', longbow: '🏹',
    crossbow: '🎯', manatarms: '🛡️', knight: '🐴', royalknight: '👑', monk: '🙏',
    trader: '🧺', ram: '🐏', mangonel: '💣', towncenter: '🏠', house: '🏡',
    farm: '🌾', barracks: '⚔️', archerrange: '🏹', stable: '🐴', market: '⚖️',
    monastery: '⛪', outpost: '🗼', landmark: '🏰', wonder: '🌟', siegeworkshop: '⚙️',
    university: '🎓'
  };

  const refreshSelection = (): void => {
    const el = document.getElementById('selection');
    if (!el) return;
    if (selected.length === 0 && selectedB.length === 0) {
      el.textContent = 'No selection';
      return;
    }
    const parts: string[] = [];
    const byType = new Map<string, { n: number; hp: number; max: number }>();
    for (const id of selected) {
      const u = sim.state.units.find((v) => v.id === id);
      if (!u) continue;
      const e = byType.get(u.type) ?? { n: 0, hp: 0, max: 0 };
      e.n++;
      e.hp += u.hp;
      e.max += u.maxHp;
      byType.set(u.type, e);
    }
    for (const [t, e] of byType) {
      const icon = ICONS[t] ?? '•';
      let line = `${icon} ${e.n}x ${t} — HP ${Math.ceil(e.hp)}/${e.max}`;
      const s = UNIT_COMBAT[t];
      if (s) line += ` · ATK ${s.damage} ARM ${s.melee}/${s.ranged} RNG ${s.range}`;
      parts.push(line);
    }
    const blds = selectedB.map((id) => game.buildings.get(id)).filter((b) => b !== undefined);
    for (const b of blds) {
      const icon = ICONS[b.type] ?? '🏚️';
      let line = `${icon} ${b.type} — HP ${Math.ceil(b.hp)}/${b.maxHp}`;
      if (!b.built) line += ` — obra ${(b.progress * 100) | 0}%`;
      if (b.queue.length > 0) {
        const slots = b.queue.map((q) => {
          const done = q.total > 0 ? 1 - q.time / q.total : 1;
          const bars = Math.round(done * 5);
          return `[${q.unit} ${'▓'.repeat(bars)}${'░'.repeat(5 - bars)}]`;
        }).join(' ');
        line += ` — fila ${slots}`;
      }
      parts.push(line);
    }
    el.innerHTML = parts.map((p) => `<div>${p}</div>`).join('');
  };

  // ---- Grade de comandos contextual ----
  const TRAINABLE: Record<string, { unit: string; label: string; time: number }[]> = {
    towncenter: [{ unit: 'villager', label: 'Aldeão', time: 20 }],
    barracks: [{ unit: 'spearman', label: 'Lanceiro', time: 15 }],
    archerrange: [
      { unit: 'archer', label: 'Arqueiro', time: 15 },
      { unit: 'longbow', label: 'Arco Longo', time: 15 },
      { unit: 'handcannoneer', label: 'Bombardeiro', time: 35 }
    ],
    stable: [{ unit: 'scout', label: 'Batedor', time: 23 }],
    market: [{ unit: 'trader', label: 'Mercador', time: 30 }],
    monastery: [{ unit: 'monk', label: 'Monge', time: 30 }]
  };
  const BUILDABLE = ['house', 'farm', 'mill', 'barracks', 'archerrange', 'stable', 'market', 'palisade'];

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

  // Grade de comandos: coleta descritores e só reconstrói o DOM se mudar
  // (rebuild cego engole cliques em andamento).
  let lastGridSig = '';
  const refreshGrid = (): void => {
    const grid = document.getElementById('cmd-grid');
    if (!grid) return;
    interface Desc { act: string; label: string; title: string; enabled: boolean; onClick: () => void }
    const descs: Desc[] = [];
    const btn = (act: string, label: string, title: string, enabled: boolean, onClick: () => void): void => {
      descs.push({ act, label, title, enabled, onClick });
    };
    if (placeMode) {
      btn('cancel', 'Cancelar', 'Cancelar posicionamento (Esc)', true, () => {
        placeMode = null;
        setHint(null);
        lastGridSig = '';
        refreshGrid();
      });
    } else if (routeMode) {
      btn('cancel', 'Cancelar', 'Cancelar rota (Esc)', true, () => {
        routeMode = null;
        setHint(null);
        lastGridSig = '';
        refreshGrid();
      });
    } else if (gateMode) {
      btn('cancel', 'Cancelar', 'Cancelar portão (Esc)', true, () => {
        gateMode = false;
        setHint(null);
        lastGridSig = '';
        refreshGrid();
      });
    } else if (choosingAge) {
      const pair = game.ageChoices(0);
      if (pair) {
        pair.forEach((lm, i) => {
          btn(`landmark-${i}`, lm.name, `${lm.effect} — F:${lm.cost.food ?? 0} M:${lm.cost.wood ?? 0} O:${lm.cost.gold ?? 0} P:${lm.cost.stone ?? 0}`, canAfford(lm.cost), () => {
            if (game.advanceAge(0, i as 0 | 1)) {
              // Auto-designa até 5 aldeões selecionados para a obra.
              const vils = sim.state.units.filter((u) => selected.includes(u.id) && u.type === 'villager').slice(0, 5);
              for (const v of vils) game.addAgeBuilder(0, v.id);
              setHint(`Era avançando: ${lm.name}`);
              sfx.advance();
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
    } else {
    const selUnits = sim.state.units.filter((u) => selected.includes(u.id));
    const hasVillager = selUnits.some((u) => u.type === 'villager');
    if (hasVillager) {
      for (const bt of BUILDABLE) {
        let ok = false;
        let title = bt;
        if (bt === 'palisade') {
          // Muralha: 2 de madeira por tile (WALL_DEFS); dois cliques definem o trecho.
          ok = canBuild(game.ageOf(0), 'palisade') && (sim.state.resources[0]?.wood ?? 0) >= 2;
          title = 'palisade — M:2/tile, dois cliques (início e fim)';
        } else try {
          const def = getDef(bt);
          ok = canBuild(game.ageOf(0), bt) && canAfford(def.cost);
          title = `${bt} — M:${def.cost.wood ?? 0} F:${def.cost.food ?? 0} O:${def.cost.gold ?? 0} P:${def.cost.stone ?? 0}`;
        } catch {
          ok = false;
        }
        btn(`build-${bt}`, bt, title, ok, () => {
          placeMode = { building: bt };
          routeMode = null;
          choosingAge = false;
          setHint(`Clique no terreno para construir: ${bt} (Esc cancela)`);
          refreshGrid();
        });
      }
      const st = game.ages[0];
      btn('advance', 'Era ↑', 'Avançar de era (landmark)', st.age < 4 && !st.advancing, () => {
        choosingAge = true;
        placeMode = null;
        routeMode = null;
        refreshGrid();
      });
      const ownWalls = [...game.walls.values()].some((w) => w.player === 0);
      btn('gate', 'Portão', ownWalls ? 'Alternar portão na muralha (clique nela)' : 'Portão (requer muralha própria)', ownWalls, () => {
        gateMode = true;
        placeMode = null;
        routeMode = null;
        choosingAge = false;
        setHint('Portão: clique na sua muralha (Esc cancela)');
        refreshGrid();
      });
    }
    // Parar: limpa ordens e filas dos selecionados (qualquer seleção).
    if (selected.length > 0) {
      btn('stop', 'Parar', 'Parar selecionados', true, () => {
        game.clearOrders(selected);
        refreshGrid();
        refreshSelection();
      });
    }
    const selVils = selUnits.filter((u) => u.type === 'villager');
    if (selVils.length > 0) {
      // Reparar: prédio próprio danificado mais próximo (raio 8 dos selecionados).
      const damaged = [...game.buildings.values()].filter((b) => b.player === 0 && b.hp < b.maxHp);
      if (damaged.length > 0) {
        btn('repair', 'Reparar', 'Reparar prédio danificado próximo', true, () => {
          for (const v of selVils) {
            let best: number | null = null;
            let bd = Infinity;
            for (const b of damaged) {
              const u = sim.state.units.find((x) => x.id === v.id)!;
              const d = Math.hypot(b.x - u.x, b.y - u.y);
              if (d <= 8 && d < bd) {
                bd = d;
                best = b.id;
              }
            }
            if (best !== null) game.orderRepair(v.id, best);
          }
          sfx.order();
          refreshGrid();
          refreshSelection();
        });
      }
    }
    // Montar: à distância sobem na muralha de pedra própria próxima.
    const selRanged = selUnits.filter(
      (u) => u.type === 'archer' || u.type === 'longbow' || u.type === 'crossbow' || u.type === 'arbaletrier'
    );
    const stoneWalls = [...game.walls.values()].filter((w) => w.player === 0 && w.kind === 'stone');
    if (selRanged.length > 0 && stoneWalls.length > 0) {
      btn('mount', 'Montar', 'Subir à distância na muralha de pedra', true, () => {
        for (const r of selRanged) {
          for (const w of stoneWalls) {
            if (game.mountWall(r.id, w.id)) break;
          }
        }
        sfx.order();
        refreshGrid();
        refreshSelection();
      });
    }
    const selTraders = selUnits.filter((u) => u.type === 'trader');
    if (selTraders.length > 0) {
      btn('route', 'Rota', 'Definir rota de comércio (2 mercados)', true, () => {
        routeMode = { traderId: selTraders[0].id };
        placeMode = null;
        choosingAge = false;
        setHint('Rota: clique o mercado de origem (precisa de 2 mercados; Esc cancela)');
        refreshGrid();
      });
    }
    for (const bid of selectedB) {
      const b = game.buildings.get(bid);
      if (!b || b.player !== 0 || !b.built) continue;
      for (const t of TRAINABLE[b.type] ?? []) {
        const allowed = canTrain(game.ageOf(0), t.unit);
        btn(`train-${t.unit}`, t.label, allowed ? `Treinar ${t.label}` : `${t.label} (era superior)`, allowed, () => {
          game.trainUnit(bid, t.unit, t.time);
          refreshGrid();
          refreshSelection();
        });
      }
    }
    } // fim do ramo normal (placeMode/choosingAge tratados acima)
    if (descs.length === 0) {
      descs.push({ act: 'noop', label: '—', title: 'Selecione aldeões ou prédios', enabled: false, onClick: () => undefined });
    }
    const sig = descs.map((d) => `${d.act}:${d.label}:${d.enabled}`).join('|');
    if (sig === lastGridSig) return;
    lastGridSig = sig;
    grid.innerHTML = '';
    for (const d of descs) {
      const b = document.createElement('button');
      b.dataset.act = d.act;
      b.textContent = d.label;
      b.title = d.title;
      b.disabled = !d.enabled;
      b.addEventListener('click', d.onClick);
      grid.appendChild(b);
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
    const foe = sim.state.units.find(
      (u) => u.player !== 0 && u.hp > 0 && Math.hypot(u.x - wx, u.y - wz) <= 1.5 && game.isSeenBy(u.id, 0)
    );
    const military = mine.filter((u) => u.type !== 'villager' && u.type !== 'monk' && u.type !== 'trader' && u.type !== 'scout');
    if (foe && military.length > 0) {
      for (const m of military) game.orderAttack(m.id, foe.id);
      const rest = mine.filter((u) => !military.includes(u));
      if (rest.length > 0) sim.commandMove(rest.map((u) => u.id), wx, wz, additive);
      sfx.attack();
      return;
    }
    // Cerco a prédio inimigo próximo do clique (pegada + 1.5).
    const foeB = [...game.buildings.values()].find((b) => {
      if (b.player === 0) return false;
      let w = 3;
      let h = 3;
      try {
        const fp = buildingFootprint(b.type as BuildingKind);
        w = fp.w;
        h = fp.h;
      } catch {
        w = 3;
        h = 3;
      }
      return Math.abs(b.x - wx) <= w / 2 + 1.5 && Math.abs(b.y - wz) <= h / 2 + 1.5;
    });
    if (foeB && military.length > 0) {
      for (const m of military) game.orderSiege(m.id, foeB.id);
      sfx.attack();
      return;
    }
    // Reparo: aldeões consertam prédio próprio danificado sob o clique.
    const ownB = [...game.buildings.values()].find((b) => {
      if (b.player !== 0 || b.hp >= b.maxHp) return false;
      let w = 3;
      let h = 3;
      try {
        const fp = buildingFootprint(b.type as BuildingKind);
        w = fp.w;
        h = fp.h;
      } catch {
        w = 3;
        h = 3;
      }
      return Math.abs(b.x - wx) <= w / 2 + 1.5 && Math.abs(b.y - wz) <= h / 2 + 1.5;
    });
    const vils = mine.filter((u) => u.type === 'villager');
    if (ownB && vils.length > 0) {
      let any = false;
      for (const v of vils) any = game.orderRepair(v.id, ownB.id) || any;
      if (any) {
        sfx.order();
        refreshSelection();
        return;
      }
    }
    // Montar muralha de pedra própria com à distância selecionados.
    const ranged = mine.filter(
      (u) => u.type === 'archer' || u.type === 'longbow' || u.type === 'crossbow' || u.type === 'arbaletrier'
    );
    if (ranged.length > 0) {
      const off = terrain.size / 2;
      let wallId: number | null = null;
      let bd = Infinity;
      for (const w of game.walls.values()) {
        if (w.player !== 0 || w.kind !== 'stone') continue;
        for (const t of game.wallTilesOf(w.id)) {
          const d = Math.hypot(t.x - off - wx, t.y - off - wz);
          if (d <= 3 && d < bd) {
            bd = d;
            wallId = w.id;
          }
        }
      }
      if (wallId !== null) {
        let any = false;
        for (const r of ranged) any = game.mountWall(r.id, wallId) || any;
        if (any) {
          sfx.order();
          refreshSelection();
          return;
        }
      }
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
    sfx.order();
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
      // Portão: alterna a muralha própria mais próxima do clique (raio 3).
      if (gateMode) {
        let best: { id: number; d: number } | null = null;
        for (const w of game.walls.values()) {
          if (w.player !== 0) continue;
          const tiles = game.wallTilesOf(w.id);
          for (const t of tiles) {
            const wx = t.x - terrain.size / 2;
            const wz = t.y - terrain.size / 2;
            const d = Math.hypot(wx - g.x, wz - g.z);
            if (d <= 3 && (!best || d < best.d)) best = { id: w.id, d };
          }
        }
        if (best) {
          const w = game.walls.get(best.id)!;
          game.setGate(best.id, 0, !w.gate);
          setHint(w.gate ? 'Portão fechado' : 'Portão aberto');
          sfx.order();
        } else {
          setHint('Sem muralha sua por aqui (Esc cancela)');
        }
        gateMode = false;
        refreshGrid();
        return;
      }
      // Rota de comércio: dois cliques em mercados próprios construídos.
      if (routeMode) {
        const market = [...game.buildings.values()].find(
          (b) => b.player === 0 && b.type === 'market' && b.built && Math.hypot(b.x - g.x, b.y - g.z) <= 3.5
        );
        if (!market) {
          setHint('Rota: clique em um mercado próprio (Esc cancela)');
        } else if (routeMode.from === undefined) {
          routeMode.from = market.id;
          setHint('Rota: clique o mercado de destino (Esc cancela)');
        } else {
          const id = game.assignRoute(routeMode.traderId, routeMode.from, market.id);
          setHint(id === -1 ? 'Rota inválida' : 'Rota de comércio ativa');
          if (id !== -1) sfx.order();
          else sfx.error();
          routeMode = null;
        }
        refreshGrid();
        return;
      }
      if (placeMode) {
        // Muralha: primeiro clique marca o início, segundo fecha o trecho.
        if (placeMode.building === 'palisade' && !placeMode.from) {
          placeMode.from = { x: g.x, y: g.z };
          setHint('Paliçada: clique o fim do trecho (Esc cancela)');
          refreshGrid();
          return;
        }
        if (placeMode.building === 'palisade' && placeMode.from) {
          const id = game.placeWall(0, 'palisade', placeMode.from.x, placeMode.from.y, g.x, g.z);
          if (id !== -1) {
            setHint('Paliçada em construção');
            sfx.build();
          } else {
            setHint('Sem fundos para a paliçada');
            sfx.error();
          }
          placeMode = null;
          refreshSelection();
          refreshGrid();
          return;
        }
        const id = game.orderBuild(0, placeMode.building, g.x, g.z);
        if (id !== -1) {
          for (const uid of selected) {
            const u = sim.state.units.find((v) => v.id === uid);
            if (u && u.type === 'villager') game.addBuilder(id, uid);
          }
          setHint(`${placeMode.building} em construção`);
          sfx.build();
        } else {
          setHint('Sem fundos ou era insuficiente');
          sfx.error();
        }
        placeMode = null;
        refreshSelection();
        refreshGrid();
        return;
      }
      // Raycast nas malhas primeiro (preciso); raio de fallback depois.
      const rayHit = pickUnit(e.clientX, e.clientY);
      const hit = rayHit.length > 0 ? rayHit : clickSelect(selView(), 0, g.x, g.z);
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
    if (selected.length > 0 || selectedB.length > 0) sfx.select();
  });
  el.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    if (placeMode || routeMode || gateMode) {
      placeMode = null;
      routeMode = null;
      gateMode = false;
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
      routeMode = null;
      gateMode = false;
      choosingAge = false;
      setHint(null);
      lastGridSig = '';
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
    const kl = e.key.toLowerCase();
    if (kl === 'q' || kl === 'e') {
      // Passo de 90° (SPEC HUD §3/§5).
      const next = rotate(cam, kl === 'q' ? Math.PI / 2 : -Math.PI / 2);
      cam.yaw = next.yaw;
      applyCamera();
      e.preventDefault();
    } else if (e.key === ' ') {
      // Espaço: centra no TC próprio (como no original).
      const tc = [...game.buildings.values()].find((b) => b.player === 0 && b.type === 'towncenter');
      if (tc) {
        cam.tx = tc.x;
        cam.tz = tc.y;
        applyCamera();
        e.preventDefault();
      }
    }
  });

  const idleVilBtn = document.getElementById('btn-idle-vil');
  idleVilBtn?.addEventListener('click', () => {
    const idle = game.idleVillagers(0);
    if (idle.length > 0) {
      selected = [idle[0]];
      selectedB = [];
      const u = sim.state.units.find((v) => v.id === idle[0]);
      if (u) {
        cam.tx = u.x;
        cam.tz = u.y;
        applyCamera();
      }
      refreshSelection();
      refreshGrid();
    }
  });
  const idleMilBtn = document.getElementById('btn-idle-mil');
  idleMilBtn?.addEventListener('click', () => {
    const idle = game.idleMilitary(0);
    if (idle.length > 0) {
      selected = [idle[0]];
      selectedB = [];
      const u = sim.state.units.find((v) => v.id === idle[0]);
      if (u) {
        cam.tx = u.x;
        cam.tz = u.y;
        applyCamera();
      }
      refreshSelection();
      refreshGrid();
    }
  });

  const muteBtn = document.getElementById('btn-mute');
  const paintMute = (): void => {
    if (muteBtn) muteBtn.textContent = isMuted() ? '🔇' : '🔊';
  };
  muteBtn?.addEventListener('click', () => {
    toggleMute();
    paintMute();
  });
  paintMute();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let frameN = 0;
  const bannerShown = { v: false };
  function frame(): void {
    game.tick(1 / 60);
    for (const b of bots) b.update(1 / 60);
    // Vitória (aniquilação/sagrados/maravilha/landmarks) calculada no Game.tick.
    syncUnits();
    // Minimapa e véu a cada 1s (encode é caro); resto a cada 0,25s.
    if (frameN % 60 === 0) {
      updateMinimap(terrain, sim, cam, (u) => u.player === 0 || game.isSeenByUnit(u, 0));
      updateShroud();
    }
    if (frameN % 15 === 0) {
      syncSettlement();
      syncWalls();
      syncBlocked();
      refreshGrid();
      if (game.winner && !bannerShown.v) {
        bannerShown.v = true;
        sfx.victory();
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
      // Aldeões por recurso (contagem de coletores ativos por fonte).
      const per: Record<string, number> = { food: 0, wood: 0, gold: 0, stone: 0 };
      for (const gr of game.gatherers.values()) {
        const k = gr.source?.kind;
        if (!k) continue;
        if (k === 'wood') per.wood++;
        else if (k === 'gold') per.gold++;
        else if (k === 'stone') per.stone++;
        else per.food++;
      }
      if (stock) {
        setText('res-food', `Food ${Math.floor(stock.food)} (+${per.food})`);
        setText('res-wood', `Wood ${Math.floor(stock.wood)} (+${per.wood})`);
        setText('res-gold', `Gold ${Math.floor(stock.gold)} (+${per.gold})`);
        setText('res-stone', `Stone ${Math.floor(stock.stone)} (+${per.stone})`);
        setText('res-pop', `Pop ${game.popUsed()[0] ?? 0}/${popCap([...game.buildings.values()])}`);
      }
      const ageEl = document.getElementById('age');
      const AGE_NAMES = ['Dark', 'Feudal', 'Castle', 'Imperial'];
      if (ageEl) ageEl.textContent = AGE_NAMES[game.ages[0]?.age - 1] ?? 'Dark';
      // Painel lateral: ociosos, objetivos, placar, produção global.
      setText('idle-vil-n', String(game.idleVillagers(0).length));
      setText('idle-mil-n', String(game.idleMilitary(0).length));
      const holders = [...game.sacred.sites.values()].map((s) => (s.owner === null ? '–' : `P${s.owner}`)).join(' ');
      setText('objectives', `Objetivos [${[...game.victories].join('/')}] · Sagrados ${holders} ${Math.floor(game.sacred.timer)}s`);
      const scores = game.stocks.map((_, p) => `P${p}:${game.score(p)}`).join(' ');
      setText('score', `Placar: ${scores}`);
      const queues: string[] = [];
      for (const b of game.buildings.values()) {
        if (b.player !== 0 || b.queue.length === 0) continue;
        queues.push(`${b.type}:${b.queue.map((q) => q.unit).join(',')}`);
      }
      setText('global-queue', `Produção: ${queues.length > 0 ? queues.join(' | ') : '—'}`);
    }
    renderer.render(scene, camera);
    (window as unknown as { __gameReady?: boolean }).__gameReady = true;
    frameN++;
    requestAnimationFrame(frame);
  }
  frame();

  return { sim, renderer, cam };
}

// Menu: ?test=1 inicia direto (e2e); senão o jogador configura o skirmish e clica em Iniciar.
const TEST_MODE = typeof location !== 'undefined' && location.search.includes('test=1');
{
  const mv = document.getElementById('menu-version');
  if (mv) mv.textContent = GAME_VERSION;
}

function readSkirmish(): SkirmishConfig {
  const civ = (document.getElementById('sel-civ') as HTMLSelectElement | null)?.value ?? 'albion';
  const botsN = Number((document.getElementById('sel-bots') as HTMLSelectElement | null)?.value ?? 1);
  const diff = ((document.getElementById('sel-diff') as HTMLSelectElement | null)?.value ?? 'medium') as 'easy' | 'medium' | 'hard';
  const reasons = ['annihilation', 'landmarks', 'sacred', 'wonder'].filter((r) => {
    const box = document.getElementById(`win-${r}`) as HTMLInputElement | null;
    return box?.checked ?? true;
  });
  const bots = Array.from({ length: Math.max(0, Math.min(3, botsN)) }, () => ({ difficulty: diff }));
  return { civ, bots, victories: reasons.length > 0 ? reasons : ['annihilation'] };
}

if (TEST_MODE) {
  const menu = document.getElementById('menu');
  if (menu) menu.style.display = 'none';
  // ?only=<reason> isola uma via de vitória no e2e (todas ligadas por padrão).
  // ?bots=N joga sem bots (mecânica pura, sem interferência).
  const params = new URLSearchParams(location.search);
  const only = params.get('only');
  const botsN = params.get('bots');
  const cfg = { ...DEFAULT_SKIRMISH };
  if (only) cfg.victories = [only];
  if (botsN !== null) cfg.bots = [];
  boot(cfg);
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
    boot(readSkirmish());
  }, { once: true });
}
