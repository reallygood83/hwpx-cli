# HWPX CLI + AI Modernization Spec

## 1) 배경

- 현재 저장소는 이미 CLI 패키지(`@ubermensch1218/hwpx-cli`)와 MCP 서버(`@ubermensch1218/hwpx-mcp`)를 보유하고 있다.
- 다만 사용자 경험은 "라이브러리 중심"으로 보이고, CLI를 중심으로 문서 작성/변환/검증/자동화하는 워크플로우는 아직 완결형이 아니다.
- 목표는 HWPX 문서작업 사용자가 GUI 없이도 터미널에서 실무를 끝낼 수 있도록 CLI를 제품의 중심 인터페이스로 재정의하는 것이다.
- 추가 요구: 퍼블리셔/스코프를 `@ubermensch1218`에서 `@masteroflearning`으로 이관한다.

## 2) 비전

"모든 HWPX 작업을 터미널 1차 인터페이스로 수행하고, AI 에이전트가 명령/출력 계약(JSON)을 안정적으로 소비하는 표준 툴체인"을 만든다.

## 3) 제품 목표

### 3.1 핵심 목표

1. **CLI-First 완성**: 읽기/추출/변환/검증/수정/배치 작업을 CLI에서 일관되게 제공
2. **AI-Ready 출력 계약**: 모든 주요 명령이 `--json` 출력 모드를 지원하고 스키마를 고정
3. **자동화 친화성**: 파이프/CI/스크립트 환경에서 예측 가능하게 동작 (종료 코드, stderr/stdout 규약)
4. **브랜딩 이관**: 패키지 스코프를 `@masteroflearning/*`로 정식 전환

### 3.2 비목표 (Non-Goals)

- HWPX GUI 에디터를 완전히 대체하는 WYSIWYG 기능 구현
- 초기 단계에서 모든 고급 편집(페이지 레이아웃, 복잡 스타일 엔진) 완전 지원
- 단일 릴리즈에서 모든 하위호환 문제를 해결

## 4) 현재 상태 요약 (As-Is)

- CLI 명령 존재: `read`, `export`, `hwp-to-hwpx`, `hwpx-to-md`, `extract`, `info`, `mcp-config`
- MCP 서버 존재: 문서 읽기/추출/정보 중심
- 모노레포 구조: `hwpx-core`(핵심), `hwpx-tools`(유틸), `hwpx-cli`(인터페이스), `hwpx-mcp`(AI 브리지)
- 확인된 제약:
  - 패키지명/문서/예제가 기존 스코프(`@ubermensch1218`) 기준
  - CLI 기능은 강력하지만 "문서작성 전체 사이클" 명령 체계(프로젝트 init, 템플릿, 검사/수정 루프)가 부족
  - AI가 바로 쓰기 좋은 구조화 출력(JSON schema/버전 전략)가 명시적으로 드러나지 않음

## 5) 대상 사용자

1. **실무 작성자**: 보고서/공문/양식 자동 생성자
2. **개발자/자동화 담당자**: 배치 변환, CI 검증, 대량 추출
3. **AI 오케스트레이션 사용자**: Claude/Codex/MCP 기반 에이전트 자동화

## 6) CLI 제품 구조 (To-Be)

## 6.1 Top-Level 커맨드

`hwpxtool <command> [subcommand] [options]`

필수 설계 원칙:

- `stdout`: 사용자 결과물(JSON/텍스트)
- `stderr`: 진행 로그/경고/진단
- `exit code`: 자동화 가능한 상태 코드
- 전 커맨드 공통 옵션: `--json`, `--quiet`, `--verbose`, `--no-color`

### 6.2 명령군 제안

1. `doc` 계열 (문서 조작)
   - `doc read <file>`
   - `doc info <file>`
   - `doc validate <file>`
   - `doc fix <file>` (안전한 자동 복구 가능한 항목만)

2. `content` 계열 (콘텐츠 추출/치환)
   - `content extract text|tables|images <file>`
   - `content replace <file> --find ... --replace ...`
   - `content map <file>` (문단/표/이미지 위치 인덱스 출력)

3. `convert` 계열 (변환)
   - `convert hwpx-to-md <file>`
   - `convert hwpx-to-txt <file>`
   - `convert hwp-to-hwpx <file>`

4. `batch` 계열 (대량처리)
   - `batch run --glob "**/*.hwpx" --cmd "convert hwpx-to-md"`
   - `batch report <run-id>`

5. `ai` 계열 (에이전트 통합)
   - `ai schema` (JSON 출력 스키마 버전/정의)
   - `ai plan <goal.txt>` (작업 플랜 초안 생성)
   - `ai mcp doctor` (MCP 연결 상태 진단)

6. `project` 계열 (온보딩)
   - `project init`
   - `project doctor`
   - `project templates list|use`

## 7) AI 활용도 강화 설계

### 7.1 JSON 출력 계약

모든 핵심 명령은 `--json` 시 아래 envelope를 공통 사용:

```json
{
  "ok": true,
  "command": "doc info",
  "version": "1.0.0",
  "data": {},
  "warnings": [],
  "errors": []
}
```

- `version`은 스키마 버전 (CLI 버전과 독립)
- 에이전트는 `ok`, `errors`, `data`만으로 분기 가능

### 7.2 상태 코드 정책

- `0`: 성공
- `1`: 사용자 입력 오류 (파일 없음, 옵션 오류)
- `2`: 문서 파싱/검증 실패
- `3`: 내부 예외
- `4`: 부분 성공 (배치 일부 실패)

### 7.3 AI 친화 기능

- `--json` + `--output -`로 파이프 처리 보장
- `--schema` 옵션으로 현재 커맨드 결과 스키마 출력
- `--dry-run` 지원 (수정/배치 계열)
- `--idempotency-key` (배치 중복 실행 방지)

### 7.4 MCP와 CLI의 역할 분리

- CLI: 로컬/CI 자동화 엔진
- MCP: AI 에이전트가 CLI 기능을 도구 형태로 안전하게 호출
- 원칙: MCP는 가능한 한 CLI 엔진을 재사용해 동작 일치 보장

## 8) 패키지 스코프 이관 계획 (`@masteroflearning`)

## 8.1 변경 대상

- `@ubermensch1218/hwpxcore` -> `@masteroflearning/hwpxcore`
- `@ubermensch1218/hwpx-tools` -> `@masteroflearning/hwpx-tools`
- `@ubermensch1218/hwpx-cli` -> `@masteroflearning/hwpx-cli`
- `@ubermensch1218/hwpx-mcp` -> `@masteroflearning/hwpx-mcp`

## 8.2 이행 전략

1. **Phase A (병행 배포)**
   - 신규 스코프로 동일 버전 배포
   - 구 스코프 패키지에 deprecation notice 설정
2. **Phase B (문서/예제 전환)**
   - README, docs, 샘플 코드, CI 배지 일괄 전환
3. **Phase C (구 스코프 종료 공지)**
   - 종료 일정 명시, 마이그레이션 가이드 제공

## 8.3 호환성 정책

- 최소 2개 마이너 릴리즈 동안 구 스코프 유지
- `npm deprecate` 메시지에 자동 치환 명령 제공

## 9) 릴리즈 로드맵

### Milestone 1 - CLI 안정화 (2주)

- 공통 옵션(`--json`, `--quiet`, `--verbose`) 도입
- 기존 명령들의 출력 계약 통일
- 상태 코드 정책 정착

### Milestone 2 - 문서작업 완결 루프 (3주)

- `doc validate`, `content map`, `content replace` 강화
- `project init/doctor/templates` 도입
- 배치 작업 기본기(`batch run`) 추가

### Milestone 3 - AI 최적화 (2주)

- `ai schema`, `--schema`, `--dry-run` 표준화
- MCP가 CLI 엔진 재사용하도록 내부 어댑터 정리

### Milestone 4 - 스코프 이관 (1~2주)

- `@masteroflearning` 퍼블리시 체계 전환
- 구 스코프 deprecate + 마이그레이션 공지

## 10) 수용 기준 (Acceptance Criteria)

1. 모든 핵심 명령에서 `--json` 출력 가능
2. 에러 케이스가 상태 코드 정책과 1:1로 맞음
3. `batch run`으로 100개 HWPX 처리 시 리포트 생성
4. MCP 경유 호출과 CLI 직접 호출의 결과(핵심 필드)가 동일
5. 문서/README의 설치 예제가 `@masteroflearning/*` 기준으로 일관됨

## 11) 운영/품질 지표

- CLI 성공 실행률 (CI + 사용자 텔레메트리 옵트인 기반)
- 배치 평균 처리 시간 / 실패율
- AI 에이전트 호출 성공률(MCP)
- 구 스코프 -> 신 스코프 전환율

## 12) 리스크 및 대응

1. **스코프 변경으로 설치 실패/혼선**
   - 대응: 병행 배포 + deprecate 메시지 + 자동 마이그레이션 가이드
2. **JSON 스키마 변경으로 에이전트 호환성 깨짐**
   - 대응: 스키마 버전 분리, semver 엄수
3. **배치 기능의 부분 실패 처리 복잡성**
   - 대응: 부분 성공 코드(`4`)와 실패 항목 리포트 표준화

## 13) 즉시 실행 항목 (Next Actions)

1. CLI 공통 출력 envelope 구현 (`--json` 우선)
2. 명령 체계를 `doc/content/convert/batch/ai/project`로 리팩터링 설계
3. `@masteroflearning` npm org 준비 및 퍼블리시 권한 확인
4. 스코프 이관 가이드 문서(`docs/migration-to-masteroflearning.md`) 추가

---

Owner: `@masteroflearning`  
Status: Draft v1  
Updated: 2026-03-02
