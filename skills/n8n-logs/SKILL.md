---
name: n8n-logs
description: n8n 컨테이너 로그를 조회한다. 기본 200줄, --follow 로 스트리밍, --since/--tail 옵션 지원. 워크플로 실행 실패 분석, 기동 에러 진단, 디버깅 시 사용. 사용자가 "로그 보여줘", "logs", "에러 확인", "왜 안 떠?" 요청 시 사용.
---

# /oh-my-n8n:n8n-logs

`n8n-ops` 에이전트에 위임.

## 사용

```
/oh-my-n8n:n8n-logs                    # 최근 200줄
/oh-my-n8n:n8n-logs --tail 50          # 최근 50줄
/oh-my-n8n:n8n-logs --follow           # 스트리밍 (background)
/oh-my-n8n:n8n-logs --since 10m        # 지난 10분
/oh-my-n8n:n8n-logs --grep "error"     # 키워드 필터 (case insensitive)
```

## 절차

1. 컨테이너 존재 확인. 없으면 `n8n-up` 안내.
2. 옵션 매핑:
   - default: `docker logs --tail 200 oh-my-n8n`
   - `--tail N`: `--tail N`
   - `--follow`: `--follow` 추가, `run_in_background: true` 로 실행
   - `--since`: `--since 10m` 그대로 전달
   - `--grep <pat>`: 출력 후 grep 으로 필터
3. 출력. 에러 라인이 보이면 `n8n-debugger` 호출 제안.

## 활용 시나리오

- `n8n-up` 후 healthz 실패 → `n8n-logs` 로 기동 에러 확인
- 워크플로 실행 결과가 이상함 → `n8n-logs --grep workflow` + `n8n-debugger`
- 장기 모니터링 → `n8n-logs --follow` background
