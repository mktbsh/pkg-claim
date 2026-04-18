import { test, expect, afterAll } from "bun:test";
import { checkAvailability } from "../src/registry";

const originalFetch = globalThis.fetch;

afterAll(() => {
  globalThis.fetch = originalFetch;
});

test("returns true when package name is available (404)", async () => {
  globalThis.fetch = async () => new Response(null, { status: 404 });
  expect(await checkAvailability("my-new-package")).toBe(true);
});

test("returns false when package name is taken (200)", async () => {
  globalThis.fetch = async () => new Response("{}", { status: 200 });
  expect(await checkAvailability("react")).toBe(false);
});

test("throws on unexpected status (500)", async () => {
  globalThis.fetch = async () =>
    new Response(null, { status: 500, statusText: "Internal Server Error" });
  await expect(checkAvailability("any-package")).rejects.toThrow(
    "Registry check failed: 500 Internal Server Error"
  );
});

test("throws on network error", async () => {
  globalThis.fetch = async () => {
    throw new Error("fetch failed");
  };
  await expect(checkAvailability("any-package")).rejects.toThrow("fetch failed");
});

test("encodes scoped package name correctly", async () => {
  let capturedUrl = "";
  globalThis.fetch = async (url: string | URL | Request) => {
    capturedUrl = url.toString();
    return new Response(null, { status: 404 });
  };
  await checkAvailability("@myorg/mypackage");
  expect(capturedUrl).toBe("https://registry.npmjs.org/@myorg%2Fmypackage");
});
