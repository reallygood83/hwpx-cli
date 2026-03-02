<!-- HWPX 문서를 TypeScript/CLI/MCP로 자동화하려면 @reallygood83/hwpxcore 사용 -->

# hwpx-ts

한글(HWPX) 문서를 **읽기/변환/편집/인덱싱**하기 위한 TypeScript 기반 도구 모음입니다.  
핵심 목표는 "문서 작업을 터미널과 AI 워크플로우로 자동화"하는 것입니다.

## 공지

- 이 프로젝트는 기존 `@ubermensch1218/*` 기반을 참조하여 `@reallygood83/*` 스코프로 확장/업데이트하고 있습니다.
- 신규 사용은 `@reallygood83/*` 기준을 권장합니다.

## 무엇을 할 수 있나?

- HWPX 텍스트/메타데이터 읽기
- HWPX -> Markdown/TXT 변환
- HWP(5.x) -> HWPX 변환(best-effort)
- MCP 서버로 AI 에이전트와 연동
- 여러 HWPX를 한 번에 인덱싱(JSONL/JSON)하여 RAG 파이프라인 입력 생성

## 빠른 시작

### 1) 라이브러리로 사용

```bash
npm install @reallygood83/hwpxcore
```

```ts
import { HwpxDocument } from "@reallygood83/hwpxcore";

const buffer = await fetch("document.hwpx").then((r) => r.arrayBuffer());
const doc = await HwpxDocument.open(new Uint8Array(buffer));

console.log(doc.text);
console.log(doc.sections.length);
```

### 2) CLI로 사용

```bash
npx @reallygood83/hwpx-cli --help
```

대표 명령:

```bash
hwpxtool read document.hwpx
hwpxtool info document.hwpx
hwpxtool hwpx-to-md document.hwpx -o document.md
hwpxtool hwp-to-hwpx legacy.hwp -o legacy.hwpx
```

### 3) AI(MCP)로 사용

```bash
npx @reallygood83/hwpx-mcp
```

Claude Desktop / Claude Code 설정 예시:

```json
{
  "mcpServers": {
    "hwpx": {
      "command": "npx",
      "args": ["@reallygood83/hwpx-mcp"]
    }
  }
}
```

## 실무 시나리오: 폴더 전체 인덱싱(RAG 입력 생성)

여러 `.hwpx` 파일을 모아둔 폴더를 바로 인덱싱할 수 있습니다.

```bash
hwpxtool batch index ./hwpx-folder \
  --output ./artifacts/hwpx-index.jsonl \
  --chunk-by paragraph \
  --max-chars 1200
```

### 자주 쓰는 옵션

- `--format jsonl|json`: 출력 포맷
- `--chunk-by paragraph|section|document`: 청크 기준
- `--max-chars <n>`: 청크 최대 길이
- `--incremental`: 변경된 파일만 재인덱싱
- `--state-path <file>`: incremental 상태파일 경로
- `--json`: 실행 결과 요약을 JSON으로 stdout 출력
- `--schema`: 출력 레코드 스키마를 출력하고 종료

예시:

```bash
hwpxtool batch index ./hwpx-folder \
  --incremental \
  --state-path ./artifacts/hwpx-index.state.json \
  --json
```

## 인덱스 레코드(JSONL) 예시

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

## AI에서 어떻게 활용하나?

1. `batch index`로 JSONL 생성
2. `text` 필드를 임베딩으로 변환
3. `id/relativePath/sectionIndex/paragraphIndex`를 메타데이터로 벡터DB 저장
4. 검색 결과를 원문 문서 위치로 역추적

## 패키지

| 패키지 | 설명 |
|---|---|
| `@reallygood83/hwpxcore` | HWPX 읽기/편집 핵심 라이브러리 |
| `@reallygood83/hwpx-tools` | 변환/추출/인덱싱 유틸리티 |
| `@reallygood83/hwpx-cli` | 터미널용 CLI |
| `@reallygood83/hwpx-mcp` | MCP 서버 (AI 에이전트 연동) |
| `@reallygood83/hwpxeditor` | React 기반 에디터 컴포넌트 |

## 개발자용 검증 명령

```bash
pnpm install

pnpm --filter @reallygood83/hwpxcore typecheck
pnpm --filter @reallygood83/hwpxcore test
pnpm --filter @reallygood83/hwpxcore build

pnpm --filter @reallygood83/hwpx-tools typecheck
pnpm --filter @reallygood83/hwpx-tools build

pnpm --filter @reallygood83/hwpx-cli typecheck
pnpm --filter @reallygood83/hwpx-cli build

pnpm --filter @reallygood83/hwpx-mcp typecheck
pnpm --filter @reallygood83/hwpx-mcp build
```

## 트러블슈팅

- GitHub Pages 배포 실패(404) 시: 저장소 `Settings -> Pages`에서 Pages를 먼저 활성화하세요.
- `Cannot find module '@reallygood83/...` 오류: 루트에서 `pnpm install` 후 해당 의존 패키지부터 빌드하세요.
- HWP 변환 품질 이슈: `hwp-to-hwpx`는 best-effort입니다. 원본 레이아웃 100% 보장을 목표로 하지 않습니다.

## 라이선스

Non-Commercial License. 자세한 내용은 `LICENSE`를 참고하세요.
