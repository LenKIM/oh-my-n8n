---
name: n8n-doctor
description: oh-my-n8n 환경 진단. 워크스페이스 셋업, n8n 컨테이너 상태, custom-nodes 로딩, 카탈로그 신선도, plugins lockfile 일치를 점검하고 누락 항목별 정확한 복구 명령 제시. 사용자가 "환경 점검", "doctor", "뭔가 안 되는 것 같아" 요청 시 사용.
---

# /oh-my-n8n:n8n-doctor

체크리스트 (각 항목 PASS/FAIL + FAIL 시 1줄 복구 명령):

## 1. 워크스페이스 준비

- `OMN_WORKSPACE` 또는 `~/.claude/oh-my-n8n.local.md` 의 `workspace:` 또는 `~/.oh-my-n8n` 존재?
- → FAIL: `/oh-my-n8n:omn-setup` 실행

## 2. 의존성

- `<workspace>/node_modules` 존재?
- → FAIL: `cd <workspace> && npm install`

## 3. 커스텀 노드 미러

- `<workspace>/custom-nodes/dist-prebuilt/*.node.js` 존재 (>= 1개)?
- → FAIL: `cp $OMN_PREBUILT_SOURCE/*.js <workspace>/custom-nodes/dist-prebuilt/`

## 4. 카탈로그 신선도

- `<workspace>/schemas/internal-nodes.json` 의 `generatedAt` 이 미러 mtime 보다 새로움?
- → FAIL: `cd <workspace> && npm run extract-catalog`

## 5. docker 인스턴스

- `docker ps --filter name=oh-my-n8n --format '{{.Status}}'` 가 "Up..." ?
- → FAIL: `/oh-my-n8n:n8n-up`

## 6. 헬스체크

- `curl -sf http://localhost:15679/healthz` 200?
- → FAIL: `/oh-my-n8n:n8n-logs --tail 50` 으로 원인 확인

## 7. 컨테이너 내 커스텀 노드 마운트

- `docker exec oh-my-n8n ls /home/node/.n8n/custom | grep -c .node.js` >= 1 ?
- → FAIL: 미러 갱신(`cp ... dist-prebuilt/`) 후 `/oh-my-n8n:n8n-restart`

## 8. 코어 노드 캐시

- `<workspace>/schemas/n8n-core-latest.schema.json` 존재?
- → FAIL: `node <workspace>/scripts/extract-core-catalog.mjs`

## 9. plugins.yaml 의 n8nVersion 과 컨테이너 실제 버전 일치

- `docker exec oh-my-n8n n8n --version` == `plugins.yaml` 의 n8nVersion 범위?
- → FAIL: Dockerfile.n8n 의 N8N_VERSION 또는 plugins.yaml 정렬 후 `/oh-my-n8n:n8n-up --rebuild`

## 출력 형식

```
oh-my-n8n doctor

[1/9] 워크스페이스          PASS  (~/.oh-my-n8n)
[2/9] 의존성                PASS
[3/9] 커스텀 노드 미러      PASS  (N nodes)
[4/9] 카탈로그 신선도       FAIL  → cd ~/.oh-my-n8n && npm run extract-catalog
[5/9] docker 인스턴스       PASS  (Up 3 hours)
[6/9] 헬스체크              PASS  (200)
[7/9] 컨테이너 마운트       PASS  (12 .node.js)
[8/9] 코어 노드 캐시        PASS  (502 nodes, n8n 2.15.0)
[9/9] 버전 정렬             PASS  (2.15.0)

요약: 1 FAIL — 위 명령 1개 실행 후 재진단.
```

## 실행 도구

내부적으로 `n8n-ops` 에이전트 호출 또는 직접 Bash 실행.
모든 경로는 `scripts/lib/workspace.mjs` 의 `resolveWorkspace()` 결과 기준.
