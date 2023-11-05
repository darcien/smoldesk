import { getDb } from "./db_utils.ts";

// TODO: remove this
console.log([
  "Debug output:",
  `Deno cwd: ${Deno.cwd()}`,
  `Partial DB: ${JSON.stringify(await getDb()).slice(0, 20)}`,
  "Debug end...",
].join("\n"));
