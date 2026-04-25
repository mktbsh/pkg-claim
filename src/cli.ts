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
import { createTempPackage, removeTempPackage, type PackageMeta } from "./scaffold.ts";
import { parseCliArgs, validatePackageName, HELP } from "./args.ts";

const VERSION = "1.1.0";

function fatal(message: string): never {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}

async function getGitConfig(key: string): Promise<string> {
  try {
    return await readCommandText("git", ["config", key]);
  } catch {
    return "";
  }
}

async function checkNpmInstalled(): Promise<void> {
  try {
    await ensureCommandAvailable("npm");
  } catch {
    fatal("npm is not installed or not in PATH");
  }
}

function printPreview(meta: PackageMeta, isInteractive: boolean): void {
  const out = isInteractive ? process.stdout : process.stderr;
  out.write(`\n── Preview ${"─".repeat(30)}\n`);
  out.write(`  name:        ${meta.name}\n`);
  out.write(`  version:     ${meta.version}\n`);
  out.write(`  description: ${meta.description}\n`);
  out.write(`  license:     ${meta.license}\n`);
  out.write(`  author:      ${meta.author}\n`);
  out.write(`${"─".repeat(40)}\n\n`);
}

async function main() {
  let args;
  try {
    args = parseCliArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`Error: ${(err as Error).message}\n`);
    process.stderr.write("Run pkg-claim --help for usage.\n");
    process.exit(1);
  }

  if (args.help) {
    process.stdout.write(HELP);
    process.exit(0);
  }

  if (args.version) {
    process.stdout.write(`${VERSION}\n`);
    process.exit(0);
  }

  const isInteractive = process.stdin.isTTY === true && !args.noInput;

  if (!isInteractive && !args.name) {
    process.stderr.write("Error: --name is required in non-interactive mode.\n");
    process.stderr.write("Run pkg-claim --help for usage.\n");
    process.exit(1);
  }

  await checkNpmInstalled();

  if (isInteractive) {
    intro("pkg-claim — reserve an npm package name");
  }

  // --- Package name ---
  let name: string;
  if (args.name) {
    const err = validatePackageName(args.name);
    if (err) fatal(err);
    name = args.name;
  } else {
    const input = await text({
      message: "Package name",
      placeholder: "my-package or @scope/my-package",
      validate: validatePackageName,
    });
    if (isCancel(input)) {
      cancel("Cancelled");
      process.exit(0);
    }
    name = input as string;
  }

  // --- Availability check ---
  const s = spinner();
  s.start("Checking availability...");
  const available = await checkAvailability(name).catch((err: Error) => {
    s.stop("Failed to check availability");
    fatal(err.message);
  });
  if (!available) {
    s.stop(`✗ ${name} is already taken`);
    process.exit(1);
  }
  s.stop(`✓ ${name} is available`);

  // --- Description ---
  let description: string;
  if (args.description !== undefined) {
    description = args.description;
  } else if (isInteractive) {
    const input = await text({ message: "Description", placeholder: "" });
    if (isCancel(input)) {
      cancel("Cancelled");
      process.exit(0);
    }
    description = input as string;
  } else {
    description = "";
  }

  // --- License ---
  let license: string;
  if (args.license !== undefined) {
    license = args.license;
  } else if (isInteractive) {
    const input = await text({ message: "License", initialValue: "MIT" });
    if (isCancel(input)) {
      cancel("Cancelled");
      process.exit(0);
    }
    license = input as string;
  } else {
    license = "MIT";
  }

  // --- Author ---
  const gitName = await getGitConfig("user.name");
  const gitEmail = await getGitConfig("user.email");
  const defaultAuthor = gitName && gitEmail ? `${gitName} <${gitEmail}>` : gitName;
  let author: string;
  if (args.author !== undefined) {
    author = args.author;
  } else if (isInteractive) {
    const input = await text({ message: "Author", initialValue: defaultAuthor });
    if (isCancel(input)) {
      cancel("Cancelled");
      process.exit(0);
    }
    author = input as string;
  } else {
    author = defaultAuthor;
  }

  const meta: PackageMeta = { name, version: "0.0.1", description, license, author };

  printPreview(meta, isInteractive);

  if (args.dryRun) {
    if (isInteractive) {
      outro("Dry-run: skipping publish");
    } else {
      process.stderr.write("Dry-run: skipping publish\n");
    }
    process.exit(0);
  }

  // --- Confirm ---
  if (!args.yes) {
    if (isInteractive) {
      const confirmed = await confirm({ message: "Publish?" });
      if (isCancel(confirmed) || !confirmed) {
        cancel("Cancelled");
        process.exit(0);
      }
    } else {
      fatal("Pass --yes to confirm publishing, or --dry-run to preview.");
    }
  }

  let dir: string | undefined;
  try {
    dir = await createTempPackage(meta);
    await publish({ dir, dryRun: false });
    if (isInteractive) {
      outro(`Published ${meta.name}@${meta.version}`);
    } else {
      process.stdout.write(`${meta.name}@${meta.version}\n`);
    }
  } catch (err) {
    fatal(`Publish failed: ${(err as Error).message}`);
  } finally {
    if (dir) await removeTempPackage(dir);
  }
}

main();
