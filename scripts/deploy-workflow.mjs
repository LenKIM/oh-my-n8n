#!/usr/bin/env node
/**
 * Deploy a workflow JSON to a running n8n instance via REST API.
 *
 * Usage:
 *   N8N_URL=http://localhost:5678 N8N_API_KEY=xxx \
 *     node scripts/deploy-workflow.mjs <workflow.json> [--activate]
 *
 * Behavior:
 *   - 워크플로 name 으로 기존 검색 → 있으면 PUT 갱신, 없으면 POST 생성.
 *   - --activate 시 활성화 토글.
 *
 * 사전조건: scripts/validate-workflow.mjs 가 PASS 인 파일에 대해서만 실행.
 */

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { resolveWorkspace } from "./lib/workspace.mjs";

const ROOT = resolveWorkspace();

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
const activate = args.includes("--activate");

if (!target) {
  console.error("usage: deploy-workflow.mjs <workflow.json> [--activate]");
  process.exit(2);
}

const N8N_URL = process.env.N8N_URL || "http://localhost:5678";
const API_KEY = process.env.N8N_API_KEY;
if (!API_KEY) {
  console.error("N8N_API_KEY 환경변수 필요");
  process.exit(2);
}

// 검증 선행 — 워크스페이스의 검증기를 사용
const v = spawnSync("node", [join(ROOT, "scripts/validate-workflow.mjs"), target], {
  stdio: "inherit",
  env: { ...process.env, OMN_WORKSPACE: ROOT },
});
if (v.status !== 0) {
  console.error("validation 실패 — 배포 차단");
  process.exit(1);
}

const wf = JSON.parse(readFileSync(target, "utf8"));
const headers = { "X-N8N-API-KEY": API_KEY, "Content-Type": "application/json" };

// 검색
const list = await fetch(`${N8N_URL}/api/v1/workflows?name=${encodeURIComponent(wf.name)}`, { headers });
if (!list.ok) {
  console.error(`workflow 검색 실패: ${list.status} ${await list.text()}`);
  process.exit(1);
}
const { data: existing = [] } = await list.json();
const found = existing.find((w) => w.name === wf.name);

let result;
if (found) {
  const r = await fetch(`${N8N_URL}/api/v1/workflows/${found.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(wf),
  });
  if (!r.ok) { console.error(`PUT 실패: ${r.status} ${await r.text()}`); process.exit(1); }
  result = await r.json();
  console.log(`updated workflow #${result.id} (${result.name})`);
} else {
  const r = await fetch(`${N8N_URL}/api/v1/workflows`, {
    method: "POST",
    headers,
    body: JSON.stringify(wf),
  });
  if (!r.ok) { console.error(`POST 실패: ${r.status} ${await r.text()}`); process.exit(1); }
  result = await r.json();
  console.log(`created workflow #${result.id} (${result.name})`);
}

if (activate) {
  const r = await fetch(`${N8N_URL}/api/v1/workflows/${result.id}/activate`, { method: "POST", headers });
  if (!r.ok) { console.error(`activate 실패: ${r.status} ${await r.text()}`); process.exit(1); }
  console.log(`activated workflow #${result.id}`);
}
