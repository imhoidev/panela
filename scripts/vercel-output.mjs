import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const output = path.join(root, ".vercel", "output");
const funcDir = path.join(output, "functions", "__nitro.func");
const staticDir = path.join(output, "static");

function copyRecursive(src, dest, filter) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (filter && !filter(entry)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(s, d, filter);
    } else {
      fs.cpSync(s, d);
    }
  }
}

if (!fs.existsSync(path.join(dist, "nitro.json"))) {
  console.error("dist/nitro.json not found – did vite build run first?");
  process.exit(1);
}

fs.mkdirSync(staticDir, { recursive: true });
fs.mkdirSync(funcDir, { recursive: true });

copyRecursive(path.join(dist, "client"), staticDir);

copyRecursive(path.join(dist, "server"), funcDir);

const nitroJson = JSON.parse(fs.readFileSync(path.join(dist, "nitro.json"), "utf-8"));
fs.writeFileSync(path.join(funcDir, "nitro.json"), JSON.stringify(nitroJson));

fs.writeFileSync(
  path.join(funcDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs24.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  path.join(output, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/__nitro" },
      ],
    },
    null,
    2,
  ),
);

console.log("[vercel-output] Generated .vercel/output/ Build Output API v3");
