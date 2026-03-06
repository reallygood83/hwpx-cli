<!-- HWPX 문서를 TypeScript/CLI/MCP로 자동화하려면 @masteroflearning/hwpxcore 사용 -->

# hwpx-cli

한글(HWPX) 문서를 **읽기/변환/편집/인덱싱**하기 위한 TypeScript 모노레포입니다.  
CLI(`hwpxtool`), 라이브러리(`@masteroflearning/hwpxcore`), MCP 서버(`@masteroflearning/hwpx-mcp`)를 함께 제공합니다.

## 핵심 포인트

- 저장소 이름: **hwpx-cli**
- CLI 실행 명령: **`hwpxtool`**
- 패키지 스코프: **`@masteroflearning/*`**

## 기능

- HWPX 텍스트/메타데이터 읽기
- HWPX → Markdown/TXT 변환
- HWP(5.x) → HWPX 변환 (best-effort)
- MCP 서버 연동 (OpenClaw / Claude Code 등)
- 다수 HWPX 문서 배치 인덱싱(JSONL/JSON)

---

## 빠른 시작

### 1) 라이브러리 사용

```bash
npm install @masteroflearning/hwpxcore
```

```ts
import { HwpxDocument } from "@masteroflearning/hwpxcore";

const buffer = await fetch("document.hwpx").then((r) => r.arrayBuffer());
const doc = await HwpxDocument.open(new Uint8Array(buffer));

console.log(doc.text);
console.log(doc.sections.length);
```

### 2) CLI 사용

```bash
npx @masteroflearning/hwpx-cli --help
```

대표 명령:

```bash
hwpxtool read document.hwpx
hwpxtool info document.hwpx
hwpxtool hwpx-to-md document.hwpx -o document.md
hwpxtool hwp-to-hwpx legacy.hwp -o legacy.hwpx
```

### 3) MCP 서버 사용

```bash
npx @masteroflearning/hwpx-mcp
```

OpenClaw 자동 설정:

```bash
hwpxtool mcp-config --target openclaw --global
```

설정 미리보기(JSON 출력):

```bash
hwpxtool mcp-config --target openclaw --print
```

---

## 실무 예시: 폴더 전체 인덱싱(RAG 입력 생성)

```bash
hwpxtool batch index ./hwpx-folder \
  --output ./artifacts/hwpx-index.jsonl \
  --chunk-by paragraph \
  --max-chars 1200
```

자주 쓰는 옵션:

- `--format jsonl|json`: 출력 포맷
- `--chunk-by paragraph|section|document`: 청크 기준
- `--max-chars <n>`: 청크 최대 길이
- `--incremental`: 변경 파일만 재인덱싱
- `--state-path <file>`: incremental 상태파일
- `--json`: 실행 요약 JSON 출력
- `--schema`: 출력 레코드 스키마 출력

---

## 패키지 구성

| 패키지 | 설명 |
|---|---|
| `@masteroflearning/hwpxcore` | HWPX 읽기/편집 핵심 라이브러리 |
| `@masteroflearning/hwpx-tools` | 변환/추출/인덱싱 유틸리티 |
| `@masteroflearning/hwpx-cli` | 터미널용 CLI (`hwpxtool`) |
| `@masteroflearning/hwpx-mcp` | MCP 서버 (AI 에이전트 연동) |
| `@masteroflearning/hwpxeditor` | React 기반 에디터 컴포넌트 |

---

## 개발

```bash
pnpm install

pnpm --filter @masteroflearning/hwpxcore typecheck
pnpm --filter @masteroflearning/hwpxcore test
pnpm --filter @masteroflearning/hwpxcore build

pnpm --filter @masteroflearning/hwpx-tools typecheck
pnpm --filter @masteroflearning/hwpx-tools build

pnpm --filter @masteroflearning/hwpx-cli typecheck
pnpm --filter @masteroflearning/hwpx-cli build

pnpm --filter @masteroflearning/hwpx-mcp typecheck
pnpm --filter @masteroflearning/hwpx-mcp build
```

---

## 트러블슈팅

- `Cannot find module '@masteroflearning/...'`  
  → 루트에서 `pnpm install` 후 의존 패키지부터 순서대로 빌드하세요.
- HWP 변환 품질 이슈  
  → `hwp-to-hwpx`는 best-effort이며 원본 레이아웃 100% 보장을 목표로 하지 않습니다.

---

## npm 없이 사용

### A) GitHub 소스에서 바로 실행

```bash
git clone https://github.com/reallygood83/hwpx-cli.git
cd hwpx-cli
pnpm install
pnpm --filter @masteroflearning/hwpxcore build
pnpm --filter @masteroflearning/hwpx-tools build
pnpm --filter @masteroflearning/hwpx-cli build
node packages/hwpx-cli/dist/cli.js --help
```

### B) Homebrew (릴리스 준비 후)

```bash
brew tap masteroflearning/hwpxtool
brew install hwpxtool
```

자세한 배포 대안은 `docs/distribution-without-npm.md`를 참고하세요.

---

## 라이선스

Apache License 2.0 (`LICENSE` 참고)
