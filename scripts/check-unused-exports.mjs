/**
 * Dev helper: lists exported symbols that are never referenced anywhere else.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = "D:/Shugela/src";
const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if ([".ts", ".tsx"].includes(extname(full))) files.push(full);
  }
})(ROOT);

const sources = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));

const exportRe = /export\s+(?:async\s+)?(?:function|const|class|interface|type|let)\s+([A-Za-z0-9_]+)/g;
const unused = [];

for (const [file, source] of sources) {
  const names = new Set();
  let m;
  while ((m = exportRe.exec(source))) names.add(m[1]);

  for (const name of names) {
    let used = 0;
    for (const [otherFile, otherSource] of sources) {
      if (otherFile === file) continue;
      const re = new RegExp(`\\b${name}\\b`, "g");
      used += (otherSource.match(re) || []).length;
    }
    if (used === 0) unused.push(`${file.replace(ROOT, "src")}: ${name}`);
  }
}

console.log(unused.length ? unused.join("\n") : "no unused exports");
