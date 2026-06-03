---
name: n8n-up
description: oh-my-n8n docker 인스턴스를 기동한다. 이미 떠있으면 skip. --rebuild 옵션으로 Dockerfile/plugins.yaml 변경 후 이미지 재빌드. 사용자가 "n8n 켜줘", "인스턴스 시작", "올려줘" 또는 plugins.yaml/Dockerfile 변경 후 반영 요청 시 사용.
---

# /oh-my-n8n:n8n-up

n8n docker 인스턴스 기동. `n8n-ops` 에이전트에 위임.

## 사용

```
/oh-my-n8n:n8n-up               # 그냥 기동 (이미 떠있으면 skip)
/oh-my-n8n:n8n-up --rebuild     # 이미지 재빌드 후 기동
```

## 절차

1. 워크스페이스 위치 해석 (`scripts/lib/workspace.mjs`).
2. 컨테이너 상태 점검:
   ```bash
   docker ps --filter "name=oh-my-n8n" --format "{{.Status}}"
   ```
3. 분기:
   - **이미 Up + `--rebuild` 미지정** → "이미 기동됨" 보고 + healthz 확인 후 종료.
   - **Up + `--rebuild` 지정** → `docker compose -f docker/docker-compose.yml up -d --build`
   - **Down** → `docker compose -f docker/docker-compose.yml up -d` (또는 `--rebuild` 시 `--build` 동반)
4. 기동 후 8초 대기 → `curl -sf http://localhost:15679/healthz` 확인.
5. healthz 200 시 커스텀 노드 마운트 점검:
   ```bash
   docker exec oh-my-n8n ls /home/node/.n8n/custom | grep -c '\.node\.js$'
   ```
   기대치 = 카탈로그 노드 수. 불일치 시 경고.
6. healthz 실패 시 `docker logs oh-my-n8n | tail -30` 출력 후 사용자에게 결정 위임.

## 출력

```
✓ docker compose up -d (--build)
✓ healthz: 200
✓ 커스텀 노드 N개 마운트
✓ Editor: http://localhost:15679
```

## 거부 사례

- 워크스페이스 미준비 → `/oh-my-n8n:omn-setup` 안내 후 종료
- 포트 충돌 → 점유 프로세스 정보 출력 후 사용자에게 결정 위임 (자동으로 다른 포트로 바꾸지 않음)
