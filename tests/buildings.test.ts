import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  buildingFootprint,
  buildingMesh,
  constructionMesh,
  type BuildingKind,
} from '../src/render/buildings';

const KINDS: BuildingKind[] = [
  'towncenter',
  'house',
  'farm',
  'mill',
  'lumbercamp',
  'miningcamp',
  'barracks',
  'archerrange',
  'stable',
  'blacksmith',
  'market',
  'monastery',
  'outpost',
];

const height = (obj: THREE.Object3D): number => {
  const box = new THREE.Box3().setFromObject(obj);
  return box.max.y - box.min.y;
};

describe('buildingMesh', () => {
  it.each(KINDS)('%s returns a non-empty Group with visible geometry', (kind) => {
    const g = buildingMesh(kind);
    expect(g).toBeInstanceOf(THREE.Group);
    expect(g.children.length).toBeGreaterThan(0);
    const box = new THREE.Box3().setFromObject(g);
    const size = new THREE.Vector3();
    box.getSize(size);
    expect(size.x).toBeGreaterThan(0);
    expect(size.y).toBeGreaterThan(0);
    expect(size.z).toBeGreaterThan(0);
  });

  it('towncenter is larger than house', () => {
    expect(height(buildingMesh('towncenter'))).toBeGreaterThan(height(buildingMesh('house')));
  });

  it('is deterministic: same child count and bounds on repeated builds', () => {
    for (const kind of KINDS) {
      const a = buildingMesh(kind);
      const b = buildingMesh(kind);
      expect(a.children.length).toBe(b.children.length);
      expect(new THREE.Box3().setFromObject(a).equals(new THREE.Box3().setFromObject(b))).toBe(true);
    }
  });
});

describe('buildingFootprint', () => {
  it.each(KINDS)('%s has a positive footprint', (kind) => {
    const fp = buildingFootprint(kind);
    expect(fp.w).toBeGreaterThan(0);
    expect(fp.h).toBeGreaterThan(0);
  });

  it('matches the specified sizes and is deterministic', () => {
    expect(buildingFootprint('farm')).toEqual({ w: 3, h: 3 });
    expect(buildingFootprint('house')).toEqual({ w: 2, h: 2 });
    expect(buildingFootprint('towncenter')).toEqual({ w: 6, h: 6 });
    expect(buildingFootprint('barracks')).toEqual(buildingFootprint('barracks'));
  });
});

describe('constructionMesh', () => {
  it('progress 0.5 is shorter than progress 1.0', () => {
    const half = constructionMesh('barracks', 0.5);
    const full = constructionMesh('barracks', 1.0);
    expect(half.scale.y).toBeLessThan(1.0);
    expect(full.scale.y).toBe(1);
    expect(height(half)).toBeLessThan(height(full));
  });

  it('clamps invalid progress values', () => {
    expect(constructionMesh('house', 2).scale.y).toBe(1);
    expect(constructionMesh('house', -1).scale.y).toBeGreaterThan(0);
    expect(constructionMesh('house', NaN).scale.y).toBeGreaterThan(0);
  });

  it.each(KINDS)('%s scaffold is non-empty and deterministic', (kind) => {
    const a = constructionMesh(kind, 0.5);
    const b = constructionMesh(kind, 0.5);
    expect(a.children.length).toBeGreaterThan(0);
    expect(a.children.length).toBe(b.children.length);
  });
});

describe('Fase 9: novos prédios (siegeworkshop, university, wonder, landmark)', () => {
  const NEW_KINDS: BuildingKind[] = ['siegeworkshop', 'university', 'wonder', 'landmark'];

  it.each(NEW_KINDS)('%s returns a non-empty Group with bounds > 0', (kind) => {
    const g = buildingMesh(kind);
    expect(g).toBeInstanceOf(THREE.Group);
    expect(g.children.length).toBeGreaterThan(0);
    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(g).getSize(size);
    expect(size.x).toBeGreaterThan(0);
    expect(size.y).toBeGreaterThan(0);
    expect(size.z).toBeGreaterThan(0);
  });

  it('has the expected footprints', () => {
    expect(buildingFootprint('siegeworkshop')).toEqual({ w: 4, h: 4 });
    expect(buildingFootprint('university')).toEqual({ w: 5, h: 5 });
    expect(buildingFootprint('wonder')).toEqual({ w: 8, h: 8 });
    expect(buildingFootprint('landmark')).toEqual({ w: 4, h: 4 });
  });

  it('is deterministic for the new kinds', () => {
    for (const kind of NEW_KINDS) {
      const a = buildingMesh(kind);
      const b = buildingMesh(kind);
      expect(a.children.length).toBe(b.children.length);
      expect(new THREE.Box3().setFromObject(a).equals(new THREE.Box3().setFromObject(b))).toBe(true);
    }
  });

  it('wonder is taller than university and landmark has a tintable cloak', () => {
    expect(height(buildingMesh('wonder'))).toBeGreaterThan(height(buildingMesh('university')));
    const cloaks = buildingMesh('landmark').children.filter((c) => c.userData['cloak'] === true);
    expect(cloaks.length).toBe(1);
  });

  it.each(NEW_KINDS)('%s scaffold is non-empty and deterministic', (kind) => {
    const a = constructionMesh(kind, 0.5);
    const b = constructionMesh(kind, 0.5);
    expect(a.children.length).toBeGreaterThan(0);
    expect(a.children.length).toBe(b.children.length);
  });
});
