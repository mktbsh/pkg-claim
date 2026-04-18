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
  const result = await Bun.$`npm ${args}`.cwd(cwd).nothrow();
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString());
  }
};
