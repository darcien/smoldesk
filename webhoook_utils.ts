import { z } from "./deps.ts";

export const webhooksConfigSchema = z.object({
  $schema: z.string(),
  discord: z.array(z.object({
    url: z.string().url(),
    filter: z.object({
      // unimplemented
      // projectId: z.string().optional(),
      userIds: z.array(z.string()),
    }),
  })).optional(),
});

export async function loadWebhooksConfig() {
  try {
    const text = await Deno.readTextFile("./webhooks.json");
    const obj = JSON.parse(text);
    const { $schema: _, ...webhooksConfig } = webhooksConfigSchema.parse(obj);
    return webhooksConfig;
  } catch (error: unknown) {
    console.log("💥 ./webhooks.json is not configured yet");
    throw error;
  }
}
