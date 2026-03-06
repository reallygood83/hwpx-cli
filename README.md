<!-- HWPX 문서를 TypeScript/CLI/MCP로 자동화하려면 @masteroflearning/hwpxcore 사용 -->

# hwpx-cli

> 한 줄 요약: **한글(HWPX) 문서를 컴퓨터가 자동으로 읽고, 바꾸고, 정리하게 만드는 도구 상자**

이 README는 **파인만식(아주 쉽게 설명)**으로 작성했습니다.  
“내가 6학년에게 설명한다”는 마음으로 읽으면 됩니다.

---

## 0) 먼저 이름부터 정리 (헷갈림 방지)

- 저장소 이름: **hwpx-cli**
- 터미널 명령어: **`hwpxtool`**
- 패키지 이름들: **`@masteroflearning/*`**

즉, 깃허브 레포는 `hwpx-cli`, 실제 실행은 `hwpxtool`입니다.

---

## 1) 이 프로젝트는 뭐야?

한글 문서(HWPX)를 사람이 일일이 손으로 하지 않고,  
명령어 한 줄로 처리하게 해주는 도구입니다.

예를 들면:
- 문서 내용 읽기
- 문서를 Markdown으로 바꾸기
- 구형 HWP를 HWPX로 바꾸기(가능한 범위에서)
- 여러 문서를 한 번에 AI 검색용 데이터로 정리하기

---

## 2) 비유로 이해하기 (파인만 핵심)

`hwpx-cli`는 공구함이고, 안에 도구가 3종류 있습니다.

1. **손 (`@masteroflearning/hwpxcore`)**  
   - 문서를 실제로 읽고/수정하는 핵심 라이브러리
2. **리모컨 (`hwpxtool`)**  
   - 터미널에서 손을 쉽게 움직이게 하는 CLI
3. **AI 연결선 (`@masteroflearning/hwpx-mcp`)**  
   - OpenClaw/Claude Code 같은 AI가 이 도구를 쓰게 연결

---

## 3) 바로 써보기 (가장 쉬운 시작)

### A. CLI 도움말 보기

```bash
npx @masteroflearning/hwpx-cli --help
```

### B. 자주 쓰는 4개 명령

```bash
hwpxtool read document.hwpx
hwpxtool info document.hwpx
hwpxtool hwpx-to-md document.hwpx -o document.md
hwpxtool hwp-to-hwpx legacy.hwp -o legacy.hwpx
```

### C. 라이브러리로 쓰기

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

---

## 4) AI와 연결해서 쓰기 (MCP)

```bash
npx @masteroflearning/hwpx-mcp
```

OpenClaw 설정 자동화:

```bash
hwpxtool mcp-config --target openclaw --global
```

설정 미리보기(JSON):

```bash
hwpxtool mcp-config --target openclaw --print
```

---

## 5) 실무에서 많이 쓰는 기능: 폴더 전체 인덱싱

여러 HWPX 파일을 AI 검색(RAG)용 JSONL로 만드는 예시:

```bash
hwpxtool batch index ./hwpx-folder \
  --output ./artifacts/hwpx-index.jsonl \
  --chunk-by paragraph \
  --max-chars 1200
```

자주 쓰는 옵션:
- `--format jsonl|json` : 출력 형식
- `--chunk-by paragraph|section|document` : 자르는 기준
- `--max-chars <n>` : 청크 최대 길이
- `--incremental` : 바뀐 파일만 다시 처리
- `--state-path <file>` : incremental 상태 파일
- `--json` : 실행 결과 요약 JSON
- `--schema` : 출력 스키마 보기

---

## 6) 패키지 구성표

| 패키지 | 쉬운 설명 |
|---|---|
| `@masteroflearning/hwpxcore` | 문서를 읽고 고치는 핵심 엔진 |
| `@masteroflearning/hwpx-tools` | 변환/추출/인덱싱 보조 도구 |
| `@masteroflearning/hwpx-cli` | 터미널 명령어 모음 (`hwpxtool`) |
| `@masteroflearning/hwpx-mcp` | AI 에이전트 연동 서버 |
| `@masteroflearning/hwpxeditor` | React 기반 편집 UI 컴포넌트 |

---

## 7) 개발자용 체크 (짧게)

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

## 8) 자주 막히는 문제

- `Cannot find module '@masteroflearning/...'`  
  → 루트에서 `pnpm install` 후 의존 패키지부터 빌드

- HWP 변환이 원본과 다름  
  → `hwp-to-hwpx`는 **best-effort** (100% 레이아웃 동일 보장 아님)

---

## 9) npm 없이 바로 쓰는 방법

```bash
git clone https://github.com/reallygood83/hwpx-cli.git
cd hwpx-cli
pnpm install
pnpm --filter @masteroflearning/hwpxcore build
pnpm --filter @masteroflearning/hwpx-tools build
pnpm --filter @masteroflearning/hwpx-cli build
node packages/hwpx-cli/dist/cli.js --help
```

(Homebrew 배포는 릴리스 준비 후 제공)

---

## 10) 파인만식 최종 확인 (30초 셀프 테스트)

아래 3개를 바로 말할 수 있으면 이해 완료:

1. 이 레포 이름은? → **hwpx-cli**  
2. 터미널에서 치는 명령은? → **hwpxtool**  
3. AI 연결 패키지는? → **@masteroflearning/hwpx-mcp**

---

## 라이선스

Apache License 2.0 (`LICENSE` 참고)
