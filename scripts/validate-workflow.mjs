#!/usr/bin/env node
/**
 * oh-my-n8n workflow validator.
 *
 * Usage:
 *   node scripts/validate-workflow.mjs <workflow.json> [--json]
 *
 * Checks:
 *   1. JSON 파싱 가능
 *   2. 필수 필드 존재 (name, nodes, connections)
 *   3. 트리거 노드 정확히 1개
 *   4. 모든 노드의 type 이 카탈로그(core/custom-nodes/plugins.yaml)에 존재
 *   5. parameters 안 시크릿 하드코딩 패턴 없음
 *   6. expression {{...}} 괄호 균형
 *   7. 고립 노드 없음 (트리거 제외)
 *
 * Exit code: 0=PASS, 1=FAIL, 2=usage error.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveWorkspace } from "./lib/workspace.mjs";

const __filename = fileURLToPath(import.meta.url);
// 검증기는 두 곳에서 실행될 수 있음:
//   - 플러그인 경로 (CLAUDE_PLUGIN_ROOT, 읽기 전용)
//   - 워크스페이스 (사용자 git clone, 카탈로그 위치)
// 카탈로그/커스텀 노드는 항상 워크스페이스 기준.
const ROOT = resolveWorkspace();

const args = process.argv.slice(2);
const jsonOutput = args.includes("--json");
const target = args.find((a) => !a.startsWith("--"));

if (!target) {
  console.error("usage: validate-workflow.mjs <workflow.json> [--json]");
  process.exit(2);
}

const findings = [];
const add = (level, code, msg) => findings.push({ level, code, msg });

let workflow;
try {
  workflow = JSON.parse(readFileSync(target, "utf8"));
} catch (e) {
  add("CRITICAL", "PARSE", `JSON 파싱 실패: ${e.message}`);
  finish();
}

// 1. 필수 필드
for (const f of ["name", "nodes", "connections"]) {
  if (workflow[f] === undefined) add("CRITICAL", "MISSING_FIELD", `필수 필드 누락: ${f}`);
}
const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];

// 2. 트리거 유일성
const triggers = nodes.filter((n) => /trigger$|webhook$|cron$/i.test(n.type ?? ""));
if (triggers.length === 0) add("CRITICAL", "NO_TRIGGER", "트리거 노드가 없습니다");
else if (triggers.length > 1) add("CRITICAL", "MULTI_TRIGGER", `트리거가 ${triggers.length}개 — 1개만 허용`);

// 3. 카탈로그 빌드
const catalog = loadCatalog();
for (const n of nodes) {
  if (!n.type) {
    add("CRITICAL", "NODE_NO_TYPE", `노드 ${n.name ?? n.id} 에 type 없음`);
    continue;
  }
  if (!isKnownNodeType(n.type, catalog)) {
    add("CRITICAL", "UNKNOWN_NODE", `미등록 노드 타입: ${n.type} (노드: ${n.name})`);
  }
}

// 4. 시크릿 스캔
const secretRe = /(api[_-]?key|secret|password|token|bearer)\s*["']?\s*[:=]\s*["'][^"']{8,}["']/i;
const raw = JSON.stringify(workflow);
const secretMatches = raw.match(new RegExp(secretRe, "gi"));
if (secretMatches) {
  for (const m of secretMatches.slice(0, 5)) {
    add("CRITICAL", "HARDCODED_SECRET", `시크릿 의심 패턴: ${m.slice(0, 60)}...`);
  }
}

// 5. expression 괄호 균형
for (const n of nodes) {
  const exprs = collectExpressions(n.parameters);
  for (const e of exprs) {
    if (!balancedBraces(e)) {
      add("WARN", "EXPR_UNBALANCED", `${n.name}: 표현식 괄호 불균형 — ${e.slice(0, 60)}`);
    }
  }
}

// 6. 고립 노드
const connections = workflow.connections ?? {};
const connected = new Set();
for (const [src, slots] of Object.entries(connections)) {
  connected.add(src);
  for (const slot of Object.values(slots)) {
    for (const arr of slot) for (const c of arr) connected.add(c.node);
  }
}
for (const n of nodes) {
  if (!connected.has(n.name) && !triggers.includes(n)) {
    add("WARN", "ORPHAN_NODE", `고립 노드: ${n.name}`);
  }
}

finish();

// ---

function loadCatalog() {
  const cat = { core: true, custom: new Set(), community: new Set() };

  // prebuilt 커스텀 노드 카탈로그 (schemas/internal-nodes.json)
  const internal = join(ROOT, "schemas/internal-nodes.json");
  if (existsSync(internal)) {
    try {
      const data = JSON.parse(readFileSync(internal, "utf8"));
      for (const n of data.nodes ?? []) cat.custom.add(n.name);
    } catch {}
  }

  // custom-nodes/nodes/* (TS 소스 워크스페이스 — 향후 확장)
  const cnDir = join(ROOT, "custom-nodes/nodes");
  if (existsSync(cnDir)) {
    for (const dir of readdirSync(cnDir, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      const pkgPath = join(cnDir, dir.name, "package.json");
      if (existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
          cat.custom.add(pkg.name);
          cat.custom.add(`${pkg.name}.${dir.name}`);
        } catch {}
      }
    }
  }

  // plugins.yaml — 라이트 파서 (정식 yaml 의존성 회피)
  const yamlPath = join(ROOT, "plugins/plugins.yaml");
  if (existsSync(yamlPath)) {
    const txt = readFileSync(yamlPath, "utf8");
    for (const m of txt.matchAll(/^\s*-\s*name:\s*["']?([^"'\s#]+)["']?/gm)) {
      cat.community.add(m[1]);
    }
  }

  return cat;
}

function isKnownNodeType(type, cat) {
  // n8n core
  if (/^n8n-nodes-base\./.test(type)) return true;
  if (/^@n8n\/n8n-nodes-/.test(type)) return true;

  // prebuilt 커스텀 노드는 type 이 단순 이름 (예: "alimtalk") 또는 "CUSTOM.<name>" 형태
  for (const name of cat.custom) {
    if (type === name) return true;
    if (type === `CUSTOM.${name}`) return true;
    if (type.startsWith(name + ".") || type.endsWith("." + name)) return true;
  }
  for (const pkg of cat.community) {
    if (type.startsWith(pkg + ".") || type === pkg) return true;
  }
  return false;
}

function collectExpressions(obj, out = []) {
  if (typeof obj === "string") {
    if (obj.startsWith("=") && obj.includes("{{")) out.push(obj);
  } else if (Array.isArray(obj)) {
    for (const v of obj) collectExpressions(v, out);
  } else if (obj && typeof obj === "object") {
    for (const v of Object.values(obj)) collectExpressions(v, out);
  }
  return out;
}

function balancedBraces(s) {
  let depth = 0;
  for (let i = 0; i < s.length - 1; i++) {
    if (s[i] === "{" && s[i + 1] === "{") { depth++; i++; }
    else if (s[i] === "}" && s[i + 1] === "}") { depth--; i++; if (depth < 0) return false; }
  }
  return depth === 0;
}

function finish() {
  const critical = findings.filter((f) => f.level === "CRITICAL");
  const status = critical.length === 0 ? "PASS" : "FAIL";

  if (jsonOutput) {
    console.log(JSON.stringify({ status, target, findings }, null, 2));
  } else {
    console.log(`\n=== validate-workflow: ${basename(target)} ===`);
    console.log(`Status: ${status}\n`);
    if (findings.length === 0) console.log("(no issues)");
    for (const f of findings) console.log(`  [${f.level}] ${f.code}: ${f.msg}`);
  }
  process.exit(status === "PASS" ? 0 : 1);
}
