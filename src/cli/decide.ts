import { tryParseDay } from "../domain/dates";
import { decideAll } from "../domain/decide";
import { InvoiceListSchema } from "../domain/invoice";
import { parseDecideArgs } from "./args";
import { CliError, printJson, readJsonFile, runCli } from "./io";

runCli(() => {
  const { file, today } = parseDecideArgs(process.argv.slice(2));
  const day = tryParseDay(today);
  if (day === null) throw new CliError(`Invalid --today: ${today}`);
  const parsed = InvoiceListSchema.safeParse(readJsonFile(file));
  if (!parsed.success) throw new CliError(`Invalid invoices file: ${parsed.error.message}`);
  const decisions = decideAll(parsed.data, day).map(({ id, action, rule }) => ({
    id,
    action,
    rule,
  }));
  printJson({ today, decisions });
});
