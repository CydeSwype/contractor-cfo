// Deterministic per-project dev ports.
//
// Derives a stable, uncommon port pair from the project name so every project on
// this machine lands on its own unique ports — no hand-picked numbers, and no
// collisions with the usual 3000 / 5173 / 8080 defaults that every other project
// also grabs.
//
// Reuse across projects: copy this file in and the same formula gives each repo
// its own pair automatically. Run `node scripts/ports.mjs` to print this repo's.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function projectName() {
  try {
    return JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')).name || 'app';
  } catch {
    return 'app';
  }
}

// FNV-1a: a small, stable string hash. Same name always yields the same port.
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Compute the { server, client } port pair for a project name.
 * Base lands in 30000–39999 (uncommon, above the usual dev defaults, below the
 * OS ephemeral range); client sits one above the server.
 */
export function getPorts(name = projectName()) {
  const base = 30000 + (hash(name) % 10000);
  return { server: base, client: base + 1 };
}

export const PORTS = getPorts();

// `node scripts/ports.mjs` prints the pair for the current project.
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`${projectName()} → server ${PORTS.server}, client ${PORTS.client}`);
}
