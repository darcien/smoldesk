import { load, parse, z } from "./deps.ts";
import { logger } from "./logger_utils.ts";

const discordWebhookConfigSchema = z.object({
  description: z.string(),
  disabled: z.boolean().optional(),
  url: z.string().url(),
  filter: z.object({
    // unimplemented
    // projectId: z.string().optional(),
    userIds: z.array(z.string()),
  }),
});

export const webhooksConfigSchema = z.object({
  $schema: z.string(),
  discord: z.array(discordWebhookConfigSchema).optional(),
});

export type WebhooksConfig = Omit<
  z.TypeOf<typeof webhooksConfigSchema>,
  "$schema"
>;
export type DiscordWebhookConfig = z.TypeOf<typeof discordWebhookConfigSchema>;

export async function loadWebhooksConfig(): Promise<WebhooksConfig> {
  try {
    const text = await Deno.readTextFile("./webhooks.json");
    const obj = JSON.parse(text);
    const { $schema: _, ...webhooksConfig } = webhooksConfigSchema.parse(obj);
    return webhooksConfig;
  } catch (error: unknown) {
    logger().error("./webhooks.json is not configured yet");
    throw error;
  }
}

export function getUserIdsForReporting(config: WebhooksConfig): string[] {
  return config.discord?.flatMap((discordConfig) =>
    getUserIdsFromDiscordConfig(discordConfig)
  ) ?? [];
}

export function getUserIdsFromDiscordConfig(
  discordConfig: DiscordWebhookConfig,
): string[] {
  return discordConfig.filter.userIds.flatMap((userIdWithCommentSuffix) => {
    const [userId, _comment] = userIdWithCommentSuffix.split(" ");
    return userId ? [userId] : [];
  });
}

export type RuntimeConfig = {
  dryRun: boolean;
};

export function loadRuntimeConfig(): RuntimeConfig {
  const flags = parse(Deno.args, {
    boolean: ["dry-run"],
  });

  return {
    dryRun: flags["dry-run"],
  };
}

export type EnvConfig = {
  UPTIME_KUMA_HEARTBEAT_URL: string;
};
export async function loadEnvConfig() {
  const envConfig = await load();
  return envConfig as EnvConfig;
}

export type Configs = {
  runtimeConfig: RuntimeConfig;
  webhooksConfig: WebhooksConfig;
  envConfig: EnvConfig;
};

export async function loadConfigs(): Promise<Configs> {
  return {
    runtimeConfig: loadRuntimeConfig(),
    webhooksConfig: await loadWebhooksConfig(),
    envConfig: await loadEnvConfig(),
  };
}
