import nextEnv from "@next/env";
import { createMonidClient } from "../lib/monid/client.js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const rawQuery = process.env.MONID_TEST_QUERY_PARAMS_JSON;
if (!rawQuery) throw new Error("MONID_TEST_QUERY_PARAMS_JSON is required. Inspect the endpoint first, then provide only the required low-cost test parameters.");

let queryParams: Record<string, unknown>;
try {
  queryParams = JSON.parse(rawQuery) as Record<string, unknown>;
} catch {
  throw new Error("MONID_TEST_QUERY_PARAMS_JSON must be valid JSON.");
}

const result = await createMonidClient().run("semrush", "/trends_daily", { queryParams });
console.log(JSON.stringify({
  runId: result.runId,
  status: result.status,
  providerHttpStatus: result.providerResponse?.httpStatus ?? null,
  billedUnits: result.billedUnits ?? null,
  output: result.output ?? null,
  reason: result.reason ?? null,
}, null, 2));
