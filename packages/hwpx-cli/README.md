# @reallygood83/hwpx-cli

HWPX 문서 작업을 터미널에서 일관되게 처리하기 위한 CLI입니다.

## 공지

- 본 CLI는 기존 `@ubermensch1218/hwpx-cli` 기반을 참조해 확장/업데이트했습니다.
- 현재 권장 스코프는 `@reallygood83/*` 입니다.

## 설치

```bash
npm install -g @reallygood83/hwpx-cli
```

또는 실행 시점 설치:

```bash
npx @reallygood83/hwpx-cli --help
```

## 핵심 명령

```bash
hwpxtool read <file>
hwpxtool export <file> -f md -o out.md
hwpxtool hwpx-to-md <file>
hwpxtool extract <file> <part>
hwpxtool info <file>
hwpxtool batch index <input>
```

## `batch index` (AI 인덱싱)

여러 HWPX 파일을 한 번에 읽어서 AI 파이프라인에 넣기 쉬운 인덱스 파일을 만듭니다.

### 기본 사용

```bash
hwpxtool batch index ./hwpx-folder
```

- 기본 출력: `<input>/hwpx-index.jsonl`
- 기본 청크: `paragraph`
- 기본 최대 길이: `1200`자

### 주요 옵션

```bash
hwpxtool batch index ./hwpx-folder \
  --output ./artifacts/hwpx-index.jsonl \
  --format jsonl \
  --chunk-by paragraph \
  --max-chars 1200 \
  --json
```

- `--output <file>`: 출력 파일 경로
- `--format <jsonl|json>`: 출력 포맷
- `--chunk-by <paragraph|section|document>`: 청크 전략
- `--max-chars <number>`: 청크 최대 길이
- `--include-empty`: 빈 청크도 포함
- `--fail-fast`: 첫 실패 파일에서 즉시 중단
- `--json`: 실행 요약을 JSON으로 stdout 출력

### 출력 레코드 예시 (JSONL)

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
    "title": "...",
    "author": "...",
    "date": "...",
    "sections": 3,
    "paragraphs": 220,
    "indexedAt": "2026-03-02T...Z"
  }
}
```

## AI/RAG 연결 팁

1. `batch index`로 JSONL 생성
2. `text` 필드 임베딩 생성
3. `id`, `relativePath`, `sectionIndex`, `paragraphIndex`를 메타데이터로 벡터 DB 저장
4. 검색 결과를 원문 파일/위치로 역추적
