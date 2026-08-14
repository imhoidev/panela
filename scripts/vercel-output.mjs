import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const output = path.join(root, ".vercel", "output");
const funcDir = path.join(output, "functions", "index.func");
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

if (!fs.existsSync(path.join(dist, "client")) || !fs.existsSync(path.join(dist, "server"))) {
  console.error("[vercel-output] Error: dist/client or dist/server not found – did vite build run first?");
  process.exit(1);
}

// Clean target directory
if (fs.existsSync(output)) {
  fs.rmSync(output, { recursive: true, force: true });
}

fs.mkdirSync(staticDir, { recursive: true });
fs.mkdirSync(funcDir, { recursive: true });

// 1. Copy client assets to static output
copyRecursive(path.join(dist, "client"), staticDir);

// 2. Copy server build to function output
copyRecursive(path.join(dist, "server"), funcDir);

// 3. Create Node.js request handler bridging Vercel Serverless Function to TanStack Start fetch()
const indexHandler = `import server from "./server.js";

export default async function handler(req, res) {
  try {
    const host = req.headers.host || "localhost";
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const url = new URL(req.url, \`\${protocol}://\${host}\`);

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    const method = req.method || "GET";
    let body;
    if (method !== "GET" && method !== "HEAD") {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = Buffer.concat(chunks);
    }

    const request = new Request(url.href, {
      method,
      headers,
      body,
      duplex: body ? "half" : undefined,
    });

    const response = await server.fetch(request);

    res.statusCode = response.status;
    response.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });

    const arrayBuffer = await response.arrayBuffer();
    res.end(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("[Vercel SSR Handler Error]", err);
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
  }
}
`;

fs.writeFileSync(path.join(funcDir, "index.mjs"), indexHandler, "utf-8");

// 4. Configure Vercel function runtime
fs.writeFileSync(
  path.join(funcDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
    },
    null,
    2,
  ),
);

// 5. Configure Vercel routes (filesystem first, fallback to SSR function)
fs.writeFileSync(
  path.join(output, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index" },
      ],
    },
    null,
    2,
  ),
);

console.log("[vercel-output] Generated .vercel/output/ Build Output API v3 successfully for TanStack Start");
