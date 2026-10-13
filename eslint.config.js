import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "dist-demo", ".wrangler", "node_modules"] },
  {
    files: ["src/**/*.{ts,tsx}", "functions/**/*.ts", "shared/**/*.ts", "tests/**/*.ts", "realtime/**/*.ts"],
    extends: [tseslint.configs.base],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": [
        "error",
        // node:test registers a test when test() is called and the runner awaits it
        {
          allowForKnownSafeCalls: [
            { from: "package", package: "node:test", name: ["test", "before", "after"] },
          ],
        },
      ],
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true, varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
    },
  },
);
