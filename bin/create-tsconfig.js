#!/usr/bin/env node

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const rl = createInterface({ input: stdin, output: stdout });

async function ask(question) {
  return rl.question(question);
}

async function askYesNo(question) {
  for (;;) {
    const raw = (await ask(`${question} [y/n]: `)).trim().toLowerCase();
    if (raw === "y" || raw === "yes") return true;
    if (raw === "n" || raw === "no") return false;
    console.log("  Please enter y or n.");
  }
}

const PROJECT_TYPES = [
  { label: "Express / Node.js application",  id: "node-app"  },
  { label: "Node.js package / library",       id: "node-lib"  },
  { label: "Vue 3 application (Vite)",        id: "vue-app"   },
  { label: "Vue 3 component library",         id: "vue-lib"   },
  { label: "Node.js test config (vitest)",    id: "node-test" },
  { label: "Vue test config (vitest)",        id: "vue-test"  },
];

async function selectProjectType() {
  console.log("\nProject type:");
  PROJECT_TYPES.forEach((t, i) => console.log(`  ${i + 1}. ${t.label}`));
  for (;;) {
    const raw = (await ask(`\nEnter number [1–${PROJECT_TYPES.length}]: `)).trim();
    const n = parseInt(raw, 10);
    if (n >= 1 && n <= PROJECT_TYPES.length) return PROJECT_TYPES[n - 1];
    console.log(`  Please enter a number from 1 to ${PROJECT_TYPES.length}.`);
  }
}

function buildConfig(projectId, useDecorators) {
  const isVue = projectId.startsWith("vue-");
  const isTest = projectId.endsWith("-test");

  const base = isVue
    ? "@blacklizard/tsconfig/tsconfig.vue.json"
    : "@blacklizard/tsconfig/tsconfig.node.json";

  const compilerOptions = {};

  switch (projectId) {
    case "node-app":
      compilerOptions.rootDir = "./src";
      compilerOptions.outDir = "./dist";
      compilerOptions.types = ["node"];
      compilerOptions.composite = true;
      break;

    case "node-lib":
      compilerOptions.rootDir = "./src";
      compilerOptions.outDir = "./dist";
      compilerOptions.declaration = true;
      compilerOptions.declarationMap = true;
      compilerOptions.types = ["node"];
      compilerOptions.composite = true;
      break;

    case "vue-app":
      compilerOptions.rootDir = "./src";
      compilerOptions.outDir = "./dist";
      compilerOptions.noEmit = true;
      compilerOptions.types = ["vite/client"];
      break;

    case "vue-lib":
      compilerOptions.rootDir = "./src";
      compilerOptions.outDir = "./dist";
      compilerOptions.declaration = true;
      compilerOptions.declarationMap = true;
      compilerOptions.emitDeclarationOnly = true;
      compilerOptions.types = [];
      break;

    case "node-test":
      compilerOptions.rootDir = ".";
      compilerOptions.outDir = "./dist-test";
      compilerOptions.noEmit = true;
      compilerOptions.types = ["node", "vitest/globals"];
      break;

    case "vue-test":
      compilerOptions.rootDir = "./src";
      compilerOptions.outDir = "./dist";
      compilerOptions.noEmit = true;
      compilerOptions.types = ["vite/client", "vitest/globals"];
      break;
  }

  if (useDecorators) {
    compilerOptions.experimentalDecorators = true;
    compilerOptions.emitDecoratorMetadata = true;
  }

  const include = isVue
    ? isTest
      ? ["src/**/*.ts", "src/**/*.vue", "tests/**/*.ts"]
      : ["src/**/*.ts", "src/**/*.vue"]
    : isTest
      ? ["src/**/*.ts", "tests/**/*.ts"]
      : ["src/**/*.ts"];

  const exclude = ["node_modules", "dist"];
  if (!isVue && !isTest) {
    exclude.push("**/*.test.ts", "**/*.spec.ts");
  }

  return {
    $schema: "https://json.schemastore.org/tsconfig",
    extends: base,
    compilerOptions,
    include,
    exclude,
  };
}

async function main() {
  console.log("@blacklizard/tsconfig — project tsconfig generator");
  console.log("──────────────────────────────────────────────────");

  const projectType = await selectProjectType();
  console.log(`\n  Selected: ${projectType.label}`);

  const useDecorators = await askYesNo(
    "\nUse reflect-metadata, class-transformer, TypeORM, NestJS, or similar decorator packages?"
  );

  if (useDecorators) {
    console.log(
      "  Note: experimentalDecorators + emitDecoratorMetadata will be added.\n" +
      "  These use TypeScript's legacy decorator mode, not TC39 stage 3 decorators.\n" +
      "  Required by: reflect-metadata, class-transformer, TypeORM, inversify, NestJS."
    );
  }

  const rawFile = (await ask("\nOutput filename [tsconfig.json]: ")).trim();
  const outputFile = rawFile || "tsconfig.json";

  let shouldWrite = true;
  if (existsSync(outputFile)) {
    shouldWrite = await askYesNo(`\n${outputFile} already exists. Overwrite?`);
  }

  rl.close();

  if (!shouldWrite) {
    console.log("\nAborted. No file written.");
    process.exit(0);
  }

  const config = buildConfig(projectType.id, useDecorators);
  const content = JSON.stringify(config, null, 2) + "\n";

  writeFileSync(resolve(outputFile), content, "utf8");

  console.log(`\nWrote: ${outputFile}`);
  console.log(`Preset: ${projectType.label}`);

  if (useDecorators) {
    console.log(
      "\nDecorator setup:\n" +
      "  1. Install reflect-metadata\n" +
      "  2. Add to your entry point: import \"reflect-metadata\";\n" +
      "  3. tsconfig-level: experimentalDecorators + emitDecoratorMetadata are set."
    );
  }

  const isTest = projectType.id.endsWith("-test");
  const isVue = projectType.id.startsWith("vue-");

  if (!isTest) {
    const testPreset = isVue ? "Vue test config (vitest)" : "Node.js test config (vitest)";
    console.log(`\nTip: run again and choose "${testPreset}" to generate tsconfig.test.json.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
