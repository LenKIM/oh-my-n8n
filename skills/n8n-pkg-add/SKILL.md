---
name: n8n-pkg-add
description: plugins/plugins.yaml 에 커뮤니티 노드를 추가하고 lockfile/install.sh 를 갱신한다. 인자로 npm 패키지명 + version range. 사용자가 "이 플러그인 추가", "n8n-nodes-X 설치" 요청 시 사용.
---

# /oh-my-n8n:n8n-pkg-add

커뮤니티 n8n 노드 화이트리스트 추가.

## 사용

```
/oh-my-n8n:n8n-pkg-add n8n-nodes-mcp ^0.5.0 "MCP 서버 연동"
/oh-my-n8n:n8n-pkg-add n8n-nodes-puppeteer ^1.4.0
```

## 절차

1. `npm view <name> versions` 로 패키지 존재 확인
2. `plugins/plugins.yaml` 에 entry 추가
3. `node scripts/sync-plugins.mjs` 실행
   → `plugins/install.sh` + `plugins/lockfile.json` 갱신
4. (옵션) `docker compose build n8n` 으로 이미지 재빌드 안내
5. commit 제안

## 거부 사례

- 패키지가 npm 에서 검색되지 않음 → 차단
- 라이선스가 조직 정책 위반 (GPL 등) → 사용자에게 고지 후 결정 위임
