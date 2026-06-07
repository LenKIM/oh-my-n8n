# oh-my-n8n

[English](./README.md) · [한국어](./README.ko.md)

**n8n** 워크플로 작성·검증·운영을 위한 멀티 에이전트 Claude Code 하네스입니다.
`oh-my-claudecode`(OMC) 의 멀티 에이전트 오케스트레이션 패턴을 n8n 도메인에 특화시켰습니다.

플러그인 자체는 **얇은 래퍼(thin wrapper)** 입니다. 실제 데이터(조직의 커스텀 노드 미러,
카탈로그, docker, `node_modules`)는 사용자 머신의 **워크스페이스(workspace)** 에 존재합니다.
처음 사용할 때 `/oh-my-n8n:omn-setup` 이 설치 전 과정을 자동화합니다.

## 무엇을 하는가

- **커스텀 노드 미러** (`custom-nodes/dist-prebuilt/`) — 조직의 prebuilt n8n 노드를 여기에 두면
  docker 가 마운트하여 즉시 로드합니다. (로컬에만 보관 — 절대 커밋하지 않음.)
- **선언적 커뮤니티 플러그인** (`plugins/plugins.yaml`) — 화이트리스트 + lockfile.
- **워크플로 작성 에이전트** — 요구사항 → 검증된 JSON → dry-run → 배포.
- **버전 마이그레이션 에이전트** — n8n 업그레이드 시 breaking change 를 자동으로 처리.

## 어떻게 동작하는가

oh-my-n8n 은 docker 래퍼가 아닙니다 — n8n 작업을 **7개의 전문 서브 에이전트** 로 분리하고,
*작성/검증 분리(write / verify separation)* 를 강제하여 어떤 에이전트도 자기 산출물을 스스로
승인하지 못하게 하는 **멀티 에이전트 하네스** 입니다.

### 에이전트

각 에이전트는 작업 성격에 맞는 모델을 배정받아(조회는 저렴하게, 설계·리뷰는 그렇지 않게)
독립된 컨텍스트에서 동작합니다:

| 에이전트 | 모델 | 역할 |
|---|---|---|
| `n8n-workflow-author` | sonnet | 자연어 요구사항 → 워크플로 JSON. **등록된 노드만**(`custom-nodes/`, `plugins.yaml`) 사용하며, 시크릿은 항상 credential 참조로만 — 리터럴 금지. |
| `n8n-workflow-reviewer` | opus | author 의 JSON 을 **별도 컨텍스트** 에서 독립 재검증 — 스키마 적합성, 시크릿 노출, expression 문법, 노드 등록 여부, 트리거 유일성, 데드 노드. author 의 자기 승인 불가. |
| `n8n-node-developer` | opus | 조직의 TypeScript 커스텀 노드를 `INodeType` 표준에 맞춰 작성/수정. |
| `n8n-debugger` | sonnet | 실행 ID / 에러 스택트레이스를 받아 실패 노드를 특정하고 수정안을 제시. |
| `n8n-migrator` | opus | n8n 업그레이드 시 breaking change(typeVersion 변경, deprecated 노드)를 감지하고 자동 마이그레이션. |
| `n8n-ops` | sonnet | docker/k8s 라이프사이클, 헬스체크, 백업/복구, 로그 수집. |
| `explore` | haiku | 빠른 읽기 전용 카탈로그/스키마/예제 조회. |

### 워크플로 정확성을 지키는 장치

- **작성/검증 분리** — 작성과 리뷰는 항상 별도 패스입니다. 한 컨텍스트 안에서의 자기 승인은
  금지됩니다 (OMC 오케스트레이션 패턴의 핵심을 n8n 에 특화).
- **카탈로그 기반 노드** — 생성된 워크플로의 모든 노드는 코어 노드 카탈로그
  (`schemas/n8n-core-latest.schema.json`, 502 노드) 또는 사용자의 커스텀 노드 미러에
  존재해야 합니다. 미등록 노드는 거부되며, 하네스가 `n8n-pkg-add` / `n8n-new-node` 로 안내합니다.
- **시크릿 하드코딩 금지** — 토큰은 오직 n8n credential 참조로만 사용하며, 워크플로가
  완료로 간주되기 전 정규식 스캔이 리터럴을 차단합니다.
- **자동 검증 훅** — PostToolUse 훅이 `*.workflow.json` 이 작성/수정될 때마다
  `validate-workflow.mjs` 를 실행하고 결과를 다시 주입하여 실패를 즉시 수정하게 합니다.
- **"완료" 선언 전 증거 확보** — `validate-workflow.mjs` 통과, 트리거 정확히 1개,
  (배포 시) 라이브 인스턴스에서 dry-run 성공 — 이 조건이 충족되기 전까지 완료를 선언하지 않습니다.

## 설치

### 1. 사전 요구사항

- Claude Code 설치 (`claude` CLI 사용 가능)
- Docker Desktop 또는 Docker Engine
- Node.js >= 18
- (선택) 커스텀 노드를 쓰는 경우, 조직 prebuilt n8n 노드의 소스 디렉토리

### 2. 플러그인 등록 (Claude 내부)

Claude Code 를 실행한 뒤 Claude 프롬프트에 입력:

```
/plugin marketplace add https://github.com/<your-org>/oh-my-n8n.git
```

> 로컬에 클론되어 있다면 경로도 가능합니다:
> `/plugin marketplace add /path/to/oh-my-n8n`

### 3. 플러그인 설치 + 활성화

```
/plugin install oh-my-n8n@oh-my-n8n
```

확인:

```
/plugin list
```

`oh-my-n8n` 이 active 로 표시되면 준비 완료입니다. 12개의 슬래시 명령(`/oh-my-n8n:*`)을 사용할 수 있습니다.

### 4. 워크스페이스 부트스트랩

```
/oh-my-n8n:omn-setup
```

setup 스킬이 다음 순서로 실행됩니다:

1. 워크스페이스를 `~/.oh-my-n8n` 으로 클론(또는 pull)
2. `npm install`
3. prebuilt 커스텀 노드 복사 (커스텀 노드를 쓰는 경우 `OMN_PREBUILT_SOURCE` 경로에서)
4. 카탈로그 추출 (`schemas/internal-nodes.json`)
5. docker 인스턴스 기동 (`/oh-my-n8n:n8n-up --rebuild` 에 위임, http://localhost:15679)
6. 코어 노드 카탈로그 캐시 (`schemas/n8n-core-latest.schema.json`)
7. 워크스페이스 위치를 `~/.claude/oh-my-n8n.local.md` 에 기록

이후 다른 스킬들은 이 설정을 자동으로 인식합니다.

### 5. 검증

```
/oh-my-n8n:n8n-doctor
```

모든 항목 PASS → 준비 완료.

### 플러그인 업데이트

플러그인 코드가 갱신되면:

```
/plugin marketplace update oh-my-n8n
/plugin update oh-my-n8n
```

워크스페이스(`~/.oh-my-n8n`)는 `cd ~/.oh-my-n8n && git pull && npm install` 로 별도 갱신하거나,
`/oh-my-n8n:omn-setup` 을 다시 실행하면 됩니다 (멱등성 보장).

## 환경 점검

```
/oh-my-n8n:n8n-doctor
```

실패마다 한 줄짜리 복구 명령이 따라오는 PASS/FAIL 점검 모음입니다.

## 일상 사용

워크플로:
```
/oh-my-n8n:n8n-new-workflow      # 요구사항 → 워크플로 JSON
/oh-my-n8n:n8n-validate <path>   # 검증
/oh-my-n8n:n8n-deploy <path>     # n8n 인스턴스에 업로드
/oh-my-n8n:n8n-new-node <Name>   # 커스텀 노드 스캐폴딩
/oh-my-n8n:n8n-pkg-add <pkg>     # 커뮤니티 플러그인 추가
/oh-my-n8n:n8n-upgrade <version> # n8n 버전 업그레이드 마이그레이션
```

Docker 라이프사이클:
```
/oh-my-n8n:n8n-up                # 기동 (이미 실행 중이면 건너뜀)
/oh-my-n8n:n8n-up --rebuild      # 이미지 재빌드 후 기동
/oh-my-n8n:n8n-down              # 정지 (데이터 보존)
/oh-my-n8n:n8n-restart           # 재시작 (커스텀 노드 변경 반영)
/oh-my-n8n:n8n-logs --tail 50    # 로그 (--follow / --since / --grep)
```

## 워크스페이스 위치 해석 순서

1. `OMN_WORKSPACE` 환경변수
2. `~/.claude/oh-my-n8n.local.md` 의 `workspace:` frontmatter
3. `~/.oh-my-n8n` (기본값)

## 환경변수

| 변수 | 기본값 | 용도 |
|---|---|---|
| `OMN_WORKSPACE` | `~/.oh-my-n8n` | 워크스페이스 절대 경로 |
| `OMN_PREBUILT_SOURCE` | (없음) | prebuilt 커스텀 노드 소스 디렉토리 |
| `N8N_URL` | `http://localhost:15679` | 배포 대상 인스턴스 |
| `N8N_API_KEY` | (없음) | n8n REST API 키 |

## 디렉토리 구조

```
플러그인 (배포됨):                  워크스페이스 (직접 클론):
  agents/                            custom-nodes/dist-prebuilt/   ← 커스텀 노드 미러
  skills/                            schemas/                       ← 카탈로그 캐시
  hooks/hooks.json                   workflows/                     ← 직접 작성한 워크플로
  scripts/lib/workspace.mjs          plugins/                       ← 커뮤니티 노드 yaml
                                     docker/                        ← 로컬 인스턴스
                                     node_modules/
                                     ~/.claude/oh-my-n8n.local.md   ← 워크스페이스 포인터
```

## 검증된 환경

- n8n 2.15.0
- n8n 코어 노드 카탈로그 (502 노드)
- (선택) 조직의 prebuilt 커스텀 노드 (`custom-nodes/dist-prebuilt/` 에 미러링)

설계는 `DESIGN.md`, 운영 원칙은 `CLAUDE.md` 를 참고하세요.

## 라이선스

[LICENSE](./LICENSE) 참고.
