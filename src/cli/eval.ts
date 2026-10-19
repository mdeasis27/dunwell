import { z } from "zod";
import { evaluateRawCases } from "../domain/evaluate";
import { CliError, printJson, readJsonFile, runCli } from "./io";

const DEFAULT_CASES = "fixtures/cases.json";

// Only the outer shape is strict. Individual cases and invoices are checked while scoring.
const CaseFileSchema = z.array(
  z.object({ today: z.unknown(), invoices: z.unknown(), expected: z.unknown() }),
);

runCli(() => {
  const file = process.argv[2] ?? DEFAULT_CASES;
  const parsed = CaseFileSchema.safeParse(readJsonFile(file));
  if (!parsed.success) throw new CliError(`Invalid cases file: ${parsed.error.message}`);
  printJson(evaluateRawCases(parsed.data));
});
