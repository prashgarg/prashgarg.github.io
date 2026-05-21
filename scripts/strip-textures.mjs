// Strip embedded textures from .glb files. We override every material's
// colour via the recolour map at runtime, so the texture pixels in these
// CC0 Quaternius pieces are pure bloat. Drops cottage piece sizes from
// 7–24 MB each down to <100 KB each.
//
// Usage: node scripts/strip-textures.mjs [file1.glb file2.glb …]
//        (no args = process every .glb under public/models/)
import { NodeIO } from '@gltf-transform/core';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const io = new NodeIO();
const root = 'public/models';
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(root).filter((f) => f.endsWith('.glb')).map((f) => join(root, f));

for (const path of files) {
  const before = statSync(path).size;
  const doc = await io.read(path);
  const r = doc.getRoot();
  // remove all texture binaries + their material slots
  for (const tex of r.listTextures()) tex.dispose();
  for (const mat of r.listMaterials()) {
    mat.setBaseColorTexture(null);
    mat.setMetallicRoughnessTexture(null);
    mat.setNormalTexture(null);
    mat.setEmissiveTexture(null);
    mat.setOcclusionTexture(null);
  }
  await io.write(path, doc);
  const after = statSync(path).size;
  console.log(
    path.padEnd(48),
    (before / 1024 / 1024).toFixed(1).padStart(6) + ' MB →',
    (after / 1024).toFixed(0).padStart(6) + ' KB',
  );
}
