import {
  Configs,
  DiscordWebhookConfig,
  getUserIdsFromDiscordConfig,
  RuntimeConfig,
} from "./config_utils.ts";
import { RESTPostAPIWebhookWithTokenJSONBody } from "./deps.ts";
import { logger } from "./logger_utils.ts";

async function sendMessageToWebhook(
  { message, webhookUrl }: { message: string; webhookUrl: string },
) {
  // TODO: this webhook config should be customizeable
  const body: RESTPostAPIWebhookWithTokenJSONBody = {
    username: "Bernard (PM)",
    avatar_url:
      "https://cdn.discordapp.com/app-icons/1047114663546077236/f955f79add76f138757a0f9f695fc5f1.png?size=256",
    content: message,
  };

  // res body depends on wait query param
  // https://discord.com/developers/docs/resources/webhook#execute-webhook-query-string-params
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return res;
}

export enum BlastResult {
  OkAllSent,
  OkPartiallySent,
  OkSkipped,
  Error,
}

export type MessageToSend = {
  message: string;
  userId: string;
};

export enum SendWebhookSafelyResult {
  OkSent,
  OkSkipped,
  OkDisabled,
  OkDryRun,
  Error,
}

async function sendMessagesToSingleWebhookSafely(
  {
    runtimeConfig,
    discordConfig,
    messages,
  }: {
    runtimeConfig: RuntimeConfig;
    discordConfig: DiscordWebhookConfig;
    messages: Array<MessageToSend>;
  },
) {
  if (discordConfig.disabled) {
    logger().info(
      `[${discordConfig.description}] Disabled from config, skipping`,
    );
    return SendWebhookSafelyResult.OkDisabled;
  }

  // Each config could specify different users to report
  const userIds = new Set(getUserIdsFromDiscordConfig(discordConfig));
  const messagesToSend = messages
    .filter((m) => userIds.has(m.userId));

  if (messagesToSend.length === 0) {
    logger().info(
      `[${discordConfig.description}] No message to send, skipping`,
    );
    return SendWebhookSafelyResult.OkSkipped;
  }

  const formattedMessage = messagesToSend
    .map((m) => m.message)
    .join("\n");

  if (runtimeConfig.dryRun) {
    logger().info(
      `[${discordConfig.description}] Running in dry run mode, message:
${formattedMessage}`,
    );
    return SendWebhookSafelyResult.OkDryRun;
  }

  logger().info(
    `[${discordConfig.description}] Attempting to send message, message:
${formattedMessage}`,
  );

  try {
    const res = await sendMessageToWebhook({
      message: formattedMessage,
      webhookUrl: discordConfig.url,
    });

    if (res.ok) {
      logger().info(
        `[${discordConfig.description}] Webhook message sent`,
      );
      return SendWebhookSafelyResult.OkSent;
    }

    const badResDetail = {
      status: res.status,
      statusText: res.statusText,
      body: await res.text(),
    };
    logger().info(
      `[${discordConfig.description}] Discord does not respond with OK status, detail: ${
        JSON.stringify(badResDetail)
      }`,
    );
    return [SendWebhookSafelyResult.Error, {
      status: res.status,
      statusText: res.statusText,
      body: await res.text(),
    }] as const;
  } catch (error) {
    logger().info(
      `[${discordConfig.description}], Error when sending message to Discord, error: ${error}`,
    );
    return [SendWebhookSafelyResult.Error, error] as const;
  }
}

export async function blastMessagesToDiscord(
  {
    webhooksConfig,
    runtimeConfig,
  }: Configs,
  messages: Array<MessageToSend>,
) {
  const discordWebhooks = webhooksConfig.discord ?? [];

  if (discordWebhooks.length === 0) {
    return BlastResult.OkSkipped;
  }

  const allResults = await Promise.all(
    discordWebhooks
      .map((discordConfig) =>
        sendMessagesToSingleWebhookSafely({
          discordConfig,
          runtimeConfig,
          messages,
        })
      ),
  );

  if (
    allResults.every((r) =>
      r === SendWebhookSafelyResult.OkSkipped ||
      r === SendWebhookSafelyResult.OkDisabled ||
      r === SendWebhookSafelyResult.OkDryRun
    )
  ) {
    return BlastResult.OkSkipped;
  }

  if (
    allResults.every((r) => r === SendWebhookSafelyResult.OkSent)
  ) {
    return BlastResult.OkAllSent;
  }

  if (
    allResults.some((r) =>
      r === SendWebhookSafelyResult.OkSent ||
      r === SendWebhookSafelyResult.OkSkipped ||
      r === SendWebhookSafelyResult.OkDisabled ||
      r === SendWebhookSafelyResult.OkDryRun
    )
  ) {
    return BlastResult.OkPartiallySent;
  }

  return BlastResult.Error;
}
