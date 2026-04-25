import { expect, test } from "bun:test";
import { HELP } from "../src/args";
import { runPkgClaim, type AppDeps } from "../src/app";

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
    registryChecks: [] as string[],
    gitConfigKeys: [] as string[],
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
    readCommandText: async (_command: string, args: string[]) => {
      const key = args.at(-1) ?? "";
      calls.gitConfigKeys.push(key);
      if (key === "user.name") return "Alice";
      if (key === "user.email") return "alice@example.com";
      return "";
    },
    checkAvailability: async (name: string) => {
      calls.registryChecks.push(name);
      return true;
    },
    spinner: () => ({
      start() {},
      stop() {},
    }),
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

  await expect(runPkgClaim(["--no-input", "--name", "my-pkg", "--yes"], deps)).resolves.toBe(0);
  expect(calls.ensuredCommands).toEqual(["npm"]);
  expect(calls.registryChecks).toEqual(["my-pkg"]);
  expect(calls.gitConfigKeys).toEqual(["user.name", "user.email"]);
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
