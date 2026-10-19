import { readFileSync } from "node:fs";

export class CliError extends Error {}

export function readJsonFile(path: string): unknown {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    throw new CliError(`Cannot read file: ${path}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new CliError(`Invalid JSON in file: ${path}`);
  }
}

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function runCli(main: () => void): void {
  try {
    main();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    process.stderr.write(`${JSON.stringify({ error: message })}\n`);
    process.exitCode = 1;
  }
}
