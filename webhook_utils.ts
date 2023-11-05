import { Configs } from "./config_utils.ts";
import { Db, saveDb } from "./db_utils.ts";
import {
  blastMessagesToDiscord,
  BlastResult,
  MessageToSend,
} from "./discord_utils.ts";
import { sendHeartbeat } from "./heartbeat_utils.ts";

export async function blastMessagesToAllWebhooks(
  configs: Configs,
  messages: Array<MessageToSend>,
) {
  const discordResult = await blastMessagesToDiscord(configs, messages);

  // There's only discord webhook right now
  return discordResult;
}

export async function handleBlastResult(
  {
    configs,
    result,
    newDb,
  }: {
    configs: Configs;
    result: BlastResult;
    newDb: Db;
  },
) {
  const { envConfig, runtimeConfig } = configs;

  switch (result) {
    case BlastResult.Error:
      return sendHeartbeat(envConfig, {
        msg: "Error all webhooks failed",
      });
    case BlastResult.OkAllSent:
      await saveDb(runtimeConfig, newDb);
      return sendHeartbeat(envConfig, {
        msg: "Ok all sent",
      });
    case BlastResult.OkPartiallySent:
      await saveDb(runtimeConfig, newDb);
      return sendHeartbeat(envConfig, {
        msg: "Ok partially sent",
      });
    case BlastResult.OkSkipped:
      await saveDb(runtimeConfig, newDb);
      return sendHeartbeat(envConfig, {
        msg: "Ok nothing sent",
      });

    default:
      return sendHeartbeat(envConfig, {
        msg: `Ok unhandled result=${result}`,
      });
  }
}
