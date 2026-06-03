---
name: omn-setup
description: oh-my-n8n 하네스의 워크스페이스를 부트스트랩한다. 첫 사용 시 또는 n8n-doctor 가 누락을 감지했을 때 호출. git clone, npm install, 커스텀 노드 카탈로그 추출, docker 인스턴스 기동까지 순차 실행. 사용자가 "n8n 하네스 셋업", "처음 설치", "omn 초기화" 요청 시 사용.
---

# /oh-my-n8n:omn-setup

oh-my-n8n 워크스페이스를 사용자 머신에 준비한다.

## 결정 사항 (사용자에게 한 번에 질문)

다음 항목을 한 번의 질문 묶음으로 확인:

1. **워크스페이스 경로** (default: `~/.oh-my-n8n`)
2. **prebuilt 커스텀 노드 소스** (커스텀 노드를 쓰는 경우, 다음 중 하나)
   - 환경변수 `OMN_PREBUILT_SOURCE` 가 가리키는 로컬 경로 (조직의 prebuilt n8n 노드 디렉토리)
   - 기존 워크스페이스 (이미 있다면 skip)
   - 커스텀 노드를 쓰지 않으면 이 단계는 skip
3. **docker 자동 기동 여부** (default: yes)
4. **n8n 인스턴스 포트** (default: 15679 — 표준 5678/5679/5680 충돌 회피)

## 절차

### 1단계 — 워크스페이스 git clone

```bash
WS="${OMN_WORKSPACE:-$HOME/.oh-my-n8n}"
if [ ! -d "$WS/.git" ]; then
  git clone https://github.com/<your-org>/oh-my-n8n.git "$WS"
else
  (cd "$WS" && git pull --ff-only)
fi
```

### 2단계 — 의존성 설치

```bash
cd "$WS" && npm install
```

### 3단계 — prebuilt 커스텀 노드 미러 (커스텀 노드를 쓰는 경우)

```bash
SRC="${OMN_PREBUILT_SOURCE:-}"
if [ -z "$SRC" ]; then
  echo "OMN_PREBUILT_SOURCE 가 설정되지 않았습니다 — 커스텀 노드 미러 단계를 건너뜁니다."
elif [ ! -d "$SRC" ]; then
  echo "커스텀 노드 소스를 찾을 수 없습니다: $SRC"
  echo "OMN_PREBUILT_SOURCE 환경변수로 경로를 지정하세요."
  exit 1
else
  mkdir -p "$WS/custom-nodes/dist-prebuilt"
  cp "$SRC"/*.js "$WS/custom-nodes/dist-prebuilt/"
fi
```

### 4단계 — 카탈로그 추출

```bash
cd "$WS" && npm run extract-catalog
```

### 5단계 — docker 기동 (사용자 동의 시)

`/oh-my-n8n:n8n-up --rebuild` 스킬에 위임. setup 은 docker 라이프사이클을 직접 관리하지 않는다.

위임 후 healthz PASS 확인되면 6단계로.

PASS 시 `node scripts/extract-core-catalog.mjs` 실행하여 코어 노드 카탈로그까지 추출.

### 6단계 — 설정 영속화

`~/.claude/oh-my-n8n.local.md` 에 다음 기록:

```markdown
---
workspace: <절대경로>
n8nUrl: http://localhost:15679
n8nVersion: 2.15.0
prebuiltSource: <원본 경로>
setupAt: <ISO8601>
---

# oh-my-n8n local config

(생성됨 — 수동 편집 가능)
```

이 파일은 `scripts/lib/workspace.mjs` 와 향후 다른 스킬이 워크스페이스 위치를 자동 해석하는 데 사용됨.

## 출력

```
✓ workspace: ~/.oh-my-n8n
✓ npm install: 완료
✓ 커스텀 노드: N개 (custom-nodes/dist-prebuilt/)   # 커스텀 노드를 쓰는 경우
✓ 카탈로그: schemas/internal-nodes.json
✓ docker: n8n-up --rebuild 위임 완료 (oh-my-n8n @ localhost:15679)
✓ 코어 노드 캐시: schemas/n8n-core-2.15.0.schema.json (502 nodes)

다음 단계:
  /oh-my-n8n:n8n-new-workflow  → 첫 워크플로 작성
  /oh-my-n8n:n8n-doctor        → 환경 점검

라이프사이클 스킬:
  /oh-my-n8n:n8n-up | n8n-down | n8n-restart | n8n-logs
```

## 실패 처리

각 단계 실패 시 그 단계만 표시하고 사용자에게 결정 요청. 다음 단계로 진행하지 않음.

- git clone 실패 → 인증 / 네트워크 점검 안내
- npm install 실패 → Node 버전 (>=18) 확인
- 커스텀 노드 소스 누락 → `OMN_PREBUILT_SOURCE` 환경변수 안내 (커스텀 노드를 쓰는 경우)
- docker 기동 실패 → `docker logs oh-my-n8n` 출력 후 사용자에게 결정 위임
- 포트 충돌 → 다른 포트 제안

## 멱등성

이미 셋업된 워크스페이스에 다시 실행해도 안전. 각 단계가 "이미 완료됨" 을 감지하고 skip.
