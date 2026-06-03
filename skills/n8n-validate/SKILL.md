---
name: n8n-validate
description: 워크플로 JSON 을 스키마/시크릿/expression/카탈로그 적합성 기준으로 검증한다. 인자로 파일 경로 또는 디렉토리 받음. 워크플로 작성/수정 후 또는 배포 전 점검 시 사용.
---

# /oh-my-n8n:n8n-validate

워크플로 JSON 검증 스킬.

## 사용

```
/oh-my-n8n:n8n-validate workflows/my-flow.workflow.json
/oh-my-n8n:n8n-validate workflows/         # 디렉토리 전수 검사
```

## 동작

`Bash` 로 `node scripts/validate-workflow.mjs <target>` 실행.

여러 파일이면 각 결과 요약 + 전체 PASS/FAIL.

검사 항목은 `scripts/validate-workflow.mjs` 헤더 주석 참조.

## FAIL 시

- CRITICAL 항목별 사유 + 수정 제안 출력.
- `n8n-workflow-author` 에 수정 위임 안내.
