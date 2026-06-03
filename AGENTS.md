# oh-my-n8n — 에이전트 카탈로그

| 에이전트 | 모델 | 트리거 | 핵심 책임 |
|---|---|---|---|
| `n8n-workflow-author` | sonnet | 워크플로 작성/수정 요청 | 요구사항 → n8n 워크플로 JSON. 등록된 노드만 사용. |
| `n8n-node-developer` | opus | 커스텀 노드 추가/수정 | TypeScript 노드 코드, credentials, 단위테스트 작성. |
| `n8n-workflow-reviewer` | opus | author 산출물 검증 | 스키마/시크릿/expression/트리거 검증. 별개 컨텍스트. |
| `n8n-debugger` | sonnet | 실행 실패 로그 분석 | 실행 로그 → 원인 노드/입력 추적, 수정안 제시. |
| `n8n-migrator` | opus | n8n 버전 업그레이드 | breaking change 감지, 노드 파라미터 자동 마이그레이션. |
| `n8n-ops` | sonnet | docker/k8s/백업 작업 | 인프라, 헬스체크, 백업/복구. |
| `explore` | haiku | 빠른 카탈로그 조회 | 노드 스키마/예제 lookup. |

## team pipeline

```
plan → author(n8n-workflow-author)
     → review(n8n-workflow-reviewer)
     → validate(scripts/validate-workflow.mjs)
     → fix(n8n-debugger)         [loop, max 3]
     → deploy(/n8n-deploy)
```

자세한 운영 원칙은 `CLAUDE.md` 참조.
