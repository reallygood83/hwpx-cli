import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve } from "node:path";
import { HwpxPackage, TextExtractor } from "@masteroflearning/hwpxcore";

export type BatchIndexFormat = "jsonl" | "json";
export type BatchChunkBy = "paragraph" | "section" | "document";

export interface BatchIndexRecord {
  id: string;
  sourcePath: string;
  relativePath: string;
  sourceFile: string;
  chunkBy: BatchChunkBy;
  chunkIndex: number;
  sectionIndex: number | null;
  paragraphIndex: number | null;
  text: string;
  metadata: {
    title: string | null;
    author: string | null;
    date: string | null;
    sections: number;
    paragraphs: number;
    indexedAt: string;
  };
}

export interface BatchIndexFailure {
  file: string;
  error: string;
}

interface BatchIndexStateFileEntry {
  size: number;
  mtimeMs: number;
  updatedAt: string;
}

interface BatchIndexState {
  version: 1;
  files: Record<string, BatchIndexStateFileEntry>;
}

export interface BatchIndexOptions {
  inputPath: string;
  outputPath: string;
  format: BatchIndexFormat;
  chunkBy: BatchChunkBy;
  maxChars: number;
  includeEmpty: boolean;
  failFast: boolean;
  incremental: boolean;
  statePath: string;
}

export interface BatchIndexResult {
  ok: boolean;
  command: "batch index";
  startedAt: string;
  finishedAt: string;
  input: string;
  output: string;
  statePath: string;
  format: BatchIndexFormat;
  chunkBy: BatchChunkBy;
  maxChars: number;
  incremental: boolean;
  scannedFiles: number;
  indexedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  chunkCount: number;
  failures: BatchIndexFailure[];
  records: BatchIndexRecord[];
}

function normalizeChunkText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function splitByMaxChars(text: string, maxChars: number): string[] {
  const cleaned = normalizeChunkText(text);
  if (!cleaned) return [""];
  if (cleaned.length <= maxChars) return [cleaned];

  const words = cleaned.split(" ");
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    if (!word) continue;

    if (word.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      let start = 0;
      while (start < word.length) {
        chunks.push(word.slice(start, start + maxChars));
        start += maxChars;
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
    }
    current = word;
  }

  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [cleaned.slice(0, maxChars)];
}

function toStableId(parts: Array<string | number | null>): string {
  const seed = parts.map((part) => String(part ?? "")).join("|");
  return createHash("sha256").update(seed).digest("hex");
}

async function listHwpxFiles(inputPath: string): Promise<string[]> {
  const inputStat = await stat(inputPath);
  if (inputStat.isFile()) {
    if (extname(inputPath).toLowerCase() !== ".hwpx") {
      throw new Error(`Input file is not an .hwpx file: ${inputPath}`);
    }
    return [inputPath];
  }

  if (!inputStat.isDirectory()) {
    throw new Error(`Input path is neither a file nor directory: ${inputPath}`);
  }

  const files: string[] = [];
  const stack: string[] = [inputPath];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = resolve(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && extname(entry.name).toLowerCase() === ".hwpx") {
        files.push(fullPath);
      }
    }
  }

  files.sort();
  return files;
}

function extractDocMeta(pkg: HwpxPackage): { title: string | null; author: string | null; date: string | null; sections: number; paragraphs: number } {
  const extractor = new TextExtractor(pkg);
  const sections = extractor.sections();
  const paragraphs = extractor.extractParagraphs();

  let title: string | null = null;
  let author: string | null = null;
  let date: string | null = null;
  try {
    const manifestText = pkg.getText(HwpxPackage.MANIFEST_PATH);
    const titleMatch = /<dc:title[^>]*>([^<]*)<\/dc:title>/i.exec(manifestText);
    const authorMatch = /<dc:creator[^>]*>([^<]*)<\/dc:creator>/i.exec(manifestText);
    const dateMatch = /<dc:date[^>]*>([^<]*)<\/dc:date>/i.exec(manifestText);
    title = titleMatch?.[1] ?? null;
    author = authorMatch?.[1] ?? null;
    date = dateMatch?.[1] ?? null;
  } catch {
    // no-op
  }

  return { title, author, date, sections: sections.length, paragraphs: paragraphs.length };
}

async function readState(statePath: string): Promise<BatchIndexState> {
  try {
    const raw = await readFile(statePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<BatchIndexState>;
    if (parsed.version === 1 && parsed.files && typeof parsed.files === "object") {
      return parsed as BatchIndexState;
    }
  } catch {
    // ignore
  }
  return { version: 1, files: {} };
}

async function readExistingRecords(outputPath: string, format: BatchIndexFormat): Promise<Map<string, BatchIndexRecord[]>> {
  const map = new Map<string, BatchIndexRecord[]>();
  try {
    const raw = await readFile(outputPath, "utf-8");
    const records: BatchIndexRecord[] = format === "json"
      ? (JSON.parse(raw) as BatchIndexRecord[])
      : raw.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => JSON.parse(line) as BatchIndexRecord);

    for (const record of records) {
      const arr = map.get(record.relativePath) ?? [];
      arr.push(record);
      map.set(record.relativePath, arr);
    }
  } catch {
    // ignore parse/read failures
  }
  return map;
}

export async function batchIndexHwpx(options: BatchIndexOptions): Promise<BatchIndexResult> {
  const startedAt = new Date().toISOString();
  const inputPath = resolve(options.inputPath);
  const outputPath = resolve(options.outputPath);
  const statePath = resolve(options.statePath);

  const files = await listHwpxFiles(inputPath);
  if (files.length === 0) {
    throw new Error(`No .hwpx files found in: ${inputPath}`);
  }

  const inputStats = await stat(inputPath);
  const baseDir = inputStats.isDirectory() ? inputPath : dirname(inputPath);

  const failures: BatchIndexFailure[] = [];
  const records: BatchIndexRecord[] = [];
  let indexedFiles = 0;
  let skippedFiles = 0;

  const emptyState: BatchIndexState = { version: 1, files: {} };
  const previousState: BatchIndexState = options.incremental ? await readState(statePath) : emptyState;
  const existingRecordsByPath = options.incremental
    ? await readExistingRecords(outputPath, options.format)
    : new Map<string, BatchIndexRecord[]>();
  const nextState: BatchIndexState = { version: 1, files: {} };

  for (const filePath of files) {
    const relPath = relative(baseDir, filePath) || basename(filePath);
    try {
      const fsInfo = await stat(filePath);
      const prev = previousState.files[relPath];
      const reusable =
        options.incremental &&
        !!prev &&
        prev.size === fsInfo.size &&
        prev.mtimeMs === fsInfo.mtimeMs &&
        existingRecordsByPath.has(relPath);

      if (reusable) {
        const prevRecords = existingRecordsByPath.get(relPath) ?? [];
        records.push(...prevRecords);
        skippedFiles += 1;
        nextState.files[relPath] = {
          size: fsInfo.size,
          mtimeMs: fsInfo.mtimeMs,
          updatedAt: prev.updatedAt,
        };
        continue;
      }

      const buffer = await readFile(filePath);
      const pkg = await HwpxPackage.open(buffer);
      const extractor = new TextExtractor(pkg);
      const meta = extractDocMeta(pkg);
      const indexedAt = new Date().toISOString();

      let localChunkIndex = 0;
      if (options.chunkBy === "paragraph") {
        const paragraphs = extractor.extractParagraphs();
        for (const paragraph of paragraphs) {
          const splitChunks = splitByMaxChars(paragraph.text, options.maxChars);
          for (const chunkText of splitChunks) {
            const normalized = normalizeChunkText(chunkText);
            if (!options.includeEmpty && !normalized) continue;
            records.push({
              id: toStableId([relPath, options.chunkBy, paragraph.sectionIndex, paragraph.paragraphIndex, localChunkIndex, normalized]),
              sourcePath: filePath,
              relativePath: relPath,
              sourceFile: basename(filePath),
              chunkBy: options.chunkBy,
              chunkIndex: localChunkIndex,
              sectionIndex: paragraph.sectionIndex,
              paragraphIndex: paragraph.paragraphIndex,
              text: normalized,
              metadata: { ...meta, indexedAt },
            });
            localChunkIndex += 1;
          }
        }
      } else if (options.chunkBy === "section") {
        const sectionTexts = extractor.extractSectionTexts("\n");
        for (const [sectionIndex, sectionText] of sectionTexts.entries()) {
          const splitChunks = splitByMaxChars(sectionText, options.maxChars);
          for (const chunkText of splitChunks) {
            const normalized = normalizeChunkText(chunkText);
            if (!options.includeEmpty && !normalized) continue;
            records.push({
              id: toStableId([relPath, options.chunkBy, sectionIndex, localChunkIndex, normalized]),
              sourcePath: filePath,
              relativePath: relPath,
              sourceFile: basename(filePath),
              chunkBy: options.chunkBy,
              chunkIndex: localChunkIndex,
              sectionIndex,
              paragraphIndex: null,
              text: normalized,
              metadata: { ...meta, indexedAt },
            });
            localChunkIndex += 1;
          }
        }
      } else {
        const splitChunks = splitByMaxChars(extractor.extractText("\n"), options.maxChars);
        for (const chunkText of splitChunks) {
          const normalized = normalizeChunkText(chunkText);
          if (!options.includeEmpty && !normalized) continue;
          records.push({
            id: toStableId([relPath, options.chunkBy, localChunkIndex, normalized]),
            sourcePath: filePath,
            relativePath: relPath,
            sourceFile: basename(filePath),
            chunkBy: options.chunkBy,
            chunkIndex: localChunkIndex,
            sectionIndex: null,
            paragraphIndex: null,
            text: normalized,
            metadata: { ...meta, indexedAt },
          });
          localChunkIndex += 1;
        }
      }

      indexedFiles += 1;
      nextState.files[relPath] = {
        size: fsInfo.size,
        mtimeMs: fsInfo.mtimeMs,
        updatedAt: indexedAt,
      };
      pkg.close();
    } catch (error) {
      failures.push({
        file: filePath,
        error: error instanceof Error ? error.message : String(error),
      });
      if (options.failFast) break;
    }
  }

  await mkdir(dirname(outputPath), { recursive: true });
  const payload =
    options.format === "json"
      ? JSON.stringify(records, null, 2)
      : `${records.map((record) => JSON.stringify(record)).join("\n")}${records.length > 0 ? "\n" : ""}`;
  await writeFile(outputPath, payload, "utf-8");

  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(nextState, null, 2), "utf-8");

  return {
    ok: failures.length === 0,
    command: "batch index",
    startedAt,
    finishedAt: new Date().toISOString(),
    input: inputPath,
    output: outputPath,
    statePath,
    format: options.format,
    chunkBy: options.chunkBy,
    maxChars: options.maxChars,
    incremental: options.incremental,
    scannedFiles: files.length,
    indexedFiles,
    skippedFiles,
    failedFiles: failures.length,
    chunkCount: records.length,
    failures,
    records,
  };
}
