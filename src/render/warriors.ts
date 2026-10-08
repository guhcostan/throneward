/**
 * Unidades militares low-poly procedurais (Fase 3). Arte ORIGINAL, gerada por código.
 *
 * Módulo SEM WebGLRenderer: apenas geometrias/malhas do Three.js, testável
 * em headless. Tudo é determinístico (sem Math.random).
 *
 * Convenções:
 * - Unidades de mundo: 1 tile = 1 unidade.
 * - Origem: centro da unidade no plano XZ; pés/base em y = 0.
 * - Infantaria ~1.4 de altura; cavalaria ~2.0.
 * - Paleta terrosa, coerente com `buildings.ts` (madeira, couro, ferro, barro).
 * - Detalhe de jogador: meshes marcados com `userData.cloak = true` são
 *   tingidos por `setPlayerColor`.
 */
import * as THREE from 'three';

export type WarriorKind =
  | 'spearman'
  | 'archer'
  | 'longbow'
  | 'crossbow'
  | 'manatarms'
  | 'knight'
  | 'scout'
  | 'monk'
  | 'ram'
  | 'mangonel';

type V3 = readonly [number, number, number];

const PALETTE = {
  tunic: 0x7d6a4f,
  leather: 0x6b4f35,
  iron: 0x4f4f57,
  steel: 0x8e9196,
  wood: 0x8a6b4a,
  woodDark: 0x5e4630,
  skin: 0xc49a6c,
  hair: 0x3b2a1e,
  shield: 0x7a4a3a,
  horse: 0x7b5a3a,
  horseDark: 0x4a3322,
  robe: 0x9a8a6a,
  rope: 0xb8a57a,
  stone: 0x9a9a9a,
  roof: 0x7a4a3a,
  cloak: 0x8c3b2e,
} as const;

function mat(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });
}

function part(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  color: number,
  pos: V3,
  rot: V3 = [0, 0, 0],
  cloak = false,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, mat(color));
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.set(rot[0], rot[1], rot[2]);
  if (cloak) mesh.userData.cloak = true;
  parent.add(mesh);
  return mesh;
}

/** Caixa com centro em `pos`. */
function box(
  parent: THREE.Object3D,
  size: V3,
  color: number,
  pos: V3,
  rot?: V3,
  cloak = false,
): THREE.Mesh {
  return part(parent, new THREE.BoxGeometry(size[0], size[1], size[2]), color, pos, rot, cloak);
}

/** Cilindro com centro em `pos`. */
function cyl(
  parent: THREE.Object3D,
  radius: number,
  height: number,
  color: number,
  pos: V3,
  rot?: V3,
  segments = 8,
): THREE.Mesh {
  return part(parent, new THREE.CylinderGeometry(radius, radius, height, segments), color, pos, rot);
}

/** Cone com base em pos[1]-h/2 e ápice em pos[1]+h/2. */
function cone(
  parent: THREE.Object3D,
  radius: number,
  height: number,
  color: number,
  pos: V3,
  segments = 8,
): THREE.Mesh {
  return part(parent, new THREE.ConeGeometry(radius, height, segments), color, pos);
}

/** Esfera (cabeça, juntas). */
function sphere(parent: THREE.Object3D, radius: number, color: number, pos: V3): THREE.Mesh {
  return part(parent, new THREE.SphereGeometry(radius, 8, 6), color, pos);
}

/** Segmento de cilindro ligando dois pontos (usado em arcos e hastes inclinadas). */
function segment(
  parent: THREE.Object3D,
  a: V3,
  b: V3,
  radius: number,
  color: number,
): THREE.Mesh {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 6), mat(color));
  mesh.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(mesh);
  return mesh;
}

/**
 * Arco de arma curvado por `segs` segmentos no plano YZ, com centro da curva
 * em (x, yc, zc - R): o ponto médio fica em z = zc e as pontas recuam.
 */
function bowLimb(
  parent: THREE.Object3D,
  x: number,
  yc: number,
  zc: number,
  radius: number,
  halfAngle: number,
  segs: number,
  color: number,
): void {
  const pts: V3[] = [];
  for (let i = 0; i <= segs; i++) {
    const phi = -halfAngle + (2 * halfAngle * i) / segs;
    pts.push([x, yc + radius * Math.sin(phi), zc - radius + radius * Math.cos(phi)]);
  }
  for (let i = 0; i < segs; i++) {
    segment(parent, pts[i], pts[i + 1], 0.035, color);
  }
  const first = pts[0];
  const last = pts[segs];
  segment(parent, first, last, 0.01, PALETTE.rope);
}

/** Corpo de infantaria (~1.4 de altura), voltado para +Z. */
function footBody(g: THREE.Group, tunic: number = PALETTE.tunic): void {
  box(g, [0.16, 0.5, 0.16], PALETTE.leather, [-0.1, 0.25, 0]);
  box(g, [0.16, 0.5, 0.16], PALETTE.leather, [0.1, 0.25, 0]);
  box(g, [0.42, 0.5, 0.26], tunic, [0, 0.75, 0]);
  box(g, [0.12, 0.4, 0.12], tunic, [-0.3, 0.8, 0]);
  box(g, [0.12, 0.4, 0.12], tunic, [0.3, 0.8, 0]);
  sphere(g, 0.14, PALETTE.skin, [0, 1.25, 0]);
  cyl(g, 0.16, 0.06, PALETTE.iron, [0, 1.36, 0], undefined, 8);
  // Capa/tabardo de jogador: fica nas costas.
  box(g, [0.36, 0.5, 0.03], PALETTE.cloak, [0, 0.8, -0.17], undefined, true);
}

function spearman(g: THREE.Group): void {
  footBody(g);
  // Escudo redondo no braço esquerdo.
  cyl(g, 0.2, 0.04, PALETTE.shield, [-0.38, 0.8, 0.12], [Math.PI / 2, 0, 0], 10);
  // Lança longa inclinada com ponta de ferro.
  segment(g, [0.36, 0.7, 0.05], [0.45, 2.1, 0.12], 0.025, PALETTE.wood);
  cone(g, 0.05, 0.22, PALETTE.steel, [0.455, 2.25, 0.125]);
}

function archerLike(g: THREE.Group, longbow: boolean): void {
  footBody(g);
  // Aljava nas costas.
  box(g, [0.1, 0.4, 0.1], PALETTE.leather, [0.16, 0.95, -0.2], [0, 0, 0.2]);
  // Arco na mão esquerda (curvo para frente).
  const R = longbow ? 0.95 : 0.7;
  const half = longbow ? 1.0 : 0.9;
  bowLimb(g, -0.38, 0.85, 0.25, R, half, 3, PALETTE.wood);
  // Flecha em posição de tiro (mão direita).
  segment(g, [0.3, 0.85, 0.1], [0.3, 0.85, 0.6], 0.015, PALETTE.wood);
}

function crossbow(g: THREE.Group): void {
  footBody(g);
  // Coronha.
  box(g, [0.1, 0.12, 0.7], PALETTE.woodDark, [0.3, 0.85, 0.22]);
  // Cabide/arco transversal.
  box(g, [0.85, 0.06, 0.06], PALETTE.wood, [0.3, 0.9, 0.58]);
  // Gatilho.
  box(g, [0.04, 0.1, 0.04], PALETTE.iron, [0.3, 0.78, 0.05]);
  // Aljava.
  box(g, [0.1, 0.4, 0.1], PALETTE.leather, [0.16, 0.95, -0.2], [0, 0, 0.2]);
}

function manAtArms(g: THREE.Group): void {
  footBody(g, PALETTE.steel);
  // Elmo.
  cyl(g, 0.15, 0.12, PALETTE.iron, [0, 1.3, 0]);
  // Escudo de tábua com aro.
  cyl(g, 0.24, 0.05, PALETTE.shield, [-0.38, 0.8, 0.14], [Math.PI / 2, 0, 0], 10);
  // Espada: lâmina + guarda.
  box(g, [0.05, 0.6, 0.02], PALETTE.steel, [0.36, 1.05, 0.1]);
  box(g, [0.18, 0.04, 0.04], PALETTE.iron, [0.36, 0.74, 0.1]);
}

/** Cavalo (corpo, pescoço, cabeça, 4 pernas) de altura ~1.15 até a cernelha. */
function horse(g: THREE.Group, bodyColor: number, scale: number): THREE.Group {
  const h = new THREE.Group();
  h.scale.setScalar(scale);
  g.add(h);
  box(h, [1.0, 0.5, 0.4], bodyColor, [0, 0.9, 0]);
  box(h, [0.22, 0.5, 0.22], bodyColor, [0.5, 1.2, 0], [0, 0, -0.5]);
  box(h, [0.32, 0.22, 0.18], bodyColor, [0.66, 1.4, 0]);
  box(h, [0.1, 0.3, 0.1], PALETTE.horseDark, [-0.56, 0.95, 0], [0, 0, 0.4]);
  box(h, [0.12, 0.8, 0.12], PALETTE.horseDark, [-0.38, 0.4, -0.14]);
  box(h, [0.12, 0.8, 0.12], PALETTE.horseDark, [-0.38, 0.4, 0.14]);
  box(h, [0.12, 0.8, 0.12], PALETTE.horseDark, [0.38, 0.4, -0.14]);
  box(h, [0.12, 0.8, 0.12], PALETTE.horseDark, [0.38, 0.4, 0.14]);
  return h;
}

/** Cavaleiro sobre o cavalo: altura total ~2.0. */
function rider(g: THREE.Group, armor: boolean): void {
  box(g, [0.3, 0.5, 0.26], armor ? PALETTE.steel : PALETTE.tunic, [0, 1.5, 0]);
  box(g, [0.1, 0.35, 0.1], PALETTE.leather, [-0.2, 1.4, 0.16]);
  box(g, [0.1, 0.35, 0.1], PALETTE.leather, [0.2, 1.4, 0.16]);
  sphere(g, 0.14, PALETTE.skin, [0, 1.9, 0]);
  cyl(g, 0.16, 0.1, armor ? PALETTE.iron : PALETTE.leather, [0, 2.0, 0]);
  box(g, [0.36, 0.5, 0.03], PALETTE.cloak, [0, 1.5, -0.15], undefined, true);
}

function knight(g: THREE.Group): void {
  horse(g, PALETTE.horse, 1);
  rider(g, true);
  // Lança de cavaleiro, apoiada no lado direito.
  segment(g, [0.3, 1.3, 0.15], [0.7, 2.0, 0.55], 0.03, PALETTE.wood);
  // Escudo no braço esquerdo.
  cyl(g, 0.2, 0.04, PALETTE.shield, [-0.3, 1.5, 0.2], [Math.PI / 2, 0, 0], 10);
}

function scout(g: THREE.Group): void {
  horse(g, PALETTE.rope, 0.9);
  rider(g, false);
  // Dardo curto.
  segment(g, [0.28, 1.4, 0.1], [0.5, 1.8, 0.3], 0.02, PALETTE.wood);
}

function monk(g: THREE.Group): void {
  // Túnica em cone (ápice no topo) com capuz simples.
  cone(g, 0.34, 1.1, PALETTE.robe, [0, 0.55, 0], 8);
  sphere(g, 0.14, PALETTE.skin, [0, 1.2, 0]);
  cone(g, 0.18, 0.2, PALETTE.robe, [0, 1.3, -0.04], 8);
  // Capa de jogador nas costas da túnica.
  box(g, [0.4, 0.6, 0.03], PALETTE.cloak, [0, 0.6, -0.31], undefined, true);
  // Cajado.
  segment(g, [0.36, 0.0, 0.08], [0.36, 1.5, 0.08], 0.03, PALETTE.woodDark);
}

function ram(g: THREE.Group): void {
  // Estrutura inferior e chassi.
  box(g, [1.6, 0.25, 0.6], PALETTE.wood, [0, 0.45, 0]);
  // Rodas.
  for (const x of [-0.6, 0.6]) {
    for (const z of [-0.36, 0.36]) {
      cyl(g, 0.22, 0.1, PALETTE.woodDark, [x, 0.22, z], [0, 0, Math.PI / 2]);
    }
  }
  // Telhado de duas águas protegendo a equipe.
  box(g, [1.6, 0.08, 0.45], PALETTE.roof, [0, 0.95, -0.22], [0.6, 0, 0]);
  box(g, [1.6, 0.08, 0.45], PALETTE.roof, [0, 0.95, 0.22], [-0.6, 0, 0]);
  // Tronco com ponta de ferro.
  cyl(g, 0.1, 1.4, PALETTE.wood, [0, 0.6, 0], [0, 0, Math.PI / 2]);
  sphere(g, 0.14, PALETTE.iron, [0.75, 0.6, 0]);
  // Estandarte de jogador.
  box(g, [0.5, 0.3, 0.03], PALETTE.cloak, [0, 1.15, 0.0], undefined, true);
}

function mangonel(g: THREE.Group): void {
  // Base e rodas.
  box(g, [0.9, 0.2, 0.7], PALETTE.woodDark, [0, 0.3, 0]);
  for (const z of [-0.4, 0.4]) {
    cyl(g, 0.22, 0.08, PALETTE.wood, [0, 0.22, z], [0, 0, Math.PI / 2]);
  }
  // Montantes laterais.
  box(g, [0.08, 0.6, 0.08], PALETTE.wood, [0, 0.65, -0.3]);
  box(g, [0.08, 0.6, 0.08], PALETTE.wood, [0, 0.65, 0.3]);
  // Braço inclinado com colher na ponta.
  box(g, [0.1, 0.1, 1.3], PALETTE.wood, [-0.1, 1.0, 0], [0.6, 0, 0]);
  box(g, [0.26, 0.14, 0.26], PALETTE.iron, [-0.55, 1.45, 0]);
  // Estandarte de jogador.
  box(g, [0.04, 0.3, 0.3], PALETTE.cloak, [0.0, 1.1, -0.35], undefined, true);
}

/** Cria a malha de uma unidade militar. Determinística. */
export function warriorMesh(kind: WarriorKind): THREE.Group {
  const g = new THREE.Group();
  g.name = `warrior:${kind}`;
  switch (kind) {
    case 'spearman':
      spearman(g);
      break;
    case 'archer':
      archerLike(g, false);
      break;
    case 'longbow':
      archerLike(g, true);
      break;
    case 'crossbow':
      crossbow(g);
      break;
    case 'manatarms':
      manAtArms(g);
      break;
    case 'knight':
      knight(g);
      break;
    case 'scout':
      scout(g);
      break;
    case 'monk':
      monk(g);
      break;
    case 'ram':
      ram(g);
      break;
    case 'mangonel':
      mangonel(g);
      break;
  }
  return g;
}

/** Tinge os meshes de jogador (`userData.cloak === true`) com a cor `hex`. */
export function setPlayerColor(g: THREE.Group, hex: number): void {
  g.traverse((obj) => {
    if (obj.userData.cloak !== true) return;
    if (!(obj instanceof THREE.Mesh)) return;
    if (obj.material instanceof THREE.MeshStandardMaterial) {
      obj.material.color.setHex(hex);
    }
  });
}
