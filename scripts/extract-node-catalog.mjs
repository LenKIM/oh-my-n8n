#!/usr/bin/env node
/**
 * custom-nodes/dist-prebuilt/*.js 의 노드/credentials 메타를 추출하여
 * schemas/internal-nodes.json 으로 직렬화.
 *
 * - 각 .node.js 를 require → exports 의 첫 클래스를 인스턴스화 → `description` 수집.
 * - 각 .credentials.js 도 동일하게 처리.
 * - 결과는 validate-workflow.mjs 와 n8n-workflow-author 가 카탈로그로 사용.
 */

import { readdirSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveWorkspace } from "./lib/workspace.mjs";

const ROOT = resolveWorkspace();
const SRC = join(ROOT, "custom-nodes/dist-prebuilt");
const OUT = join(ROOT, "schemas/internal-nodes.json");
const require = createRequire(import.meta.url);

if (!existsSync(SRC)) {
  console.error(`not found: ${SRC}`);
  process.exit(1);
}

const nodes = [];
const credentials = [];
const errors = [];

for (const f of readdirSync(SRC).sort()) {
  if (!f.endsWith(".js")) continue;
  const full = join(SRC, f);
  let mod;
  try {
    mod = require(full);
  } catch (e) {
    errors.push({ file: f, error: e.message });
    continue;
  }
  const exported = Object.values(mod).filter((v) => typeof v === "function");
  for (const Cls of exported) {
    let inst;
    try { inst = new Cls(); } catch { continue; }

    if (f.endsWith(".credentials.js")) {
      // credentials 는 description 없이 인스턴스에 직접 name/properties 가 붙는 형태가 일반적.
      const name = inst.name ?? inst.description?.name;
      if (!name) continue;
      credentials.push({
        file: f,
        name,
        displayName: inst.displayName ?? inst.description?.displayName,
        documentationUrl: inst.documentationUrl ?? null,
        propertyCount: Array.isArray(inst.properties) ? inst.properties.length : 0,
      });
      continue;
    }

    const desc = inst.description;
    if (!desc) continue;

    if (f.endsWith(".node.js")) {
      const fullType = inferFullType(desc);
      nodes.push({
        file: f,
        name: desc.name,
        fullType,
        displayName: desc.displayName,
        group: desc.group,
        version: desc.version,
        description: desc.description,
        usableAsTool: desc.usableAsTool ?? false,
        credentials: (desc.credentials ?? []).map((c) => c.name),
        properties: (desc.properties ?? []).map((p) => ({
          name: p.name,
          displayName: p.displayName,
          type: p.type,
          required: p.required ?? false,
          default: p.default,
          description: p.description ?? null,
        })),
      });
    }
  }
}

function inferFullType(desc) {
  // n8n 내부적으로 type 은 보통 "<package>.<name>" 형식.
  // 커스텀 노드는 n8n 인스턴스에서 `CUSTOM.<name>` 으로 등록되므로
  // 워크플로 JSON 의 `type` 필드도 반드시 prefix 를 포함해야 한다.
  return `CUSTOM.${desc.name}`;
}

writeFileSync(
  OUT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "custom-nodes/dist-prebuilt",
      nodes,
      credentials,
      errors,
    },
    null,
    2,
  ) + "\n",
);

console.log(`wrote ${OUT}`);
console.log(`nodes: ${nodes.length}, credentials: ${credentials.length}, errors: ${errors.length}`);
if (errors.length) {
  for (const e of errors) console.log(`  [error] ${e.file}: ${e.error}`);
}
