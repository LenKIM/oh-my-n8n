#!/usr/bin/env node
/**
 * 실행 중인 n8n 컨테이너 안에서 코어 노드 카탈로그를 추출하여
 * 호스트의 schemas/n8n-core-<version>.schema.json 으로 저장.
 *
 * 동작:
 *   1. 컨테이너 안에 추출 스크립트 (extract-in-container.cjs) 주입
 *   2. docker exec 로 실행 → stdout 으로 JSON 회수
 *   3. 호스트에 파일로 기록
 *
 * Usage: node scripts/extract-core-catalog.mjs [container-name]
 */

import { execSync, spawnSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveWorkspace } from "./lib/workspace.mjs";

const ROOT = resolveWorkspace();
const container = process.argv[2] ?? "oh-my-n8n";

// 컨테이너 안에서 실행할 추출기
const extractor = `
const fs = require("fs");
const path = require("path");
const NODES_DIR = "/usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base/dist/nodes";
const CREDS_DIR = "/usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base/dist/credentials";

function walk(dir, suffix) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p, suffix));
    else if (entry.name.endsWith(suffix)) out.push(p);
  }
  return out;
}

function tryLoad(file) {
  try {
    const mod = require(file);
    return Object.values(mod).filter((v) => typeof v === "function");
  } catch { return []; }
}

const nodes = [];
for (const f of walk(NODES_DIR, ".node.js")) {
  for (const Cls of tryLoad(f)) {
    let inst; try { inst = new Cls(); } catch { continue; }
    const d = inst.description; if (!d || !d.name) continue;
    nodes.push({
      type: "n8n-nodes-base." + d.name,
      name: d.name,
      displayName: d.displayName,
      group: d.group,
      version: d.version,
      description: d.description,
      credentials: (d.credentials ?? []).map((c) => c.name),
      propertyCount: Array.isArray(d.properties) ? d.properties.length : 0,
    });
  }
}

const credentials = [];
for (const f of walk(CREDS_DIR, ".credentials.js")) {
  for (const Cls of tryLoad(f)) {
    let inst; try { inst = new Cls(); } catch { continue; }
    const name = inst.name ?? inst.description?.name;
    if (!name) continue;
    credentials.push({
      name,
      displayName: inst.displayName ?? inst.description?.displayName,
      propertyCount: Array.isArray(inst.properties) ? inst.properties.length : 0,
    });
  }
}

const version = require("/usr/local/lib/node_modules/n8n/package.json").version;
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), n8nVersion: version, nodes, credentials }));
`;

// 임시 스크립트를 컨테이너에 복사
const tmp = "/tmp/oh-my-n8n-extract.cjs";
writeFileSync(tmp, extractor);
execSync(`docker cp ${tmp} ${container}:/tmp/extract.cjs`);

const r = spawnSync("docker", ["exec", container, "node", "/tmp/extract.cjs"], {
  encoding: "utf8",
  maxBuffer: 100 * 1024 * 1024,
});
if (r.status !== 0) {
  console.error("docker exec failed:", r.stderr);
  process.exit(1);
}

const data = JSON.parse(r.stdout);
const out = join(ROOT, `schemas/n8n-core-${data.n8nVersion}.schema.json`);
writeFileSync(out, JSON.stringify(data, null, 2) + "\n");

// 최신 버전 심볼릭 링크 (latest pointer)
const latest = join(ROOT, "schemas/n8n-core-latest.schema.json");
writeFileSync(latest, JSON.stringify(data, null, 2) + "\n");

console.log(`wrote ${out}`);
console.log(`n8n version: ${data.n8nVersion}`);
console.log(`core nodes: ${data.nodes.length}, credentials: ${data.credentials.length}`);
