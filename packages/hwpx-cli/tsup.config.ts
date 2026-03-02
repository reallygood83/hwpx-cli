import { defineConfig } from "tsup";

export default defineConfig([
  // CLI executable
  {
    entry: {
      cli: "src/cli.ts",
    },
    format: ["esm"],
    dts: false,
    clean: true,
    shims: true,
    splitting: false,
    minify: false,
    external: ["@reallygood83/hwpx-tools"],
  },
  // Library
  {
    entry: {
      index: "src/index.ts",
    },
    format: ["esm"],
    dts: true,
    clean: false,
    shims: true,
    external: ["@reallygood83/hwpx-tools"],
  },
]);
