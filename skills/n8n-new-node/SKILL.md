---
name: n8n-new-node
description: 조직 공유용 n8n 커스텀 노드(TypeScript) 패키지를 스캐폴딩한다. 인자로 노드 이름(PascalCase). 사용자가 "커스텀 노드 만들어줘", "노드 추가" 요청 시 사용.
---

# /oh-my-n8n:n8n-new-node

`custom-nodes/nodes/<NodeName>/` 에 새 커스텀 노드 패키지 생성.

## 사용

```
/oh-my-n8n:n8n-new-node AcmeSlack
/oh-my-n8n:n8n-new-node AcmeInternalApi --with-credentials
```

## 동작

`n8n-node-developer` 에이전트에 위임:

1. 가장 비슷한 기존 노드를 참고 모델로 선정
2. 스캐폴딩
   - `package.json` (n8n 필드 포함)
   - `<NodeName>.node.ts` (INodeType 구현)
   - `<NodeName>.node.json` (codex 메타)
   - `credentials/<NodeName>Api.credentials.ts` (옵션)
   - `README.md`
3. `npm run build` 검증
4. 최소 워크플로 예제 JSON 출력

## 후속

- docker 재시작으로 로컬 n8n 에 반영
- `/oh-my-n8n:n8n-new-workflow` 로 노드 사용 워크플로 작성
