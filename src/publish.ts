import { runCommand } from "./command";

export interface PublishOptions {
  dir: string;
  dryRun: boolean;
}

export type Commander = (args: string[], cwd: string) => Promise<void>;

export async function publish(
  { dir, dryRun }: PublishOptions,
  cmd: Commander = defaultCmd
): Promise<void> {
  const args = ["publish", ...(dryRun ? ["--dry-run"] : [])];
  await cmd(args, dir);
}

const defaultCmd: Commander = async (args, cwd) => {
  const result = await runCommand("npm", args, cwd);
  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr.trim() || `npm publish failed with exit code ${result.exitCode}`
    );
  }
};
