#!/usr/bin/env node
import {
  cancel,
  confirm,
  intro,
  isCancel,
  outro,
  spinner,
  text,
} from "@clack/prompts";
import { ensureCommandAvailable, readCommandText } from "./command.ts";
import { publish } from "./publish.ts";
import { checkAvailability } from "./registry.ts";
import { createTempPackage, removeTempPackage } from "./scaffold.ts";

const dryRun = process.argv.includes("--dry-run");

async function getGitConfig(key: string): Promise<string> {
  try {
    return await readCommandText("git", ["config", key]);
  } catch {
    return "";
  }
}

function errorLog(message: string): void {
  console.error(`Error: ${message}`);
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
  try {
    await ensureCommandAvailable("npm");
  } catch {
    errorLog("npm is not installed or not in PATH");
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
    errorLog((err as Error).message);
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

  const log = (message: string): void => console.log(message);

  log(`\n── Preview ${"─".repeat(30)}`);
  log(`  name:        ${meta.name}`);
  log(`  version:     ${meta.version}`);
  log(`  description: ${meta.description}`);
  log(`  license:     ${meta.license}`);
  log(`  author:      ${meta.author}`);
  log("─".repeat(40) + "\n");

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
    errorLog(`\nPublish failed:\n${(err as Error).message}`);
    process.exit(1);
  } finally {
    if (dir) await removeTempPackage(dir);
  }
}

main();
