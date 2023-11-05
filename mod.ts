import { MessageToSend } from "./discord_utils.ts";
import { fetchAllUsersAvailability } from "./request_utils.ts";
import { Db, getDb } from "./db_utils.ts";
import { getUserIdsForReporting, loadConfigs } from "./config_utils.ts";
import { mapUnavailUserToDbUnavailTuple } from "./map_utils.ts";
import { formatUnavailabilityMessage } from "./format_utils.ts";
import { logger } from "./logger_utils.ts";
import {
  blastMessagesToAllWebhooks,
  handleBlastResult,
} from "./webhook_utils.ts";

const now = new Date();
logger().info(`Starting check for ${now.toISOString()}`);

const { allAvailableUsers, allUnavailableUsers } =
  await fetchAllUsersAvailability({ date: now });

const configs = await loadConfigs();
const { webhooksConfig } = configs;

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

// TODO: PTO needs to be reimplemented
// OLD implementation

// const users = { ...oldDb.users };
// const ptos = { ...oldDb.ptos };
// const unavailabilities = { ...oldDb.unavailabilities };

// for (const user of availableUsers) {
//   users[user.id] = {
//     id: user.id,
//     name: user.name,
//   };

//   for (const pto of user.ptoRequests) {
//     ptos[pto.id] = {
//       ...pto,
//       userId: user.id,
//     };
//   }
// }

// const addedPtos = Object.values(ptos).filter((pto) => !oldDb.ptos?.[pto.id]);
// const removedPtos = Object.values(oldDb.ptos || {}).filter((pto) =>
//   !ptos[pto.id]
// );

// const message = [
//   ...addedPtoMessages,
//   ...addedUnavailabilityMessages,
// ].join("\n");

// // TODO: Need major refactor to make the initial fetch dont do any filter
// // (or filter based on flattened webhooks config),
// // iterate over the config to craft the messages and send per webhook URL.
// await blastMessageToAllWebooks(message);

// for (const addedPto of addedPtos) {
//   const message = `Added PTO for ${
//     users[addedPto.userId]
//       ?.name
//   }: ${addedPto.requestDate} - ${addedPto.endDate}`;
//   console.log(message);
// }
// for (const removedPto of removedPtos) {
//   console.log(
//     `Removed PTO for ${
//       users[removedPto.userId]
//         ?.name
//     }: ${removedPto.requestDate} - ${removedPto.endDate}`,
//   );
// }
// for (const addedUnavailability of addedUnavailabilities) {
//   console.log(
//     `Added Unavailability for ${
//       users[addedUnavailability.userId]
//         ?.name
//     }: ${addedUnavailability.availability} - ${addedUnavailability.unavailableTime}`,
//   );
// }
