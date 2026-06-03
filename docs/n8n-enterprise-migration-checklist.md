# n8n 엔터프라이즈 전환 체크리스트

> 현재 환경: **Self-hosted**, 인증은 **OIDC** 연동 예정
> 운영 n8n 버전: **2.15.0**
> 작성일: 2026-05-15

엔터프라이즈 라이선스 적용 시 챙겨야 할 항목을 카테고리별로 정리한 문서입니다.
"설정값 한 줄로 끝나는 작은 항목"부터 "정책/거버넌스 차원의 결정"까지 포함합니다.

---

## 목차

1. [Phase별 전환 절차](#phase별-전환-절차)
2. [엔터프라이즈에서 해제되는 limit 항목](#엔터프라이즈에서-해제되는-limit-항목)
3. [Audit Log 활용 방법](#audit-log-활용-방법)
4. [놓치기 쉬운 보안/운영 설정](#놓치기-쉬운-보안운영-설정)
5. [거버넌스 / 운영 절차](#거버넌스--운영-절차)
6. [우선순위 매트릭스](#우선순위-매트릭스)

---

## Phase별 전환 절차

### Phase 1 — 계약/라이선스 활성화

- [ ] **현재 월간 실행량 측정** — 계약 규모(executions) 협의 근거 마련
- [ ] **호스팅 방식 명시** — 계약서에 Self-hosted 명시
- [ ] **SLA 조건 확인** — 응답 시간, 장애 대응 채널 범위
- [ ] **인보이스 빌링 등록** — 세금계산서 방식
- [ ] **라이선스 키 발급 및 적용**

```bash
N8N_LICENSE_ACTIVATION_KEY=<발급받은 키>
N8N_LICENSE_AUTO_RENEW_ENABLED=true              # 기본 true
N8N_LICENSE_SERVER_URL=https://license.n8n.io/v1 # 방화벽 아웃바운드 허용 필요
```

> ⚠️ 조직 방화벽이 있으면 `license.n8n.io` 아웃바운드 허용 필수.

---

### Phase 2 — OIDC SSO 연동

- [ ] **조직 IdP에 n8n 앱 등록**
  - Redirect URI: `https://<n8n-host>/rest/oauth2/callback`
  - Client ID / Client Secret 발급
- [ ] **환경변수 설정**

```bash
N8N_SSO_OIDC_LOGIN_ENABLED=true
N8N_AUTH_OIDC_ISSUER_URL=https://<idp-domain>/.well-known/openid-configuration
N8N_AUTH_OIDC_CLIENT_ID=<client-id>
N8N_AUTH_OIDC_CLIENT_SECRET=<client-secret>

# JIT(Just-In-Time) provisioning — 기본 true (⚠️ IdP 쪽 그룹 필터 필수)
N8N_SSO_JIT_PROVISIONING_ENABLED=true
N8N_SSO_GO_TO_SSO_DIRECTLY=true   # 로그인 화면 스킵하고 IdP로 직행

# IdP claim → n8n role 매핑
N8N_SSO_PROVISIONING_INSTANCE_ROLE_CLAIM=role
N8N_SSO_PROVISIONING_PROJECT_CLAIMS=projects
```

- [ ] **MFA 정책 결정** — OIDC 쪽에서 MFA 처리하면 `N8N_MFA_ENABLED`는 무관
- [ ] **첫 로그인 → Owner 계정 연결 확인**
- [ ] **테스트 계정으로 SSO 로그인 → 워크플로 접근 → 로그아웃 전체 검증**

> 🚨 **JIT provisioning 디폴트 ON 주의** — IdP 통과한 누구나 계정 생성됨.
> 반드시 IdP 측에서 그룹/조직 필터링으로 막아야 함.

---

### Phase 3 — RBAC / 프로젝트 구조 설계

엔터프라이즈부터 **Projects** + **Custom Roles** 사용 가능.

- [ ] **프로젝트 구조 설계** — 팀/도메인 단위로 분리
- [ ] **역할 매핑**

| 역할 | 대상 |
|------|------|
| Owner | 시스템 관리자 1~2명 |
| Admin | 팀 리드, 워크플로 관리자 |
| Member | 워크플로 개발자 |
| Viewer | 모니터링 전용 |

- [ ] **Custom Role 필요 여부 검토** — 예: 실행만 가능, 편집 불가
- [ ] **Credentials 공유 범위** — 글로벌 vs 프로젝트 내 제한
- [ ] **기존 admin 남발 계정 정리**

---

### Phase 4 — 소스 컨트롤 / 환경 분리

- [ ] **Git 저장소 준비** — 워크플로 전용 private repo
- [ ] **브랜치 전략 결정** — `main`=prod, `develop`=dev
- [ ] **Source Control 설정**
  - Settings → Source Control에서 Git SSH 키 등록
  - 환경별 n8n 인스턴스에 각각 브랜치 연결
- [ ] **Push 권한 제한** — Admin 이상만 push 가능
- [ ] **기존 워크플로 초기 export**
- [ ] **자동 push 정책** — 매일 새벽 백업 워크플로로 자동화

```
POST /api/v1/source-control/push  # n8n 스케줄 워크플로로 자동 백업
```

---

### Phase 5 — 외부 시크릿 스토어 연동

지원: 1Password, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, HashiCorp Vault

- [ ] **시크릿 스토어 선택** (조직 표준에 맞춰)
- [ ] **기존 Credentials 감사** — 현재 저장된 API 키/토큰 목록
- [ ] **Vault에 시크릿 이전** — `{{ $secret.MY_KEY }}` 형태로 참조
- [ ] **Project-level Vault 분리 여부 결정**

---

### Phase 6 — 감사 로그 / 로그 스트리밍

- [ ] **로그 스트리밍 destination 설정** — Datadog / Sentry / ELK / Splunk
- [ ] **스트리밍 이벤트 범위** — 워크플로/credential/사용자/로그인 이벤트
- [ ] **보존 기간 설정** — 컴플라이언스 요건 확인

---

### Phase 7 — 인프라/운영 준비

- [ ] **Queue 모드 전환** — Redis 기반
- [ ] **Worker 스케일링 계획** — 피크 실행량 기준
- [ ] **백업 주기 재검토** — 실행 로그 보존 기간 증가 반영
- [ ] **모니터링 연결** — `/healthz` 엔드포인트를 조직 모니터링에 등록

---

### Phase 8 — 전환 후 검증

- [ ] SSO 로그인이 모든 구성원에게 정상 작동
- [ ] 기존 워크플로 실행 회귀 테스트
- [ ] Credentials 외부 시크릿 스토어 resolve 검증
- [ ] Git push/pull 배포 흐름 동작
- [ ] 감사 로그 외부 스트리밍 정상
- [ ] admin 계정 수 최소화 완료

---

## 엔터프라이즈에서 해제되는 limit 항목

라이선스 키 적용 즉시 또는 환경변수 한 줄로 해제되는 항목들.

### 1. 동시 실행 (Concurrency)

```bash
EXECUTIONS_CONCURRENCY_LIMIT=-1        # -1 = 무제한 (Enterprise)
N8N_RUNNERS_MAX_CONCURRENCY=10         # task runner당 기본 10 → 서버 스펙에 맞게
```

> 무제한이라도 DB 커넥션 풀·메모리가 병목. PostgreSQL `max_connections` 확인.

---

### 2. 전역 변수 (Variables)

Free 플랜은 변수 50개 제한. 엔터프라이즈는 무제한. **별도 설정 불필요** — 라이선스 적용 즉시 해제.

---

### 3. 워크플로 버전 히스토리

```bash
N8N_WORKFLOW_HISTORY_PRUNE_TIME=-1                    # -1 = 무제한 보존
N8N_WORKFLOW_HISTORY_COMPACTION_STARTUP_TRIM=true     # 시작 시 정리 1회
```

> 무제한 보존해도 자동 압축(15분~2시간 버전 병합, 6일+ 일일 trimming)으로 용량 압박 완화.

---

### 4. 실행 히스토리 보존

```bash
# 기본: 14일(336시간), 1만 건
# Enterprise: 365일+, 무제한 건수
EXECUTIONS_DATA_MAX_AGE=8760           # 365일 (시간 단위)
EXECUTIONS_DATA_PRUNE_MAX_COUNT=0      # 0 = 무제한
```

> ⚠️ DB 용량 계획 먼저. 일 평균 실행 수 × 365로 추정 후 PostgreSQL 디스크 증설.

---

### 5. 실행 데이터 저장 정책

```bash
EXECUTIONS_DATA_SAVE_ON_SUCCESS=all     # all | none
EXECUTIONS_DATA_SAVE_ON_ERROR=all       # all | none
EXECUTIONS_DATA_SAVE_ON_PROGRESS=false  # 노드 중간 결과 (용량 trade-off)
EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=true
```

---

### 6. 외부 스토리지 — Binary Data S3

```bash
N8N_AVAILABLE_BINARY_DATA_MODES=filesystem,s3
N8N_DEFAULT_BINARY_DATA_MODE=s3        # 기본 filesystem
N8N_EXTERNAL_STORAGE_S3_HOST=...
N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME=...
N8N_EXTERNAL_STORAGE_S3_REGION=...
```

> 파일 처리 워크플로 많으면 filesystem → S3 전환 검토.

---

### 7. 공유 프로젝트 / 사용자 수

- Unlimited shared projects
- 계약된 시트 수 (보통 무제한 계약 가능)

> **설계가 핵심.** 프로젝트 수가 아니라 팀/도메인 분리 기준 합의가 우선.

---

## Audit Log 활용 방법

n8n의 "audit"은 성격이 다른 두 가지가 있습니다.

### 종류 1 — Security Audit (보안 점검 리포트)

`GET /api/v1/audit` 호출 시 그 시점 인스턴스의 보안 상태를 스캔한 JSON 리포트 반환.
**실시간 스트림이 아니라 정기 점검 용도.**

**5가지 카테고리:**

| 카테고리 | 감지 내용 |
|---------|---------|
| `credentials` | 미사용 credential, 비활성 워크플로에만 쓰는 credential |
| `database` | SQL 노드에서 expression으로 쿼리 조립 → SQL injection 위험 |
| `nodes` | RCE 가능 노드(Execute Command, Code 등), 미검증 커뮤니티/커스텀 노드 |
| `instance` | 인증 없는 webhook, 구버전 n8n, 보안 설정 상태 |
| `filesystem` | 파일 접근 노드가 허용 경로 밖을 읽는지 |

> 조직 커스텀 노드(`custom-nodes/`)도 `nodes` 카테고리에서 "미검증" 경고로 잡힘.
> 화이트리스트 처리 필요 (노이즈 제거).

---

### 종류 2 — Log Streaming (실시간 이벤트 로그)

**엔터프라이즈 전용.** 외부 destination으로 실시간 전송.

**이벤트 카테고리:**
```
n8n.audit.user.login.success / failed
n8n.audit.user.created / deleted / role.changed
n8n.audit.workflow.created / updated / deleted / activated
n8n.audit.credential.created / updated / deleted / shared
n8n.audit.api.created / deleted
```

**Destination:** Datadog, Sentry, Splunk, ELK, webhook

---

### 활용 시나리오

**① 보안 이상 감지**
- credential 삭제 이벤트 → 오너 아닌 사람이 삭제 시 Slack 알림
- 로그인 실패 연속 5회 → 계정 잠금 알림

**② 변경 추적 (Change Audit)**
- 워크플로 수정 이벤트 → 누가 언제 무엇을 변경했는지 기록
- credential 공유 이벤트 → 민감 credential 새 프로젝트 공유 알림

**③ 주간 보안 리포트 워크플로**
- 매주 월요일 `GET /api/v1/audit` 호출
- risk 항목 있으면 담당자 Slack DM
- 없으면 #ops-n8n 채널에 "이번 주 이상 없음" 메시지

**④ 컴플라이언스 아카이빙**
- Log Streaming → ELK or S3
- 90일치 이벤트 로그 보존 (감사 대응용)

> ⚠️ **Log Streaming은 DB에 쌓이지 않음** — 설정 안 하면 이벤트 휘발.
> 엔터프라이즈 전환 시 가장 먼저 켜야 할 항목.

---

### Event Bus 안정성

Log Streaming destination 다운 시 이벤트 유실 방지:

```bash
N8N_EVENTBUS_CHECKUNSENTINTERVAL=5000   # 미전송 재전송 (기본 0 = 비활성)
N8N_EVENTBUS_RECOVERY_MODE=extensive    # 크래시 시 실행 복구 (simple | extensive)
```

---

## 놓치기 쉬운 보안/운영 설정

### 🚨 SSRF Protection — 기본값이 꺼져 있음

```bash
N8N_SSRF_PROTECTION_ENABLED=true            # ⚠️ 기본 false → 반드시 켜기
N8N_SSRF_BLOCKED_IP_RANGES=default          # RFC1918 + loopback + link-local
N8N_SSRF_ALLOWED_HOSTNAMES=*.your-company.example   # 조직 내부 도메인으로 교체
```

> HTTP Request 노드로 메타데이터 엔드포인트(`169.254.169.254`) 호출해서 클라우드 IAM 키 탈취 가능.

---

### 외부 통신 차단 (조직 정책)

```bash
N8N_DIAGNOSTICS_ENABLED=false             # PostHog 외부 전송 차단
N8N_VERSION_NOTIFICATIONS_ENABLED=false   # api.n8n.io 외부 호출 차단
N8N_TEMPLATES_ENABLED=false               # 공개 템플릿 갤러리 차단
N8N_HIRING_BANNER_ENABLED=false           # devtools 채용 배너 제거
N8N_PERSONALIZATION_ENABLED=false         # 첫 로그인 설문 제거
```

> 현재 `docker-compose.yml`에 `N8N_DIAGNOSTICS_ENABLED`, `N8N_PERSONALIZATION_ENABLED`는 이미 있음. 나머지 추가 권장.

---

### 쿠키 보안

```bash
N8N_SECURE_COOKIE=true              # HTTPS면 true (기본값)
N8N_SAMESITE_COOKIE=strict          # lax → strict 강화 검토
```

---

### Public API 정책

```bash
N8N_PUBLIC_API_DISABLED=false           # 외부 자동화 쓸 거면 켜둠
N8N_PUBLIC_API_SWAGGERUI_DISABLED=true  # ⚠️ 운영환경은 Swagger 차단
```

> API 키 회전 정책도 같이 정해야 함.

---

### 구조화 로그 (외부 수집 필수)

```bash
N8N_LOG_LEVEL=info                      # 운영 info, 트러블슈팅 debug
N8N_LOG_OUTPUT=console,file
N8N_LOG_FORMAT=json                     # ⚠️ ELK/Datadog 수집하려면 json 필수
N8N_LOG_FILE_LOCATION=/home/node/.n8n/logs/
N8N_LOG_FILE_MAXSIZE=16
N8N_LOG_FILE_COUNT_MAX=14               # 14일치
```

---

### Sentry 연동

```bash
N8N_SENTRY_DSN=https://...
N8N_SENTRY_ENVIRONMENT=production
```

---

### Queue 모드 (필수)

```bash
EXECUTIONS_MODE=queue
QUEUE_BULL_REDIS_HOST=<redis-host>
QUEUE_BULL_REDIS_PORT=6379
QUEUE_BULL_REDIS_PASSWORD=...
N8N_REDIS_KEY_PREFIX=n8n-prod          # 공유 Redis면 prefix 분리

QUEUE_WORKER_LOCK_DURATION=60000        # 무거운 워크플로면 늘려야 함
QUEUE_WORKER_LOCK_RENEW_TIME=10000
QUEUE_WORKER_STALLED_INTERVAL=30000
```

---

### Multi-Main HA (엔터프라이즈 전용)

```bash
N8N_MULTI_MAIN_SETUP_ENABLED=true       # 메인 다중화 (HA)
N8N_MULTI_MAIN_SETUP_KEY_TTL=10
N8N_MULTI_MAIN_SETUP_CHECK_INTERVAL=3
```

> 메인 한 대로 운영 시 SPOF. SLA에 HA 잡혀 있으면 필수.

---

### Webhook 분리 운영

```bash
WEBHOOK_URL=https://n8n.your-company.example/
N8N_DISABLE_PRODUCTION_MAIN_PROCESS=true   # 웹훅 전용 프로세스 분리 시
N8N_PAYLOAD_SIZE_MAX=16                    # MiB, 큰 페이로드면 증액
N8N_FORMDATA_FILE_SIZE_MAX=200             # MiB, 업로드 한도
```

---

### AI 기능 정책

```bash
N8N_AI_ENABLED=false                          # 조직 DLP 정책 따라 결정
N8N_AI_ALLOW_SENDING_PARAMETER_VALUES=false   # 실제 값 외부 전송 차단
```

> Enterprise의 AI Workflow Builder 크레딧 1000개는 **Cloud 전용**. Self-hosted는 별개.

---

### External Hooks (조직 정책 확장)

```bash
EXTERNAL_HOOK_FILES=/path/to/hook.js   # 워크플로 저장/실행 전후 조직 정책 검증
```

---

### 노드 차단

```bash
# 기본 제외: executeCommand, localFileTrigger
NODES_EXCLUDE=["n8n-nodes-base.executeCommand","n8n-nodes-base.localFileTrigger"]
```

---

### Data Tables 용량

```bash
N8N_DATA_TABLES_MAX_SIZE_BYTES=52428800       # 50 MiB → 필요 시 증액
N8N_DATA_TABLES_UPLOAD_MAX_FILE_SIZE_BYTES=
```

---

## 거버넌스 / 운영 절차

설정값이 아니라 **정책/프로세스** 차원에서 결정해야 할 항목.

- [ ] **PostgreSQL 백업 주기** — `pg_dump` 일 1회 + WAL 아카이브
- [ ] **Redis persistence** — Queue 모드 시 RDB/AOF 둘 다 설정
- [ ] **n8n 업그레이드 정책** — 마이너 버전마다 dev → staging → prod 절차
- [ ] **Custom node 빌드 CI** — `custom-nodes/` 변경 시 자동 빌드/검증
- [ ] **Source Control push 정책** — 누가 언제 push 권한 가지는지
- [ ] **Credential 회전 정책** — 90일 주기 등
- [ ] **DR(재해복구) 시나리오** — n8n 인스턴스 다운 시 워크플로 재배포 절차
- [ ] **워크플로 네이밍 컨벤션** — `[팀]_[목적]_워크플로명` 같은 규칙
- [ ] **태그 거버넌스** — 환경/팀/도메인 태그 표준화

---

## 우선순위 매트릭스

| 영역 | 항목 | 우선순위 | 난이도 |
|------|------|---------|-------|
| 🔴 즉시 | 라이선스 키 적용 | 필수 | 🟢 |
| 🔴 즉시 | SSRF Protection ON | 보안 | 🟢 |
| 🔴 즉시 | 외부 텔레메트리 OFF | 보안 | 🟢 |
| 🔴 즉시 | OIDC + JIT 범위 제한 | 인증 | 🟡 |
| 🔴 즉시 | Variables 제한 해제 | 자동 | 🟢 |
| 🟠 1주 | 실행 히스토리 기간 확장 | 데이터 | 🟢 |
| 🟠 1주 | Workflow History 무제한 | 데이터 | 🟢 |
| 🟠 1주 | 구조화 JSON 로그 + Sentry | 가시성 | 🟡 |
| 🟠 1주 | Audit Log + Log Streaming | 가시성 | 🟡 |
| 🟠 1주 | Queue 모드 + Redis | 운영 | 🟡 |
| 🟠 1주 | Source Control Git 연동 | 백업 | 🟡 |
| 🟡 1달 | 외부 시크릿 스토어 | 보안 | 🟡 |
| 🟡 1달 | Multi-Main HA (SLA 따라) | 신뢰성 | 🔴 |
| 🟡 1달 | AI 기능 사용 정책 결정 | 정책 | 🟢 |
| 🟡 1달 | External Hooks 조직 정책 | 정책 | 🔴 |
| 🟢 분기 | Workflow naming/태그 표준 | 거버넌스 | 🟢 |
| 🟢 분기 | DR 시나리오 문서화 | 거버넌스 | 🟡 |

---

## 핵심 메시지

설정값보다 더 중요한 5가지:

1. **외부 통신 차단 정책** — 텔레메트리/템플릿/버전 알림은 조직 정책상 OFF가 표준
2. **SSRF는 디폴트가 꺼져 있다** — 켜는 것 잊지 말 것
3. **JIT provisioning이 디폴트 ON** — IdP 측 그룹 필터링이 사실상 인증 게이트
4. **Audit Log는 휘발성** — Log Streaming 안 켜면 다 사라짐
5. **무제한 보존 ≠ 무한 디스크** — Workflow History 압축 설정 같이 가야 함

---

## 참고

- [n8n Pricing](https://n8n.io/pricing/)
- [n8n Enterprise Features](https://docs.n8n.io/) — Source Control, External Secrets, Log Streaming, RBAC
- 현재 워크스페이스 docker-compose: `~/.oh-my-n8n/docker/docker-compose.yml`
- 커스텀 노드 카탈로그: `schemas/internal-nodes.json` (조직 커스텀 노드, git-ignored)
- n8n 코어 노드 카탈로그: `schemas/n8n-core-latest.schema.json` (502 노드)
