import {
  cancel as promptCancel,
  confirm as promptConfirm,
  intro as promptIntro,
  isCancel as promptIsCancel,
  outro as promptOutro,
  spinner as createSpinner,
  text as promptText,
} from "@clack/prompts";
import { HELP, parseCliArgs, validatePackageName } from "./args.ts";
import {
  ensureCommandAvailable,
  readCommandText,
  type CommandExecutor,
} from "./command.ts";
import {
  getNpmIdentity,
  requireNonInteractivePublishConfirmation,
} from "./preflight.ts";
import { publish, type PublishOptions } from "./publish.ts";
import { checkAvailability } from "./registry.ts";
import {
  createTempPackage,
  removeTempPackage,
  type PackageMeta,
} from "./scaffold.ts";

const VERSION = "1.1.0";
const PACKAGE_VERSION = "0.0.1";

interface Writer {
  write(chunk: string): void;
}

interface Spinner {
  start(message: string): void;
  stop(message: string): void;
}

interface ResolvedAppDeps {
  stdout: Writer;
  stderr: Writer;
  stdinIsTTY: boolean;
  ensureCommandAvailable: (command: string) => Promise<void>;
  readCommandText: (command: string, args: string[]) => Promise<string>;
  checkAvailability: (name: string) => Promise<boolean>;
  createTempPackage: (meta: PackageMeta) => Promise<string>;
  removeTempPackage: (dir: string) => Promise<void>;
  publish: (options: PublishOptions) => Promise<void>;
  intro: typeof promptIntro;
  outro: typeof promptOutro;
  cancel: typeof promptCancel;
  text: (options: Parameters<typeof promptText>[0]) => Promise<unknown>;
  confirm: (options: Parameters<typeof promptConfirm>[0]) => Promise<unknown>;
  isCancel: typeof promptIsCancel;
  spinner: () => Spinner;
}

export interface AppDeps {
  stdout?: Writer;
  stderr?: Writer;
  stdinIsTTY?: boolean;
  ensureCommandAvailable?: (command: string) => Promise<void>;
  readCommandText?: (command: string, args: string[]) => Promise<string>;
  checkAvailability?: (name: string) => Promise<boolean>;
  createTempPackage?: (meta: PackageMeta) => Promise<string>;
  removeTempPackage?: (dir: string) => Promise<void>;
  publish?: (options: PublishOptions) => Promise<void>;
  intro?: typeof promptIntro;
  outro?: typeof promptOutro;
  cancel?: typeof promptCancel;
  text?: (options: Parameters<typeof promptText>[0]) => Promise<unknown>;
  confirm?: (options: Parameters<typeof promptConfirm>[0]) => Promise<unknown>;
  isCancel?: typeof promptIsCancel;
  spinner?: () => Spinner;
}

function writeError(stderr: Writer, message: string): number {
  stderr.write(`Error: ${message}\n`);
  return 1;
}

function writeUsageError(stderr: Writer, message: string): number {
  stderr.write(`Error: ${message}\n`);
  stderr.write("Run pkg-claim --help for usage.\n");
  return 1;
}

function resolveDeps(deps: AppDeps): ResolvedAppDeps {
  return {
    stdout: deps.stdout ?? process.stdout,
    stderr: deps.stderr ?? process.stderr,
    stdinIsTTY: deps.stdinIsTTY ?? (process.stdin.isTTY === true),
    ensureCommandAvailable: deps.ensureCommandAvailable ?? ensureCommandAvailable,
    readCommandText: deps.readCommandText ?? readCommandText,
    checkAvailability: deps.checkAvailability ?? checkAvailability,
    createTempPackage: deps.createTempPackage ?? createTempPackage,
    removeTempPackage: deps.removeTempPackage ?? removeTempPackage,
    publish: deps.publish ?? publish,
    intro: deps.intro ?? promptIntro,
    outro: deps.outro ?? promptOutro,
    cancel: deps.cancel ?? promptCancel,
    text: deps.text ?? promptText,
    confirm: deps.confirm ?? promptConfirm,
    isCancel: deps.isCancel ?? promptIsCancel,
    spinner: deps.spinner ?? createSpinner,
  };
}

async function getGitConfig(key: string, deps: ResolvedAppDeps): Promise<string> {
  try {
    return await deps.readCommandText("git", ["config", key]);
  } catch {
    return "";
  }
}

function createReadExecutor(deps: ResolvedAppDeps): CommandExecutor {
  return async (command, args) => {
    try {
      const stdout = await deps.readCommandText(command, args);
      return {
        exitCode: 0,
        stdout,
        stderr: "",
      };
    } catch (err) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: (err as Error).message,
      };
    }
  };
}

function printPreview(meta: PackageMeta, isInteractive: boolean, deps: ResolvedAppDeps): void {
  const out = isInteractive ? deps.stdout : deps.stderr;
  out.write(`\n── Preview ${"─".repeat(30)}\n`);
  out.write(`  name:        ${meta.name}\n`);
  out.write(`  version:     ${meta.version}\n`);
  out.write(`  description: ${meta.description}\n`);
  out.write(`  license:     ${meta.license}\n`);
  out.write(`  author:      ${meta.author}\n`);
  out.write(`${"─".repeat(40)}\n\n`);
}

export async function runPkgClaim(argv: string[], deps: AppDeps = {}): Promise<number> {
  const resolvedDeps = resolveDeps(deps);

  let args;
  try {
    args = parseCliArgs(argv);
  } catch (err) {
    return writeUsageError(resolvedDeps.stderr, (err as Error).message);
  }

  if (args.help) {
    resolvedDeps.stdout.write(HELP);
    return 0;
  }

  if (args.version) {
    resolvedDeps.stdout.write(`${VERSION}\n`);
    return 0;
  }

  const isInteractive = resolvedDeps.stdinIsTTY && !args.noInput;

  if (!isInteractive && !args.name) {
    return writeUsageError(resolvedDeps.stderr, "--name is required in non-interactive mode.");
  }

  try {
    await resolvedDeps.ensureCommandAvailable("npm");
  } catch {
    return writeError(resolvedDeps.stderr, "npm is not installed or not in PATH");
  }

  if (isInteractive) {
    resolvedDeps.intro("pkg-claim — reserve an npm package name");
  }

  let name: string;
  if (args.name) {
    const nameError = validatePackageName(args.name);
    if (nameError) return writeError(resolvedDeps.stderr, nameError);
    name = args.name;
  } else {
    const input = await resolvedDeps.text({
      message: "Package name",
      placeholder: "my-package or @scope/my-package",
      validate: validatePackageName,
    });
    if (resolvedDeps.isCancel(input)) {
      resolvedDeps.cancel("Cancelled");
      return 0;
    }
    name = input as string;
  }

  try {
    requireNonInteractivePublishConfirmation({
      name,
      confirmName: args.confirmName,
      dryRun: args.dryRun,
      noInput: args.noInput,
      isInteractive,
    });
  } catch (err) {
    return writeError(resolvedDeps.stderr, (err as Error).message);
  }

  if (!args.dryRun) {
    try {
      await getNpmIdentity(createReadExecutor(resolvedDeps));
    } catch (err) {
      return writeError(resolvedDeps.stderr, (err as Error).message);
    }
  }

  const availabilitySpinner = resolvedDeps.spinner();
  availabilitySpinner.start("Checking availability...");

  let available: boolean;
  try {
    available = await resolvedDeps.checkAvailability(name);
  } catch (err) {
    availabilitySpinner.stop("Failed to check availability");
    return writeError(resolvedDeps.stderr, (err as Error).message);
  }

  if (!available) {
    availabilitySpinner.stop(`✗ ${name} is already taken`);
    return 1;
  }

  availabilitySpinner.stop(`✓ ${name} is available`);

  let description: string;
  if (args.description !== undefined) {
    description = args.description;
  } else if (isInteractive) {
    const input = await resolvedDeps.text({ message: "Description", placeholder: "" });
    if (resolvedDeps.isCancel(input)) {
      resolvedDeps.cancel("Cancelled");
      return 0;
    }
    description = input as string;
  } else {
    description = "";
  }

  let license: string;
  if (args.license !== undefined) {
    license = args.license;
  } else if (isInteractive) {
    const input = await resolvedDeps.text({ message: "License", initialValue: "MIT" });
    if (resolvedDeps.isCancel(input)) {
      resolvedDeps.cancel("Cancelled");
      return 0;
    }
    license = input as string;
  } else {
    license = "MIT";
  }

  const gitName = await getGitConfig("user.name", resolvedDeps);
  const gitEmail = await getGitConfig("user.email", resolvedDeps);
  const defaultAuthor = gitName && gitEmail ? `${gitName} <${gitEmail}>` : gitName;

  let author: string;
  if (args.author !== undefined) {
    author = args.author;
  } else if (isInteractive) {
    const input = await resolvedDeps.text({ message: "Author", initialValue: defaultAuthor });
    if (resolvedDeps.isCancel(input)) {
      resolvedDeps.cancel("Cancelled");
      return 0;
    }
    author = input as string;
  } else {
    author = defaultAuthor;
  }

  const meta: PackageMeta = {
    name,
    version: PACKAGE_VERSION,
    description,
    license,
    author,
  };

  printPreview(meta, isInteractive, resolvedDeps);

  if (args.dryRun) {
    if (isInteractive) {
      resolvedDeps.outro("Dry-run: skipping publish");
    } else {
      resolvedDeps.stderr.write("Dry-run: skipping publish\n");
    }
    return 0;
  }

  if (!isInteractive && !args.yes) {
    return writeError(
      resolvedDeps.stderr,
      "Pass --yes to confirm publishing, or --dry-run to preview."
    );
  }

  if (isInteractive) {
    if (!args.yes) {
      const confirmed = await resolvedDeps.confirm({ message: "Publish?" });
      if (resolvedDeps.isCancel(confirmed) || !confirmed) {
        resolvedDeps.cancel("Cancelled");
        return 0;
      }
    }

    const confirmedName = await resolvedDeps.text({
      message: "Type the package name to confirm publish",
      placeholder: name,
    });
    if (resolvedDeps.isCancel(confirmedName) || confirmedName !== name) {
      resolvedDeps.cancel("Cancelled");
      return 0;
    }
  }

  let dir: string | undefined;
  let exitCode = 0;
  try {
    dir = await resolvedDeps.createTempPackage(meta);
    await resolvedDeps.publish({ dir, dryRun: false });
    if (isInteractive) {
      resolvedDeps.outro(`Published ${meta.name}@${meta.version}`);
    } else {
      resolvedDeps.stdout.write(`${meta.name}@${meta.version}\n`);
    }
  } catch (err) {
    exitCode = writeError(resolvedDeps.stderr, `Publish failed: ${(err as Error).message}`);
  } finally {
    if (dir) {
      try {
        await resolvedDeps.removeTempPackage(dir);
      } catch (err) {
        resolvedDeps.stderr.write(`Warning: Cleanup failed: ${(err as Error).message}\n`);
      }
    }
  }

  return exitCode;
}
