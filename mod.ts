import { MessageToSend } from "./discord_utils.ts";
import { fetchAllUsersAvailability, FetchResult } from "./request_utils.ts";
import { Db, getDb } from "./db_utils.ts";
import { getUserIdsForReporting, loadConfigs } from "./config_utils.ts";
import { mapUnavailUserToDbUnavailTuple } from "./map_utils.ts";
import { formatUnavailabilityMessage } from "./format_utils.ts";
import { logger } from "./logger_utils.ts";
import {
  blastMessagesToAllWebhooks,
  handleBlastResult,
} from "./webhook_utils.ts";
import { sendHeartbeat } from "./heartbeat_utils.ts";

const now = new Date();
logger().info(`Starting check for ${now.toISOString()}`);

const configs = await loadConfigs();
const { envConfig, webhooksConfig } = configs;

const fetchResult = await fetchAllUsersAvailability({ date: now });

if (fetchResult.status !== FetchResult.Ok) {
  switch (fetchResult.status) {
    case FetchResult.ErrorTimeout: {
      logger().error("[request] request timed out");
      sendHeartbeat(envConfig, { msg: "request timed out" });
      break;
    }
    case FetchResult.ErrorUnknown: {
      logger().error(
        `[request] request failed, error=${fetchResult.error}`,
        fetchResult.error,
      );
      sendHeartbeat(envConfig, { msg: "request failed" });
      break;
    }
    case FetchResult.ErrorMalformedResponse: {
      logger().error(
        `[request] bad response from server, error=${fetchResult.error}`,
        fetchResult.error,
      );
      sendHeartbeat(envConfig, { msg: "malformed response" });
      break;
    }
  }
  Deno.exit(0);
}

const { allAvailableUsers = [], allUnavailableUsers = [] } = fetchResult;

const userIdsForReporting = new Set(getUserIdsForReporting(webhooksConfig));

const [
  availableUsers,
  unavailableUsers,
] = [
  allAvailableUsers.filter((u) => userIdsForReporting.has(u.id)),
  allUnavailableUsers.filter((u) => userIdsForReporting.has(u.id)),
];

const oldDb = await getDb();

const newDbUsers: Db["users"] = [
  ...availableUsers,
  ...unavailableUsers,
].reduce(
  (acc, user) => {
    acc[user.id] = {
      id: user.id,
      name: user.name,
    };
    return acc;
  },
  // Use old DB users as initial value
  // so we keep record of the old users
  // even though the new config don't do reporting on the old users.
  { ...oldDb.users },
);

const newUnavailabilities = unavailableUsers
  .map((u) => mapUnavailUserToDbUnavailTuple(u))
  .filter(([unavailId, _]) => !oldDb.unavailabilities?.[unavailId])
  .map(([unavailabilityId, unavailability]) => {
    return {
      unavailabilityId,
      unavailability,
      formattedMsg: formatUnavailabilityMessage({
        users: newDbUsers,
        unavailability,
      }),
    };
  });

const newDbUnavailabilities: Db["unavailabilities"] = newUnavailabilities
  .reduce((acc, u) => {
    acc[u.unavailabilityId] = u.unavailability;
    return acc;
  }, { ...oldDb.unavailabilities });

// TODO: this DB update logic needs to be factored out
const newDb: Db = {
  ...oldDb,
  users: newDbUsers,
  unavailabilities: newDbUnavailabilities,
};

const messages: Array<MessageToSend> = [
  ...newUnavailabilities.map((u) => ({
    message: u.formattedMsg,
    userId: u.unavailability.userId,
  })),
];

const blastResult = await blastMessagesToAllWebhooks(configs, messages);

await handleBlastResult({ configs, result: blastResult, newDb });
