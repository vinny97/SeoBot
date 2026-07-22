import nextEnv from "@next/env";
import { createMonidClient } from "../lib/monid/client.js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const inspection = await createMonidClient().inspect("semrush", "/trends_daily");
console.log(JSON.stringify({
  provider: inspection.provider,
  endpoint: inspection.endpoint,
  method: inspection.method,
  description: inspection.description,
  input: inspection.input,
  price: inspection.price,
  notes: inspection.notes,
}, null, 2));
