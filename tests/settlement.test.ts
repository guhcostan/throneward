import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Settlement, type SettlementItem } from '../src/render/settlement';

function item(over: Partial<SettlementItem> = {}): SettlementItem {
  return {
    id: 1,
    kind: 'house',
    x: 0,
    z: 0,
    groundY: 0,
    progress: 1,
    built: true,
    ...over,
  };
}

/** Assinatura estrutural (sem UUIDs, que são aleatórios no Three.js). */
function signature(root: THREE.Object3D): string {
  const out: unknown[] = [];
  root.traverse((o) => {
    const entry: Record<string, unknown> = {
      type: o.type,
      name: o.name,
      pos: o.position.toArray(),
      scale: o.scale.toArray(),
    };
    if (o instanceof THREE.Mesh) {
      const geo = o.geometry as THREE.BufferGeometry;
      entry.verts = Array.from(geo.getAttribute('position').array);
      const m = o.material as THREE.MeshStandardMaterial;
      entry.color = m.color.getHex();
      entry.opacity = m.opacity;
    }
    out.push(entry);
  });
  return JSON.stringify(out);
}

describe('Settlement', () => {
  it('upsert de prédio concluído adiciona 1 filho ao group', () => {
    const s = new Settlement();
    s.upsert(item({ id: 7, built: true }));
    expect(s.group.children).toHaveLength(1);
    expect(s.ids()).toEqual([7]);
    const node = s.group.children[0] as THREE.Group;
    expect(node.children.length).toBeGreaterThan(0);
    expect(node.children[0].name).toBe('building-house');
  });

  it('posiciona o nó em (x, groundY, z)', () => {
    const s = new Settlement();
    s.upsert(item({ id: 2, x: 3, z: -4, groundY: 0.5 }));
    const node = s.group.children[0];
    expect(node.position.toArray()).toEqual([3, 0.5, -4]);
  });

  it('atualizar progresso troca o andaime (e só ao cruzar 0.05)', () => {
    const s = new Settlement();
    s.upsert(item({ id: 3, built: false, progress: 0.2 }));
    const node = s.group.children[0] as THREE.Group;
    const first = node.children[0];
    expect(first.name).toBe('construction-house');

    s.upsert(item({ id: 3, built: false, progress: 0.22 }));
    expect(node.children[0]).toBe(first);

    s.upsert(item({ id: 3, built: false, progress: 0.6 }));
    expect(node.children[0]).not.toBe(first);
    expect(node.children).toHaveLength(1);
    expect(node.children[0].name).toBe('construction-house');
  });

  it('andaime vira prédio concluído quando built passa a true', () => {
    const s = new Settlement();
    s.upsert(item({ id: 4, built: false, progress: 0.9 }));
    s.upsert(item({ id: 4, built: true, progress: 1 }));
    const node = s.group.children[0] as THREE.Group;
    expect(node.children).toHaveLength(1);
    expect(node.children[0].name).toBe('building-house');
  });

  it('remove esvazia group e map', () => {
    const s = new Settlement();
    s.upsert(item({ id: 1 }));
    s.upsert(item({ id: 2, x: 5 }));
    s.remove(1);
    expect(s.ids()).toEqual([2]);
    expect(s.group.children).toHaveLength(1);
    s.remove(2);
    expect(s.ids()).toEqual([]);
    expect(s.group.children).toHaveLength(0);
    s.remove(99); // no-op
    expect(s.group.children).toHaveLength(0);
  });

  it('dois prédios do mesmo kind compartilham geometria e têm ids corretos', () => {
    const s = new Settlement();
    s.upsert(item({ id: 10, x: 0 }));
    s.upsert(item({ id: 11, x: 4 }));
    expect(s.ids()).toEqual([10, 11]);
    const a = s.group.children[0] as THREE.Group;
    const b = s.group.children[1] as THREE.Group;
    expect(a.children.length).toBeGreaterThan(0);
    expect(b.children.length).toBeGreaterThan(0);
    const meshA = a.children[0] as THREE.Mesh;
    const meshB = b.children[0] as THREE.Mesh;
    expect(meshA).not.toBe(meshB);
    expect(meshA.geometry).toBe(meshB.geometry);
  });

  it('é determinístico: mesma entrada gera mesma estrutura', () => {
    const build = () => {
      const s = new Settlement();
      s.upsert(item({ id: 1, kind: 'towncenter', x: 1, z: 2 }));
      s.upsert(item({ id: 2, kind: 'farm', built: false, progress: 0.4 }));
      return s.group;
    };
    expect(signature(build())).toBe(signature(build()));
  });
});
