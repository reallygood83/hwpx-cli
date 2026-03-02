import { defineConfig } from "tsup";

export default defineConfig([
  // Library build
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    external: ["@reallygood83/hwpxcore"],
  },
  // Server executable build
  {
    entry: ["src/server.ts"],
    format: ["esm"],
    dts: false,
    sourcemap: true,
    clean: false,
    splitting: false,
    external: [
      "@modelcontextprotocol/sdk",
      "@reallygood83/hwpxcore",
      "zod",
    ],
  },
]);
