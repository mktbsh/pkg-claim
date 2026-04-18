import { spawn } from "node:child_process";

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type CommandExecutor = (
  command: string,
  args: string[],
  cwd?: string
) => Promise<CommandResult>;

export async function runCommand(
  command: string,
  args: string[],
  cwd?: string,
  executor: CommandExecutor = defaultExecutor
): Promise<CommandResult> {
  return executor(command, args, cwd);
}

export async function readCommandText(
  command: string,
  args: string[],
  executor: CommandExecutor = defaultExecutor
): Promise<string> {
  const result = await executor(command, args);

  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr.trim() || `${command} exited with code ${result.exitCode}`
    );
  }

  return result.stdout.trim();
}

export async function ensureCommandAvailable(
  command: string,
  executor: CommandExecutor = defaultExecutor
): Promise<void> {
  const result = await executor(command, ["--version"]);

  if (result.exitCode !== 0) {
    throw new Error(`${command} is not installed or not in PATH`);
  }
}

const defaultExecutor: CommandExecutor = async (command, args, cwd) =>
  await new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
