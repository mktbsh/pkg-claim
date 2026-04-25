import { HELP, parseCliArgs } from "./args.ts";

const VERSION = "1.1.0";

interface Writer {
  write(chunk: string): void;
}

export interface AppDeps {
  stdout?: Writer;
  stderr?: Writer;
  stdinIsTTY?: boolean;
}

function writeUsageError(stderr: Writer, message: string): number {
  stderr.write(`Error: ${message}\n`);
  stderr.write("Run pkg-claim --help for usage.\n");
  return 1;
}

export async function runPkgClaim(argv: string[], deps: AppDeps = {}): Promise<number> {
  const resolvedDeps = {
    stdout: deps.stdout ?? process.stdout,
    stderr: deps.stderr ?? process.stderr,
    stdinIsTTY: deps.stdinIsTTY ?? (process.stdin.isTTY === true),
  };

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

  return 0;
}
