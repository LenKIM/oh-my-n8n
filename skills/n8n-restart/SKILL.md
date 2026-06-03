---
name: n8n-restart
description: oh-my-n8n 컨테이너를 재시작한다. 커스텀 노드(custom-nodes/dist-prebuilt)를 갱신했거나 환경변수 변경 후 즉시 반영할 때 사용. 이미지 변경은 반영하지 않음 (그건 n8n-up --rebuild). 사용자가 "재시작", "restart", "커스텀 노드 갱신했어" 요청 시 사용.
---

# /oh-my-n8n:n8n-restart

n8n 컨테이너 재시작. 마운트된 파일(`custom-nodes/dist-prebuilt/*.js`) 의 변경사항을 즉시 적용.

## 사용

```
/oh-my-n8n:n8n-restart
```

## 절차

1. 컨테이너 상태 확인. Down 이면 `n8n-up` 안내 후 종료.
2. `docker compose -f docker/docker-compose.yml restart n8n`
3. 8초 대기 → healthz 확인.
4. 마운트된 커스텀 노드 수 비교 (재시작 후 카탈로그와 일치해야 함).

## 활용 시나리오

- 원본 레포에서 커스텀 노드 갱신 → `cp ... dist-prebuilt/` → `npm run extract-catalog` → **`n8n-restart`**
- 환경변수 추가 → `docker-compose.yml` 수정 → `n8n-restart` (이 경우 docker compose 가 자동으로 recreate)
- 이미지 변경(Dockerfile, plugins.yaml) → `n8n-up --rebuild` 사용 (`n8n-restart` 로는 반영 안 됨)
