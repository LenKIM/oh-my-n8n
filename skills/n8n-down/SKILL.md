---
name: n8n-down
description: oh-my-n8n docker 인스턴스를 정지한다. 기본은 stop (데이터 보존). 볼륨 삭제는 명시 confirm 필요. 사용자가 "n8n 꺼줘", "인스턴스 정지", "내려줘" 요청 시 사용.
---

# /oh-my-n8n:n8n-down

n8n docker 인스턴스 정지. `n8n-ops` 에이전트에 위임.

## 사용

```
/oh-my-n8n:n8n-down              # stop (컨테이너 정지, 데이터 보존)
/oh-my-n8n:n8n-down --remove     # down (컨테이너 제거, 볼륨 보존)
/oh-my-n8n:n8n-down --purge      # down -v (볼륨까지 삭제 — 명시 confirm 필요)
```

## 절차

1. 컨테이너 상태 확인.
2. 분기:
   - default → `docker compose -f docker/docker-compose.yml stop`
   - `--remove` → `docker compose -f docker/docker-compose.yml down`
   - `--purge` → 사용자에게 "정말 볼륨까지 삭제하시겠습니까? 모든 워크플로/credentials 가 사라집니다" 명시 확인.
     동의 시 `docker compose -f docker/docker-compose.yml down -v`.
3. 결과 보고.

## 안전 규칙

- `--purge` 는 **항상** 사용자 명시 동의 필요. 자동 진행 금지.
- production 환경 감지 (`.env` 의 `N8N_ENV=prod`) 시 `--purge` 차단.
