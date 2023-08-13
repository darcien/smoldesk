import { RESTPostAPIWebhookWithTokenJSONBody } from "https://deno.land/x/discord_api_types@0.37.52/v10.ts";
import { load } from "https://deno.land/std@0.197.0/dotenv/mod.ts";

const config = await load();

const allWebhookUrls = config.DISCORD_WEBHOOK_URLS.replaceAll(/[\n ]/g, "")
  .split(
    ",",
  ).filter((url) => (url.trim()).length > 0);

console.log({ allWebhookUrls });

if (allWebhookUrls.length === 0) {
  throw new Error(
    "Need at least one webhook url configured via DISCORD_WEBHOOK_URLS",
  );
}

async function sendMessageToWebhook(
  { message, webhookUrl }: { message: string; webhookUrl: string },
) {
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

export async function blastMessageToAllWebooks(message: string) {
  const all = await Promise.allSettled(
    allWebhookUrls.map((webhookUrl) =>
      sendMessageToWebhook({ message, webhookUrl })
    ),
  );

  const failed = all.filter((res) => res.status === "rejected");
  console.log(
    `Failed to send to ${failed.length} out of ${all.length} webhooks`,
    { failed },
  );
}

export function formatDateForDiscord(
  date: Date,
  format: "relative" | "short date",
) {
  const discordFormat = format === "relative" ? "R" : "d";
  return `<t:${Math.floor(date.getTime() / 1000)}:${discordFormat}>`;
}
