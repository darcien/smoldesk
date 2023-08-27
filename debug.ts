import { load } from "https://deno.land/std@0.197.0/dotenv/mod.ts";
import { getDb } from "./db_utils.ts";

const config = await load();

console.log([
  "Debug output:",
  `Deno cwd: ${Deno.cwd()}`,
  `Env config: ${config.KODESK_API_URL}`,
  `Partial DB: ${JSON.stringify(await getDb()).slice(0, 20)}`,
  "Debug end...",
].join("\n"));
