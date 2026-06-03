#!/usr/bin/env node
/**
 * PostToolUse hook: Write/Edit/MultiEdit 가 *.workflow.json 을 건드리면
 * 자동으로 validate-workflow.mjs 를 실행하고 결과를 system-reminder 로 주입.
 *
 * stdin 으로 hook payload 가 들어옴 (Claude Code spec).
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveWorkspace } from "./lib/workspace.mjs";

const ROOT = resolveWorkspace();

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const path = payload?.tool_input?.file_path;
if (!path || !path.endsWith(".workflow.json")) process.exit(0);

// 검증기는 워크스페이스의 카탈로그를 사용. 대상 JSON 은 어디에 있어도 OK.
const validator = join(ROOT, "scripts/validate-workflow.mjs");
const r = spawnSync("node", [validator, path, "--json"], {
  encoding: "utf8",
  env: { ...process.env, OMN_WORKSPACE: ROOT },
});
let result;
try {
  result = JSON.parse(r.stdout);
} catch {
  process.exit(0);
}

if (result.status === "PASS") {
  console.log(`[oh-my-n8n] ${path}: validate PASS`);
  process.exit(0);
}

const lines = result.findings.map((f) => `  [${f.level}] ${f.code}: ${f.msg}`).join("\n");
console.log(
  `<system-reminder>\noh-my-n8n: workflow validation FAILED for ${path}\n${lines}\n` +
    `즉시 n8n-workflow-author 또는 n8n-workflow-reviewer 에 수정 위임하세요.\n</system-reminder>`,
);
// non-blocking: exit 0 so the write itself succeeds, the model just sees the warning.
process.exit(0);
