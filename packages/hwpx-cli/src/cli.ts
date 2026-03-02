import { Command } from "commander";
import {
  openHwpxFile,
  exportToMarkdownBundle,
  exportToText,
  exportSectionText,
  convertHwpFileToHwpxBytes,
  extractPart,
  getHwpxInfo,
  listParts,
  type MarkdownExportOptions,
  type MarkdownImageManifestItem,
  type MarkdownImageMode,
  type TextExportOptions,
  TextExtractor,
  batchIndexHwpx,
} from "@masteroflearning/hwpx-tools";
import { createHash } from "node:crypto";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve } from "node:path";
import { handleMcpConfig, type McpConfigOptions } from "./commands/mcp-config.js";

export interface ReadOptions {
  section?: number;
}

export interface ExportOptions {
  format: "md" | "txt";
  output: string;
  imageMode?: string;
  imagesDir?: string;
  manifest?: string;
  tokenEfficient?: boolean;
}

export interface HwpxToMdOptions {
  output?: string;
  imageMode?: string;
  imagesDir?: string;
  manifest?: string;
  tokenEfficient?: boolean;
}

export interface HwpToHwpxOptions {
  output?: string;
}

export interface BatchIndexOptions {
  output?: string;
  format?: "jsonl" | "json";
  chunkBy?: "paragraph" | "section" | "document";
  maxChars?: number;
  includeEmpty?: boolean;
  failFast?: boolean;
  incremental?: boolean;
  statePath?: string;
  schema?: boolean;
  json?: boolean;
}

interface BatchIndexRecord {
  id: string;
  sourcePath: string;
  relativePath: string;
  sourceFile: string;
  chunkBy: "paragraph" | "section" | "document";
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

interface BatchFailure {
  file: string;
  error: string;
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

  if (current) {
    chunks.push(current);
  }

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
        continue;
      }
      if (entry.isFile() && extname(entry.name).toLowerCase() === ".hwpx") {
        files.push(fullPath);
      }
    }
  }

  files.sort();
  return files;
}

function parseImageMode(value: string | undefined, fallback: MarkdownImageMode): MarkdownImageMode {
  if (!value) return fallback;
  if (value === "markdown" || value === "placeholder" || value === "omit") {
    return value;
  }
  throw new Error(`Unsupported image mode: ${value}. Use one of: markdown, placeholder, omit`);
}

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

function defaultMarkdownOutputPath(inputPath: string): string {
  const inputDir = dirname(inputPath);
  const inputBase = basename(inputPath, extname(inputPath));
  return resolve(inputDir, `${inputBase}.md`);
}

function defaultManifestOutputPath(markdownOutputPath: string): string {
  const outputDir = dirname(markdownOutputPath);
  const outputBase = basename(markdownOutputPath, extname(markdownOutputPath));
  return resolve(outputDir, `${outputBase}.images-manifest.json`);
}

async function writeImageFiles(
  hwpx: Awaited<ReturnType<typeof openHwpxFile>>,
  images: MarkdownImageManifestItem[],
  imagesDir: string
): Promise<number> {
  await mkdir(imagesDir, { recursive: true });

  const written = new Set<string>();
  let count = 0;

  for (const image of images) {
    if (!image.href || image.missingPart) continue;
    if (written.has(image.href)) continue;
    if (!hwpx.hasPart(image.href)) continue;

    const fileName = basename(image.href);
    const outPath = resolve(imagesDir, fileName);
    await writeFile(outPath, hwpx.getPart(image.href));
    written.add(image.href);
    count += 1;
  }

  return count;
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name("hwpxtool")
    .description("CLI tool for HWPX file operations")
    .version("0.1.0");

  // read command
  program
    .command("read <file>")
    .description("Read HWPX file and output text content")
    .option("-s, --section <number>", "Section index to read (0-based)", parseInt)
    .action(async (file: string, options: ReadOptions) => {
      const filePath = resolve(file);
      console.error(`Reading: ${filePath}`);

      try {
        const hwpx = await openHwpxFile(filePath);

        if (options.section !== undefined) {
          const content = exportSectionText(hwpx, options.section);
          console.log(content);
        } else {
          const content = exportToText(hwpx);
          console.log(content);
        }
      } catch (error) {
        console.error(
          "Error reading file:",
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  // export command
  program
    .command("export <file>")
    .description("Export HWPX file to other formats")
    .requiredOption("-f, --format <format>", "Output format (md, txt)")
    .requiredOption("-o, --output <file>", "Output file path")
    .option("--image-mode <mode>", "Image mode for markdown export: markdown, placeholder, omit")
    .option("--images-dir <dir>", "Extract image files into this directory")
    .option("--manifest <file>", "Write markdown image manifest JSON")
    .option("--token-efficient", "Enable token-efficient markdown normalization")
    .action(async (file: string, options: ExportOptions) => {
      const filePath = resolve(file);
      const outputPath = resolve(options.output);

      console.error(`Exporting: ${filePath}`);
      console.error(`Format: ${options.format}`);
      console.error(`Output: ${outputPath}`);

      try {
        const hwpx = await openHwpxFile(filePath);
        let content: string;

        if (options.format === "md") {
          const imageMode = parseImageMode(
            options.imageMode,
            options.tokenEfficient ? "placeholder" : "markdown"
          );
          const imagesDir = options.imagesDir ? resolve(options.imagesDir) : null;
          const imageBasePath = imagesDir
            ? toPosixPath(relative(dirname(outputPath), imagesDir) || ".")
            : "images";

          const mdOptions: MarkdownExportOptions = {
            includeSectionSeparators: true,
            convertHeadingStyles: true,
            tokenEfficient: !!options.tokenEfficient,
            imageMode,
            imageBasePath,
          };

          const result = exportToMarkdownBundle(hwpx, mdOptions);
          content = result.markdown;

          if (imagesDir) {
            const writtenCount = await writeImageFiles(hwpx, result.images, imagesDir);
            console.error(`Extracted ${writtenCount} image file(s) to ${imagesDir}`);
          }

          if (options.manifest) {
            const manifestPath = resolve(options.manifest);
            await mkdir(dirname(manifestPath), { recursive: true });
            await writeFile(
              manifestPath,
              JSON.stringify(
                {
                  source: filePath,
                  generatedAt: new Date().toISOString(),
                  imageMode,
                  tokenEfficient: !!options.tokenEfficient,
                  images: result.images,
                  stats: result.stats,
                },
                null,
                2
              ),
              "utf-8"
            );
            console.error(`Wrote image manifest: ${manifestPath}`);
          }
        } else if (options.format === "txt") {
          const txtOptions: TextExportOptions = {
            paragraphSeparator: "\n",
            sectionSeparator: "\n\n",
          };
          content = exportToText(hwpx, txtOptions);
        } else {
          throw new Error(`Unsupported format: ${options.format}`);
        }

        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, content, "utf-8");
        console.error(`Successfully exported to ${outputPath}`);
      } catch (error) {
        console.error(
          "Error exporting file:",
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  // hwp-to-hwpx command (best-effort conversion)
  program
    .command("hwp-to-hwpx <file>")
    .description("Convert HWP (HWP 5.x binary) file to HWPX (best-effort)")
    .option("-o, --output <file>", "HWPX output file (default: <input>.hwpx)")
    .action(async (file: string, options: HwpToHwpxOptions) => {
      const filePath = resolve(file);
      const inputBase = basename(filePath, extname(filePath));
      const outputPath = resolve(options.output ?? resolve(dirname(filePath), `${inputBase}.hwpx`));

      console.error(`Converting: ${filePath}`);
      console.error(`Output: ${outputPath}`);

      try {
        const hwpxBytes = await convertHwpFileToHwpxBytes(filePath);
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, hwpxBytes);
        console.error(`Wrote HWPX: ${outputPath}`);
      } catch (error) {
        console.error(
          "Error converting file:",
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  // hwpx-to-md command (token-efficient markdown export with image manifest)
  program
    .command("hwpx-to-md <file>")
    .description("Convert HWPX file to token-efficient Markdown with image manifest")
    .option("-o, --output <file>", "Markdown output file (default: <input>.md)")
    .option("--image-mode <mode>", "Image mode: markdown, placeholder, omit", "placeholder")
    .option("--images-dir <dir>", "Extract image files into this directory")
    .option("--manifest <file>", "Image manifest output path (default: <output>.images-manifest.json)")
    .option("--no-token-efficient", "Disable token-efficient markdown normalization")
    .action(async (file: string, options: HwpxToMdOptions) => {
      const filePath = resolve(file);
      const outputPath = resolve(options.output ?? defaultMarkdownOutputPath(filePath));
      const imageMode = parseImageMode(options.imageMode, "placeholder");
      const tokenEfficient = options.tokenEfficient ?? true;
      const imagesDir = options.imagesDir ? resolve(options.imagesDir) : null;
      const manifestPath = resolve(options.manifest ?? defaultManifestOutputPath(outputPath));
      const imageBasePath = imagesDir
        ? toPosixPath(relative(dirname(outputPath), imagesDir) || ".")
        : "images";

      console.error(`Converting: ${filePath}`);
      console.error(`Output: ${outputPath}`);
      console.error(`Image mode: ${imageMode}`);
      console.error(`Token efficient: ${tokenEfficient ? "yes" : "no"}`);

      try {
        const hwpx = await openHwpxFile(filePath);
        const result = exportToMarkdownBundle(hwpx, {
          includeSectionSeparators: true,
          convertHeadingStyles: true,
          tokenEfficient,
          imageMode,
          imageBasePath,
        });

        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, result.markdown, "utf-8");
        console.error(`Wrote markdown: ${outputPath}`);

        if (imagesDir) {
          const writtenCount = await writeImageFiles(hwpx, result.images, imagesDir);
          console.error(`Extracted ${writtenCount} image file(s) to ${imagesDir}`);
        }

        await mkdir(dirname(manifestPath), { recursive: true });
        await writeFile(
          manifestPath,
          JSON.stringify(
            {
              source: filePath,
              markdown: outputPath,
              generatedAt: new Date().toISOString(),
              imageMode,
              tokenEfficient,
              imagesDir,
              images: result.images,
              stats: result.stats,
            },
            null,
            2
          ),
          "utf-8"
        );
        console.error(`Wrote image manifest: ${manifestPath}`);
      } catch (error) {
        console.error(
          "Error converting file:",
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  // extract command
  program
    .command("extract <file> <part>")
    .description("Extract specific XML part from HWPX file")
    .action(async (file: string, part: string) => {
      const filePath = resolve(file);

      console.error(`Extracting: ${part} from ${filePath}`);

      try {
        const content = await extractPart(filePath, part);
        console.log(content);
      } catch (error) {
        console.error(
          "Error extracting part:",
          error instanceof Error ? error.message : String(error)
        );

        // List available parts on error
        try {
          const parts = await listParts(filePath);
          console.error("Available parts:");
          for (const p of parts) {
            console.error(`  - ${p}`);
          }
        } catch {
          // Ignore listing error
        }

        process.exit(1);
      }
    });

  // batch command
  const batch = program
    .command("batch")
    .description("Batch operations for multiple HWPX files");

  batch
    .command("index <input>")
    .description("Index one or many HWPX files into AI-ready chunks")
    .option("-o, --output <file>", "Output file path (default: <input>/hwpx-index.jsonl)")
    .option("--format <format>", "Output format: jsonl or json", "jsonl")
    .option("--chunk-by <mode>", "Chunk strategy: paragraph, section, document", "paragraph")
    .option("--max-chars <number>", "Maximum characters per chunk", (value) => parseInt(value, 10), 1200)
    .option("--include-empty", "Include empty chunks")
    .option("--fail-fast", "Stop at the first failed file")
    .option("--incremental", "Re-index only changed files using state cache")
    .option("--state-path <file>", "Index state file path (default: <output>.state.json)")
    .option("--schema", "Print output record schema and exit")
    .option("--json", "Print summary as JSON to stdout")
    .action(async (input: string, options: BatchIndexOptions) => {
      if (options.schema) {
        const schema = {
          id: "sha256(relativePath|chunkBy|position|chunkIndex|text)",
          sourcePath: "absolute path",
          relativePath: "path relative to input base",
          sourceFile: "basename",
          chunkBy: "paragraph|section|document",
          chunkIndex: "number",
          sectionIndex: "number|null",
          paragraphIndex: "number|null",
          text: "normalized chunk text",
          metadata: {
            title: "string|null",
            author: "string|null",
            date: "string|null",
            sections: "number",
            paragraphs: "number",
            indexedAt: "ISO datetime",
          },
        };
        console.log(JSON.stringify(schema, null, 2));
        return;
      }

      const inputPath = resolve(input);
      const format = options.format === "json" ? "json" : "jsonl";
      const chunkBy =
        options.chunkBy === "section" || options.chunkBy === "document"
          ? options.chunkBy
          : "paragraph";
      const maxChars = Number.isFinite(options.maxChars) && (options.maxChars ?? 0) > 0
        ? Math.floor(options.maxChars as number)
        : 1200;

      try {
        const inputStats = await stat(inputPath);
        const baseDir = inputStats.isDirectory() ? inputPath : dirname(inputPath);
        const outputPath = resolve(options.output ?? resolve(baseDir, "hwpx-index.jsonl"));
        const defaultStatePath = `${outputPath}.state.json`;
        const statePath = resolve(options.statePath ?? defaultStatePath);

        const result = await batchIndexHwpx({
          inputPath,
          outputPath,
          format,
          chunkBy,
          maxChars,
          includeEmpty: !!options.includeEmpty,
          failFast: !!options.failFast,
          incremental: !!options.incremental,
          statePath,
        });

        const summary = {
          ok: result.ok,
          command: result.command,
          startedAt: result.startedAt,
          finishedAt: result.finishedAt,
          input: result.input,
          output: result.output,
          statePath: result.statePath,
          format: result.format,
          chunkBy: result.chunkBy,
          maxChars: result.maxChars,
          incremental: result.incremental,
          scannedFiles: result.scannedFiles,
          indexedFiles: result.indexedFiles,
          skippedFiles: result.skippedFiles,
          failedFiles: result.failedFiles,
          chunkCount: result.chunkCount,
          failures: result.failures,
        };

        if (options.json) {
          console.log(JSON.stringify(summary, null, 2));
        } else {
          console.error(`Indexed files: ${result.indexedFiles}/${result.scannedFiles}`);
          if (result.incremental) {
            console.error(`Skipped files (unchanged): ${result.skippedFiles}`);
          }
          console.error(`Chunks written: ${result.chunkCount}`);
          console.error(`Output: ${result.output}`);
          console.error(`State: ${result.statePath}`);
          if (result.failures.length > 0) {
            console.error(`Failed files: ${result.failures.length}`);
            for (const failure of result.failures) {
              console.error(`- ${failure.file}: ${failure.error}`);
            }
          }
        }

        if (result.failedFiles > 0 && result.indexedFiles > 0) {
          process.exit(4);
        }
        if (result.failedFiles > 0 && result.indexedFiles === 0) {
          process.exit(2);
        }
      } catch (error) {
        console.error("Error indexing files:", error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // info command
  program
    .command("info <file>")
    .description("Display HWPX file metadata")
    .action(async (file: string) => {
      const filePath = resolve(file);

      console.error(`Getting info for: ${filePath}`);

      try {
        const info = await getHwpxInfo(filePath);
        console.log(JSON.stringify(info, null, 2));
      } catch (error) {
        console.error(
          "Error getting file info:",
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  // mcp-config command
  program
    .command("mcp-config")
    .description("Configure hwpx MCP server for Claude Code or OpenClaw")
    .option("-g, --global", "Configure globally (default)", true)
    .option("-p, --project", "Configure for current project only")
    .option("-t, --target <client>", "MCP client target: claude or openclaw", "claude")
    .option("--config-path <path>", "Custom MCP config file path")
    .option("--print", "Print JSON config without writing files")
    .option("-l, --list", "List configured MCP servers")
    .option("-r, --remove", "Remove hwpx from MCP configuration")
    .action((options: McpConfigOptions) => {
      handleMcpConfig(options);
    });

  return program;
}

// Run CLI when executed directly
const program = createProgram();
program.parse();
