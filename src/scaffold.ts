import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface PackageMeta {
  name: string;
  version: string;
  description: string;
  license: string;
  author: string;
}

export async function createTempPackage(meta: PackageMeta): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "pkg-claim-"));

  await writeFile(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: meta.name,
        version: meta.version,
        description: meta.description,
        license: meta.license,
        author: meta.author,
        type: "module",
        exports: "./index.js",
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  await writeFile(join(dir, "index.js"), "export {};\n", "utf8");

  return dir;
}

export async function removeTempPackage(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}
