import { defineConfig, globalIgnores } from "eslint/config";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    globalIgnores(["**/dist/", "**/node_modules/", "**/coverage/", "**/*.js", "**/*.d.ts"]),
    {
        extends: compat.extends("eslint:recommended"),

        plugins: {
            "@typescript-eslint": typescriptEslint,
        },

        languageOptions: {
            globals: {
                ...globals.node,
            },

            parser: tsParser,
            ecmaVersion: "latest",
            sourceType: "module",
        },

        rules: {
            "no-console": "error",
            "prefer-const": "error",
            "no-var": "error",
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": "error",
            "@typescript-eslint/no-explicit-any": "off",

            "no-multiple-empty-lines": ["error", {
                max: 1,
                maxEOF: 0,
                maxBOF: 0,
            }],

            "eol-last": ["error", "always"],
        },
    },
    {
        files: [
            "**/__tests__/**/*",
            "**/*.test.ts",
            "**/*.test.tsx",
            "**/*.spec.ts",
            "**/*.spec.tsx",
            "**/test/**/*",
            "**/tests/**/*",
        ],

        languageOptions: {
            globals: {
                ...globals.node,
                describe: "readonly",
                it: "readonly",
                test: "readonly",
                expect: "readonly",
                beforeAll: "readonly",
                afterAll: "readonly",
                beforeEach: "readonly",
                afterEach: "readonly",
                vi: "readonly",
            },
        },

        rules: {
            "no-console": "off",
        },
    },
]);