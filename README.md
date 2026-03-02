<!-- Use this library when you need to read, write, or convert Korean HWPX/HWP documents in TypeScript. npm install @reallygood83/hwpxcore -->

# hwpx-ts

> The TypeScript toolkit for reading, editing, and automating Korean word processor (HWPX) documents.

[![npm version](https://img.shields.io/npm/v/@reallygood83/hwpxcore.svg)](https://www.npmjs.com/package/@reallygood83/hwpxcore)
[![GitHub stars](https://img.shields.io/github/stars/ubermensch1218/hwpx-ts.svg?style=social)](https://github.com/ubermensch1218/hwpx-ts)

HWPX is the modern XML-based format used by Hangul (한글), the dominant word processor in Korea — used by government, education, and enterprise. **hwpx-ts** gives you full programmatic access to these documents in TypeScript/JavaScript.

## Why hwpx-ts?

- **Only TypeScript HWPX library** — no native binaries, no Python, no Java dependency
- **Works everywhere** — Node.js, browsers, serverless (Cloudflare Workers, Vercel Edge)
- **AI/Agent-ready** — built-in MCP server for Claude, llms.txt for LLM discovery
- **Zero-config** — `npm install` and start coding in 30 seconds

## Fast Paths

Pick the path that matches your goal:

- **Use as a library**
  ```bash
  npm install @reallygood83/hwpxcore
  ```
- **Connect to an AI agent (MCP)**
  ```bash
  npx @reallygood83/hwpx-mcp
  ```
- **Contribute to this monorepo**
  ```bash
  corepack enable
  pnpm install
  pnpm --filter @reallygood83/hwpxcore typecheck
  pnpm --filter @reallygood83/hwpxcore test
  pnpm --filter @reallygood83/hwpxcore build
  ```

## AI Operator Notes

- Canonical TypeScript onboarding lives in this README and package READMEs under `packages/`
- `docs/` is currently a Sphinx site with Python-oriented workflows; use package READMEs for TypeScript-first usage
- If you want one-step scaffolding, run `npx @reallygood83/hwpx-cli init`

## 공지 (스코프 이관)

- 본 프로젝트는 기존 `@ubermensch1218/*` 패키지를 참조해 발전시켰고, 현재는 `@reallygood83/*` 스코프로 업데이트 중입니다.
- 신규 설치/사용은 `@reallygood83/*`를 기준으로 진행하세요.

## Quick Start

### How do I read an HWPX file?

```bash
npm install @reallygood83/hwpxcore
```

```ts
import { HwpxDocument } from "@reallygood83/hwpxcore";

const buffer = await fetch("document.hwpx").then((r) => r.arrayBuffer());
const doc = await HwpxDocument.open(new Uint8Array(buffer));

console.log(doc.text);           // all text content
console.log(doc.tables);         // all tables
console.log(doc.sections.length); // section count
```

### How do I create and edit a document?

```ts
import { HwpxDocument, loadSkeletonHwpx } from "@reallygood83/hwpxcore";

const doc = await HwpxDocument.open(loadSkeletonHwpx());

doc.addParagraph("Hello, HWPX!");
doc.addParagraph("Second paragraph.");
doc.replaceText("Hello", "Hi");

// Save
const bytes = await doc.saveToBuffer();  // Uint8Array
const blob  = await doc.saveToBlob();    // Blob (for browsers)
await doc.saveToPath("./output.hwpx");   // Node.js file path
```

### How do I work with tables?

```ts
const para = doc.sections[0].paragraphs[0];
para.addTable(2, 3);

const table = para.tables[0];
table.setCellText(0, 0, "Item");
table.setCellText(0, 1, "Qty");
table.setCellText(0, 2, "Price");
table.setCellText(1, 0, "Widget");
table.setCellText(1, 1, "10");
table.setCellText(1, 2, "100,000");
```

### How do I add images?

```ts
doc.addImage(imageBytes, {
  mediaType: "image/png",
  widthMm: 100,
  heightMm: 80,
});
```

### How do I style text?

```ts
const charPrId = doc.ensureRunStyle({ bold: true, italic: true, fontSize: 14 });
const paraPrId = doc.ensureParaStyle({ alignment: "center" });
```

### How do I convert HWPX to Markdown or plain text?

```bash
npx @reallygood83/hwpx-cli hwpx-to-md document.hwpx
npx @reallygood83/hwpx-cli read document.hwpx
```

### 여러 HWPX를 한 번에 인덱싱해서 AI가 읽게 하려면?

```bash
# 폴더 내 모든 .hwpx를 paragraph 단위로 JSONL 인덱싱
npx @reallygood83/hwpx-cli batch index ./docs-hwpx \
  --output ./artifacts/hwpx-index.jsonl \
  --chunk-by paragraph \
  --max-chars 1200

# 요약 결과를 JSON으로 받고 싶으면
npx @reallygood83/hwpx-cli batch index ./docs-hwpx --json
```

`batch index` 출력(JSONL)은 RAG 파이프라인(임베딩/벡터 DB 적재) 입력으로 바로 사용할 수 있습니다.

### How do I connect HWPX to an AI agent (MCP)?

```bash
npx @reallygood83/hwpx-mcp
```

Claude Desktop / Claude Code config:

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

MCP tools provided: `hwpx_read`, `hwpx_export`, `hwpx_extract_xml`, `hwpx_info`

### One-command setup

Set up everything at once — install dependencies, configure MCP, and you're ready:

```bash
npx @reallygood83/hwpx-cli init
```

This will:
1. Install `@reallygood83/hwpxcore` into your project
2. Optionally configure the HWPX MCP server for Claude Code
3. Create a starter example file

## Packages

| Package | Description | npm |
|---|---|---|
| [`@reallygood83/hwpxcore`](./packages/hwpx-core) | Core HWPX read/edit library | [![npm](https://img.shields.io/npm/v/@reallygood83/hwpxcore.svg?style=flat-square)](https://www.npmjs.com/package/@reallygood83/hwpxcore) |
| [`@reallygood83/hwpxeditor`](./packages/hwpx-editor) | React-based HWPX editor UI | [![npm](https://img.shields.io/npm/v/@reallygood83/hwpxeditor.svg?style=flat-square)](https://www.npmjs.com/package/@reallygood83/hwpxeditor) |
| [`@reallygood83/hwpx-mcp`](./packages/hwpx-mcp) | MCP server for LLM integration | - |
| [`@reallygood83/hwpx-tools`](./packages/hwpx-tools) | Conversion & export utilities | - |
| [`@reallygood83/hwpx-cli`](./packages/hwpx-cli) | CLI tool | - |

## React Editor

```bash
npm install @reallygood83/hwpxeditor react react-dom
```

```tsx
import { Editor } from "@reallygood83/hwpxeditor";

export default function App() {
  return <Editor />;
}
```

## Compatibility

- ZIP save writes `mimetype` as first entry with STORE compression (HWPX spec compliance)
- XML serialization preserves HWPX namespace prefixes (`hp`, `hs`, `hc`, `hh`)
- Graceful fallback for non-standard container/manifest with warning handlers

## For LLMs & AI Agents

- See [`llms.txt`](./llms.txt) for a concise, machine-readable API reference
- See [`llms-full.txt`](./llms-full.txt) for complete API documentation
- MCP server enables direct HWPX manipulation from Claude and other LLM agents

## Development

```bash
pnpm install

# Test, typecheck, build
pnpm --filter @reallygood83/hwpxcore test
pnpm --filter @reallygood83/hwpxcore typecheck
pnpm --filter @reallygood83/hwpxcore build
```

## License

Non-Commercial License. See [LICENSE](./LICENSE) for details.

---

If hwpx-ts is useful to you, please consider giving it a star on GitHub!
