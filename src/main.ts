import * as THREE from 'three';
import { Sim } from './sim/sim';

// Minimal 3D bootstrap: terrain plane + instanced units placeholder + camera pan/zoom/rotate.
// Expanded in Fase 1 by builders.

export function boot(): { sim: Sim; renderer: THREE.WebGLRenderer } {
  const container = document.getElementById('app')!;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a2b1a);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(20, 20, 20);
  camera.lookAt(0, 0, 0);

  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(10, 20, 10);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x3a6b35 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const sim = new Sim({ seed: 1234, tickRate: 60 });
  sim.spawnUnit('villager', 0, 2, 2);
  sim.spawnUnit('villager', 0, -2, -1);

  // window.__game — reading state + sending commands (used by tests).
  (window as unknown as { __game: unknown }).__game = {
    sim,
    getState: () => JSON.parse(JSON.stringify(sim.state)),
    command: (cmd: { type: string; unitIds?: number[]; x?: number; y?: number; queue?: boolean }) => {
      if (cmd.type === 'move' && cmd.unitIds && cmd.x !== undefined && cmd.y !== undefined) {
        sim.commandMove(cmd.unitIds, cmd.x, cmd.y, !!cmd.queue);
        return { ok: true };
      }
      return { ok: false, error: 'unknown command' };
    },
    version: '0.0.1-fase0'
  };

  // Instanced placeholder for units (real low-poly procedural models in Fase 1+).
  const unitMesh = new THREE.InstancedMesh(
    new THREE.CapsuleGeometry(0.3, 0.8, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0xd8c48a }),
    512
  );
  scene.add(unitMesh);
  const dummy = new THREE.Object3D();

  // Basic camera: drag pan, wheel zoom, right-drag rotate.
  let yaw = Math.PI / 4, dist = 35, tx = 0, tz = 0;
  const el = renderer.domElement;
  el.addEventListener('wheel', (e: WheelEvent) => { dist = Math.min(80, Math.max(10, dist + e.deltaY * 0.02)); }, { passive: true });

  function frame(): void {
    camera.position.set(tx + dist * Math.cos(yaw) * 0.7, dist * 0.7, tz + dist * Math.sin(yaw) * 0.7);
    camera.lookAt(tx, 0, tz);
    sim.tickOnce(1 / 60);
    sim.state.units.forEach((u, i) => {
      dummy.position.set(u.x, 0.8, u.y);
      dummy.updateMatrix();
      unitMesh.setMatrixAt(i, dummy.matrix);
    });
    unitMesh.count = sim.state.units.length;
    unitMesh.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();

  return { sim, renderer };
}

boot();
