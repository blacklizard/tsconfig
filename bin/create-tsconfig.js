#!/usr/bin/env node

import { select, input, confirm } from "@inquirer/prompts";
import { fileSelector } from "inquirer-file-selector";
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const PROJECT_TYPES = [
  { label: "Express / Node.js application",  id: "node-app"  },
  { label: "Node.js package / library",       id: "node-lib"  },
  { label: "Vue 3 application (Vite)",        id: "vue-app"   },
  { label: "Vue 3 component library",         id: "vue-lib"   },
  { label: "Node.js test config (vitest)",    id: "node-test" },
  { label: "Vue test config (vitest)",        id: "vue-test"  },
];

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
      compilerOptions.noEmit = false;
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

  const projectTypeId = await select({
    message: "Project type:",
    choices: PROJECT_TYPES.map((t) => ({ name: t.label, value: t.id })),
  });

  const useDecorators = await confirm({
    message: "Use reflect-metadata, class-transformer, TypeORM, NestJS, or similar decorator packages?",
    default: true,
  });

  if (useDecorators) {
    console.log(
      "  Note: experimentalDecorators + emitDecoratorMetadata will be added.\n" +
      "  These use TypeScript's legacy decorator mode, not TC39 stage 3 decorators.\n" +
      "  Required by: reflect-metadata, class-transformer, TypeORM, inversify, NestJS."
    );
  }

  const selected = await fileSelector({
    message: "Select project root directory:",
    type: "directory",
    basePath: "./",
  });

  const projectDir = selected.path;

  const filename = await input({
    message: "Output filename:",
    default: "tsconfig.json",
  });

  const outputFile = join(projectDir, filename);

  if (existsSync(outputFile)) {
    const overwrite = await confirm({
      message: `${outputFile} already exists. Overwrite?`,
      default: false,
    });
    if (!overwrite) {
      console.log("\nExiting. No file written.");
      process.exit(0);
    }
  }

  const config = buildConfig(projectTypeId, useDecorators);
  const content = JSON.stringify(config, null, 2) + "\n";

  writeFileSync(outputFile, content, "utf8");

  console.log(`\nWrote: ${outputFile}`);
  console.log(`Preset: ${PROJECT_TYPES.find((t) => t.id === projectTypeId).label}`);

  if (useDecorators) {
    console.log(
      "\nDecorator setup:\n" +
      "  1. Install reflect-metadata\n" +
      "  2. Add to your entry point: import \"reflect-metadata\";\n" +
      "  3. tsconfig-level: experimentalDecorators + emitDecoratorMetadata are set."
    );
  }

  const isTest = projectTypeId.endsWith("-test");
  const isVue = projectTypeId.startsWith("vue-");

  if (!isTest) {
    const testPreset = isVue ? "Vue test config (vitest)" : "Node.js test config (vitest)";
    console.log(`\nTip: run again and choose "${testPreset}" to generate tsconfig.test.json.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
