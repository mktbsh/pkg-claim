import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    "pkg-claim": "./src/cli.ts",
  },
  format: ["esm"],
  target: "node24",
  fixedExtension: false,
  outDir: "bin",
  minify: true,
});
