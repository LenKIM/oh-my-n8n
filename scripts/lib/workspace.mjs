/**
 * oh-my-n8n 워크스페이스 위치 해석.
 *
 * 우선순위:
 *   1. OMN_WORKSPACE 환경변수
 *   2. ~/.claude/oh-my-n8n.local.md 의 frontmatter `workspace:` (setup 이 기록)
 *   3. ~/.oh-my-n8n (default)
 *
 * 플러그인 형태로 배포되더라도 데이터(node_modules, schemas, custom-nodes)는
 * 항상 사용자 쓰기 가능 워크스페이스에 둠.
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function resolveWorkspace() {
  if (process.env.OMN_WORKSPACE) return process.env.OMN_WORKSPACE;

  const settings = join(homedir(), ".claude/oh-my-n8n.local.md");
  if (existsSync(settings)) {
    const txt = readFileSync(settings, "utf8");
    // frontmatter 블록만 추출
    const fm = txt.match(/^---\n([\s\S]*?)\n---/);
    if (fm) {
      const m = fm[1].match(/^workspace:\s*["']?([^"'\n]+)/m);
      if (m) return m[1].trim().replace(/^~/, homedir());
    }
  }

  return join(homedir(), ".oh-my-n8n");
}

export function workspacePath(...parts) {
  return join(resolveWorkspace(), ...parts);
}

export function assertWorkspaceReady() {
  const ws = resolveWorkspace();
  const missing = [];
  if (!existsSync(ws)) missing.push(`workspace 디렉토리 없음: ${ws}`);
  if (!existsSync(join(ws, "node_modules"))) missing.push("node_modules 미설치 (npm install 필요)");
  if (!existsSync(join(ws, "schemas/internal-nodes.json")))
    missing.push("커스텀 노드 카탈로그 미생성 (extract-catalog 필요)");
  if (missing.length) {
    console.error("[oh-my-n8n] 워크스페이스 준비 미완료:");
    for (const m of missing) console.error("  -", m);
    console.error("\n해결: Claude 에서 `/oh-my-n8n:omn-setup` 실행");
    process.exit(2);
  }
  return ws;
}
