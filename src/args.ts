import { parseArgs } from "node:util";

export interface CliArgs {
  name?: string;
  description?: string;
  license?: string;
  author?: string;
  confirmName?: string;
  dryRun: boolean;
  yes: boolean;
  noInput: boolean;
  version: boolean;
  help: boolean;
}

export const HELP = `pkg-claim — reserve an npm package name

USAGE
  pkg-claim [options]

OPTIONS
  --name <name>         Package name (e.g. my-pkg or @scope/pkg)
  --description <text>  Package description
  --license <spdx>      License identifier (default: MIT)
  --author <name>       Author (defaults to git config user)
  --confirm-name <name> Exact package name confirmation for real publish
  -n, --dry-run         Simulate publish without actually publishing
  -y, --yes             Skip the final confirmation prompt
  --no-input            Disable all prompts; real publish requires --name and --confirm-name
  -v, --version         Show version
  -h, --help            Show this help

EXAMPLES
  # Interactive mode
  $ pkg-claim

  # Non-interactive
  $ pkg-claim --no-input --name my-cool-pkg --confirm-name my-cool-pkg --yes

  # Check availability without publishing
  $ pkg-claim --name my-cool-pkg --dry-run
`;

export function parseCliArgs(argv: string[]): CliArgs {
  const { values } = parseArgs({
    args: argv,
    options: {
      name: { type: "string" },
      description: { type: "string" },
      license: { type: "string" },
      author: { type: "string" },
      "confirm-name": { type: "string" },
      "dry-run": { type: "boolean", short: "n" },
      yes: { type: "boolean", short: "y" },
      "no-input": { type: "boolean" },
      version: { type: "boolean", short: "v" },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
  });

  return {
    name: values.name,
    description: values.description,
    license: values.license,
    author: values.author,
    confirmName: values["confirm-name"],
    dryRun: values["dry-run"] ?? false,
    yes: values.yes ?? false,
    noInput: values["no-input"] ?? false,
    version: values.version ?? false,
    help: values.help ?? false,
  };
}

export function validatePackageName(name: string | undefined): string | undefined {
  if (!name?.trim()) return "Name is required";
  if (name.startsWith("@")) {
    if (!/^@[a-z0-9-][a-z0-9-._]*\/[a-z0-9-][a-z0-9-._]*$/.test(name)) {
      return "Invalid scoped name. Use @scope/name (lowercase, URL-safe)";
    }
    return undefined;
  }
  if (!/^[a-z0-9-][a-z0-9-._]*$/.test(name)) {
    return "Invalid name. Use lowercase, URL-safe characters";
  }
  return undefined;
}
