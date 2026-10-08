/**
 * Prédios low-poly procedurais (Fase 2). Arte ORIGINAL, gerada por código.
 *
 * Módulo SEM WebGLRenderer: apenas geometrias/malhas do Three.js, testável
 * em headless. Tudo é determinístico (sem Math.random).
 *
 * Convenções:
 * - Unidades de mundo: 1 tile = 1 unidade.
 * - Origem: centro do prédio no plano XZ; base do prédio em y = 0.
 * - Paleta terrosa própria deste projeto (madeira, pedra, telha, barro).
 */
import * as THREE from 'three';

export type BuildingKind =
  | 'towncenter'
  | 'house'
  | 'farm'
  | 'mill'
  | 'lumbercamp'
  | 'miningcamp'
  | 'barracks'
  | 'archerrange'
  | 'stable'
  | 'blacksmith'
  | 'market'
  | 'monastery'
  | 'outpost';

type V3 = readonly [number, number, number];

const PALETTE = {
  wood: 0x8a6b4a,
  woodDark: 0x5e4630,
  stone: 0x9a9a9a,
  stoneDark: 0x6e6a64,
  roof: 0x7a4a3a,
  clay: 0xb06a44,
  plaster: 0xd6c8a6,
  iron: 0x4f4f57,
  soil: 0x5c4630,
  crop: 0x6f8f3a,
  cloth: 0x8c3b2e,
  canopy: 0xc0a060,
  flag: 0xa33a2a,
  white: 0xe6dccb,
  hay: 0xc9a84a,
  forge: 0xb0502a,
} as const;

const GABLE_ANGLE = 0.5;

function mat(color: number, opacity: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
    transparent: opacity < 1,
    opacity,
  });
}

function place(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  color: number,
  pos: V3,
  rot: V3 = [0, 0, 0],
  opacity = 1,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, mat(color, opacity));
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.set(rot[0], rot[1], rot[2]);
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
  opacity?: number,
): THREE.Mesh {
  return place(parent, new THREE.BoxGeometry(size[0], size[1], size[2]), color, pos, rot, opacity);
}

/** Cilindro (ou tronco de cone) com centro em `pos`. */
function cyl(
  parent: THREE.Object3D,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments: number,
  color: number,
  pos: V3,
  rot?: V3,
): THREE.Mesh {
  return place(
    parent,
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    color,
    pos,
    rot,
  );
}

/** Cone com base em y = pos[1] - h/2 e ápice em y = pos[1] + h/2. */
function cone(
  parent: THREE.Object3D,
  radius: number,
  height: number,
  segments: number,
  color: number,
  pos: V3,
  rot?: V3,
): THREE.Mesh {
  return place(parent, new THREE.ConeGeometry(radius, height, segments), color, pos, rot);
}

/**
 * Telhado de duas águas com cumeeira paralela ao eixo X.
 * `yRidge` é a altura da cumeeira; `span` é a profundidade (eixo Z) coberta.
 */
function gableX(
  parent: THREE.Object3D,
  ridgeLength: number,
  span: number,
  yRidge: number,
  color: number,
  center: readonly [number, number] = [0, 0],
): void {
  const half = span / 2;
  const panelLen = half / Math.cos(GABLE_ANGLE) + 0.1;
  const yc = yRidge - (span / 4) * Math.sin(GABLE_ANGLE);
  box(parent, [ridgeLength, 0.12, panelLen], color, [center[0], yc, center[1] - span / 4], [-GABLE_ANGLE, 0, 0]);
  box(parent, [ridgeLength, 0.12, panelLen], color, [center[0], yc, center[1] + span / 4], [GABLE_ANGLE, 0, 0]);
}

/**
 * Telhado de duas águas com cumeeira paralela ao eixo Z.
 * `yRidge` é a altura da cumeeira; `span` é a largura (eixo X) coberta.
 */
function gableZ(
  parent: THREE.Object3D,
  ridgeLength: number,
  span: number,
  yRidge: number,
  color: number,
  center: readonly [number, number] = [0, 0],
): void {
  const half = span / 2;
  const panelLen = half / Math.cos(GABLE_ANGLE) + 0.1;
  const yc = yRidge - (span / 4) * Math.sin(GABLE_ANGLE);
  box(parent, [panelLen, 0.12, ridgeLength], color, [center[0] - span / 4, yc, center[1]], [0, 0, GABLE_ANGLE]);
  box(parent, [panelLen, 0.12, ridgeLength], color, [center[0] + span / 4, yc, center[1]], [0, 0, -GABLE_ANGLE]);
}

type Builder = (g: THREE.Group) => void;

const BUILDERS: Record<BuildingKind, Builder> = {
  towncenter(g) {
    // Base maciça 6x2.6x6 com friso e telhado piramidal.
    box(g, [6, 2.6, 6], PALETTE.stone, [0, 1.3, 0]);
    box(g, [5.2, 0.4, 5.2], PALETTE.stoneDark, [0, 2.8, 0]);
    cone(g, 4.3, 1.4, 4, PALETTE.roof, [0, 3.7, 0], [0, Math.PI / 4, 0]);
    // Torre de vigia no canto.
    cyl(g, 0.9, 1.1, 5, 8, PALETTE.stone, [2, 2.5, 2]);
    cone(g, 1.1, 1.2, 8, PALETTE.roof, [2, 5.6, 2]);
    // Mastro e bandeira sobre a torre.
    cyl(g, 0.04, 0.04, 1.2, 5, PALETTE.woodDark, [2, 6.8, 2]);
    box(g, [0.6, 0.4, 0.02], PALETTE.flag, [2.3, 7.2, 2]);
    // Portal frontal.
    box(g, [1.2, 1.6, 0.2], PALETTE.woodDark, [0, 0.8, 3.05]);
  },

  house(g) {
    // Corpo 1.6x1.4x1.6 com telhado de duas águas (cumeeira em Z) => ~2.5 de altura.
    box(g, [1.6, 1.4, 1.6], PALETTE.plaster, [0, 0.7, 0]);
    gableZ(g, 2.0, 1.9, 2.45, PALETTE.roof);
    box(g, [0.4, 0.8, 0.1], PALETTE.woodDark, [0, 0.4, 0.85]);
    box(g, [0.35, 0.35, 0.05], PALETTE.woodDark, [0.5, 0.9, 0.82]);
    box(g, [0.25, 0.6, 0.25], PALETTE.stoneDark, [0.5, 2.1, -0.3]);
  },

  farm(g) {
    // Campo plano 3x0.2x3 com cinco fileiras verdes finas.
    box(g, [3, 0.2, 3], PALETTE.soil, [0, 0.1, 0]);
    for (let i = 0; i < 5; i++) {
      box(g, [2.8, 0.1, 0.3], PALETTE.crop, [0, 0.25, -1.2 + i * 0.6]);
    }
  },

  mill(g) {
    // Base de pedra, corpo cônico de barro e telhado.
    cyl(g, 1.3, 1.4, 1.4, 10, PALETTE.stone, [0, 0.7, 0]);
    cyl(g, 0.9, 1.2, 2.2, 8, PALETTE.plaster, [0, 2.5, 0]);
    cone(g, 1.1, 0.9, 8, PALETTE.roof, [0, 4.05, 0]);
    // Rodízio: cubo com duas pás em cruz, girado no eixo X lateral.
    const hub = new THREE.Group();
    hub.position.set(1.25, 2.6, 0);
    g.add(hub);
    box(hub, [0.12, 1.8, 0.1], PALETTE.wood, [0, 0, 0]);
    box(hub, [0.12, 0.1, 1.8], PALETTE.wood, [0, 0, 0]);
  },

  lumbercamp(g) {
    // Cabana, toras empilhadas e toco de corte.
    box(g, [2, 1.2, 1.6], PALETTE.wood, [-0.4, 0.6, -0.4]);
    cone(g, 1.5, 0.8, 4, PALETTE.roof, [-0.4, 1.6, -0.4], [0, Math.PI / 4, 0]);
    cyl(g, 0.22, 0.22, 1.2, 6, PALETTE.woodDark, [0.9, 0.22, 0.9], [0, 0, Math.PI / 2]);
    cyl(g, 0.22, 0.22, 1.2, 6, PALETTE.woodDark, [0.9, 0.22, 0.45], [0, 0, Math.PI / 2]);
    cyl(g, 0.22, 0.22, 1.2, 6, PALETTE.woodDark, [0.9, 0.66, 0.675], [0, 0, Math.PI / 2]);
    cyl(g, 0.35, 0.35, 0.4, 8, PALETTE.wood, [-1.0, 0.2, 1.1]);
  },

  miningcamp(g) {
    // Tenda cônica, carrinho de minério e pilha de pedras.
    cone(g, 1.4, 1.6, 4, PALETTE.cloth, [0, 0.8, -0.2], [0, Math.PI / 4, 0]);
    box(g, [1.2, 0.6, 0.8], PALETTE.iron, [1.0, 0.3, 0.9]);
    box(g, [0.6, 0.5, 0.6], PALETTE.stoneDark, [-1.0, 0.25, 1.0]);
    box(g, [0.5, 0.4, 0.5], PALETTE.stone, [-0.5, 0.2, 1.2]);
    box(g, [0.15, 1.4, 0.15], PALETTE.woodDark, [-1.4, 0.7, -0.9]);
    box(g, [0.15, 1.4, 0.15], PALETTE.woodDark, [-0.6, 0.7, -1.0]);
    box(g, [1.0, 0.15, 0.15], PALETTE.woodDark, [-1.0, 1.4, -0.95]);
  },

  barracks(g) {
    // Caserna longa de pedra com telhado de duas águas e mastro.
    box(g, [3.6, 1.8, 2.6], PALETTE.stone, [0, 0.9, 0]);
    gableX(g, 3.8, 2.6, 2.6, PALETTE.roof);
    box(g, [0.6, 1.0, 0.1], PALETTE.woodDark, [0, 0.5, 1.33]);
    cyl(g, 0.04, 0.04, 1.6, 5, PALETTE.woodDark, [1.6, 2.6, -1.0]);
    box(g, [0.5, 0.3, 0.02], PALETTE.flag, [1.85, 3.1, -1.0]);
  },

  archerrange(g) {
    // Alvo de palha em dois postes, linha de tiro e cerca.
    box(g, [0.12, 2.2, 0.12], PALETTE.woodDark, [-0.8, 1.1, -1.2]);
    box(g, [0.12, 2.2, 0.12], PALETTE.woodDark, [0.8, 1.1, -1.2]);
    cyl(g, 0.6, 0.6, 0.1, 12, PALETTE.white, [0, 1.6, -1.2], [Math.PI / 2, 0, 0]);
    cyl(g, 0.3, 0.3, 0.11, 12, PALETTE.cloth, [0, 1.6, -1.2], [Math.PI / 2, 0, 0]);
    box(g, [4, 0.5, 0.4], PALETTE.stoneDark, [0, 0.25, 1.6]);
    box(g, [0.1, 0.9, 0.1], PALETTE.wood, [-1.6, 0.45, 1.5]);
    box(g, [0.1, 0.9, 0.1], PALETTE.wood, [1.6, 0.45, 1.5]);
  },

  stable(g) {
    // Celeiro com telhado, cercado e feno.
    box(g, [3, 1.8, 2.4], PALETTE.wood, [-0.5, 0.9, -0.6]);
    gableX(g, 3.2, 2.4, 2.6, PALETTE.roof, [-0.5, -0.6]);
    box(g, [0.12, 1.0, 0.12], PALETTE.woodDark, [1.4, 0.5, -1.5]);
    box(g, [0.12, 1.0, 0.12], PALETTE.woodDark, [1.4, 0.5, 0.0]);
    box(g, [0.12, 1.0, 0.12], PALETTE.woodDark, [1.4, 0.5, 1.5]);
    box(g, [0.08, 0.08, 3.1], PALETTE.woodDark, [1.4, 0.7, 0.0]);
    cyl(g, 0.4, 0.4, 0.6, 8, PALETTE.hay, [1.4, 0.3, -1.6], [0, 0, Math.PI / 2]);
  },

  blacksmith(g) {
    // Oficina de pedra com chaminé, bigorna e brasa.
    box(g, [2, 1.4, 1.8], PALETTE.stoneDark, [-0.3, 0.7, 0]);
    box(g, [2.2, 0.2, 2.0], PALETTE.roof, [-0.3, 1.5, 0]);
    cyl(g, 0.25, 0.3, 1.6, 8, PALETTE.stoneDark, [0.6, 2.3, 0.6]);
    box(g, [0.5, 0.2, 0.4], PALETTE.forge, [-0.9, 0.12, 0.7]);
    box(g, [0.7, 0.35, 0.4], PALETTE.iron, [1.0, 0.17, -0.9]);
    box(g, [0.9, 0.1, 0.4], PALETTE.iron, [1.0, 0.4, -0.9]);
  },

  market(g) {
    // Banca com dossel de tecido, balcão e caixas.
    box(g, [0.15, 2.2, 0.15], PALETTE.wood, [-1.5, 1.1, -1.5]);
    box(g, [0.15, 2.2, 0.15], PALETTE.wood, [1.5, 1.1, -1.5]);
    box(g, [0.15, 2.2, 0.15], PALETTE.wood, [-1.5, 1.1, 1.5]);
    box(g, [0.15, 2.2, 0.15], PALETTE.wood, [1.5, 1.1, 1.5]);
    cone(g, 2.4, 0.7, 4, PALETTE.canopy, [0, 2.5, 0], [0, Math.PI / 4, 0]);
    box(g, [2.4, 0.8, 0.7], PALETTE.wood, [0, 0.4, 1.0]);
    box(g, [0.5, 0.5, 0.5], PALETTE.wood, [-0.9, 0.25, -1.0]);
    box(g, [0.5, 0.5, 0.5], PALETTE.wood, [-0.2, 0.25, -1.0]);
    cyl(g, 0.25, 0.25, 0.6, 8, PALETTE.woodDark, [1.1, 0.3, -1.1]);
  },

  monastery(g) {
    // Nave de barro/gesso, torre de pedra com cruz e portal.
    box(g, [3.2, 2.2, 2.0], PALETTE.plaster, [0, 1.1, -0.4]);
    gableX(g, 3.4, 2.0, 2.6, PALETTE.roof, [0, -0.4]);
    cyl(g, 0.6, 0.7, 3.2, 8, PALETTE.stone, [1.4, 1.6, -1.0]);
    cone(g, 0.75, 1.0, 8, PALETTE.roof, [1.4, 3.7, -1.0]);
    box(g, [0.08, 0.4, 0.08], PALETTE.iron, [1.4, 4.4, -1.0]);
    box(g, [0.25, 0.08, 0.08], PALETTE.iron, [1.4, 4.35, -1.0]);
    box(g, [0.6, 1.0, 0.1], PALETTE.woodDark, [0, 0.5, 0.65]);
  },

  outpost(g) {
    // Torre de vigia 1.5x4x1.5 com telhado cônico e ameias.
    box(g, [1.5, 4, 1.5], PALETTE.stone, [0, 2, 0]);
    cone(g, 1.2, 1.6, 4, PALETTE.roof, [0, 4.8, 0], [0, Math.PI / 4, 0]);
    box(g, [0.35, 0.4, 0.35], PALETTE.stoneDark, [0.55, 4.2, 0.55]);
    box(g, [0.35, 0.4, 0.35], PALETTE.stoneDark, [-0.55, 4.2, -0.55]);
    box(g, [0.2, 0.5, 0.1], PALETTE.woodDark, [0, 1.1, 0.8]);
  },
};

const FOOTPRINTS: Record<BuildingKind, { w: number; h: number }> = {
  towncenter: { w: 6, h: 6 },
  house: { w: 2, h: 2 },
  farm: { w: 3, h: 3 },
  mill: { w: 3, h: 3 },
  lumbercamp: { w: 3, h: 3 },
  miningcamp: { w: 3, h: 3 },
  barracks: { w: 4, h: 4 },
  archerrange: { w: 4, h: 4 },
  stable: { w: 4, h: 4 },
  blacksmith: { w: 3, h: 3 },
  market: { w: 4, h: 4 },
  monastery: { w: 4, h: 4 },
  outpost: { w: 3, h: 3 },
};

/** Malha 3D do prédio, pronta para ser posicionada no mundo. */
export function buildingMesh(kind: BuildingKind): THREE.Group {
  const group = new THREE.Group();
  group.name = `building-${kind}`;
  BUILDERS[kind](group);
  return group;
}

/** Pegada em tiles (largura w, profundidade h). Sempre > 0. */
export function buildingFootprint(kind: BuildingKind): { w: number; h: number } {
  const fp = FOOTPRINTS[kind];
  return { w: fp.w, h: fp.h };
}

/**
 * Andaime de construção: esqueleto de postes, travessas e base semitransparente
 * com a mesma pegada do prédio. `progress` (0..1) escala o grupo em Y.
 */
export function constructionMesh(kind: BuildingKind, progress: number): THREE.Group {
  const { w, h } = buildingFootprint(kind);
  const bounds = new THREE.Box3().setFromObject(buildingMesh(kind));
  const height = Math.max(bounds.max.y, 1);

  const group = new THREE.Group();
  group.name = `construction-${kind}`;

  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;

  // Base semitransparente (plataforma).
  box(group, [w, 0.15, h], PALETTE.wood, [0, 0.075, 0], undefined, 0.35);

  // Quatro postes de canto.
  const inX = w / 2 - 0.15;
  const inZ = h / 2 - 0.15;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(group, [0.2, height, 0.2], PALETTE.woodDark, [sx * inX, height / 2, sz * inZ]);
    }
  }

  // Travessas superiores em volta da pegada.
  const topY = height - 0.1;
  box(group, [w, 0.12, 0.12], PALETTE.woodDark, [0, topY, -inZ]);
  box(group, [w, 0.12, 0.12], PALETTE.woodDark, [0, topY, inZ]);
  box(group, [0.12, 0.12, h], PALETTE.woodDark, [-inX, topY, 0]);
  box(group, [0.12, 0.12, h], PALETTE.woodDark, [inX, topY, 0]);

  // Escala Y pelo progresso (mínimo visível para não virar degenerado).
  group.scale.y = Math.max(0.05, p);
  return group;
}
