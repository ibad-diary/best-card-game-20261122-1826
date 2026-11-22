// Ember Pact — entrypoint: hands the game in.
// Copies game/ and screenshots/ from this repository into the output
// directory (or $MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with buildDossier from vendor/makefun-game.ts.
// Copy-only: it never writes into the repository directory, and it runs
// twice with byte-identical results. The dossier caps match the
// competition's gate so a local run fails exactly where the grader would.
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// The grader mounts the output directory itself, so the directory cannot
// be removed (its parent is read-only): create it if missing and clear
// only its contents, leaving the directory itself in place.
mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Ember Pact handed in: ${outDir} (${dossier.length} byte dossier)`);
