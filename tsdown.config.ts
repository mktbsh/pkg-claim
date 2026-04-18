import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    "pkg-claim": "./src/cli.ts",
  },
  format: ["esm"],
  target: "node24",
  outDir: "bin",
  minify: true,
});
