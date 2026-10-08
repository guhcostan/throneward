import { Sim } from '../src/sim/sim';

// Headless determinism check: same seed => same hash. Run with `pnpm test:headless`.
function run(seed: number): string {
  const sim = new Sim({ seed, tickRate: 60 });
  sim.spawnUnit('villager', 0, 0, 0);
  sim.spawnUnit('scout', 1, 20, 20);
  sim.commandMove([1], 10, 5);
  sim.commandMove([2], 0, 0);
  for (let i = 0; i < 600; i++) sim.tickOnce(1 / 60);
  return sim.hash();
}

const a = run(1234);
const b = run(1234);
const c = run(9999);
console.log(JSON.stringify({ a, b, c, deterministic: a === b, seedSensitive: a !== c }));
if (a !== b || a === c) {
  console.error('HEADLESS DETERMINISM FAILED');
  process.exit(1);
}
console.log('HEADLESS OK');
