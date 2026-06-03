# oh-my-n8n — n8n 전용 Claude Code 하네스 디자인

`oh-my-claudecode`(OMC) 의 멀티 에이전트 오케스트레이션 패턴을 차용해, **n8n 워크플로 개발/운영** 에 특화된 하네스를 구성한다.

> **현재 상태 (2026-04 기준)**: P0~P3 완료, P4 일부 진행. 실제 동작 환경/스킬 카탈로그/디렉토리 구조는 `README.md` / `CLAUDE.md` 가 SSOT. 본 문서는 초기 설계 문서로 남겨둔다.
> 아래 §2 디렉토리 구조와 §6 로드맵은 현재 상태에 맞춰 갱신됨.

---

## 1. 목표

1. 조직에서 공유하는 **커스텀 노드(custom nodes)** 를 한 곳에서 관리하고 로컬/스테이징 n8n 인스턴스에 즉시 로드.
2. 자주 쓰는 **커뮤니티 플러그인(npm n8n-nodes-\*)** 의 설치/버전 고정/업그레이드를 선언적으로 처리.
3. 최신 n8n 버전 스키마에 맞는 **워크플로 JSON** 을 LLM 으로 생성·검증·배포하는 에이전트 제공.

---

## 2. 디렉토리 구조 (현재)

플러그인은 **얇은 래퍼**, 데이터/인프라는 **워크스페이스** (사용자 git clone) 에 위치.

```
oh-my-n8n/
├── .claude-plugin/
│   ├── plugin.json              # plugin manifest (agents/skills/hooks/mcpServers 키)
│   └── marketplace.json
├── CLAUDE.md                    # 하네스 운영 원칙
├── AGENTS.md                    # 에이전트 카탈로그
├── README.md                    # 사용 가이드
│
├── agents/                      # 서브 에이전트 7종 (frontmatter + 시스템 프롬프트)
│   ├── n8n-workflow-author.md   # 워크플로 JSON 생성
│   ├── n8n-node-developer.md    # 커스텀 노드 TS 코드 작성
│   ├── n8n-workflow-reviewer.md # 검증 (별개 컨텍스트)
│   ├── n8n-debugger.md          # 실행 로그 → 원인 추적
│   ├── n8n-migrator.md          # 버전 업그레이드 마이그레이션
│   └── n8n-ops.md               # docker compose / k8s 운영
│
├── skills/                      # 슬래시 커맨드 12종
│   # 부트스트랩/진단
│   ├── omn-setup/SKILL.md            # 워크스페이스 부트스트랩 (1회)
│   ├── n8n-doctor/SKILL.md           # 9개 항목 환경 진단
│   # 워크플로
│   ├── n8n-new-workflow/SKILL.md     # 요구사항 → 워크플로 JSON
│   ├── n8n-validate/SKILL.md         # JSON 검증 + dry-run
│   ├── n8n-deploy/SKILL.md           # n8n REST API 업로드
│   # 노드/플러그인
│   ├── n8n-new-node/SKILL.md         # 커스텀 노드 스캐폴딩
│   ├── n8n-pkg-add/SKILL.md          # 커뮤니티 플러그인 추가
│   ├── n8n-upgrade/SKILL.md          # n8n 버전 업그레이드 마이그레이션
│   # docker 라이프사이클
│   ├── n8n-up/SKILL.md               # 인스턴스 기동 (--rebuild 옵션)
│   ├── n8n-down/SKILL.md             # 정지 (--remove, --purge)
│   ├── n8n-restart/SKILL.md          # 재시작 (마운트 변경 반영)
│   └── n8n-logs/SKILL.md             # 로그 조회
│
├── custom-nodes/                # 조직 공유 커스텀 노드
│   ├── dist-prebuilt/           # ★ 운영 패턴: 조직 빌드 산출물 미러 (git-ignored, 로컬)
│   │   ├── *.node.js
│   │   └── *.credentials.js
│   ├── nodes/                   # 향후 TS 소스 워크스페이스 (비어있음)
│   ├── package.json
│   └── tsconfig.json
│
├── plugins/                     # 설치할 커뮤니티 플러그인 선언
│   ├── plugins.yaml             # 화이트리스트 SSOT
│   ├── lockfile.json            # npm view 로 해석된 버전 잠금
│   └── install.sh               # plugins.yaml → Dockerfile 빌드 단계용
│
├── workflows/                   # 검증된 워크플로 JSON
│   ├── templates/               # manual-trigger-skeleton 등
│   └── examples/                # 실제 사용 패턴
│
├── schemas/                     # 노드 카탈로그 SSOT
│   ├── internal-nodes.json      # 조직 prebuilt 커스텀 노드 (extract-node-catalog, git-ignored)
│   ├── n8n-core-2.15.0.schema.json   # 코어 노드 502종
│   └── n8n-core-latest.schema.json   # 최신 버전 포인터
│
├── scripts/
│   ├── lib/workspace.mjs        # 워크스페이스 위치 해석 (env → local.md → default)
│   ├── extract-node-catalog.mjs # 커스텀 노드 카탈로그 추출
│   ├── extract-core-catalog.mjs # 코어 노드 카탈로그 추출 (라이브 컨테이너)
│   ├── validate-workflow.mjs    # 워크플로 JSON 검증
│   ├── deploy-workflow.mjs      # n8n REST API 배포
│   ├── sync-plugins.mjs         # plugins.yaml → install.sh + lockfile
│   └── hook-validate-on-write.mjs    # PostToolUse hook
│
├── hooks/
│   └── hooks.json               # PostToolUse: *.workflow.json 자동 검증
│
├── docker/
│   ├── docker-compose.yml       # 로컬 n8n + dist-prebuilt 마운트 (포트 15679)
│   └── Dockerfile.n8n           # n8n 2.15.0 + 커뮤니티 플러그인
│
├── package.json                 # 의존성 (n8n-workflow, xlsx, @langchain/core)
└── .mcp.json                    # MCP 서버 (현재 비어있음)
```

**워크스페이스 vs 플러그인 경로**: 플러그인 자체 경로는 읽기 전용. `node_modules/`, `schemas/*` 갱신 등 쓰기 작업은 워크스페이스(default `~/.oh-my-n8n` 또는 `OMN_WORKSPACE`)에서 수행. 위치 해석은 `scripts/lib/workspace.mjs`.

---

## 3. 핵심 컴포넌트

### 3-1. 커스텀 노드 모노레포 (`custom-nodes/`)

- pnpm/npm workspaces 로 노드별 패키지 분리.
- `N8N_CUSTOM_EXTENSIONS` 환경변수 또는 `~/.n8n/custom` 심볼릭 링크로 로드.
- `docker-compose.yml` 에서 `./custom-nodes:/home/node/.n8n/custom:ro` 마운트.
- CI: 노드별 단위테스트 + `n8n-node-dev` 린트.

### 3-2. 플러그인 선언 (`plugins/plugins.yaml`)

```yaml
n8nVersion: ">=1.70.0 <2.0.0"
plugins:
  - name: n8n-nodes-mcp
    version: ^0.5.0
  - name: "@n8n/n8n-nodes-langchain"
    version: pinned-from-core
  - name: n8n-nodes-puppeteer
    version: ^1.4.0
```

`scripts/sync-plugins.mjs` 가 yaml → `npm install -g` 또는 Dockerfile 빌드 인자로 변환.

### 3-3. 워크플로 작성 에이전트 (`agents/n8n-workflow-author.md`)

핵심 역할:
- 사용자의 자연어 요구사항 → n8n 워크플로 JSON.
- 항상 **현재 설치된 n8n 버전의 노드 스키마**를 참조 (`schemas/` 또는 MCP 로 라이브 조회).
- `custom-nodes/` 와 `plugins.yaml` 에 등록된 노드만 사용 (외부 노드 사용 시 사전에 등록 PR 유도).
- 출력 후 자동으로 `n8n-workflow-reviewer` 에이전트로 검증 패스.

OMC 의 "writer ↔ reviewer 분리" 원칙을 그대로 차용 — 작성자와 리뷰어는 **별개 컨텍스트**.

### 3-4. 검증 파이프라인

`PostToolUse` 훅에서 `*.workflow.json` 변경 감지 → `validate-workflow.mjs` 자동 실행.
검사 항목:
1. n8n JSON Schema 호환성.
2. 사용된 모든 노드 타입이 코어/`custom-nodes`/`plugins.yaml` 에 존재.
3. `credentials` 시크릿 하드코딩 금지(정규식 스캔).
4. `expressions` 문법 검사 (`={{ ... }}` 파싱).
5. 트리거 노드 정확히 1개.

---

## 4. 에이전트 카탈로그

| 에이전트 | 모델 | 역할 |
|---|---|---|
| `n8n-workflow-author` | sonnet | 요구사항 → 워크플로 JSON |
| `n8n-node-developer` | opus | TypeScript 커스텀 노드 작성 |
| `n8n-workflow-reviewer` | opus | 스키마/보안/시크릿 검증 |
| `n8n-debugger` | sonnet | 실패 실행 로그 → 원인 추적 |
| `n8n-migrator` | opus | 버전 업그레이드 자동 마이그레이션 |
| `n8n-ops` | sonnet | docker/k8s/백업/복구 |
| `explore` | haiku | 빠른 카탈로그/스키마 조회 |

`/team` 파이프라인 예시:
```
team-plan(n8n-workflow-author)
  → team-exec(n8n-workflow-author)
  → team-verify(n8n-workflow-reviewer)
  → team-fix(n8n-debugger) [loop, max 3]
```

---

## 5. CLAUDE.md (하네스 운영 원칙) — 초안

```md
<!-- OMN:START -->
<!-- OMN:VERSION:0.1.0 -->

# oh-my-n8n — n8n 전용 멀티 에이전트 하네스

당신은 n8n 워크플로 개발/운영을 돕는 oh-my-n8n 하네스에서 동작합니다.

<operating_principles>
- 워크플로 JSON 은 **항상** 현재 설치된 n8n 버전 스키마와 `custom-nodes/`, `plugins.yaml` 의
  노드만 사용한다. 미등록 노드 사용 금지.
- 시크릿/토큰을 워크플로 JSON 에 하드코딩하지 않는다 — n8n credentials 참조만 허용.
- 작성(writer)과 검증(reviewer)은 별도 컨텍스트로 분리. 자기 검증 금지.
- 변경 후에는 `validate-workflow.mjs` 로 검증 증거를 수집하기 전까지 완료 선언 금지.
</operating_principles>

<delegation_rules>
- 워크플로 JSON 생성/수정 → `n8n-workflow-author`
- 커스텀 노드(TS) 작성 → `n8n-node-developer`
- 검증/리뷰 → `n8n-workflow-reviewer`
- 실행 실패 분석 → `n8n-debugger`
- 버전 업그레이드 → `n8n-migrator`
- 배포/운영 → `n8n-ops`
</delegation_rules>

<knowledge_sources>
1. `schemas/n8n-<version>.schema.json` — 노드 스키마 (Single Source of Truth).
2. `custom-nodes/nodes/*/` — 조직 커스텀 노드 정의.
3. `plugins/plugins.yaml` — 설치 가능한 커뮤니티 노드.
4. `workflows/templates/`, `workflows/examples/` — 검증된 패턴.
스키마 의심 시 MCP 의 `n8n.describeNode` 또는 공식 docs 를 조회.
</knowledge_sources>

<workflow_authoring_protocol>
1. 요구사항 분해 → 사용할 트리거/노드 후보 나열.
2. 후보 노드가 모두 등록되어 있는지 확인. 미등록 시 사용자에게 보고하고 등록 제안.
3. JSON 초안 작성 → `n8n-workflow-reviewer` 호출.
4. 리뷰 통과 후 `n8n-validate` 스킬로 dry-run.
5. 사용자 승인 시 `n8n-deploy` 로 업로드.
</workflow_authoring_protocol>

<skills>
`/oh-my-n8n:n8n-new-workflow`, `/oh-my-n8n:n8n-new-node`, `/oh-my-n8n:n8n-validate`,
`/oh-my-n8n:n8n-deploy`, `/oh-my-n8n:n8n-upgrade`, `/oh-my-n8n:n8n-pkg-add`,
`/oh-my-n8n:n8n-doctor`
</skills>

<commit_protocol>
OMC 와 동일한 git trailer 규칙 사용 (Constraint/Rejected/Directive/Confidence/Scope-risk).
워크플로 JSON 변경 시 추가 trailer:
- `Workflow-id:` n8n 워크플로 ID
- `n8n-version:` 대상 n8n 버전
</commit_protocol>
```

---

## 6. 단계별 구축 로드맵

| 단계 | 산출물 | 상태 |
|---|---|---|
| **P0** 부트스트랩 | `plugin.json`, `CLAUDE.md`, `docker-compose.yml`, 에이전트 7종 + 스킬 7종 | ✅ 완료 |
| **P1** 카탈로그 | `plugins.yaml` + `sync-plugins.mjs`, 조직 커스텀 노드 미러 (`dist-prebuilt/`), 카탈로그 추출 (`internal-nodes.json`) | ✅ 완료 |
| **P2** 워크플로 작성 | `n8n-workflow-author` + `n8n-workflow-reviewer`, `validate-workflow.mjs` (7개 검사) | ✅ 완료 |
| **P3** 자동화 훅 + 플러그인화 | `PostToolUse` 자동 검증 훅, `omn-setup` 부트스트랩, 라이프사이클 스킬 4종 (`n8n-up/down/restart/logs`), 워크스페이스 분리 | ✅ 완료 |
| **P4** 운영 | n8n 2.15.0 docker 기동 검증, 코어 노드 502종 캐시, `n8n-migrator` 작성, 백업/복구 런북, `.mcp.json` 채우기 | 🟡 일부 |
| **P5** 배포 | GitHub 레포 공개, 플러그인 마켓플레이스 등록, prebuilt 커스텀 노드 표준 배포처 정립 | ⬜ 미시작 |

---

## 7. OMC 와의 매핑 정리

| OMC 컴포넌트 | oh-my-n8n 대응 |
|---|---|
| `agents/executor` | `n8n-workflow-author` + `n8n-node-developer` |
| `agents/code-reviewer` | `n8n-workflow-reviewer` |
| `agents/debugger` | `n8n-debugger` |
| `skills/autopilot` | `/n8n-new-workflow` (요구사항 → 배포까지 end-to-end) |
| `team_pipeline` | plan → author → review → validate → deploy |
| `<verification>` | `validate-workflow.mjs` 증거 수집 |
| `hooks.json` | workflow JSON 변경 시 자동 검증 |

이 디자인을 베이스로 P0 부트스트랩(`plugin.json` + `CLAUDE.md` + `docker-compose.yml`) 부터 시작하면 됩니다.
