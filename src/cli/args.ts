import { CliError } from "./io";

export interface DecideArgs {
  readonly file: string;
  readonly today: string;
}

export function parseDecideArgs(argv: readonly string[]): DecideArgs {
  const positional: string[] = [];
  let today: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--today") {
      today = argv[i + 1];
      i += 1;
    } else if (arg.startsWith("--today=")) {
      today = arg.slice("--today=".length);
    } else {
      positional.push(arg);
    }
  }
  const file = positional[0];
  if (!file) throw new CliError("Usage: decide <invoices.json> --today YYYY-MM-DD");
  if (!today) throw new CliError("Missing required --today YYYY-MM-DD");
  return { file, today };
}
