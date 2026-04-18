#!/usr/bin/env bun
import {
  intro,
  outro,
  text,
  confirm,
  spinner,
  isCancel,
  cancel,
} from "@clack/prompts";
import { checkAvailability } from "./registry.ts";
import { createTempPackage, removeTempPackage } from "./scaffold.ts";
import { publish } from "./publish.ts";

const dryRun = process.argv.includes("--dry-run");

async function getGitConfig(key: string): Promise<string> {
  try {
    return (await Bun.$`git config ${key}`.quiet().text()).trim();
  } catch {
    return "";
  }
}

function validatePackageName(name: string): string | undefined {
  if (!name.trim()) return "Name is required";
  if (name.startsWith("@")) {
    if (!/^@[a-z0-9-][a-z0-9-._]*\/[a-z0-9-][a-z0-9-._]*$/.test(name)) {
      return "Invalid scoped name. Use @scope/name (lowercase, URL-safe)";
    }
    return undefined;
  }
  if (!/^[a-z0-9-][a-z0-9-._]*$/.test(name)) {
    return "Invalid name. Use lowercase, URL-safe characters";
  }
  return undefined;
}

async function checkNpmInstalled(): Promise<void> {
  const result = await Bun.$`npm --version`.quiet().nothrow();
  if (result.exitCode !== 0) {
    console.error("Error: npm is not installed or not in PATH");
    process.exit(1);
  }
}

async function main() {
  await checkNpmInstalled();

  intro("pkg-claim — reserve an npm package name");

  const nameInput = await text({
    message: "Package name",
    placeholder: "my-package or @scope/my-package",
    validate: validatePackageName,
  });
  if (isCancel(nameInput)) {
    cancel("Cancelled");
    process.exit(0);
  }
  const name = nameInput as string;

  const s = spinner();
  s.start("Checking availability...");
  let available: boolean;
  try {
    available = await checkAvailability(name);
  } catch (err) {
    s.stop("Failed to check availability");
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
  if (!available) {
    s.stop(`✗ ${name} is already taken`);
    process.exit(1);
  }
  s.stop(`✓ ${name} is available`);

  const descInput = await text({ message: "Description", placeholder: "" });
  if (isCancel(descInput)) {
    cancel("Cancelled");
    process.exit(0);
  }

  const licenseInput = await text({ message: "License", initialValue: "MIT" });
  if (isCancel(licenseInput)) {
    cancel("Cancelled");
    process.exit(0);
  }

  const gitName = await getGitConfig("user.name");
  const gitEmail = await getGitConfig("user.email");
  const defaultAuthor =
    gitName && gitEmail ? `${gitName} <${gitEmail}>` : gitName;
  const authorInput = await text({
    message: "Author",
    initialValue: defaultAuthor,
  });
  if (isCancel(authorInput)) {
    cancel("Cancelled");
    process.exit(0);
  }

  const meta = {
    name,
    version: "0.0.1",
    description: descInput as string,
    license: licenseInput as string,
    author: authorInput as string,
  };

  console.log("\n── Preview ──────────────────────────────");
  console.log(`  name:        ${meta.name}`);
  console.log(`  version:     ${meta.version}`);
  console.log(`  description: ${meta.description}`);
  console.log(`  license:     ${meta.license}`);
  console.log(`  author:      ${meta.author}`);
  console.log("─────────────────────────────────────────\n");

  if (dryRun) {
    outro("Dry-run: skipping publish");
    process.exit(0);
  }

  const confirmed = await confirm({ message: "Publish?" });
  if (isCancel(confirmed) || !confirmed) {
    cancel("Cancelled");
    process.exit(0);
  }

  let dir: string | undefined;
  try {
    dir = await createTempPackage(meta);
    await publish({ dir, dryRun: false });
    outro(`Published ${meta.name}@${meta.version}`);
  } catch (err) {
    console.error(`\nPublish failed:\n${(err as Error).message}`);
    process.exit(1);
  } finally {
    if (dir) await removeTempPackage(dir);
  }
}

main();
