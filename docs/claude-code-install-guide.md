# Claude Code 설치 가이드

공식 문서: https://code.claude.com/docs/ko/setup

본 가이드는 **Windows** 와 **macOS** 환경에서 Claude Code 를 설치하는 절차를 정리합니다.
Windows 의 경우 환경변수 설정까지 포함하여 상세히 안내합니다.

---

## 사전 요구사항 (공통)

- **운영체제**
  - macOS 13.0 이상
  - Windows 10 (1809 빌드) 이상 / Windows 11 / Windows Server 2019+
- **하드웨어**: RAM 4GB 이상, x64 또는 ARM64 프로세서
- **네트워크**: 인터넷 연결 필수 (기업/조직 네트워크 사용 시 프록시/방화벽 확인)
- **계정**: Claude Pro / Max / Team / Enterprise / Console 계정
  - 무료 Claude.ai 플랜으로는 Claude Code 를 사용할 수 없습니다.

---

## 1. Windows 설치 가이드 (Native + PowerShell)

> Windows 는 Native 설치 방식을 사용합니다. 설치 스크립트는 자동으로 `claude.exe` 를
> `%USERPROFILE%\.local\bin` 경로에 배치하므로, 이 경로를 **PATH 환경변수**에
> 등록해야 어디서든 `claude` 명령을 실행할 수 있습니다.

### Step 1. (권장) Git for Windows 설치

Claude Code 는 내부적으로 Bash 도구를 사용할 수 있으며, 설치되어 있지 않으면
PowerShell 로 fallback 됩니다. 더 풍부한 기능을 위해 설치를 권장합니다.

- 다운로드: https://git-scm.com/downloads/win
- 설치 옵션은 기본값으로 진행해도 무방합니다.

### Step 2. PowerShell 실행

1. `Win + X` → **Windows PowerShell** 또는 **Terminal** 선택
2. 프롬프트가 아래와 같이 표시되는지 확인:
   ```
   PS C:\Users\YourName>
   ```
   - 앞에 `PS` 가 보이면 PowerShell 입니다.
   - `PS` 없이 `C:\Users\YourName>` 만 보이면 CMD 이므로 PowerShell 로 다시 여세요.
3. **관리자 권한은 필요 없습니다.** 일반 사용자 권한으로 실행하세요.

### Step 3. 설치 명령 실행

PowerShell 에서 아래 명령을 실행합니다:

```powershell
irm https://claude.ai/install.ps1 | iex
```

설치 스크립트가 다음을 수행합니다:
- 최신 `claude.exe` 바이너리를 다운로드
- `%USERPROFILE%\.local\bin\claude.exe` 에 설치
- 버전 정보 및 설정 파일을 `%USERPROFILE%\.local\share\claude` 에 저장

설치가 끝나면 다음과 같은 메시지가 출력됩니다:
```
Claude Code installed to C:\Users\YourName\.local\bin\claude.exe
```

> **실행 정책 오류가 발생한다면?**
> `irm: ... cannot be loaded because running scripts is disabled on this system` 메시지가
> 보이면 아래 명령으로 현재 사용자 한정 정책을 변경한 뒤 다시 시도하세요:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

### Step 4. Windows 환경변수 (PATH) 설정 ⚠️ 중요

설치 직후 `claude` 명령이 인식되지 않을 수 있습니다. 이때 `%USERPROFILE%\.local\bin`
경로를 PATH 환경변수에 추가해야 합니다.

#### 방법 A. PowerShell 로 영구 등록 (권장)

현재 사용자 PATH 에 `%USERPROFILE%\.local\bin` 을 추가:

```powershell
$claudePath = "$env:USERPROFILE\.local\bin"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

if ($currentPath -notlike "*$claudePath*") {
    [Environment]::SetEnvironmentVariable(
        "Path",
        "$currentPath;$claudePath",
        "User"
    )
    Write-Host "PATH 에 $claudePath 추가됨"
} else {
    Write-Host "이미 PATH 에 등록되어 있습니다."
}
```

등록 후 **PowerShell 창을 닫고 새로 열어야** 변경사항이 적용됩니다.

#### 방법 B. GUI 로 등록

1. `Win + R` → `sysdm.cpl` 입력 후 Enter
2. **고급** 탭 → **환경 변수(N)...** 클릭
3. 상단의 **사용자 변수** 영역에서 `Path` 선택 → **편집(E)...**
4. **새로 만들기(N)** → 아래 경로 입력:
   ```
   %USERPROFILE%\.local\bin
   ```
5. **확인** 을 모두 눌러 닫기
6. 열려 있는 모든 PowerShell / CMD 창을 닫고 새로 열기

#### (옵션) Git Bash 경로 환경변수 설정

Claude Code 가 Git Bash 를 자동으로 찾지 못하는 경우 `settings.json` 에 경로를
지정합니다. `%USERPROFILE%\.claude\settings.json` 파일을 열고 다음 항목을 추가:

```json
{
  "env": {
    "CLAUDE_CODE_GIT_BASH_PATH": "C:\\Program Files\\Git\\bin\\bash.exe"
  }
}
```

> 경로 구분자는 반드시 `\\` (백슬래시 두 개) 로 작성해야 합니다.

### Step 5. 설치 확인

**새 PowerShell 창을 연 뒤** 다음을 실행:

```powershell
claude --version
claude doctor
```

- `claude --version` → 설치된 버전 출력 확인
- `claude doctor` → 의존성, 네트워크, 설정 진단 (9개 항목)

`claude : The term 'claude' is not recognized...` 오류가 나오면 PATH 등록이
적용되지 않은 것이므로 Step 4 를 다시 확인하고 PowerShell 을 재실행하세요.

### Step 6. 실행 및 로그인

프로젝트 폴더로 이동한 뒤 실행:

```powershell
cd C:\path\to\your\project
claude
```

자동으로 브라우저가 열리며 Anthropic 로그인 페이지로 이동합니다. 로그인 후
콘솔로 돌아오면 사용 준비 완료입니다.

### Step 7. 업데이트

Native 설치는 **백그라운드에서 자동 업데이트** 되므로 별도 작업이 필요 없습니다.
즉시 최신 버전을 받고 싶다면:

```powershell
claude update
```

---

## 2. macOS 설치 가이드 (Homebrew)

### Step 1. Homebrew 설치 (미설치 시)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

설치 후 안내에 따라 `brew` 명령이 PATH 에 등록되었는지 확인합니다.

### Step 2. Claude Code 설치

두 가지 채널 중 선택:

**안정 채널 (권장)** — 약 1주일 지연, 회귀 버전 자동 스킵:
```bash
brew install --cask claude-code
```

**최신 채널** — 릴리스 즉시 반영:
```bash
brew install --cask claude-code@latest
```

### Step 3. 설치 확인

```bash
claude --version
claude doctor
```

### Step 4. 실행 및 로그인

```bash
cd ~/path/to/your/project
claude
```

브라우저 로그인 후 사용을 시작합니다.

### Step 5. 업데이트 (수동)

Homebrew 설치는 자동 업데이트되지 않습니다. 주기적으로 실행:

```bash
brew upgrade claude-code
# 또는 latest 채널 사용 시
brew upgrade claude-code@latest
```

---

## 비교 요약

| 항목 | Windows (Native) | macOS (Homebrew) |
|---|---|---|
| 설치 명령 | `irm https://claude.ai/install.ps1 \| iex` | `brew install --cask claude-code` |
| 셸 | PowerShell | Terminal (zsh / bash) |
| 권장 추가 도구 | Git for Windows | — |
| 설치 위치 | `%USERPROFILE%\.local\bin\claude.exe` | `/opt/homebrew/bin/claude` |
| 환경변수 설정 | **필요** (`%USERPROFILE%\.local\bin` PATH 등록) | 불필요 (Homebrew 가 자동 처리) |
| 자동 업데이트 | ✅ 백그라운드 자동 | ❌ `brew upgrade` 수동 |
| 첫 실행 | `claude` | `claude` |

---

## 문제 해결

- 설치/로그인 문제: https://code.claude.com/docs/ko/troubleshoot-install
- `claude doctor` 실행 후 출력되는 항목별 안내 참고
- Windows 에서 `claude` 명령이 인식되지 않을 때 → PATH 등록 후 PowerShell 재실행
- 기업/조직 네트워크 환경에서는 프록시/방화벽으로 `claude.ai`, `downloads.claude.ai` 접근 허용 필요
