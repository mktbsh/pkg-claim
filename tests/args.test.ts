import { test, expect } from "bun:test";
import { parseCliArgs, validatePackageName, HELP } from "../src/args";

// --- parseCliArgs ---

test("defaults: all booleans false, strings undefined", () => {
  const args = parseCliArgs([]);
  expect(args).toEqual({
    name: undefined,
    description: undefined,
    license: undefined,
    author: undefined,
    confirmName: undefined,
    dryRun: false,
    yes: false,
    noInput: false,
    version: false,
    help: false,
  });
});

test("--name sets name", () => {
  expect(parseCliArgs(["--name", "my-pkg"]).name).toBe("my-pkg");
});

test("--description sets description", () => {
  expect(parseCliArgs(["--description", "A cool pkg"]).description).toBe("A cool pkg");
});

test("--license sets license", () => {
  expect(parseCliArgs(["--license", "Apache-2.0"]).license).toBe("Apache-2.0");
});

test("--author sets author", () => {
  expect(parseCliArgs(["--author", "Alice"]).author).toBe("Alice");
});

test("--dry-run sets dryRun", () => {
  expect(parseCliArgs(["--dry-run"]).dryRun).toBe(true);
});

test("-n sets dryRun (short flag)", () => {
  expect(parseCliArgs(["-n"]).dryRun).toBe(true);
});

test("--yes sets yes", () => {
  expect(parseCliArgs(["--yes"]).yes).toBe(true);
});

test("-y sets yes (short flag)", () => {
  expect(parseCliArgs(["-y"]).yes).toBe(true);
});

test("--no-input sets noInput", () => {
  expect(parseCliArgs(["--no-input"]).noInput).toBe(true);
});

test("--version sets version", () => {
  expect(parseCliArgs(["--version"]).version).toBe(true);
});

test("-v sets version (short flag)", () => {
  expect(parseCliArgs(["-v"]).version).toBe(true);
});

test("--help sets help", () => {
  expect(parseCliArgs(["--help"]).help).toBe(true);
});

test("-h sets help (short flag)", () => {
  expect(parseCliArgs(["-h"]).help).toBe(true);
});

test("throws on unknown flag", () => {
  expect(() => parseCliArgs(["--unknown"])).toThrow();
});

test("--confirm-name sets confirmName", () => {
  expect(parseCliArgs(["--confirm-name", "my-pkg"]).confirmName).toBe("my-pkg");
});

test("HELP contains --confirm-name <name>", () => {
  expect(HELP).toContain("--confirm-name <name>");
});

// --- validatePackageName ---

test("returns undefined for valid simple name", () => {
  expect(validatePackageName("my-package")).toBeUndefined();
  expect(validatePackageName("abc")).toBeUndefined();
  expect(validatePackageName("a1b2c3")).toBeUndefined();
  expect(validatePackageName("pkg.utils")).toBeUndefined();
});

test("returns undefined for valid scoped name", () => {
  expect(validatePackageName("@scope/pkg")).toBeUndefined();
  expect(validatePackageName("@my-org/my-pkg")).toBeUndefined();
});

test("returns error for empty name", () => {
  expect(validatePackageName("")).toBe("Name is required");
  expect(validatePackageName("   ")).toBe("Name is required");
});

test("returns error for uppercase in name", () => {
  expect(validatePackageName("MyPackage")).toBeTruthy();
});

test("returns error for invalid scoped name (missing slash)", () => {
  expect(validatePackageName("@scope")).toBeTruthy();
});

test("returns error for invalid scoped name (uppercase scope)", () => {
  expect(validatePackageName("@Scope/pkg")).toBeTruthy();
});
