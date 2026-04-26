import type { CommandExecutor } from "./command";
import { readCommandText } from "./command";

export async function getNpmIdentity(executor?: CommandExecutor): Promise<string> {
  try {
    return await readCommandText("npm", ["whoami"], executor);
  } catch (e) {
    throw new Error(
      "Could not confirm the active npm account. Run npm login and try again."
    );
  }
}

export function requireNonInteractivePublishConfirmation(options: {
  name: string;
  confirmName?: string;
  dryRun?: boolean;
  noInput?: boolean;
  isInteractive?: boolean;
}): void {
  const { name, confirmName, dryRun, noInput, isInteractive } = options;

  if (dryRun) return;

  const interactive = isInteractive ?? !noInput;
  if (interactive) return;

  if (!confirmName) {
    throw new Error(
      noInput
        ? "--confirm-name <package-name> is required when publishing with --no-input."
        : "--confirm-name <package-name> is required in non-interactive mode."
    );
  }

  if (name !== confirmName) {
    throw new Error("--name and --confirm-name must match exactly.");
  }
}
