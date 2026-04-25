import { expect, test } from "bun:test";
import { HELP } from "../src/args";
import { runPkgClaim, type AppDeps } from "../src/app";

function quietSpinner() {
  return {
    start() {},
    stop() {},
  };
}

function createTestDeps() {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    deps: {
      stdout: {
        write(chunk: string) {
          stdout.push(chunk);
        },
      },
      stderr: {
        write(chunk: string) {
          stderr.push(chunk);
        },
      },
      stdinIsTTY: false,
      readCommandText: async () => "",
    },
    getStdout() {
      return stdout.join("");
    },
    getStderr() {
      return stderr.join("");
    },
  };
}

test("runPkgClaim prints help to stdout and returns 0", async () => {
  const { deps, getStdout, getStderr } = createTestDeps();

  await expect(runPkgClaim(["--help"], deps)).resolves.toBe(0);
  expect(getStdout()).toBe(HELP);
  expect(getStderr()).toBe("");
});

test("runPkgClaim requires --name in non-interactive mode", async () => {
  const { deps, getStdout, getStderr } = createTestDeps();

  await expect(runPkgClaim(["--no-input"], deps)).resolves.toBe(1);
  expect(getStdout()).toBe("");
  expect(getStderr()).toBe(
    "Error: --name is required in non-interactive mode.\nRun pkg-claim --help for usage.\n"
  );
});

test("runPkgClaim performs the non-interactive publish flow for a valid invocation", async () => {
  const { deps: baseDeps, getStdout, getStderr } = createTestDeps();
  const calls = {
    ensuredCommands: [] as string[],
    readCommands: [] as Array<{ command: string; args: string[] }>,
    registryChecks: [] as string[],
    tempPackages: [] as Array<{
      name: string;
      version: string;
      description: string;
      license: string;
      author: string;
    }>,
    published: [] as Array<{ dir: string; dryRun: boolean }>,
    removedDirs: [] as string[],
  };

  const deps = {
    ...baseDeps,
    ensureCommandAvailable: async (command: string) => {
      calls.ensuredCommands.push(command);
    },
    readCommandText: async (command: string, args: string[]) => {
      calls.readCommands.push({ command, args });
      const key = args.at(-1) ?? "";
      if (command === "npm" && key === "whoami") return "alice";
      if (key === "user.name") return "Alice";
      if (key === "user.email") return "alice@example.com";
      return "";
    },
    checkAvailability: async (name: string) => {
      calls.registryChecks.push(name);
      return true;
    },
    spinner: quietSpinner,
    createTempPackage: async (meta) => {
      calls.tempPackages.push(meta);
      return "stub-dir";
    },
    publish: async (options) => {
      calls.published.push(options);
    },
    removeTempPackage: async (dir: string) => {
      calls.removedDirs.push(dir);
    },
  } satisfies AppDeps;

  await expect(
    runPkgClaim(
      ["--no-input", "--name", "my-pkg", "--yes", "--confirm-name", "my-pkg"],
      deps
    )
  ).resolves.toBe(0);
  expect(calls.ensuredCommands).toEqual(["npm"]);
  expect(calls.registryChecks).toEqual(["my-pkg"]);
  expect(calls.readCommands).toEqual([
    { command: "npm", args: ["whoami"] },
    { command: "git", args: ["config", "user.name"] },
    { command: "git", args: ["config", "user.email"] },
  ]);
  expect(calls.tempPackages).toEqual([
    {
      name: "my-pkg",
      version: "0.0.1",
      description: "",
      license: "MIT",
      author: "Alice <alice@example.com>",
    },
  ]);
  expect(calls.published).toEqual([{ dir: "stub-dir", dryRun: false }]);
  expect(calls.removedDirs).toEqual(["stub-dir"]);
  expect(getStdout()).toBe("my-pkg@0.0.1\n");
  expect(getStderr()).toContain("name:        my-pkg");
});

test("runPkgClaim rejects non-interactive publish without --confirm-name", async () => {
  const { deps: baseDeps, getStdout, getStderr } = createTestDeps();
  const calls = {
    created: 0,
    published: 0,
  };

  const deps = {
    ...baseDeps,
    ensureCommandAvailable: async () => {},
    readCommandText: async (command: string, args: string[]) => {
      if (command === "npm" && args[0] === "whoami") return "alice";
      return "";
    },
    checkAvailability: async () => true,
    spinner: quietSpinner,
    createTempPackage: async () => {
      calls.created += 1;
      return "stub-dir";
    },
    publish: async () => {
      calls.published += 1;
    },
  } satisfies AppDeps;

  await expect(runPkgClaim(["--no-input", "--name", "my-pkg", "--yes"], deps)).resolves.toBe(1);
  expect(calls.created).toBe(0);
  expect(calls.published).toBe(0);
  expect(getStdout()).toBe("");
  expect(getStderr()).toContain(
    "Error: --confirm-name <package-name> is required when publishing with --no-input.\n"
  );
});

test("runPkgClaim rejects non-interactive publish with mismatched --confirm-name", async () => {
  const { deps: baseDeps, getStdout, getStderr } = createTestDeps();
  const calls = {
    created: 0,
    published: 0,
  };

  const deps = {
    ...baseDeps,
    ensureCommandAvailable: async () => {},
    readCommandText: async (command: string, args: string[]) => {
      if (command === "npm" && args[0] === "whoami") return "alice";
      return "";
    },
    checkAvailability: async () => true,
    spinner: quietSpinner,
    createTempPackage: async () => {
      calls.created += 1;
      return "stub-dir";
    },
    publish: async () => {
      calls.published += 1;
    },
  } satisfies AppDeps;

  await expect(
    runPkgClaim(
      ["--no-input", "--name", "my-pkg", "--yes", "--confirm-name", "other-pkg"],
      deps
    )
  ).resolves.toBe(1);
  expect(calls.created).toBe(0);
  expect(calls.published).toBe(0);
  expect(getStdout()).toBe("");
  expect(getStderr()).toContain("Error: --name and --confirm-name must match exactly.\n");
});

test("runPkgClaim keeps dry-run working without --confirm-name", async () => {
  const { deps: baseDeps, getStdout, getStderr } = createTestDeps();
  const calls = {
    readCommands: [] as Array<{ command: string; args: string[] }>,
    created: 0,
    published: 0,
  };

  const deps = {
    ...baseDeps,
    ensureCommandAvailable: async () => {},
    readCommandText: async (command: string, args: string[]) => {
      calls.readCommands.push({ command, args });
      return "";
    },
    checkAvailability: async () => true,
    spinner: quietSpinner,
    createTempPackage: async () => {
      calls.created += 1;
      return "stub-dir";
    },
    publish: async () => {
      calls.published += 1;
    },
  } satisfies AppDeps;

  await expect(runPkgClaim(["--no-input", "--name", "my-pkg", "--dry-run"], deps)).resolves.toBe(0);
  expect(calls.readCommands).toEqual([
    { command: "git", args: ["config", "user.name"] },
    { command: "git", args: ["config", "user.email"] },
  ]);
  expect(calls.created).toBe(0);
  expect(calls.published).toBe(0);
  expect(getStdout()).toBe("");
  expect(getStderr()).toContain("Dry-run: skipping publish\n");
});

test("runPkgClaim surfaces the npm identity preflight error before publish", async () => {
  const { deps: baseDeps, getStdout, getStderr } = createTestDeps();
  const calls = {
    created: 0,
    published: 0,
  };

  const deps = {
    ...baseDeps,
    ensureCommandAvailable: async () => {},
    readCommandText: async (command: string, args: string[]) => {
      if (command === "npm" && args[0] === "whoami") {
        throw new Error("whoami: not logged in");
      }
      return "";
    },
    checkAvailability: async () => true,
    spinner: quietSpinner,
    createTempPackage: async () => {
      calls.created += 1;
      return "stub-dir";
    },
    publish: async () => {
      calls.published += 1;
    },
  } satisfies AppDeps;

  await expect(
    runPkgClaim(
      ["--no-input", "--name", "my-pkg", "--yes", "--confirm-name", "my-pkg"],
      deps
    )
  ).resolves.toBe(1);
  expect(calls.created).toBe(0);
  expect(calls.published).toBe(0);
  expect(getStdout()).toBe("");
  expect(getStderr()).toBe(
    "Error: Could not confirm the active npm account. Run npm login and try again.\n"
  );
});

test("runPkgClaim cancels interactive publish when typed package name does not match", async () => {
  const { deps: baseDeps, getStdout, getStderr } = createTestDeps();
  const calls = {
    created: 0,
    published: 0,
    cancelled: [] as string[],
  };
  const cancelToken = Symbol("cancel");

  const deps = {
    ...baseDeps,
    stdinIsTTY: true,
    ensureCommandAvailable: async () => {},
    readCommandText: async (command: string, args: string[]) => {
      if (command === "npm" && args[0] === "whoami") return "alice";
      return "";
    },
    checkAvailability: async () => true,
    spinner: quietSpinner,
    intro() {},
    outro() {},
    cancel(message?: string) {
      calls.cancelled.push(message ?? "");
    },
    text: async ({ message }) => {
      if (message === "Type the package name to confirm publish") {
        return "other-pkg";
      }
      return cancelToken;
    },
    isCancel(value: unknown) {
      return value === cancelToken;
    },
    createTempPackage: async () => {
      calls.created += 1;
      return "stub-dir";
    },
    publish: async () => {
      calls.published += 1;
    },
  } satisfies AppDeps;

  await expect(
    runPkgClaim(
      [
        "--name",
        "my-pkg",
        "--description",
        "My package",
        "--license",
        "MIT",
        "--author",
        "Alice",
        "--yes",
      ],
      deps
    )
  ).resolves.toBe(0);
  expect(calls.cancelled).toEqual(["Cancelled"]);
  expect(calls.created).toBe(0);
  expect(calls.published).toBe(0);
  expect(getStdout()).toContain("name:        my-pkg");
  expect(getStderr()).toBe("");
});

test("runPkgClaim publishes interactively when typed package name matches", async () => {
  const { deps: baseDeps, getStdout, getStderr } = createTestDeps();
  const calls = {
    created: [] as Array<{
      name: string;
      version: string;
      description: string;
      license: string;
      author: string;
    }>,
    published: [] as Array<{ dir: string; dryRun: boolean }>,
    removed: [] as string[],
    outros: [] as string[],
  };

  const deps = {
    ...baseDeps,
    stdinIsTTY: true,
    ensureCommandAvailable: async () => {},
    readCommandText: async (command: string, args: string[]) => {
      if (command === "npm" && args[0] === "whoami") return "alice";
      return "";
    },
    checkAvailability: async () => true,
    spinner: quietSpinner,
    intro() {},
    outro(message?: string) {
      calls.outros.push(message ?? "");
    },
    cancel() {},
    text: async ({ message }) => {
      if (message === "Type the package name to confirm publish") {
        return "my-pkg";
      }
      return "";
    },
    isCancel(_value: unknown): _value is symbol {
      return false;
    },
    createTempPackage: async (meta) => {
      calls.created.push(meta);
      return "stub-dir";
    },
    publish: async (options) => {
      calls.published.push(options);
    },
    removeTempPackage: async (dir: string) => {
      calls.removed.push(dir);
    },
  } satisfies AppDeps;

  await expect(
    runPkgClaim(
      [
        "--name",
        "my-pkg",
        "--description",
        "My package",
        "--license",
        "MIT",
        "--author",
        "Alice",
        "--yes",
      ],
      deps
    )
  ).resolves.toBe(0);
  expect(calls.created).toEqual([
    {
      name: "my-pkg",
      version: "0.0.1",
      description: "My package",
      license: "MIT",
      author: "Alice",
    },
  ]);
  expect(calls.published).toEqual([{ dir: "stub-dir", dryRun: false }]);
  expect(calls.removed).toEqual(["stub-dir"]);
  expect(calls.outros).toEqual(["Published my-pkg@0.0.1"]);
  expect(getStdout()).toContain("name:        my-pkg");
  expect(getStderr()).toBe("");
});

test("runPkgClaim keeps publish failure surfaced when cleanup also fails", async () => {
  const { deps: baseDeps, getStdout, getStderr } = createTestDeps();
  const calls = {
    removedDirs: [] as string[],
  };

  const deps = {
    ...baseDeps,
    ensureCommandAvailable: async () => {},
    readCommandText: async () => "",
    checkAvailability: async () => true,
    spinner: quietSpinner,
    createTempPackage: async () => "stub-dir",
    publish: async () => {
      throw new Error("publish boom");
    },
    removeTempPackage: async (dir: string) => {
      calls.removedDirs.push(dir);
      throw new Error("cleanup boom");
    },
  } satisfies AppDeps;

  await expect(
    runPkgClaim(
      ["--no-input", "--name", "my-pkg", "--yes", "--confirm-name", "my-pkg"],
      deps
    )
  ).resolves.toBe(1);
  expect(calls.removedDirs).toEqual(["stub-dir"]);
  expect(getStdout()).toBe("");
  expect(getStderr()).toContain("Error: Publish failed: publish boom\n");
  expect(getStderr()).toContain("Warning: Cleanup failed: cleanup boom\n");
});

test("runPkgClaim keeps successful publish result when cleanup also fails", async () => {
  const { deps: baseDeps, getStdout, getStderr } = createTestDeps();
  const calls = {
    removedDirs: [] as string[],
  };

  const deps = {
    ...baseDeps,
    ensureCommandAvailable: async () => {},
    readCommandText: async () => "",
    checkAvailability: async () => true,
    spinner: quietSpinner,
    createTempPackage: async () => "stub-dir",
    publish: async () => {},
    removeTempPackage: async (dir: string) => {
      calls.removedDirs.push(dir);
      throw new Error("cleanup boom");
    },
  } satisfies AppDeps;

  await expect(
    runPkgClaim(
      ["--no-input", "--name", "my-pkg", "--yes", "--confirm-name", "my-pkg"],
      deps
    )
  ).resolves.toBe(0);
  expect(calls.removedDirs).toEqual(["stub-dir"]);
  expect(getStdout()).toBe("my-pkg@0.0.1\n");
  expect(getStderr()).toContain("name:        my-pkg");
  expect(getStderr()).toContain("Warning: Cleanup failed: cleanup boom\n");
});
