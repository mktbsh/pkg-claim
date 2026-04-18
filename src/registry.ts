function encodePackageName(name: string): string {
  if (name.startsWith("@")) {
    return name.replace("/", "%2F");
  }
  return encodeURIComponent(name);
}

export async function checkAvailability(name: string): Promise<boolean> {
  const encoded = encodePackageName(name);
  const res = await fetch(`https://registry.npmjs.org/${encoded}`);
  if (res.status === 404) return true;
  if (res.ok) return false;
  throw new Error(`Registry check failed: ${res.status} ${res.statusText}`);
}
