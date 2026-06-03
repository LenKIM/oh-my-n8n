---
name: n8n-upgrade
description: n8n 버전을 업그레이드하고 워크플로/커스텀 노드의 breaking change 를 자동 마이그레이션한다. 인자로 목표 버전. 사용자가 "n8n X.Y.Z 로 올려줘", "버전 업그레이드" 요청 시 사용.
---

# /oh-my-n8n:n8n-upgrade

n8n 버전 업그레이드 마이그레이션.

## 사용

```
/oh-my-n8n:n8n-upgrade 1.80.0
```

## 동작

`n8n-migrator` 에이전트에 위임:

1. release notes 수집 (`https://github.com/n8n-io/n8n/releases`)
2. `workflows/**/*.workflow.json` 영향 스캔
3. `custom-nodes/` peer dep 호환성 체크
4. 자동/수동 마이그레이션 항목 분리
5. 자동 항목 적용 → 전수 validate
6. `workflows/examples/` dry-run 회귀 테스트
7. PASS 시 `docker/Dockerfile.n8n` `N8N_VERSION` + `plugins/plugins.yaml` `n8nVersion` 갱신

## 안전장치

- 회귀 테스트 미통과 시 변경 미적용
- commit trailer 에 `n8n-version: from→to`
