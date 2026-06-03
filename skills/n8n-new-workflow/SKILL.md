---
name: n8n-new-workflow
description: 자연어 요구사항으로부터 n8n 워크플로 JSON 을 end-to-end 로 생성한다 (요구사항 수집 → author → reviewer → validate → 배포 옵션). 사용자가 "워크플로 만들어줘", "n8n 자동화 추가" 등을 요청할 때 사용.
---

# /oh-my-n8n:n8n-new-workflow

요구사항을 받아 검증된 n8n 워크플로 JSON 을 생성하는 end-to-end 스킬.

## 절차

1. **요구사항 수집**
   인자로 자연어 요구사항이 들어오면 그대로 사용. 없으면 사용자에게 한 번에 질문:
   - 트리거 (수동 / Webhook / Cron / 외부 이벤트)
   - 처리할 데이터 / 호출할 외부 서비스
   - 결과 출력처
   - 주기/볼륨

2. **카탈로그 사전 점검** (`explore` 에이전트)
   사용 가능 노드 목록 회수.

3. **작성** (`n8n-workflow-author` 에이전트 호출)
   `workflows/<kebab-name>.workflow.json` 생성.

4. **검증** (`n8n-workflow-reviewer` 에이전트 호출, 별도 컨텍스트)
   FAIL 시 author 에 수정 위임. 최대 3회 루프.

5. **dry-run** (`scripts/validate-workflow.mjs` Bash 실행)

6. **배포 제안**
   사용자 명시 승인 시 `/oh-my-n8n:n8n-deploy` 안내. 자동 배포 금지.

## 출력

- 생성 파일 경로
- 사용 노드 목록 (core / custom / community)
- 검증/리뷰 결과
- 다음 단계 (deploy 또는 추가 수정)
