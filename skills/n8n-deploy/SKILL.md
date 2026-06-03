---
name: n8n-deploy
description: 검증된 워크플로 JSON 을 n8n 인스턴스에 REST API 로 배포한다. validate 가 PASS 인 파일에 대해서만 실행. 환경변수 N8N_URL, N8N_API_KEY 필요. --activate 옵션으로 활성화.
---

# /oh-my-n8n:n8n-deploy

n8n 인스턴스로 워크플로 업로드.

## 사전조건

1. `scripts/validate-workflow.mjs` PASS
2. `N8N_URL`, `N8N_API_KEY` 환경변수
3. 사용자 명시 승인 (자동 배포 금지)

## 사용

```
/oh-my-n8n:n8n-deploy workflows/my-flow.workflow.json
/oh-my-n8n:n8n-deploy workflows/my-flow.workflow.json --activate
```

내부적으로 `Bash node scripts/deploy-workflow.mjs <path> [--activate]` 실행.

이름 기준으로 기존 워크플로 검색 → 있으면 PUT 갱신, 없으면 POST 생성.

## 배포 후

- workflow ID 보고
- commit 권장 — trailer 에 `Workflow-id`, `n8n-version` 명시.
