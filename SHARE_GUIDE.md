# 키워드와처를 내 PC에서 시작하기

코딩이 처음이라면 [START_HERE.md](START_HERE.md)의 단계별 요청문을 하나씩 AI에게 보내세요. 준비 → 실행 → API 연결 → 카테고리 선택 → 실제 수집 → 자동 실행 → 최종 확인 순서로 안내합니다.

이 소스는 Windows PC용 개인 키워드 트렌드 앱입니다. 각자 API 키를 발급받아 독립적으로 운영합니다. 원래 사용자의 API 키·고객 ID·수집 DB는 GitHub 저장소에 포함되어 있지 않습니다.

## 필요한 것

- Windows PC와 [Bun](https://bun.sh/docs/installation) 1.3.14 이상
- 본인 네이버 검색광고 계정의 API 키·비밀 키·고객 ID
- 매일 수집하려면 수집 시각에 켜져 있고 로그인되어 있는 PC

## 처음 실행하기

1. [GitHub 저장소](https://github.com/ghetostyle-ctrl/keyword-watcher)에서 `git clone` 하거나 **Code → Download ZIP**으로 받아 압축을 풉니다. 생긴 `keyword-watcher`(ZIP이면 `keyword-watcher-main`) 폴더를 엽니다. 압축 파일 안에서 바로 실행하지 마세요.
2. Bun을 공식 안내에 따라 설치한 뒤 터미널을 새로 엽니다.
3. `.env.example`을 복사해 이름을 `.env`로 바꿉니다. 본인의 검색광고 API 키·비밀 키·고객 ID를 입력합니다. 발급 경로는 `SETUP.md`에 있습니다.
4. `Start-KeywordWatcher.cmd`를 더블클릭합니다. 첫 실행은 필요한 패키지를 설치하므로 인터넷 연결이 필요합니다.
5. 브라우저에서 http://127.0.0.1:3000 을 엽니다.
6. **추적 키워드 → 카테고리로 시작하기**에서 관심 분야와 키워드를 선택해 등록합니다. 대시보드의 **지금 수집**으로 첫 실제 데이터를 저장합니다.

시작 키워드 목록은 등록을 돕는 목록이며 검색량이나 인기 순위가 아닙니다. 정확히 7일 전과 현재의 저장값이 있어야 7일 변화를 계산할 수 있습니다. 본인 브랜드와 경쟁사 이름은 개별 등록할 수 있습니다.

## 매일 자동 실행하기

`.env`에서 `SCHEDULER_ENABLED=true`, `COLLECTION_HOUR=9`를 지정합니다. 수동 실행 창이 켜져 있다면 Ctrl+C로 종료합니다. 프로젝트 폴더에서 PowerShell을 열고 실행합니다.

```powershell
bun install --frozen-lockfile
bun run build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/windows/Install-Tasks.ps1 -StartNow
```

설치 스크립트는 기본 위치인 `%USERPROFILE%/.bun/bin/bun.exe`를 사용합니다. Bun을 다른 위치에 설치했다면 `-BunPath`에 실제 실행 파일 경로를 지정하세요.

자동 실행 설치는 Windows 시간대가 **한국 표준시(Korea Standard Time)**일 때 가능합니다. 다른 시간대를 쓰는 PC는 이 설치 파일을 사용하지 말고 운영체제 스케줄러를 별도로 설정해야 합니다.

로그인 시 서버가 시작되고 매일 오전 9시에 수집합니다. PC가 꺼져 있거나 절전·로그아웃 상태이면 실행되지 않습니다. 화면 잠금 상태에서는 실행됩니다. 전원 설정은 자동으로 변경하지 않습니다.

상태 확인은 `scripts/windows/Get-Status.ps1`, 자동 실행 해제는 `scripts/windows/Remove-Tasks.ps1`를 사용합니다. 기본 포트 3000을 다른 앱이 사용하면 충돌하는 앱을 먼저 확인하세요. Windows 자동 실행 파일은 포트 3000을 기준으로 동작합니다.

## AI 코딩 도구에 맡길 때

받은 폴더를 AI 코딩 도구에서 열고 아래 요청을 붙여 넣을 수 있습니다.

> 이 폴더의 키워드와처 소스를 내 PC에서 실행해줘. 먼저 README.md와 SHARE_GUIDE.md를 읽고 실행 환경을 확인해줘. .env.example로 내 로컬 설정을 준비하되 다른 사람의 API 키를 사용하거나 키를 채팅·로그에 출력하지 마. 네이버 검색광고 API 발급과 로컬 입력을 안내하고 카테고리를 내가 선택하게 해줘. 임의 검색량이나 과거 스냅샷을 생성하지 말고 실제 API 응답만 저장해줘. 실행·키워드 등록·실제 수집을 검증한 뒤 Windows 로그인 자동 실행과 매일 오전 9시 수집을 설정해줘. PC가 꺼져 있을 때의 제약도 설명해줘.

## 다른 사람에게 다시 전달할 때

GitHub 주소(https://github.com/ghetostyle-ctrl/keyword-watcher)를 알려 주면 됩니다. 폴더를 직접 전달할 때는 본인의 `.env`나 `data/` 폴더를 포함하지 마세요. `.env.example`은 비밀값이 비어 있는 설치 양식이므로 포함합니다. `127.0.0.1`은 각자의 PC 주소이며, 그 주소만 보내 다른 사람을 내 앱에 접속시킬 수는 없습니다.

macOS와 Linux에서는 Bun으로 앱을 실행할 수 있지만, 제공된 `.cmd`와 Windows 자동 실행 스크립트는 사용할 수 없습니다. 해당 운영체제의 실행·스케줄러 설정이 별도로 필요합니다.
