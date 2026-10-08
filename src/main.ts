import * as THREE from 'three';
import { Sim } from './sim/sim';
import { Game } from './sim/game';
import { generateTerrain, type TerrainData } from './sim/terrain';
import { createCamera, attachCamera, cameraPos, type CameraState } from './render/camera';
import { heightColor, forestInstances, minimapImage } from './render/world';
import { Settlement } from './render/settlement';
import type { BuildingKind } from './render/buildings';

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

export function boot(): { sim: Sim; renderer: THREE.WebGLRenderer; cam: CameraState } {
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
  attachCamera(renderer.domElement, () => cam, applyCamera);

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

  const game = new Game(SEED, 2);
  const sim = game.sim;
  for (const s of terrain.spawns) {
    sim.spawnUnit('villager', 0, s.x - terrain.size / 2, s.y - terrain.size / 2);
  }
  sim.spawnUnit('scout', 0, 0, 0);
  // Initial town center for player 0 (built instantly — test/scenario setup).
  const tcId = game.orderBuild(0, 'towncenter', terrain.spawns[0].x - terrain.size / 2, terrain.spawns[0].y - terrain.size / 2);
  const tc = game.buildings.get(tcId);
  if (tc) {
    tc.progress = 1;
    tc.built = true;
    tc.hp = tc.maxHp;
  }

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
    | { type: 'instant'; buildingId: number };
  (window as unknown as { __game: unknown }).__game = {
    sim,
    game,
    terrain: { seed: SEED, size: MAP_SIZE, spawns: terrain.spawns },
    getState: () => JSON.parse(JSON.stringify({
      tick: sim.state.tick,
      units: sim.state.units,
      resources: sim.state.resources,
      pop: game.popUsed(),
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
      return { ok: false, error: 'unknown command' };
    },
    version: '0.2-fase2'
  };

  const unitMesh = new THREE.InstancedMesh(
    new THREE.CapsuleGeometry(0.3, 0.8, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffff }),
    512
  );
  scene.add(unitMesh);
  const unitColor = new THREE.Color();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let frameN = 0;
  function frame(): void {
    game.tick(1 / 60);
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
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();

  return { sim, renderer, cam };
}

boot();
