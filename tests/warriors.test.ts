import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { setPlayerColor, warriorMesh, type WarriorKind } from '../src/render/warriors';

const KINDS: WarriorKind[] = [
  'spearman',
  'archer',
  'longbow',
  'crossbow',
  'manatarms',
  'knight',
  'scout',
  'monk',
  'ram',
  'mangonel',
];

const cloakMeshes = (g: THREE.Group): THREE.Mesh[] => {
  const out: THREE.Mesh[] = [];
  g.traverse((o) => {
    if (o instanceof THREE.Mesh && o.userData.cloak === true) out.push(o);
  });
  return out;
};

const countNodes = (g: THREE.Object3D): number => {
  let n = 0;
  g.traverse(() => {
    n++;
  });
  return n;
};

describe('warriorMesh', () => {
  it.each(KINDS)('%s returns a non-empty Group with positive height', (kind) => {
    const g = warriorMesh(kind);
    expect(g).toBeInstanceOf(THREE.Group);
    expect(g.children.length).toBeGreaterThan(0);
    const size = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
    expect(size.y).toBeGreaterThan(0);
    expect(size.x).toBeGreaterThan(0);
  });

  it.each(['knight', 'scout'] as const)('%s is cavalry (taller than infantry)', (kind) => {
    const h = new THREE.Box3().setFromObject(warriorMesh(kind)).getSize(new THREE.Vector3()).y;
    expect(h).toBeGreaterThan(1.8);
  });

  it('infantry body stays near 1.4 of height', () => {
    const h = new THREE.Box3()
      .setFromObject(warriorMesh('manatarms'))
      .getSize(new THREE.Vector3()).y;
    expect(h).toBeGreaterThan(1.2);
    expect(h).toBeLessThan(1.8);
  });

  it.each(KINDS)('%s has at least one cloak mesh', (kind) => {
    expect(cloakMeshes(warriorMesh(kind)).length).toBeGreaterThan(0);
  });

  it.each(KINDS)('%s is deterministic (same child count on two builds)', (kind) => {
    const a = warriorMesh(kind);
    const b = warriorMesh(kind);
    expect(a.children.length).toBe(b.children.length);
    expect(countNodes(a)).toBe(countNodes(b));
  });
});

describe('setPlayerColor', () => {
  it('recolors cloak children', () => {
    const g = warriorMesh('spearman');
    setPlayerColor(g, 0x2255ff);
    const cloaks = cloakMeshes(g);
    expect(cloaks.length).toBeGreaterThan(0);
    for (const m of cloaks) {
      const mat = m.material as THREE.MeshStandardMaterial;
      expect(mat.color.getHex()).toBe(0x2255ff);
    }
  });

  it('does not throw on a group without cloak children', () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()));
    expect(() => setPlayerColor(g, 0xff0000)).not.toThrow();
  });

  it('does not affect non-cloak meshes', () => {
    const g = warriorMesh('archer');
    const before: number[] = [];
    g.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.cloak !== true) {
        before.push((o.material as THREE.MeshStandardMaterial).color.getHex());
      }
    });
    setPlayerColor(g, 0x00ff00);
    const after: number[] = [];
    g.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.cloak !== true) {
        after.push((o.material as THREE.MeshStandardMaterial).color.getHex());
      }
    });
    expect(after).toEqual(before);
  });
});
