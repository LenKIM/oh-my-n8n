#!/usr/bin/env node
/**
 * plugins/plugins.yaml → plugins/install.sh + plugins/lockfile.json
 *
 * - install.sh: Dockerfile.n8n 의 빌드 단계에서 실행될 npm install 스크립트.
 * - lockfile.json: 결정적 버전 잠금 (npm view 로 최신 호환 버전 해석).
 *
 * 의존성 회피를 위해 라이트 yaml 파서 사용 (단순 구조만 지원).
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveWorkspace } from "./lib/workspace.mjs";

const ROOT = resolveWorkspace();
const YAML = join(ROOT, "plugins/plugins.yaml");
const INSTALL = join(ROOT, "plugins/install.sh");
const LOCK = join(ROOT, "plugins/lockfile.json");

if (!existsSync(YAML)) {
  console.error(`not found: ${YAML}`);
  process.exit(1);
}

const txt = readFileSync(YAML, "utf8");
const n8nVersion = txt.match(/^n8nVersion:\s*["']?([^"'\n#]+)/m)?.[1]?.trim();
const plugins = [];
let cur = null;
for (const line of txt.split("\n")) {
  const name = line.match(/^\s*-\s*name:\s*["']?([^"'\s#]+)/);
  const version = line.match(/^\s*version:\s*["']?([^"'\s#]+)/);
  const reason = line.match(/^\s*reason:\s*(.+?)\s*$/);
  if (name) {
    if (cur) plugins.push(cur);
    cur = { name: name[1], version: null, reason: null };
  } else if (version && cur) {
    cur.version = version[1];
  } else if (reason && cur) {
    cur.reason = reason[1];
  }
}
if (cur) plugins.push(cur);

const resolved = {};
const installLines = ["#!/bin/sh", "set -e", `# Auto-generated from plugins.yaml at ${new Date().toISOString()}`];

if (plugins.length === 0) {
  installLines.push('echo "[oh-my-n8n] no community plugins configured"');
} else {
  installLines.push('cd "$(npm root -g)/n8n" || cd /usr/local/lib/node_modules/n8n');
  for (const p of plugins) {
    let pinned = p.version;
    try {
      pinned = execSync(`npm view ${p.name}@"${p.version}" version --silent | tail -n1`, {
        encoding: "utf8",
      }).trim() || p.version;
    } catch {}
    resolved[p.name] = { requested: p.version, pinned, reason: p.reason };
    installLines.push(`echo "[oh-my-n8n] installing ${p.name}@${pinned}"`);
    installLines.push(`npm install --omit=dev ${p.name}@${pinned}`);
  }
}

writeFileSync(INSTALL, installLines.join("\n") + "\n", { mode: 0o755 });
writeFileSync(
  LOCK,
  JSON.stringify(
    { generatedAt: new Date().toISOString(), n8nVersion, resolved },
    null,
    2,
  ) + "\n",
);

console.log(`wrote ${INSTALL}`);
console.log(`wrote ${LOCK}`);
console.log(`plugins: ${plugins.length}`);
