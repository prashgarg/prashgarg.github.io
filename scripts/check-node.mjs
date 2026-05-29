// Guard: Astro 6 + Vite 7 hang the dev server on Node 23+. Require Node 22.x.
// Runs as `predev`. Prints a clear message and exits non-zero on a bad version.
const major = Number(process.versions.node.split('.')[0]);
if (major >= 23 || major < 22) {
  console.error(
    `\n✗ Node ${process.versions.node} is not supported for the dev server.\n` +
    `  Astro 6 + Vite 7 hang silently on Node 23+ (and need ≥ 22.12).\n` +
    `  Use Node 22:  nvm use   (an .nvmrc pins 22)\n` +
    `  Or review against the built site instead:\n` +
    `      npm run build && npm run serve   # serves dist/ on http://localhost:4321\n`
  );
  process.exit(1);
}
console.log(`✓ Node ${process.versions.node} OK for dev server.`);
