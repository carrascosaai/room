// Copia el runtime ONNX (wasm) que usa Transformers.js a public/ort/ para
// servirlo desde la propia app: sin CDN externo y disponible sin conexión.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("@huggingface/transformers")); // .../dist/transformers.node.cjs
const out = join(root, "public", "ort");
mkdirSync(out, { recursive: true });
for (const f of ["ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm"]) {
  copyFileSync(join(dist, f), join(out, f));
}
console.log("ORT copiado a public/ort/");
