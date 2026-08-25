// Vercel deploys backend/dist/ as the function bundle, but tsc only compiles
// .ts files — it never copies package.json or node_modules into dist/.
//
// 1. Without a package.json declaring "type": "module" alongside the
//    compiled output, Node loads dist/server.js's ES `import` syntax as
//    CommonJS and crashes.
// 2. Vercel's own dependency tracing for this service's zero-config Express
//    detection does not reliably place node_modules at the same runtime
//    path as server.js, causing "Cannot find package 'express'" even when
//    node_modules is included elsewhere in the deployment. Copying it
//    directly into dist/ makes it travel through the exact same packaging
//    path that already correctly places server.js itself, sidestepping the
//    mismatch entirely.
const fs = require("fs");
const path = require("path");

fs.writeFileSync("dist/package.json", JSON.stringify({ type: "module" }, null, 2) + "\n");

const src = path.join(__dirname, "..", "node_modules");
const dest = path.join(__dirname, "..", "dist", "node_modules");
if (fs.existsSync(src)) {
  fs.cpSync(src, dest, { recursive: true, dereference: true });
}
