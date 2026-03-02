/**
 * @reallygood83/hwpx-mcp
 *
 * MCP server for HWPX document manipulation.
 *
 * This package provides a Model Context Protocol (MCP) server
 * that allows AI assistants to interact with HWPX documents.
 *
 * ## Available Tools
 *
 * - `hwpx_read` - Extract text content from an HWPX file
 * - `hwpx_export` - Export HWPX to Markdown or plain text format
 * - `hwpx_extract_xml` - Extract internal XML parts from the HWPX package
 * - `hwpx_info` - Get metadata and structure information about an HWPX file
 * - `hwpx_batch_index` - Index multiple HWPX files for AI/RAG workflows
 *
 * ## Usage
 *
 * Run the MCP server:
 *
 * ```bash
 * npx @reallygood83/hwpx-mcp
 * ```
 *
 * Or use with Claude Desktop or other MCP clients by adding to your config:
 *
 * ```json
 * {
 *   "mcpServers": {
 *     "hwpx": {
 *       "command": "npx",
 *       "args": ["@reallygood83/hwpx-mcp"]
 *     }
 *   }
 * }
 * ```
 */

// Re-export types for programmatic use
export { HwpxDocument, HwpxPackage, TextExtractor } from "@reallygood83/hwpxcore";
