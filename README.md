# @blacklizard/tsconfig

Production-grade TypeScript 6 tsconfig presets for Node.js 24 and Vue 3 monorepos.

- ESM only. No CommonJS.
- Strict by default. No surprises.
- Aligned with TypeScript 6 defaults and breaking changes.
- Three presets: universal base, Node.js, Vue/Vite.

## Requirements

| Dependency | Version |
|---|---|
| TypeScript | `>=6.0.0` |
| Node.js | `>=24.0.0` |

## Install

```sh
pnpm add -D @blacklizard/tsconfig
```

## CLI

Generate a project-specific `tsconfig.json` interactively:

```sh
pnpm exec create-tsconfig
```

Or without installing:

```sh
pnpm dlx @blacklizard/tsconfig
```

The CLI will ask:
1. **Project type** — Express app, Node library, Vue app, Vue component library, or test config
2. **Decorator packages** — whether you use `reflect-metadata`, `class-transformer`, TypeORM, NestJS, or similar
3. **Output filename** — defaults to `tsconfig.json`

If decorator support is selected, `experimentalDecorators: true` and `emitDecoratorMetadata: true`
are added. See [Decorators](#decorators) below.

## Presets

| File | Extends | Use for |
|---|---|---|
| `tsconfig.base.json` | — | Universal strict options only. Rarely extended directly. |
| `tsconfig.node.json` | `@tsconfig/node24` + `@tsconfig/strictest` + base | Node.js apps, Express, Node libraries |
| `tsconfig.vue.json` | Vue/Vite DOM options + base | Vue 3 apps and component libraries |

---

## Usage

Every project tsconfig must explicitly set `rootDir`, `outDir`, `types`, `include`, and `exclude`.
These are intentionally **not** set in the presets — they are project-specific.

### Express app / Node.js application

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "@blacklizard/tsconfig/tsconfig.node.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["node"],
    "composite": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

### Node.js package / library (with declaration emit)

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "@blacklizard/tsconfig/tsconfig.node.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "types": ["node"],
    "composite": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

### Node.js test config (vitest)

Extend the preset directly — not the project tsconfig — to avoid inheriting `composite: true`,
which conflicts with `noEmit: true`.

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "@blacklizard/tsconfig/tsconfig.node.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "./dist-test",
    "types": ["node", "vitest/globals"],
    "noEmit": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### Vue 3 application (Vite, type-check only)

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "@blacklizard/tsconfig/tsconfig.vue.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "exclude": ["node_modules", "dist"]
}
```

### Vue 3 component library (declaration emit via vue-tsc, JS via Vite)

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "@blacklizard/tsconfig/tsconfig.vue.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "noEmit": false,
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": true,
    "types": []
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "exclude": ["node_modules", "dist"]
}
```

### Vue vitest config

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "@blacklizard/tsconfig/tsconfig.vue.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "noEmit": true,
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "tests/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

## package.json scripts

### Node app / library

```json
{
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest --config vitest.config.ts"
  }
}
```

### Vue app

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -p tsconfig.json --noEmit && vite build",
    "typecheck": "vue-tsc -p tsconfig.json --noEmit",
    "test": "vitest --config vitest.config.ts"
  }
}
```

### Vue component library

```json
{
  "type": "module",
  "scripts": {
    "build": "vite build && vue-tsc -p tsconfig.json --emitDeclarationOnly",
    "typecheck": "vue-tsc -p tsconfig.json --noEmit",
    "test": "vitest --config vitest.config.ts"
  }
}
```

### package.json `exports` for a Node ESM library

```json
{
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      }
    }
  }
}
```

`types` must come before `default` in every condition object.

---

## NodeNext vs Bundler

**`module: "NodeNext"` + `moduleResolution: "NodeNext"`**
Used in `tsconfig.node.json`. For code that Node.js executes directly without a bundler.
TypeScript enforces `.js` extensions in relative imports. Validates `package.json` exports.
Write imports as `import { foo } from "./foo.js"` — TypeScript resolves `foo.js` → `foo.ts`.

**`module: "ESNext"` + `moduleResolution: "Bundler"`**
Used in `tsconfig.vue.json`. For code processed by Vite.
No extension requirements. Bundler handles resolution.
Do not use `Bundler` for raw Node.js code — it will miss missing `.js` extensions.

---

## Why `@tsconfig/node24` and not `@tsconfig/node22`

Node 24 (V8 13.x) natively supports ES2024 features: `Array.prototype.toSorted`,
`Object.groupBy`, `Promise.withResolvers`, `ArrayBuffer.prototype.transfer`.

`@tsconfig/node22` sets `target: "ES2023"` — TypeScript rejects these APIs even though
Node 24 supports them natively. `@tsconfig/node24` sets `target: "ES2024"`, aligning the
TypeScript lib with actual runtime capabilities.

---

## TypeScript 6 notes

**`types` now defaults to `[]`**
All presets set `types` explicitly. Never rely on implicit type inclusion.
Node projects use `["node"]`. Test configs add the runner (e.g. `["node", "vitest/globals"]`).
Vue projects use `[]` in the preset; apps add `["vite/client"]`.

**`rootDir` now defaults to `.`**
Every emitting project must set `rootDir: "./src"` explicitly.
Omitting it causes `dist/src/index.js` nesting instead of `dist/index.js`.

**`moduleResolution: "node"` is deprecated**
These presets use `NodeNext` for Node and `Bundler` for Vue/Vite.
Never use `"node"`, `"node10"`, or `"classic"`.

**`verbatimModuleSyntax: true`**
Enforces `import type` for type-only imports. Catches imports that would silently
disappear at runtime. Set in `tsconfig.base.json`, applies everywhere.

**`noUncheckedSideEffectImports: true`**
Default in TypeScript 6. Set explicitly in base for clarity.

---

## Decorators

For projects using `reflect-metadata`, `class-transformer`, `TypeORM`, `inversify`, or `NestJS`,
add these two options to your project-level `compilerOptions`:

```json
{
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true
}
```

**What these do:**
- `experimentalDecorators` — enables TypeScript's legacy decorator mode (required by the packages above)
- `emitDecoratorMetadata` — emits type metadata at runtime, consumed by `reflect-metadata`

**Important:** these use TypeScript's **legacy** decorator system, not TC39 stage 3 decorators
(the default in TypeScript 5+/6). They are incompatible with TC39 decorators. Do not mix them.

**Required setup in your entry point:**

```ts
import "reflect-metadata"; // must be first import
```

The CLI (`create-tsconfig`) adds these automatically when you answer yes to the decorator question.

---

## What is intentionally NOT in the presets

These are left to the project config:

- `target` — Node 24 and browser have different optimal targets
- `rootDir` / `outDir` — project-specific paths
- `types` — completely different per project (only a safe default is set)
- `composite` / `declaration` — library-only
- `noEmit` / `emitDeclarationOnly` — app vs library
- `paths` — project-specific aliasing
- `resolveJsonModule` — opt-in per project

---

## Common mistakes

**Missing `.js` extension in Node ESM imports**
`import "./utils"` crashes Node at runtime. Use `import "./utils.js"`.
TypeScript with `NodeNext` resolves `utils.js` → `utils.ts` during type-checking.

**`types: ["node"]` in a Vue config**
Leaks `process`, `Buffer`, and Node-flavored globals into browser code.
Use `types: []` in Vue configs and add only what the project needs.

**`composite: true` with `noEmit: true`**
`composite` requires declaration emit; `noEmit` prevents it. They conflict.
Test configs must extend the preset directly, not the build tsconfig.

**`tsc src/index.ts` in scripts**
TypeScript 6 errors when command-line files are passed while a `tsconfig.json` exists.
Always use `tsc -p tsconfig.json`.

**Wrong condition order in `exports`**
`"default"` before `"types"` loses type resolution.
`"types"` must be first in every condition object.

---

## License

[MIT](./LICENSE)
