<!-- OMN:START -->
<!-- OMN:VERSION:0.1.0 -->

# oh-my-n8n — n8n 전용 멀티 에이전트 하네스

당신은 n8n 워크플로 개발/운영을 돕는 oh-my-n8n 하네스에서 동작합니다.
oh-my-claudecode(OMC) 의 멀티 에이전트 오케스트레이션 패턴을 n8n 도메인에 특화시켰습니다.

<workspace_resolution>
모든 데이터(카탈로그, 커스텀 노드 미러, docker, node_modules)는 **워크스페이스**에 있다.
- 1순위: `$OMN_WORKSPACE` 환경변수
- 2순위: `~/.claude/oh-my-n8n.local.md` frontmatter 의 `workspace:`
- 3순위: `~/.oh-my-n8n` (default)
워크스페이스가 준비되어 있지 않으면 어떤 작업도 진행하지 말고 `/oh-my-n8n:omn-setup` 안내.
플러그인 자체 경로(`${CLAUDE_PLUGIN_ROOT}`)는 읽기 전용이므로 거기에 쓰지 말 것.
</workspace_resolution>

<operating_principles>
- 워크플로 JSON 은 **항상** 현재 설치된 n8n 버전 스키마와 `custom-nodes/`, `plugins/plugins.yaml` 에
  등록된 노드만 사용한다. 미등록 노드 사용 금지.
- 시크릿/토큰을 워크플로 JSON 에 하드코딩하지 않는다 — n8n credentials 참조만 허용.
- 작성(writer)과 검증(reviewer)은 별도 컨텍스트로 분리. 자기 검증 금지.
- 변경 후에는 `scripts/validate-workflow.mjs` 검증 증거를 수집하기 전까지 완료 선언 금지.
- 추측보다 증거 우선: 노드 스키마는 `schemas/` 또는 라이브 MCP 로 확인.
</operating_principles>

<delegation_rules>
- 워크플로 JSON 생성/수정 → `n8n-workflow-author`
- 커스텀 노드(TS) 작성/수정 → `n8n-node-developer`
- 검증/리뷰 → `n8n-workflow-reviewer`
- 실행 실패 분석 → `n8n-debugger`
- n8n 버전 업그레이드 마이그레이션 → `n8n-migrator`
- docker / k8s / 백업 / 복구 → `n8n-ops`
- 빠른 카탈로그/스키마 조회 → `explore` (haiku)
</delegation_rules>

<model_routing>
`haiku` (스키마 조회, 카탈로그 lookup), `sonnet` (워크플로 작성, 디버깅), `opus` (커스텀 노드 설계, 리뷰, 마이그레이션).
직접 편집 가능 경로: `workflows/**`, `custom-nodes/**`, `plugins/**`, `schemas/**`, `CLAUDE.md`, `AGENTS.md`.
</model_routing>

<agent_catalog>
Prefix: `oh-my-n8n:`. 전체 프롬프트는 `agents/*.md` 참조.

n8n-workflow-author (sonnet), n8n-node-developer (opus), n8n-workflow-reviewer (opus),
n8n-debugger (sonnet), n8n-migrator (opus), n8n-ops (sonnet), explore (haiku)
</agent_catalog>

<knowledge_sources>
1. `schemas/internal-nodes.json` — **조직 prebuilt 커스텀 노드 카탈로그** (커스텀 노드를 쓰는 경우).
   `npm run extract-catalog` 로 `custom-nodes/dist-prebuilt/*.js` 에서 자동 추출. (git-ignored, 로컬 생성물)
2. `schemas/n8n-core-<version>.schema.json` + `n8n-core-latest.schema.json` —
   **n8n 코어 노드 카탈로그 (502 노드, 391 credentials)**.
   `node scripts/extract-core-catalog.mjs` 로 라이브 컨테이너에서 추출.
3. `custom-nodes/dist-prebuilt/` — 조직 커스텀 노드 컴파일 산출물 (읽기 전용 미러, git-ignored).
4. `plugins/plugins.yaml` — 설치 가능한 커뮤니티 노드 화이트리스트.
5. `workflows/templates/`, `workflows/examples/` — 검증된 패턴 라이브러리.
6. n8n 공식 docs (https://docs.n8n.io) — 위 소스에 없을 때만 조회.

스키마 의심 시: `internal-nodes.json` / `n8n-core-latest.schema.json` → 공식 docs 순.
커스텀 노드 코드 수정 요청은 해당 노드의 원본 레포로 안내 — 이 하네스에서 직접 수정 금지.
**현재 검증된 n8n 버전: 2.15.0** (Dockerfile.n8n + plugins.yaml 의 SSOT).
</knowledge_sources>

<skills>
Invoke via `/oh-my-n8n:<name>`.

부트스트랩/진단:
- `omn-setup` — 워크스페이스 부트스트랩 (1회)
- `n8n-doctor` — 9개 항목 환경 진단

워크플로 작성:
- `n8n-new-workflow` — 요구사항 → JSON (author → reviewer → validate)
- `n8n-validate` — 검증 dry-run
- `n8n-deploy` — n8n REST API 업로드

노드/플러그인:
- `n8n-new-node` — 커스텀 노드 TS 스캐폴딩
- `n8n-pkg-add` — `plugins.yaml` 에 커뮤니티 노드 추가
- `n8n-upgrade` — n8n 버전 업그레이드 마이그레이션

라이프사이클 (docker):
- `n8n-up` (옵션 `--rebuild`) — 인스턴스 기동
- `n8n-down` (옵션 `--remove`, `--purge`) — 정지
- `n8n-restart` — 재시작 (커스텀 노드 갱신 반영)
- `n8n-logs` (옵션 `--tail`, `--follow`, `--since`, `--grep`) — 로그 조회
</skills>

<workflow_authoring_protocol>
1. 요구사항 분해 → 사용할 트리거/노드 후보 나열.
2. 후보 노드가 `custom-nodes/` 또는 `plugins.yaml` 에 등록되어 있는지 검증.
   미등록 시 사용자에게 보고하고 `/oh-my-n8n:n8n-pkg-add` 또는 `/oh-my-n8n:n8n-new-node` 제안.
3. JSON 초안 작성 → 별개 컨텍스트의 `n8n-workflow-reviewer` 호출.
4. 리뷰 통과 후 `n8n-validate` 로 dry-run.
5. 사용자 명시적 승인 시에만 `n8n-deploy` 실행.
</workflow_authoring_protocol>

<verification>
완료 선언 전 필수:
- `scripts/validate-workflow.mjs` 통과
- 사용된 모든 노드가 카탈로그에 존재
- 시크릿 하드코딩 없음 (정규식 스캔)
- 트리거 노드 정확히 1개
- (배포 시) n8n 인스턴스에서 dry-run 성공
</verification>

<execution_protocols>
- 광범위한 요구사항: 먼저 `explore` 로 카탈로그/예제 조회 → `plan` → `author`.
- 독립 작업 2개 이상은 병렬 호출.
- 빌드/테스트는 `run_in_background`.
- 작성과 리뷰는 항상 별도 패스 — 같은 활성 컨텍스트에서 자기 승인 금지.
</execution_protocols>

<commit_protocol>
OMC 의 git trailer 규칙을 그대로 사용:
- `Constraint:` 결정에 영향을 준 제약
- `Rejected:` 거부된 대안 | 사유
- `Directive:` 향후 수정자에 대한 지시
- `Confidence:` high | medium | low
- `Scope-risk:` narrow | moderate | broad
- `Not-tested:` 테스트되지 않은 시나리오

워크플로 JSON 변경 시 추가 trailer:
- `Workflow-id:` n8n 워크플로 ID (배포된 경우)
- `n8n-version:` 대상 n8n 버전 (예: 1.74.0)
- `Custom-nodes:` 사용된 커스텀 노드 목록 (쉼표 구분)

예시:
```
feat(workflow): add slack-to-jira escalation flow

Constraint: Slack 은 조직 전용 AcmeSlack 노드만 허용
Rejected: n8n-nodes-slack-community | 조직 인증 미지원
Confidence: high
Scope-risk: narrow
Workflow-id: 142
n8n-version: 1.74.0
Custom-nodes: AcmeSlack, AcmeInternalApi
```
</commit_protocol>

<hooks_and_context>
PostToolUse 훅이 `*.workflow.json` 변경을 감지하면 자동으로 `validate-workflow.mjs` 실행.
검증 실패 시 `<system-reminder>` 로 결과를 주입 — 즉시 수정 후 재검증.
</hooks_and_context>
<!-- OMN:END -->
