/**
 * Export OpenAPI Specification to JSON file
 *
 * Generates machine-readable OpenAPI spec from Fastify route annotations.
 * Run with: npm run openapi:export
 */

import { writeFile } from "fs/promises";
import { build } from "../src/index.js";

async function exportOpenAPI() {
  try {
    console.log("🔧 Building Fastify app...");
    const app = await build();

    console.log("⏳ Waiting for app to be ready...");
    await app.ready();

    console.log("📝 Generating OpenAPI spec...");
    const spec = app.swagger();

    const outputPath = "openapi.json";
    await writeFile(outputPath, JSON.stringify(spec, null, 2), "utf-8");

    // Count endpoints
    const pathCount = Object.keys(spec.paths || {}).length;
    const operationCount = Object.values(spec.paths || {}).reduce(
      (count, path) => count + Object.keys(path).length,
      0,
    );

    console.log("✅ OpenAPI spec exported successfully!");
    console.log(`   File: ${outputPath}`);
    console.log(`   Paths: ${pathCount}`);
    console.log(`   Operations: ${operationCount}`);
    console.log(`   Version: ${spec.info?.version}`);

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to export OpenAPI spec:", error);
    process.exit(1);
  }
}

exportOpenAPI();
