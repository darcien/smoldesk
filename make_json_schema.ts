import { zodToJsonSchema } from "./deps.ts";
import { webhooksConfigSchema } from "./webhoook_utils.ts";

const schemaByFilename = {
  webhooks: webhooksConfigSchema,
};

await Promise.all(
  Object.entries(schemaByFilename).map((
    [name, schema],
    // Typing issues even when `zodToJsonSchema` accept any schema
    // and zod version already matches.
    // deno-lint-ignore no-explicit-any
  ) => [name, zodToJsonSchema(schema as any)]).map(([name, jsonSchema]) =>
    Deno.writeTextFile(
      `./${name}.schema.json`,
      JSON.stringify(jsonSchema, null, 2),
    )
  ),
);
