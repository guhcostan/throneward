/**
 * Renderer de assentamento (Fase 2): mantém um nó THREE.Group por prédio/obra
 * na cena, a partir de itens simples (id, tipo, posição, progresso).
 *
 * Módulo SEM WebGLRenderer: apenas objetos de cena, testável em headless.
 * Determinístico (sem Math.random). Malhas de prédio concluído são construídas
 * uma vez por tipo (cache) e clonadas por instância, compartilhando geometria
 * e material.
 */
import * as THREE from 'three';
import { buildingMesh, constructionMesh, type BuildingKind } from './buildings';

export { buildingFootprint } from './buildings';

export interface SettlementItem {
  id: number;
  kind: BuildingKind;
  x: number;
  z: number;
  groundY: number;
  progress: number;
  built: boolean;
}

/** Diferença mínima de progresso para reconstruir o andaime. */
const PROGRESS_REBUILD_STEP = 0.05;

/** Estado visual guardado em `userData` de cada nó. */
interface NodeState {
  kind: BuildingKind;
  built: boolean;
  progress: number;
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

export class Settlement {
  readonly group = new THREE.Group();
  private nodes = new Map<number, THREE.Group>();
  private templates = new Map<BuildingKind, THREE.Group>();

  /** Cria ou atualiza o nó do item `it`, posicionando-o em (x, groundY, z). */
  upsert(it: SettlementItem): void {
    const progress = clamp01(it.progress);
    let node = this.nodes.get(it.id);

    if (!node) {
      node = new THREE.Group();
      node.name = `settlement-${it.id}`;
      this.nodes.set(it.id, node);
      this.group.add(node);
      this.rebuild(node, it.kind, it.built, progress);
    } else {
      const state = node.userData as NodeState;
      const needsRebuild =
        state.kind !== it.kind ||
        state.built !== it.built ||
        (!it.built && Math.abs(state.progress - progress) > PROGRESS_REBUILD_STEP);
      if (needsRebuild) this.rebuild(node, it.kind, it.built, progress);
    }

    node.position.set(it.x, it.groundY, it.z);
  }

  /** Remove o nó do item `id` da cena (no-op se não existir). */
  remove(id: number): void {
    const node = this.nodes.get(id);
    if (!node) return;
    this.group.remove(node);
    this.nodes.delete(id);
  }

  /** Ids atualmente presentes, em ordem crescente. */
  ids(): number[] {
    return [...this.nodes.keys()].sort((a, b) => a - b);
  }

  private rebuild(node: THREE.Group, kind: BuildingKind, built: boolean, progress: number): void {
    for (const child of [...node.children]) node.remove(child);

    // DÍVIDA: siegeworkshop/university/wonder ainda não têm mesh própria — caixa reserva.
    let visual: THREE.Group;
    try {
      visual = built ? this.cloneBuilt(kind) : constructionMesh(kind, progress);
    } catch {
      visual = this.fallbackBox();
    }
    node.add(visual);

    node.userData = { kind, built, progress } satisfies NodeState;
  }

  private fallbackBox(): THREE.Group {
    const g = new THREE.Group();
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(3, 2, 3),
      new THREE.MeshStandardMaterial({ color: 0x8a6b4a, roughness: 1 })
    );
    m.position.y = 1;
    g.add(m);
    return g;
  }

  private cloneBuilt(kind: BuildingKind): THREE.Group {
    let template = this.templates.get(kind);
    if (!template) {
      template = buildingMesh(kind);
      this.templates.set(kind, template);
    }
    return template.clone(true);
  }
}
