# @reallygood83/hwpx-cli

HWPX 문서 작업을 **터미널 중심**으로 처리하는 CLI입니다.

## 공지

- 본 CLI는 기존 `@ubermensch1218/hwpx-cli` 기반을 참조해 기능을 확장/업데이트했습니다.
- 현재 권장 스코프는 `@reallygood83/*` 입니다.

## 설치

```bash
npm install -g @reallygood83/hwpx-cli
```

또는 실행 시점 설치:

```bash
npx @reallygood83/hwpx-cli --help
```

## 핵심 명령 한눈에 보기

```bash
hwpxtool read <file>
hwpxtool export <file> -f md -o out.md
hwpxtool hwpx-to-md <file>
hwpxtool hwp-to-hwpx <file>
hwpxtool extract <file> <part>
hwpxtool info <file>
hwpxtool batch index <input>
hwpxtool mcp-config [options]
```

## 빠른 실전 예시

### 예시 1) 단일 문서 텍스트 확인

```bash
hwpxtool read ./docs/report.hwpx
```

### 예시 2) Markdown 변환 + 이미지 추출

```bash
hwpxtool hwpx-to-md ./docs/report.hwpx \
  -o ./out/report.md \
  --images-dir ./out/images \
  --manifest ./out/report.images-manifest.json
```

### 예시 3) 폴더 전체 인덱싱 (RAG 입력 생성)

```bash
hwpxtool batch index ./docs-hwpx \
  --output ./artifacts/hwpx-index.jsonl \
  --chunk-by paragraph \
  --max-chars 1200
```

## `batch index` 상세 가이드

여러 HWPX를 AI 검색/요약(RAG)용으로 인덱싱합니다.

### 기본 동작

```bash
hwpxtool batch index ./hwpx-folder
```

- 기본 출력: `<input>/hwpx-index.jsonl`
- 기본 청크 단위: `paragraph`
- 기본 최대 길이: `1200`

### 옵션

- `--output <file>`: 인덱스 출력 파일
- `--format <jsonl|json>`: 출력 포맷
- `--chunk-by <paragraph|section|document>`: 청크 전략
- `--max-chars <number>`: 청크 최대 길이
- `--include-empty`: 빈 청크 포함
- `--fail-fast`: 첫 실패에서 중단
- `--incremental`: 변경된 파일만 재인덱싱
- `--state-path <file>`: incremental 상태 파일 경로
- `--schema`: 레코드 스키마 출력 후 종료
- `--json`: 실행 요약을 JSON으로 출력

### incremental 인덱싱

```bash
hwpxtool batch index ./hwpx-folder \
  --incremental \
  --state-path ./artifacts/hwpx-index.state.json \
  --json
```

- 파일 크기/mtime 기준으로 변경 여부를 판단합니다.
- 변경 없는 파일은 이전 인덱스 레코드를 재사용합니다.

### 스키마 확인

```bash
hwpxtool batch index ./hwpx-folder --schema
```

## 출력 레코드 예시

```json
{
  "id": "b7f...",
  "sourcePath": "/abs/path/report.hwpx",
  "relativePath": "report.hwpx",
  "sourceFile": "report.hwpx",
  "chunkBy": "paragraph",
  "chunkIndex": 12,
  "sectionIndex": 0,
  "paragraphIndex": 45,
  "text": "...",
  "metadata": {
    "title": null,
    "author": null,
    "date": null,
    "sections": 3,
    "paragraphs": 220,
    "indexedAt": "2026-03-02T...Z"
  }
}
```

## AI/RAG 연결 절차

1. `batch index` 실행으로 JSONL 생성
2. `text` 필드 임베딩 생성
3. `id`, `relativePath`, `sectionIndex`, `paragraphIndex`를 메타데이터로 저장
4. 검색 결과를 원문 문서 위치와 매핑

## OpenClaw 최적화 사용법

OpenClaw에서 바로 사용하려면 MCP 설정을 자동 생성하세요.

```bash
# 전역 설정 (~/.openclaw/settings.json)
hwpxtool mcp-config --target openclaw --global

# 프로젝트 설정 (./.openclaw-mcp.json)
hwpxtool mcp-config --target openclaw --project
```

설정 파일에 쓰지 않고 JSON 스니펫만 출력하려면:

```bash
hwpxtool mcp-config --target openclaw --print
```

OpenClaw 자동화 품질을 높이려면:

1. 인덱싱은 `--json`으로 실행해 요약 파싱을 안정화
2. 대용량 폴더는 `--incremental` + `--state-path` 조합 사용
3. 에이전트 파이프라인은 `--schema` 출력으로 필드 계약 고정

## 종료 코드

- `0`: 성공
- `1`: 입력/옵션 오류
- `2`: 전체 실패
- `4`: 부분 성공(일부 파일 실패)

## 트러블슈팅

- `No .hwpx files found`: 입력 경로가 올바른지 확인
- `Cannot find module '@reallygood83/...'`: 루트에서 `pnpm install` 후 의존 패키지 먼저 빌드
- 부분 실패가 많으면 `--fail-fast`를 끄고 `--json` 요약의 `failures`를 먼저 확인
