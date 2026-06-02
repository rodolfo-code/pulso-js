import path from "node:path";
import { fileURLToPath } from "node:url";

import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import boundariesPlugin from "eslint-plugin-boundaries";
import importPlugin from "eslint-plugin-import";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "src/generated/**",
      "**/*.config.{ts,js,mjs}",
      "prisma/migrations/**"
    ]
  },
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
        ecmaVersion: 2022,
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      boundaries: boundariesPlugin,
      import: importPlugin
    },
    settings: {
      "boundaries/elements": [
        { type: "domain",         pattern: "src/modules/*/domain" },
        { type: "application",    pattern: "src/modules/*/application" },
        { type: "infrastructure", pattern: "src/modules/*/infrastructure" },
        { type: "presentation",   pattern: "src/modules/*/presentation" },
        { type: "shared",         pattern: "src/shared" },
        { type: "root",           pattern: "src/(main|app.module).ts", mode: "file" }
      ],
      "boundaries/include": ["src/**/*"]
    },
    rules: {
      "boundaries/element-types": ["error", {
        default: "disallow",
        rules: [
          { from: "domain",         allow: ["domain", "shared"] },
          { from: "application",    allow: ["application", "domain", "shared"] },
          { from: "infrastructure", allow: ["infrastructure", "application", "domain", "shared"] },
          { from: "presentation",   allow: ["presentation", "application", "domain", "shared"] },
          { from: "shared",         allow: ["shared"] },
          { from: "root",           allow: ["domain", "application", "infrastructure", "presentation", "shared", "root"] }
        ]
      }],
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "default",  format: ["camelCase"], leadingUnderscore: "allow" },
        { selector: "variable", format: ["camelCase", "UPPER_CASE", "PascalCase"], leadingUnderscore: "allow" },
        { selector: "function", format: ["camelCase"] },
        { selector: "typeLike", format: ["PascalCase"] },
        { selector: "enumMember", format: ["PascalCase"] },
        { selector: "import", format: null },
        { selector: "objectLiteralProperty", format: null }
      ],
      "import/order": ["error", {
        groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
        "newlines-between": "always",
        pathGroups: [{ pattern: "@/**", group: "internal" }],
        alphabetize: { order: "asc", caseInsensitive: true }
      }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }]
    }
  },
  {
    files: ["test/**/*.ts"],
    rules: {
      "boundaries/element-types": "off"
    }
  }
];