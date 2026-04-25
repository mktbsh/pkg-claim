import { runInteractiveCommand } from "./command";

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
  const exitCode = await runInteractiveCommand("npm", args, cwd);
  if (exitCode !== 0) {
    throw new Error(`npm publish failed with exit code ${exitCode}`);
  }
};
